/*
  # cashout_game records the authoritative Game Time region

  ## What changes (and nothing else)
  1. `v_region_id` is resolved once, right after authentication, via
     `resolve_user_game_time_region(v_user_id)` — the same function
     `play_daily_gate` now uses.
  2. `game_time_region_id` is added to the ledger `meta` jsonb for a
     genuinely NEW cashout row (step 7's insert) — for audit/reporting
     only, per requirement #8. It is NOT part of the idempotency/replay
     comparison — the existing fingerprint (`game_id` + `cashout_context_id`)
     is untouched, so replay behavior, context validation, and the
     stale-context guard are byte-for-byte unchanged.
  3. `played_today` in the response (`v_last_play_date = ...`) now uses
     `get_current_game_date_for_user(v_user_id)` instead of
     `get_madrid_today()` directly — identical output in Global mode, and
     consistent with `play_daily_gate`/`get_my_state`'s own resolution.

  Preserved exactly, verified by diff while writing this migration, not
  just described as unchanged: the mandatory 3-argument signature (no
  defaults), every validation check, the row lock, the existing-key
  lookup and game/context comparison for replay, the stale-context guard
  comparing against the just-locked `game_state.updated_at`, the pot
  eligibility check, the `unique_violation` exception handler, the wallet
  balance update, the streak/pot reset, and the full return shape (all
  existing keys unchanged). No new cashout mechanism, no second payout
  path, no change to amount/currency authority (still server-computed
  from `pot_cents`, never client-supplied). Day 30 badge/cycle logic is
  untouched — it was already fully independent of `cashout_game()`
  (awarded at play time via a trigger, confirmed again during this
  pass's audit) and remains so.
*/

