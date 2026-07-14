/*
  # Cashout Experience Phase 2 — enrich cashout_game response

  ## Why
  The Phase 2 cashout UI needs to show a confirmed transaction reference
  and never rely on frontend-only state for "success." The existing
  cashout_game() function (see 20260504072020_*.sql) already does the
  real work correctly — user auth check, a row-locked read of game_state
  (`FOR UPDATE`), a hard `pot_cents = 0` guard, the wallet_ledger insert,
  the wallet_balance_cache update, and the game_state reset, all inside
  one atomic Postgres function. That is what actually prevents duplicate
  payouts today: a second concurrent or repeated call blocks on the row
  lock, then finds pot_cents already 0 and raises 'No pot to cash out'
  rather than paying out twice. This migration does not change that
  mechanism — it only enriches what the function returns and records.

  ## What changes
  1. Returns the real wallet_ledger row id as `transaction_id`, so the
     frontend can show/reference a genuine confirmed transaction rather
     than inventing one client-side.
  2. Returns `currency` explicitly (`'EUR'`, matching the rest of this
     project — no multi-currency support exists anywhere in the schema,
     so this is documentation of the existing implicit currency, not a
     new feature).
  3. Records the caller-supplied `p_idem_key` in the ledger row's `meta`
     for audit/traceability. NOTE: this key is still not used as an
     active deduplication lookup (no unique index / key table was added —
     that would be new economy infrastructure beyond this pass's scope).
     The real duplicate-payout protection remains the row lock + zero-pot
     guard described above; the idem key is audit-trail only until/unless
     a future pass adds a dedicated idempotency-key table.

  ## Safety
  - Purely additive: same signature, same defaults, same core logic and
    locking behaviour as the live function.
  - Does not touch or rewrite any existing wallet_ledger / game_state
    history.
  - Safe to run once; CREATE OR REPLACE is idempotent for the function
    definition itself.

  ## Rollback
  To roll back to the previous response shape, re-apply the function body
  from 20260504072020_20260504_fix_cashout_game_signature_and_search_path.sql
  (drops `transaction_id`/`currency` from the response, drops the idem-key
  meta field). No data migration is needed either way — this only changes
  what a future call returns/records, not any existing row.
*/

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
  v_user_id        uuid;
  v_current_streak integer;
  v_pot_cents      integer;
  v_last_play_date date;
  v_cashout_amount integer;
  v_new_balance    integer;
  v_jackpot_cents  integer;
  v_ledger_id      uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT current_streak, pot_cents, last_play_date
  INTO   v_current_streak, v_pot_cents, v_last_play_date
  FROM   game_state
  WHERE  user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_pot_cents IS NULL OR v_pot_cents = 0 THEN
    RAISE EXCEPTION 'No pot to cash out';
  END IF;

  v_cashout_amount := v_pot_cents;

  INSERT INTO wallet_ledger (user_id, type, amount_cents, meta)
  VALUES (
    v_user_id, 'CASHOUT', v_cashout_amount,
    jsonb_build_object(
      'streak',    v_current_streak,
      'game_id',   p_game_id,
      'idem_key',  p_idem_key,
      'currency',  'EUR'
    )
  )
  RETURNING id INTO v_ledger_id;

  UPDATE wallet_balance_cache
  SET    balance_cents = balance_cents + v_cashout_amount,
         updated_at    = now()
  WHERE  user_id = v_user_id;

  UPDATE game_state
  SET    current_streak = 0,
         pot_cents      = 0,
         updated_at     = now()
  WHERE  user_id = v_user_id;

  SELECT balance_cents  INTO v_new_balance  FROM wallet_balance_cache WHERE user_id = v_user_id;
  SELECT balance_cents  INTO v_jackpot_cents FROM jackpot_state        WHERE id = 1;

  RETURN jsonb_build_object(
    'streak',               0,
    'pot_cents',            0,
    'wallet_balance_cents', v_new_balance,
    'jackpot_cents',        v_jackpot_cents,
    'cashout_amount_cents', v_cashout_amount,
    'played_today',         (v_last_play_date = get_madrid_today()),
    'transaction_id',       v_ledger_id,
    'currency',             'EUR'
  );
END;
$$;
