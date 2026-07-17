/*
  # Server-side cashout context validation

  ## The gap this closes (found on forensic audit, not previously caught)
  The "Cashout Idempotency Context Scoping" pass added a `contextId`
  (`game_state.updated_at`) to prevent a stale idempotency key from being
  reused for a *different* eligible pot — but that scoping only ever lived
  in the frontend (`src/lib/cashoutIdempotency.ts`, sessionStorage). The
  server-side `cashout_game(p_game_id text, p_idem_key text)` — confirmed
  by reading its live body directly, not the changelog — never received a
  context parameter at all. Any caller that didn't go through the
  frontend's key-scoping logic (a replayed/crafted request using an old
  key, or simply a future frontend bug) could still trigger a real
  idempotent-replay lookup by `(user_id, idem_key)` alone, with zero
  server-side awareness of which cashout decision that key was ever meant
  for. This migration makes context validation a real, server-enforced
  guarantee instead of a frontend convention.

  ## Legacy overload audit (done before writing anything)
  Three `cashout_game` signatures have existed in this schema's history:
  - `cashout_game()` — legacy, no-arg. Confirmed superseded and untouched
    by every cashout migration so far (including this one) —
    `20260521104759_*.sql`'s own comment calls it "a legacy function...
    superseded by cashout_game(p_game_id, p_idem_key). Both are kept."
    Not touched here either; out of scope.
  - `cashout_game(text, text)` — what the frontend has called until now.
    **This migration DROPS it.** Adding a third parameter of a new type
    (`timestamptz`) does NOT let `CREATE OR REPLACE FUNCTION` update this
    one in place — Postgres identifies overloads by argument type list, so
    a 3-arg version is a genuinely different function object, and the old
    2-arg one would otherwise keep existing (and keep being callable,
    bypassing context validation entirely) unless explicitly removed. Per
    this task's own instruction — "do not leave an older insecure
    frontend-accessible overload... unless explicitly revoked" — dropping
    it is the correct fix, not just revoking it, since nothing should ever
    call the context-blind version again.
  - `cashout_game(text, text, timestamptz)` — new, created here.

  ## New signature
  `cashout_game(p_game_id text DEFAULT 'daily_gate', p_idem_key text
  DEFAULT NULL, p_context_id timestamptz DEFAULT NULL) RETURNS jsonb`

  `p_context_id` is `timestamptz`, not `text` — PostgREST/Supabase coerces
  the JSON value sent by the client, and Postgres then compares it as a
  real timestamp (by absolute instant), not as a string. This is
  immune to cosmetic formatting differences that a naive string
  comparison would be fragile against, and a malformed value is rejected
  by the parameter-binding layer before the function body ever runs — no
  extra validation code needed for "is this a real timestamp."

  ## Server-side validation logic
  1. Authenticate, validate `p_game_id`/`p_idem_key` shape as before.
  2. **New**: reject outright if `p_context_id IS NULL` — a cashout
     decision must always be bound to a specific, known state; a missing
     context can never be treated as "any context is fine."
  3. Lock the game_state row (unchanged — this is still what actually
     prevents concurrent duplicate payouts).
  4. Look up an existing ledger row for `(user_id, idem_key)`.
     - **New**: if found, compare its stored `game_id` AND
       `cashout_context_id` against the current request's values.
       - **Match** → genuine replay. Return the original transaction,
         `idempotent_replay: true`. (Same behaviour as before, now
         actually verified, not assumed.)
       - **Mismatch** → this exact key was used for a *different* game or
         context. Explicitly reject with a distinct, recognizable error
         (`'Idempotency key context mismatch'`) — never returns the old
         transaction as if it belonged to this request, never processes a
         new payout.
  5. No existing row → a genuinely new attempt. **New**: compare
     `p_context_id` against the game_state row's own `updated_at` (the
     value just locked, i.e. what the server itself considers current).
     - **Mismatch** → `'Stale cashout context'` — rejected *before*
       touching the ledger, the wallet, or resetting anything.
     - **Match** → proceed exactly as before (pot-eligibility guard,
       insert, wallet update, reset).

  ## Ledger request fingerprint
  New cashout ledger rows now store `idem_key`, `game_id`, AND
  `cashout_context_id` (ISO 8601, from the `timestamptz` parameter) in
  `meta` — all three are compared on replay lookup, not idem_key alone.
  Historic rows (from before this migration) have no
  `cashout_context_id` and are never rewritten; the replay-lookup query
  only reads it back with `->>'cashout_context_id'`, which is simply
  `NULL` for those rows and cannot accidentally satisfy a match.

  ## Permissions
  `DROP FUNCTION` does NOT carry grants forward (unlike `CREATE OR
  REPLACE FUNCTION` on an unchanged signature) — they are explicitly
  restored below: `REVOKE ... FROM PUBLIC, anon` then
  `GRANT EXECUTE ... TO authenticated`, matching the exact pattern used
  for every other RPC in this schema (`20260521104759_*.sql`).
  `SECURITY DEFINER` and `SET search_path = public` are both re-declared.

  ## Not changed / explicitly out of scope
  No UI redesign, no economy change, no notification/withdrawal features.
  The row-lock + zero-pot guard mechanism, the partial unique index on
  `wallet_ledger`, and the legacy no-arg `cashout_game()` overload are
  all unchanged.

  ## Rollback
  Re-apply `cashout_game(text, text)` from
  20260713140000_20260713_cashout_idempotent_retry.sql (2-arg, no context
  validation) and drop the 3-arg version:
  `DROP FUNCTION IF EXISTS public.cashout_game(text, text, timestamptz);`
  then re-grant the 2-arg one as that migration describes. No ledger data
  is touched either way — historic rows remain valid regardless of which
  function version is active.
*/

