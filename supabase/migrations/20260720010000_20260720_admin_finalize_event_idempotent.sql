/*
  # admin_finalize_event: idempotent, derived-status-gated, region-scoped

  ## Idempotency design
  `INSERT INTO event_finalizations (...)` is attempted FIRST, before any
  wallet or entry mutation. Success (`RETURNING id`) means this call
  legitimately won the right to finalize — every following step (wallet
  credit, `weekend_event_entries` updates, `event_instances` status
  update, winner announcement) happens only in that same, single
  function invocation, which is already one Postgres transaction. A
  `unique_violation` on that insert means the event/instance was already
  finalized by an earlier call — the function looks up the existing
  finalization record and returns it, touching nothing else. This is the
  literal mechanism, not just a description of intent: the unique index
  from the previous migration is what makes two concurrent calls
  resolve to exactly one winner deterministically, the same way
  Postgres's own MVCC/constraint enforcement already guarantees
  elsewhere in this project (e.g. `cashout_game`'s replay handling).

  ## Locking
  For instance-scoped calls, `event_instances` is additionally locked
  (`FOR UPDATE`) before deriving its status — this isn't what prevents a
  double-payout (the `event_finalizations` unique index already
  guarantees that unconditionally), it's what guarantees a *consistent*
  status read within the transaction (no other transaction can flip
  `status` between the read and this transaction's own possible write to
  it).

  ## Eligibility (derived status, not stale stored status)
  Instance-scoped: `get_event_instance_derived_status()` — `cancelled`
  refuses outright; `scheduled`/`open` refuse unless `p_force = true`
  (an explicit admin override, always recorded in the audit log);
  `closed` or `finalized` (already-finalized is caught by the
  idempotency gate below, not here) proceed. Legacy/global calls
  (`p_event_instance_id IS NULL`) have no window concept to check —
  same as before this pass — but now also get the new `no_entries`
  safety check (see below), which the original version never had.

  ## no_entries safety (new — applied to both paths)
  Before attempting to claim the finalization slot, confirm at least one
  `weekend_event_entries` row exists for this event/date (scoped to the
  instance when provided). If none exist, return `'no_entries'` without
  creating a finalization record — so it remains retryable once a real
  entry exists, rather than permanently consuming the idempotency slot
  for what was likely a mistaken call (wrong instance id, premature
  action). This is a genuine behavior change from the original version,
  which had no such check — a deliberate safety improvement, not silently
  introduced: the function had no live caller before this pass (confirmed
  by search), so there is no compatibility risk in tightening this.

  ## Region scoping
  For an instance-scoped call: winner/entries are always filtered to
  `event_instance_id = p_event_instance_id` — a region's finalization can
  never touch another region's entries. Ledger metadata records
  `event_instance_id`, `event_game_id`, `game_time_region_id`,
  `event_date`, and `finalization_id`.

  ## Response shape
  Existing keys preserved (the function had no live caller, but keeping
  the same field names as the previous pass's version regardless, per
  "add keys rather than removing"), plus: `status` (`'finalized' |
  'already_finalized' | 'no_entries' | 'not_closed' | 'cancelled'`),
  `finalization_id`.
*/

