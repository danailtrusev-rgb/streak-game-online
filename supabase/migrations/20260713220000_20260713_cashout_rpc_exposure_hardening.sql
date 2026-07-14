/*
  # Cashout RPC Exposure and Overload Hardening

  ## The bypass this closes (confirmed real, not inferred)
  Read the final effective body of `public.cashout_game()` (no-arg)
  directly — its last redefinition is in
  `20260521104759_20260521_security_hardening.sql`. It:
  - Authenticates via `auth.uid()`.
  - Locks the player's `game_state` row and checks `pot_cents = 0`.
  - **Inserts a real `wallet_ledger` row (`type = 'CASHOUT'`).**
  - **Credits `wallet_balance_cache` for real.**
  - **Resets `current_streak`/`pot_cents` to 0.**
  - Returns a full, real success response.
  - **Validates no idempotency key. Validates no cashout context.**
  - Is `SECURITY DEFINER`, and — confirmed by reading the actual GRANT
    statement, not assumed — is explicitly
    `GRANT EXECUTE ... TO authenticated` in the very same migration that
    revoked it from `PUBLIC`/`anon`. `authenticated` was never revoked.

  This means, right now, before this migration: any authenticated Supabase
  client (not just this project's React frontend — any client holding a
  valid session, including a guest session, since guests get real
  `auth.uid()` in this app) can call `supabase.rpc('cashout_game')` with
  **zero arguments** and receive a real payout, completely bypassing every
  idempotency-key and context-validation guarantee built in the last three
  hardening passes. The fact that the current frontend only calls the
  3-argument version is irrelevant — nothing prevented a direct call to
  the old one. This is a real, currently-exploitable gap, not a
  theoretical one.

  ## Internal-dependency check (done before dropping anything)
  Searched every migration for any trigger or PL/pgSQL function that calls
  `cashout_game()` internally — none exists. It has only ever been called
  as a leaf, client-invoked RPC (originally by an older version of this
  project's frontend, before it was superseded by the 2-arg, then 3-arg,
  versions). Safe to drop outright — no legitimate internal dependency
  would break.

  ## Action taken: Option A — drop
  `DROP FUNCTION IF EXISTS public.cashout_game();` No wallet/ledger data
  is touched — this only removes a callable RPC, not any row.

  ## Secure RPC hardening
  1. **Removed all optional defaults.** The previous signature
     (`p_game_id text DEFAULT 'daily_gate', p_idem_key text DEFAULT NULL,
     p_context_id timestamptz DEFAULT NULL`) let a client omit any of the
     three security-relevant arguments and still resolve to this function
     with `NULL`/default values — the function body already rejected
     `NULL` idem_key/context_id defensively, but requiring them at the
     signature level closes the door earlier and removes any ambiguity
     about what a "valid" call looks like. New signature:
     `cashout_game(p_game_id text, p_idem_key text, p_context_id
     timestamptz) RETURNS jsonb` — no defaults on any parameter.
  2. **`CREATE OR REPLACE FUNCTION` is valid here** (not a drop+recreate):
     removing defaults does not change the argument *type* list — Postgres
     identifies overloads by types, not defaults — so the function
     identity remains `cashout_game(text, text, timestamptz)` and grants
     are preserved automatically. Re-declared explicitly anyway
     (`RETURNS jsonb`, `LANGUAGE plpgsql`, `SECURITY DEFINER`) per this
     task's instruction to confirm rather than assume, and grants are also
     explicitly reasserted below as a defensive, unambiguous statement of
     intent, not because `CREATE OR REPLACE` requires it.
  3. **Search path hardened to `SET search_path = ''`** with every object
     reference fully schema-qualified (`public.game_state`,
     `public.wallet_ledger`, `public.wallet_balance_cache`,
     `public.jackpot_state`, `public.get_madrid_today()`, `auth.uid()`).
     The previous version used `SET search_path = public` with unqualified
     references — safe in practice only because nothing untrusted can
     create objects in `public` in this project's threat model, but empty
     search_path + full qualification is the stronger, unambiguous
     guarantee and is what this task asks to prefer. No behaviour change,
     pure hardening.
  4. Logic is otherwise byte-for-byte identical to
     `20260713200000_*.sql`'s validated behaviour (replay requires
     game+context match, new attempts require the current locked context,
     row-lock + zero-pot guard, the same request fingerprint recorded in
     `wallet_ledger.meta`) — this migration does not change any cashout
     *behaviour*, only the signature and hardening.

  ## Frontend compatibility
  No frontend change needed. `useGame().cashout(gameId, idemKey,
  contextId)` already requires all three arguments in its own TypeScript
  signature and already sends all three named parameters
  (`p_game_id`, `p_idem_key`, `p_context_id`) on every call — confirmed by
  reading `src/hooks/useGame.ts` directly. Removing server-side defaults
  changes nothing observable for the only real caller.

  ## Grants (unchanged mechanism, reasserted explicitly)
  ```sql
  REVOKE ALL ON FUNCTION public.cashout_game(text, text, timestamptz) FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.cashout_game(text, text, timestamptz) FROM anon;
  GRANT EXECUTE ON FUNCTION public.cashout_game(text, text, timestamptz) TO authenticated;
  ```
  (Written as separate single-role statements below — some PostgreSQL/
  Supabase-managed environments don't reliably support the combined
  `FROM PUBLIC, anon` form for every grant target; separate statements are
  universally valid.)

  ## Not changed / explicitly out of scope
  `get_my_state()` is untouched. The partial unique index on
  `wallet_ledger` is untouched. No wallet/ledger/game_state row is
  rewritten. No UI, economy, or messaging change.

  ## Rollback
  Re-apply the no-arg `cashout_game()` body from
  `20260521104759_20260521_security_hardening.sql` if the legacy function
  is ever genuinely needed again (it is not expected to be), including its
  `GRANT EXECUTE ... TO authenticated`. Re-apply
  `20260713200000_*.sql`'s 3-arg body (with defaults, `SET search_path =
  public`, unqualified references) to revert the hardening on the secure
  function. No ledger data is touched by either direction.
*/

-- ── Step 1: remove the legacy, unvalidated, financially-mutating bypass ──
-- Confirmed above: no internal dependency, currently granted to
-- `authenticated`, performs a real cashout with zero idempotency/context
-- validation. Must not remain callable.
DROP FUNCTION IF EXISTS public.cashout_game();

-- ── Step 2: harden the secure signature — no defaults, empty search_path,
--    fully-qualified references. Same identity (text, text, timestamptz),
--    so CREATE OR REPLACE is valid and grants carry forward — reasserted
--    explicitly below anyway.
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
      'played_today',         (v_last_play_date = public.get_madrid_today()),
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
    INSERT INTO public.wallet_ledger (user_id, type, amount_cents, meta)
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
      'played_today',         (v_last_play_date = public.get_madrid_today()),
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
    'played_today',         (v_last_play_date = public.get_madrid_today()),
    'transaction_id',       v_ledger_id,
    'currency',             'EUR',
    'idempotent_replay',    false
  );
END;
$$;

-- ── Step 3: reassert grants explicitly (defensive — CREATE OR REPLACE on
--    an unchanged argument-type signature already preserves them) ──────────
REVOKE ALL ON FUNCTION public.cashout_game(text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cashout_game(text, text, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.cashout_game(text, text, timestamptz) TO authenticated;