-- The old, context-blind 2-arg overload must not remain callable once a
-- context-aware version exists — see "Legacy overload audit" above.
DROP FUNCTION IF EXISTS public.cashout_game(text, text);

CREATE FUNCTION public.cashout_game(
  p_game_id    text DEFAULT 'daily_gate',
  p_idem_key   text DEFAULT NULL,
  p_context_id timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id             uuid;
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

  -- 2. Validate game id, idempotency key, and context shape
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
  FROM   game_state
  WHERE  user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No pot to cash out';
  END IF;

  -- 4. Has this exact (user, idempotency key) already produced a cashout
  --    row? Compare game_id AND context — not idem_key alone.
  SELECT id, amount_cents, meta->>'game_id', (meta->>'cashout_context_id')::timestamptz
  INTO   v_existing_id, v_existing_amount, v_existing_game_id, v_existing_context
  FROM   wallet_ledger
  WHERE  user_id = v_user_id
    AND  type = 'CASHOUT'
    AND  meta->>'idem_key' = p_idem_key
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    IF v_existing_game_id IS DISTINCT FROM p_game_id
       OR v_existing_context IS DISTINCT FROM p_context_id THEN
      -- Same key, but a DIFFERENT game or context — never replay a
      -- transaction that was not actually made for this request, and
      -- never process a new payout for a key that's already spoken for.
      RAISE EXCEPTION 'Idempotency key context mismatch';
    END IF;

    -- Genuine replay: same user, same key, same game, same context.
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

  -- 7. Insert the cashout ledger row — full request fingerprint recorded.
  BEGIN
    INSERT INTO wallet_ledger (user_id, type, amount_cents, meta)
    VALUES (
      v_user_id, 'CASHOUT', v_cashout_amount,
      jsonb_build_object(
        'streak',              v_current_streak,
        'game_id',              p_game_id,
        'idem_key',             p_idem_key,
        'cashout_context_id',   p_context_id,
        'currency',             'EUR'
      )
    )
    RETURNING id INTO v_ledger_id;
  EXCEPTION WHEN unique_violation THEN
    -- Defense in depth: the game_state row lock already makes a same-user
    -- race practically unreachable. If it ever fires, another transaction
    -- won the insert for this exact key first — verify it actually
    -- matches this request's game/context before treating it as a
    -- replay; if it doesn't, this is a genuine conflict, not a replay.
    SELECT id, amount_cents, meta->>'game_id', (meta->>'cashout_context_id')::timestamptz
    INTO   v_existing_id, v_existing_amount, v_existing_game_id, v_existing_context
    FROM wallet_ledger
    WHERE user_id = v_user_id AND type = 'CASHOUT' AND meta->>'idem_key' = p_idem_key
    LIMIT 1;

    IF v_existing_game_id IS DISTINCT FROM p_game_id OR v_existing_context IS DISTINCT FROM p_context_id THEN
      RAISE EXCEPTION 'Idempotency key context mismatch';
    END IF;

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

REVOKE ALL ON FUNCTION public.cashout_game(text, text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cashout_game(text, text, timestamptz) TO authenticated;