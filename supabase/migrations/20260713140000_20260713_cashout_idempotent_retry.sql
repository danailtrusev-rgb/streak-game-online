/*
  # Cashout Experience Phase 2 — Idempotency and Migration Hardening

  ## Issue being fixed
  The previous migration (20260713120000_*.sql) started recording
  `p_idem_key` in the ledger row's `meta`, but only for audit — a retried
  request using the same key (after a lost response, a timeout, or an
  explicit "Retry Status" action) still hit the `pot_cents = 0` guard and
  failed, even though the original cashout had already succeeded. The
  player had no way to recover the original confirmed transaction from a
  retry with the same key.

  ## Migration-replacement safety check (done before writing this)
  `cashout_game(p_game_id text DEFAULT 'daily_gate', p_idem_key text
  DEFAULT NULL) RETURNS jsonb` — confirmed via
  `supabase/migrations/20260521104759_20260521_security_hardening.sql`
  that TWO overloads currently exist and are both granted to
  `authenticated`:
    - `cashout_game()` — a legacy no-arg overload, superseded but still
      present. This migration does NOT touch it.
    - `cashout_game(text, text)` — the live one the frontend actually
      calls (`useGame.ts` calls it with named args `p_game_id`,
      `p_idem_key`, which only match this overload's parameter names).
  This migration keeps the exact same parameter names, parameter types,
  defaults, and return type (`jsonb`) as the live `cashout_game(text,
  text)`. PostgreSQL only requires DROP + CREATE when the return type or
  parameter types change — neither changes here, so `CREATE OR REPLACE
  FUNCTION` is valid and will not be rejected. It also has a real
  advantage over DROP + CREATE here: `CREATE OR REPLACE` preserves the
  function's existing GRANTs automatically, so the existing `GRANT EXECUTE
  ... TO authenticated` from the security-hardening migration does not
  need to be (and is not) reissued. `SECURITY DEFINER` and `SET
  search_path = public` are both re-declared explicitly in the new
  definition below, so they carry forward unchanged either way.

  ## What changes
  1. Validates `p_idem_key` (must be a non-empty, UUID-shaped string) and
     `p_game_id` (must be non-empty) before doing anything else — a
     malformed/empty key is rejected outright rather than silently
     accepted.
  2. Looks up an existing CASHOUT ledger row for (user, idem_key) BEFORE
     checking pot eligibility. If found, returns that row's original
     amount/transaction id — the exact same response shape as a fresh
     success, plus `"idempotent_replay": true` so the frontend can tell
     the two apart if it ever needs to (not required, just informative).
     No new ledger row is inserted, no wallet update happens again, and
     — critically — it does NOT matter that pot_cents is now 0, since
     that's the expected, correct state after the original success.
  3. Only falls through to the pot-eligibility guard when no row exists
     for this exact key — i.e. a genuinely new attempt.
  4. Adds a partial unique index on `wallet_ledger (user_id, (meta->>
     'idem_key'))` for `type = 'CASHOUT'` rows where the key is present.
     The `game_state` row lock (`FOR UPDATE`) already serializes
     concurrent requests from the *same* user, which is what actually
     prevents a duplicate payout — this index is defense-in-depth for
     any future code path that might call the insert differently, and
     the function catches `unique_violation` and returns the winning
     transaction's real data rather than erroring or double-crediting.
     Different users may reuse the same random key without conflict
     (the index includes user_id). Existing historic rows (from before
     the previous migration started recording `idem_key`) have no
     `idem_key` in their `meta` and are excluded by the partial `WHERE`
     clause — untouched, not rewritten, not made to conflict with anything.

  ## Not changed / explicitly out of scope
  - No multi-currency support — `currency` remains hardcoded `'EUR'`,
    server-side only; the client never determines it.
  - `p_game_id` still isn't used to scope the `game_state` lookup (that
    table has one row per user, not per game+user) — this predates both
    cashout migrations and is not something this reliability pass
    changes; it's validated for shape only (non-empty).
  - No external withdrawal, KYC, notifications, or new economy logic.

  ## Rollback
  Re-apply the function body from 20260713120000_*.sql to remove the
  idempotent-replay lookup (keeps `transaction_id`/`currency`, drops the
  replay path and validation). Drop the partial index with:
  `DROP INDEX IF EXISTS wallet_ledger_cashout_idem_key_uniq;`
  Neither rollback step touches or rewrites any existing ledger row.
*/

-- Partial unique index — defense-in-depth against a genuine duplicate
-- insert race. Different users can share a key; only CASHOUT rows with a
-- recorded key are constrained; historic rows without one are untouched.
CREATE UNIQUE INDEX IF NOT EXISTS wallet_ledger_cashout_idem_key_uniq
  ON public.wallet_ledger (user_id, (meta->>'idem_key'))
  WHERE type = 'CASHOUT' AND (meta->>'idem_key') IS NOT NULL;

