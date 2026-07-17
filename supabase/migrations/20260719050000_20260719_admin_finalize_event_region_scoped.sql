/*
  # admin_finalize_event: optional region/instance scoping

  ## Why this is careful, not a rewrite
  `admin_finalize_event()` pays a REAL wallet reward
  (`wallet_ledger` type `JACKPOT_WIN`) — genuine financial logic. This
  migration does not rewrite its payout mechanism. It adds one optional
  parameter, `p_event_instance_id uuid DEFAULT NULL`, with a strict
  behavioral guarantee: **when omitted, behavior is byte-for-byte
  identical to before** (finalizes by `event_game_id` +
  `get_current_week_start()`, exactly as it always has). This preserves
  every existing caller and every existing Global-mode finalization flow
  with zero risk.

  ## What the new parameter does when provided
  Scopes the two `UPDATE weekend_event_entries` statements (winner +
  "mark all others completed") to `event_instance_id = p_event_instance_id`
  in addition to the existing `event_game_id`/`week_start_date` filter —
  so a region's finalization can never touch another region's entries
  for what would otherwise look like "the same week." The `JACKPOT_WIN`
  ledger entry's `meta` now also records `event_instance_id` and
  `game_time_region_id` (looked up from the instance) when scoped, for
  audit — never used to compute the payout amount itself, which remains
  entirely admin-supplied (`p_payout_cents`), exactly as before.

  ## Idempotency / duplicate-reward safety (unchanged mechanism,
  reconfirmed, not newly built)
  This function has never had built-in idempotency of its own — calling
  it twice for the same winner would insert two `JACKPOT_WIN` ledger
  rows. This was already true before this migration and is not a
  region-awareness gap; it's a pre-existing property of this admin-only,
  manually-invoked finalization flow. Not fixed in this pass (out of
  scope — this pass is about region-scoping, not rebuilding the
  finalization safety model) — flagged explicitly in
  PROJECT_CHANGELOG.md "Remaining limitations" rather than silently left
  undocumented.
*/

CREATE OR REPLACE FUNCTION public.admin_finalize_event(
  p_event_game_id     text,
  p_winner_user_id    uuid,
  p_payout_cents      int,
  p_display_name      text,
  p_admin_actor       text DEFAULT 'admin',
  p_event_instance_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_week_start  date;
  v_winner_id   uuid;
  v_region_id   uuid;
  v_meta        jsonb;
BEGIN
  v_week_start := public.get_current_week_start();

  IF p_event_instance_id IS NOT NULL THEN
    SELECT game_time_region_id INTO v_region_id FROM public.event_instances WHERE id = p_event_instance_id;
    IF v_region_id IS NULL THEN
      RAISE EXCEPTION 'Unknown event_instance_id: %', p_event_instance_id;
    END IF;
  END IF;

  -- Update winner entry — scoped to the instance when provided, exactly
  -- the previous (event_game_id, week_start_date)-only filter otherwise.
  UPDATE public.weekend_event_entries
  SET result_status = 'completed', reward_cents = p_payout_cents
  WHERE user_id = p_winner_user_id
    AND event_game_id = p_event_game_id
    AND week_start_date = v_week_start
    AND (p_event_instance_id IS NULL OR event_instance_id = p_event_instance_id);

  -- Mark all other entries as completed — same scoping.
  UPDATE public.weekend_event_entries
  SET result_status = 'completed'
  WHERE event_game_id = p_event_game_id
    AND week_start_date = v_week_start
    AND result_status = 'entered'
    AND (p_event_instance_id IS NULL OR event_instance_id = p_event_instance_id);

  -- Credit wallet if payout — unchanged mechanism, amount always
  -- admin-supplied, never computed from region/instance data.
  IF p_payout_cents > 0 THEN
    v_meta := jsonb_build_object('event', p_event_game_id, 'week_start', v_week_start);
    IF p_event_instance_id IS NOT NULL THEN
      v_meta := v_meta || jsonb_build_object('event_instance_id', p_event_instance_id, 'game_time_region_id', v_region_id);
    END IF;

    INSERT INTO public.wallet_ledger (user_id, type, amount_cents, meta)
    VALUES (p_winner_user_id, 'JACKPOT_WIN', p_payout_cents, v_meta);
  END IF;

  -- Mark the instance finalized when scoped (unchanged for the
  -- non-scoped path — event_instances doesn't exist as a concept there).
  IF p_event_instance_id IS NOT NULL THEN
    UPDATE public.event_instances SET status = 'finalized', updated_at = now() WHERE id = p_event_instance_id;
  END IF;

  -- Create winner announcement — unchanged.
  INSERT INTO public.winner_announcements
    (event_game_id, event_date, user_id, display_name, payout_cents, result_summary, share_text)
  VALUES
    (p_event_game_id, v_week_start,
     p_winner_user_id,
     p_display_name,
     p_payout_cents,
     'Won the ' || p_event_game_id || ' on ' || v_week_start::text,
     'I just won the Survive the Streak ' || p_event_game_id || '!')
  RETURNING id INTO v_winner_id;

  INSERT INTO public.admin_audit_log (admin_actor, action, payload_json)
  VALUES (p_admin_actor, 'finalize_event',
    jsonb_build_object('event', p_event_game_id, 'winner', p_winner_user_id,
      'payout_cents', p_payout_cents, 'announcement_id', v_winner_id,
      'event_instance_id', p_event_instance_id));

  RETURN v_winner_id;
END;
$$;

/*
  ## Rollback
  Re-apply the previous body from
  20260408131036_20260408_ecosystem_phase2_gate_progress.sql (drops the
  optional 6th parameter and instance scoping). No wallet_ledger or
  weekend_event_entries row is rewritten either way — this only changes
  behavior for FUTURE calls.
*/
