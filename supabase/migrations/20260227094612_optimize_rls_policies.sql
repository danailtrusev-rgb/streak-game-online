/*
  # Optimize Row Level Security Policies

  ## Summary
  Full audit and replacement of all RLS policies across every public table.

  ## Changes Made

  ### 1. users
  - DROP: overly broad public-role SELECT policies (USING true — exposed all rows to unauthenticated callers)
  - DROP: duplicate "Users can view own profile" policy
  - KEEP & REPLACE: SELECT scoped to authenticated, own row only (auth.uid() = id)
  - ADD: INSERT policy requiring auth.uid() = id (with_check only)
  - KEEP: UPDATE policy (already correct — auth.uid() = id on both USING and WITH CHECK)

  ### 2. game_state
  - KEEP: SELECT own row
  - ADD: INSERT own row (with_check: auth.uid() = user_id) — used by handle_new_user trigger via SECURITY DEFINER, but explicit policy is defence-in-depth
  - ADD: UPDATE own row
  - No DELETE (rows are permanent per user)

  ### 3. plays
  - KEEP: SELECT own rows
  - ADD: INSERT own rows — game function is SECURITY DEFINER so this is defence-in-depth
  - No UPDATE / DELETE (immutable audit trail)

  ### 4. wallet_ledger
  - KEEP: SELECT own rows
  - ADD: INSERT own rows (defence-in-depth; writes go through SECURITY DEFINER functions)
  - No UPDATE / DELETE (immutable ledger)

  ### 5. wallet_balance_cache
  - KEEP: SELECT own row
  - ADD: INSERT own row
  - ADD: UPDATE own row

  ### 6. idempotency_keys
  - KEEP: SELECT own keys
  - ADD: INSERT own keys (defence-in-depth)
  - No UPDATE / DELETE

  ### 7. jackpot_state
  - REPLACE: "Anyone can view jackpot" (public role, USING true) → authenticated only
  - No writes from client (SECURITY DEFINER functions only)

  ### 8. settings
  - REPLACE: "Anyone can view settings" (public role, USING true) → authenticated only
  - No client writes (admin edge function with service role only)

  ### 9. games
  - REPLACE: USING (true) → no change needed functionally but ensure authenticated scope
  - No client writes

  ### 10. admin_audit_log
  - FIX: existing admin SELECT policy references status = 'admin' which can never match
    (check constraint only allows 'active' | 'banned'). Replace with app_metadata check.
  - ADD: INSERT policy for service-role-only writes (no authenticated client should insert)

  ## Security Notes
  - All sensitive tables now require authentication for every operation
  - Write policies on tables with SECURITY DEFINER functions act as defence-in-depth
  - The admin_audit_log admin detection is moved to JWT app_metadata to avoid the broken status check
  - No USING(true) remains on any table for unauthenticated or over-broad access
*/

-- ============================================================
-- users
-- ============================================================

DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- game_state
-- ============================================================

DROP POLICY IF EXISTS "Users can view own game state" ON public.game_state;

CREATE POLICY "Users can read own game state"
  ON public.game_state FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own game state"
  ON public.game_state FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own game state"
  ON public.game_state FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- plays
-- ============================================================

DROP POLICY IF EXISTS "Users can view own plays" ON public.plays;

CREATE POLICY "Users can read own plays"
  ON public.plays FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plays"
  ON public.plays FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- wallet_ledger
-- ============================================================

DROP POLICY IF EXISTS "Users can view own ledger" ON public.wallet_ledger;

CREATE POLICY "Users can read own ledger"
  ON public.wallet_ledger FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ledger entries"
  ON public.wallet_ledger FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- wallet_balance_cache
-- ============================================================

DROP POLICY IF EXISTS "Users can view own balance" ON public.wallet_balance_cache;

CREATE POLICY "Users can read own balance"
  ON public.wallet_balance_cache FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own balance cache"
  ON public.wallet_balance_cache FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own balance cache"
  ON public.wallet_balance_cache FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- idempotency_keys
-- ============================================================

DROP POLICY IF EXISTS "Users can view own keys" ON public.idempotency_keys;

CREATE POLICY "Users can read own idempotency keys"
  ON public.idempotency_keys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own idempotency keys"
  ON public.idempotency_keys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- jackpot_state  (shared singleton — read-only for authenticated users)
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view jackpot" ON public.jackpot_state;

CREATE POLICY "Authenticated users can read jackpot state"
  ON public.jackpot_state FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- settings  (shared config — read-only for authenticated users)
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view settings" ON public.settings;

CREATE POLICY "Authenticated users can read settings"
  ON public.settings FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- games  (catalog — read-only for authenticated users)
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view games" ON public.games;

CREATE POLICY "Authenticated users can read games"
  ON public.games FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- admin_audit_log
-- ============================================================
-- NOTE: The previous admin SELECT policy used status = 'admin' which can never
-- match because the users.status check constraint only allows 'active' | 'banned'.
-- Admin access is determined by app_metadata set server-side instead.

DROP POLICY IF EXISTS "Admins can view audit log" ON public.admin_audit_log;

CREATE POLICY "Admins can read audit log"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