CREATE OR REPLACE FUNCTION public.admin_finalize_event(
  p_event_game_id     text,
  p_winner_user_id    uuid,
  p_payout_cents      int,
  p_display_name      text,
  p_admin_actor       text DEFAULT 'admin',
  p_event_instance_id uuid DEFAULT NULL,
  p_force             boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_week_start        date;
  v_event_date        date;
  v_region_id         uuid;
  v_instance          record;
  v_derived_status     text;
  v_entry_count        integer;
  v_finalization_id     uuid;
  v_ledger_id            uuid;
  v_announcement_id       uuid;
  v_existing               record;
BEGIN
  IF p_event_instance_id IS NOT NULL THEN
    SELECT * INTO v_instance FROM public.event_instances WHERE id = p_event_instance_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Unknown event_instance_id: %', p_event_instance_id;
    END IF;
    v_event_date := v_instance.event_date;
    v_region_id  := v_instance.game_time_region_id;

    v_derived_status := public.get_event_instance_derived_status(p_event_instance_id);

    IF v_derived_status = 'cancelled' THEN
      RETURN jsonb_build_object('status', 'cancelled', 'event_instance_id', p_event_instance_id, 'event_game_id', p_event_game_id);
    END IF;
    IF v_derived_status IN ('scheduled', 'open') AND NOT p_force THEN
      RETURN jsonb_build_object('status', 'not_closed', 'event_instance_id', p_event_instance_id, 'event_game_id', p_event_game_id, 'derived_status', v_derived_status);
    END IF;
  ELSE
    v_week_start := public.get_current_week_start();
    v_event_date := v_week_start;
  END IF;

  -- no_entries safety check (new — see header comment).
  IF p_event_instance_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_entry_count FROM public.weekend_event_entries WHERE event_instance_id = p_event_instance_id;
  ELSE
    SELECT COUNT(*) INTO v_entry_count FROM public.weekend_event_entries
    WHERE event_game_id = p_event_game_id AND week_start_date = v_week_start;
  END IF;
  IF v_entry_count = 0 THEN
    RETURN jsonb_build_object('status', 'no_entries', 'event_instance_id', p_event_instance_id, 'event_game_id', p_event_game_id);
  END IF;

  -- ── The atomic idempotency gate ──────────────────────────────────────
  BEGIN
    INSERT INTO public.event_finalizations
      (event_instance_id, event_game_id, game_time_region_id, event_date, winner_user_id, reward_cents, finalized_by)
    VALUES
      (p_event_instance_id, p_event_game_id, v_region_id, v_event_date, p_winner_user_id, p_payout_cents, p_admin_actor)
    RETURNING id INTO v_finalization_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO v_existing FROM public.event_finalizations
    WHERE (p_event_instance_id IS NOT NULL AND event_instance_id = p_event_instance_id)
       OR (p_event_instance_id IS NULL AND event_instance_id IS NULL AND event_game_id = p_event_game_id AND event_date = v_event_date);
    RETURN jsonb_build_object(
      'status',            'already_finalized',
      'event_instance_id', p_event_instance_id,
      'event_game_id',     p_event_game_id,
      'winner_user_id',    v_existing.winner_user_id,
      'reward_cents',      v_existing.reward_cents,
      'wallet_ledger_id',  v_existing.wallet_ledger_id,
      'finalization_id',   v_existing.id
    );
  END;

  -- Won the finalization race — the only path that ever mutates the
  -- wallet, entries, instance status, or creates an announcement.
  UPDATE public.weekend_event_entries
  SET result_status = 'completed', reward_cents = p_payout_cents
  WHERE user_id = p_winner_user_id
    AND event_game_id = p_event_game_id
    AND week_start_date = v_event_date
    AND (p_event_instance_id IS NULL OR event_instance_id = p_event_instance_id);

  UPDATE public.weekend_event_entries
  SET result_status = 'completed'
  WHERE event_game_id = p_event_game_id
    AND week_start_date = v_event_date
    AND result_status = 'entered'
    AND (p_event_instance_id IS NULL OR event_instance_id = p_event_instance_id);

  IF p_payout_cents > 0 THEN
    INSERT INTO public.wallet_ledger (user_id, type, amount_cents, meta)
    VALUES (
      p_winner_user_id, 'JACKPOT_WIN', p_payout_cents,
      jsonb_build_object(
        'event',               p_event_game_id,
        'event_date',           v_event_date,
        'event_instance_id',     p_event_instance_id,
        'game_time_region_id',    v_region_id,
        'finalization_id',          v_finalization_id
      )
    )
    RETURNING id INTO v_ledger_id;

    UPDATE public.event_finalizations SET wallet_ledger_id = v_ledger_id WHERE id = v_finalization_id;
  END IF;

  IF p_event_instance_id IS NOT NULL THEN
    UPDATE public.event_instances SET status = 'finalized', updated_at = now() WHERE id = p_event_instance_id;
  END IF;

  INSERT INTO public.winner_announcements
    (event_game_id, event_date, user_id, display_name, payout_cents, result_summary, share_text)
  VALUES
    (p_event_game_id, v_event_date,
     p_winner_user_id,
     p_display_name,
     p_payout_cents,
     'Won the ' || p_event_game_id || ' on ' || v_event_date::text,
     'I just won the Survive the Streak ' || p_event_game_id || '!')
  RETURNING id INTO v_announcement_id;

  INSERT INTO public.admin_audit_log (admin_actor, action, payload_json)
  VALUES (p_admin_actor, 'finalize_event',
    jsonb_build_object('event', p_event_game_id, 'winner', p_winner_user_id,
      'payout_cents', p_payout_cents, 'announcement_id', v_announcement_id,
      'event_instance_id', p_event_instance_id, 'finalization_id', v_finalization_id,
      'forced', p_force));

  RETURN jsonb_build_object(
    'status',            'finalized',
    'event_instance_id', p_event_instance_id,
    'event_game_id',     p_event_game_id,
    'winner_user_id',    p_winner_user_id,
    'reward_cents',      p_payout_cents,
    'wallet_ledger_id',  v_ledger_id,
    'finalization_id',   v_finalization_id,
    'announcement_id',   v_announcement_id
  );
END;
$$;

/*
  ## Rollback
  Re-apply the previous body from
  20260719050000_20260719_admin_finalize_event_region_scoped.sql (no
  idempotency gate, no derived-status check, no no_entries check). No
  `event_finalizations` row or `wallet_ledger` row is rewritten either
  way — rolling back only affects future calls.
*/