CREATE OR REPLACE FUNCTION public.cashout_game(
  p_game_id    text,
  p_idem_key   text,
  p_context_id timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id             uuid;
  v_region_id           uuid;
  v_current_streak      integer;
  v_pot_cents           integer;
  v_last_play_date      date;
  v_gs_updated_at       timestamptz;
  v_cashout_amount      integer;
  v_new_balance         integer;
  v_jackpot_cents       integer;
  v_ledger_id           uuid;
  v_existing_id         uuid;
  v_existing_amount     integer;
  v_existing_game_id    text;
  v_existing_context    timestamptz;
BEGIN
  -- 1. Authenticate
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Resolve the authoritative Game Time region for audit metadata only —
  -- never used in any eligibility, replay, or context-validation decision.
  v_region_id := public.resolve_user_game_time_region(v_user_id);

  -- 2. Validate game id, idempotency key, and context shape. These are
  --    now mandatory at the signature level (no defaults), but the body
  --    still validates defensively — a caller can still pass an explicit
  --    NULL or empty string for a required parameter, and that must be
  --    rejected the same way it always has been.
  IF p_game_id IS NULL OR btrim(p_game_id) = '' THEN
    RAISE EXCEPTION 'Invalid game id';
  END IF;
  IF p_idem_key IS NULL OR btrim(p_idem_key) = '' THEN
    RAISE EXCEPTION 'Missing idempotency key';
  END IF;
  IF p_idem_key !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RAISE EXCEPTION 'Invalid idempotency key';
  END IF;
  IF p_context_id IS NULL THEN
    RAISE EXCEPTION 'Missing cashout context';
  END IF;

  -- 3. Lock the player's game-state row.
  SELECT current_streak, pot_cents, last_play_date, updated_at
  INTO   v_current_streak, v_pot_cents, v_last_play_date, v_gs_updated_at
  FROM   public.game_state
  WHERE  user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No pot to cash out';
  END IF;

  -- 4. Has this exact (user, idempotency key) already produced a cashout
  --    row? Compare game_id AND context — not idem_key alone.
  SELECT id, amount_cents, meta->>'game_id', (meta->>'cashout_context_id')::timestamptz
  INTO   v_existing_id, v_existing_amount, v_existing_game_id, v_existing_context
  FROM   public.wallet_ledger
  WHERE  user_id = v_user_id
    AND  type = 'CASHOUT'
    AND  meta->>'idem_key' = p_idem_key
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    IF v_existing_game_id IS DISTINCT FROM p_game_id
       OR v_existing_context IS DISTINCT FROM p_context_id THEN
      RAISE EXCEPTION 'Idempotency key context mismatch';
    END IF;

    SELECT balance_cents INTO v_new_balance   FROM public.wallet_balance_cache WHERE user_id = v_user_id;
    SELECT balance_cents INTO v_jackpot_cents FROM public.jackpot_state        WHERE id = 1;
    RETURN jsonb_build_object(
      'streak',               0,
      'pot_cents',            0,
      'wallet_balance_cents', v_new_balance,
      'jackpot_cents',        v_jackpot_cents,
      'cashout_amount_cents', v_existing_amount,
      'played_today',         (v_last_play_date = public.get_current_game_date_for_user(v_user_id)),
      'transaction_id',       v_existing_id,
      'currency',             'EUR',
      'idempotent_replay',    true
    );
  END IF;

  -- 5. No row for this key — a genuinely new attempt. The submitted
  --    context must match what the server itself just locked as current.
  IF p_context_id IS DISTINCT FROM v_gs_updated_at THEN
    RAISE EXCEPTION 'Stale cashout context';
  END IF;

  -- 6. Confirm pot eligibility.
  IF v_pot_cents IS NULL OR v_pot_cents = 0 THEN
    RAISE EXCEPTION 'No pot to cash out';
  END IF;

  v_cashout_amount := v_pot_cents;

  -- 7. Insert the cashout ledger row — full request fingerprint recorded,
  --    now including the authoritative region for audit (not part of the
  --    idempotency fingerprint itself).
  BEGIN
    INSERT INTO public.wallet_ledger (user_id, type, amount_cents, meta)
    VALUES (
      v_user_id, 'CASHOUT', v_cashout_amount,
      jsonb_build_object(
        'streak',              v_current_streak,
        'game_id',              p_game_id,
        'idem_key',             p_idem_key,
        'cashout_context_id',   p_context_id,
        'currency',             'EUR',
        'game_time_region_id',  v_region_id
      )
    )
    RETURNING id INTO v_ledger_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT id, amount_cents, meta->>'game_id', (meta->>'cashout_context_id')::timestamptz
    INTO   v_existing_id, v_existing_amount, v_existing_game_id, v_existing_context
    FROM public.wallet_ledger
    WHERE user_id = v_user_id AND type = 'CASHOUT' AND meta->>'idem_key' = p_idem_key
    LIMIT 1;

    IF v_existing_game_id IS DISTINCT FROM p_game_id OR v_existing_context IS DISTINCT FROM p_context_id THEN
      RAISE EXCEPTION 'Idempotency key context mismatch';
    END IF;

    SELECT balance_cents INTO v_new_balance   FROM public.wallet_balance_cache WHERE user_id = v_user_id;
    SELECT balance_cents INTO v_jackpot_cents FROM public.jackpot_state        WHERE id = 1;
    RETURN jsonb_build_object(
      'streak',               0,
      'pot_cents',            0,
      'wallet_balance_cents', v_new_balance,
      'jackpot_cents',        v_jackpot_cents,
      'cashout_amount_cents', v_existing_amount,
      'played_today',         (v_last_play_date = public.get_current_game_date_for_user(v_user_id)),
      'transaction_id',       v_existing_id,
      'currency',             'EUR',
      'idempotent_replay',    true
    );
  END;

  -- 8. Update wallet balance (only reached for a genuinely new, just-inserted row).
  UPDATE public.wallet_balance_cache
  SET    balance_cents = balance_cents + v_cashout_amount,
         updated_at    = now()
  WHERE  user_id = v_user_id;

  -- 9. Reset streak and pot — unchanged existing rule.
  UPDATE public.game_state
  SET    current_streak = 0,
         pot_cents      = 0,
         updated_at     = now()
  WHERE  user_id = v_user_id;

  SELECT balance_cents  INTO v_new_balance   FROM public.wallet_balance_cache WHERE user_id = v_user_id;
  SELECT balance_cents  INTO v_jackpot_cents FROM public.jackpot_state        WHERE id = 1;

  -- 10. Return the confirmed transaction result.
  RETURN jsonb_build_object(
    'streak',               0,
    'pot_cents',            0,
    'wallet_balance_cents', v_new_balance,
    'jackpot_cents',        v_jackpot_cents,
    'cashout_amount_cents', v_cashout_amount,
    'played_today',         (v_last_play_date = public.get_current_game_date_for_user(v_user_id)),
    'transaction_id',       v_ledger_id,
    'currency',             'EUR',
    'idempotent_replay',    false
  );
END;
$$;

-- Grants unchanged from the previous hardening pass — same signature, so
-- CREATE OR REPLACE preserves them automatically; reasserted explicitly
-- anyway for consistency with how every other cashout_game migration in
-- this project has documented its grants.
REVOKE ALL ON FUNCTION public.cashout_game(text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cashout_game(text, text, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.cashout_game(text, text, timestamptz) TO authenticated;

/*
  ## Rollback
  Re-apply the previous body from
  20260713220000_20260713_cashout_rpc_exposure_hardening.sql verbatim
  (drops the region resolution and `game_time_region_id` meta field,
  restores direct `get_madrid_today()` calls). No ledger row is rewritten
  either way.
*/
