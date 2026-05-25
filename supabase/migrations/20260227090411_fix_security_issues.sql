/*
  # Fix Security Issues

  1. RLS Policy Fixes
    - Replace `auth.uid()` with `(select auth.uid())` in all policies for better performance
    - Remove duplicate SELECT policy on `users` table ("Users can view own data" is redundant with "Users can view own profile")
    - Fix INSERT policy on `users` to check ownership instead of always-true
    - Add SELECT policy to `admin_audit_log` (RLS enabled but no policy)

  2. Index Fixes
    - Add covering index on `idempotency_keys.user_id` for the FK
    - Drop unused indexes to reduce write overhead

  3. Function Search Path Fixes
    - Set `search_path = ''` on all mutable public functions to prevent search_path injection
*/

-- ============================================================
-- 1. DROP OLD RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Users can view own profile"                  ON public.users;
DROP POLICY IF EXISTS "Users can view own data"                     ON public.users;
DROP POLICY IF EXISTS "Users can update own profile"                ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only"  ON public.users;

DROP POLICY IF EXISTS "Users can view own game state"               ON public.game_state;
DROP POLICY IF EXISTS "Users can view own plays"                    ON public.plays;
DROP POLICY IF EXISTS "Users can view own ledger"                   ON public.wallet_ledger;
DROP POLICY IF EXISTS "Users can view own balance"                  ON public.wallet_balance_cache;
DROP POLICY IF EXISTS "Users can view own keys"                     ON public.idempotency_keys;

-- ============================================================
-- 2. RECREATE RLS POLICIES WITH (select auth.uid())
-- ============================================================

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can view own game state"
  ON public.game_state FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view own plays"
  ON public.plays FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view own ledger"
  ON public.wallet_ledger FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view own balance"
  ON public.wallet_balance_cache FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view own keys"
  ON public.idempotency_keys FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Admins can view audit log"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid()) AND status = 'admin'
    )
  );

-- ============================================================
-- 3. INDEX FIXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_user_id
  ON public.idempotency_keys (user_id);

DROP INDEX IF EXISTS public.idx_users_guest_id;
DROP INDEX IF EXISTS public.idx_users_status;
DROP INDEX IF EXISTS public.idx_game_state_streak;
DROP INDEX IF EXISTS public.idx_plays_user_date;
DROP INDEX IF EXISTS public.idx_plays_date;
DROP INDEX IF EXISTS public.idx_plays_outcome;
DROP INDEX IF EXISTS public.idx_wallet_ledger_user;
DROP INDEX IF EXISTS public.idx_games_status;
DROP INDEX IF EXISTS public.idx_idempotency_keys_expires;
DROP INDEX IF EXISTS public.idx_admin_audit_created;

-- ============================================================
-- 4. FIX FUNCTION SEARCH PATHS
-- ============================================================

ALTER FUNCTION public.get_my_state()                            SET search_path = '';
ALTER FUNCTION public.get_madrid_today()                        SET search_path = '';
ALTER FUNCTION public.secure_random_float()                     SET search_path = '';
ALTER FUNCTION public.get_setting(setting_key text)             SET search_path = '';
ALTER FUNCTION public.get_global_leaderboard(p_limit integer)   SET search_path = '';
ALTER FUNCTION public.handle_new_user()                         SET search_path = '';
ALTER FUNCTION public.play_daily_gate(p_tier integer, p_idempotency_key text) SET search_path = '';
ALTER FUNCTION public.cashout_game()                            SET search_path = '';
ALTER FUNCTION public.topup_wallet(p_amount_cents integer, p_idempotency_key text) SET search_path = '';