CREATE OR REPLACE FUNCTION public.cashout_game(
  p_game_id  text DEFAULT 'daily_gate',
  p_idem_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id          uuid;
  v_current_streak   integer;
  v_pot_cents        integer;
  v_last_play_date   date;
  v_cashout_amount   integer;
  v_new_balance      integer;
  v_jackpot_cents    integer;
  v_ledger_id        uuid;
  v_existing_id      uuid;
  v_existing_amount  integer;
BEGIN
  -- 1. Authenticate
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Validate game id and idempotency key
  IF p_game_id IS NULL OR btrim(p_game_id) = '' THEN
    RAISE EXCEPTION 'Invalid game id';
  END IF;
  IF p_idem_key IS NULL OR btrim(p_idem_key) = '' THEN
    RAISE EXCEPTION 'Missing idempotency key';
  END IF;
  IF p_idem_key !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RAISE EXCEPTION 'Invalid idempotency key';
  END IF;

  -- 3. Lock the player's game-state row. This is what actually prevents
  --    two concurrent requests (same key or not) from both paying out —
  --    a second transaction blocks here until the first commits.
  SELECT current_streak, pot_cents, last_play_date
  INTO   v_current_streak, v_pot_cents, v_last_play_date
  FROM   game_state
  WHERE  user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No pot to cash out';
  END IF;

  -- 4/5. Has this exact (user, idempotency key) already produced a
  --      cashout row? If so this is a retry — lost response, timeout,
  --      "Retry Status", refresh recovery, two tabs, whatever the cause —
  --      return the ORIGINAL confirmed transaction. Do not insert a
  --      second row. Do not fail because pot_cents is now 0; that is the
  --      correct, expected state after the original success.
  SELECT id, amount_cents
  INTO   v_existing_id, v_existing_amount
  FROM   wallet_ledger
  WHERE  user_id = v_user_id
    AND  type = 'CASHOUT'
    AND  meta->>'idem_key' = p_idem_key
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    SELECT balance_cents INTO v_new_balance   FROM wallet_balance_cache WHERE user_id = v_user_id;
    SELECT balance_cents INTO v_jackpot_cents FROM jackpot_state        WHERE id = 1;
    RETURN jsonb_build_object(
      'streak',               0,
      'pot_cents',            0,
      'wallet_balance_cents', v_new_balance,
      'jackpot_cents',        v_jackpot_cents,
      'cashout_amount_cents', v_existing_amount,
      'played_today',         (v_last_play_date = get_madrid_today()),
      'transaction_id',       v_existing_id,
      'currency',             'EUR',
      'idempotent_replay',    true
    );
  END IF;

  -- 6. No row for this key — a genuinely new attempt. Confirm eligibility.
  IF v_pot_cents IS NULL OR v_pot_cents = 0 THEN
    RAISE EXCEPTION 'No pot to cash out';
  END IF;

  v_cashout_amount := v_pot_cents;

  -- 7. Insert the cashout ledger row with the idempotency key.
  BEGIN
    INSERT INTO wallet_ledger (user_id, type, amount_cents, meta)
    VALUES (
      v_user_id, 'CASHOUT', v_cashout_amount,
      jsonb_build_object(
        'streak',   v_current_streak,
        'game_id',  p_game_id,
        'idem_key', p_idem_key,
        'currency', 'EUR'
      )
    )
    RETURNING id INTO v_ledger_id;
  EXCEPTION WHEN unique_violation THEN
    -- The game_state row lock above already makes this practically
    -- unreachable for a same-user race, but if it ever fires, another
    -- transaction won the insert for this exact key first — return ITS
    -- row rather than erroring or (worse) falling through and crediting
    -- the wallet a second time for a payout that already happened.
    SELECT id, amount_cents INTO v_existing_id, v_existing_amount
    FROM wallet_ledger
    WHERE user_id = v_user_id AND type = 'CASHOUT' AND meta->>'idem_key' = p_idem_key
    LIMIT 1;

    SELECT balance_cents INTO v_new_balance   FROM wallet_balance_cache WHERE user_id = v_user_id;
    SELECT balance_cents INTO v_jackpot_cents FROM jackpot_state        WHERE id = 1;
    RETURN jsonb_build_object(
      'streak',               0,
      'pot_cents',            0,
      'wallet_balance_cents', v_new_balance,
      'jackpot_cents',        v_jackpot_cents,
      'cashout_amount_cents', v_existing_amount,
      'played_today',         (v_last_play_date = get_madrid_today()),
      'transaction_id',       v_existing_id,
      'currency',             'EUR',
      'idempotent_replay',    true
    );
  END;

  -- 8. Update wallet balance (only reached for a genuinely new, just-inserted row).
  UPDATE wallet_balance_cache
  SET    balance_cents = balance_cents + v_cashout_amount,
         updated_at    = now()
  WHERE  user_id = v_user_id;

  -- 9. Reset streak and pot — unchanged existing rule.
  UPDATE game_state
  SET    current_streak = 0,
         pot_cents      = 0,
         updated_at     = now()
  WHERE  user_id = v_user_id;

  SELECT balance_cents  INTO v_new_balance   FROM wallet_balance_cache WHERE user_id = v_user_id;
  SELECT balance_cents  INTO v_jackpot_cents FROM jackpot_state        WHERE id = 1;

  -- 10. Return the confirmed transaction result.
  RETURN jsonb_build_object(
    'streak',               0,
    'pot_cents',            0,
    'wallet_balance_cents', v_new_balance,
    'jackpot_cents',        v_jackpot_cents,
    'cashout_amount_cents', v_cashout_amount,
    'played_today',         (v_last_play_date = get_madrid_today()),
    'transaction_id',       v_ledger_id,
    'currency',             'EUR',
    'idempotent_replay',    false
  );
END;
$$;
