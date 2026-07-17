/*
  # Security grants hardening — controlled, per-function audit

  ## Method
  Every SECURITY DEFINER function in the public schema was inspected and
  classified into one of four categories:
  A — player-callable, intentionally authenticated (self-scoped via auth.uid())
  B — internal/service-role only (helpers, schedulers, mutation functions
      accepting arbitrary p_user_id)
  C — admin-only (financial/admin actions via service_role)
  D — risky, needs decision (audited individually below)

  No blanket revoke. Each REVOKE + GRANT below is explicitly justified.

  ## Does NOT change
  - Economy, RTP, wallet balances, probabilities, or game logic
  - Regional Game Time state (stays disabled)
  - Push settings (stay disabled)
  - Cron (stays inactive)
*/

-- ────────────────────────────────────────────────────────────────────────
-- Category C: Admin/financial functions — service_role ONLY
-- ────────────────────────────────────────────────────────────────────────

-- admin_finalize_event: pays real JACKPOT_WIN wallet rewards. Was callable
-- by anon + authenticated via PUBLIC grant. No admin-session RPC path
-- exists for this — it's invoked via service_role from admin tooling.
REVOKE ALL ON FUNCTION public.admin_finalize_event(text, uuid, integer, text, text, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_finalize_event(text, uuid, integer, text, text, uuid, boolean) TO service_role;

-- ────────────────────────────────────────────────────────────────────────
-- Category B: Internal/scheduler functions — service_role ONLY
-- ────────────────────────────────────────────────────────────────────────

-- claim_due_notification_jobs: internal scheduler function, called only
-- from the schedule-reactivation-notifications Edge Function using the
-- service_role key. No player-facing path. Was callable by authenticated.
REVOKE ALL ON FUNCTION public.claim_due_notification_jobs(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_notification_jobs(integer) TO service_role;

-- update_weekly_qualification: accepts arbitrary p_user_id and writes
-- qualification status. Was callable by anon + authenticated via PUBLIC
-- grant — a player could fabricate qualification for any user. Called
-- internally by play_daily_gate (SECURITY DEFINER, owner postgres) which
-- does not need an explicit grant.
REVOKE ALL ON FUNCTION public.update_weekly_qualification(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_weekly_qualification(uuid) TO service_role;

-- ────────────────────────────────────────────────────────────────────────
-- Category D: Risky functions — audited and restricted
-- ────────────────────────────────────────────────────────────────────────

-- topup_wallet: CRITICAL RISK. Credits wallet_ledger directly with NO
-- payment-provider verification. Any authenticated user could add
-- arbitrary funds (up to 1,000,000 cents = $10,000 per call). The
-- frontend useWallet.ts hook calls this, but the hook already handles
-- RPC errors gracefully (sets error state, returns null). Revoking
-- authenticated is the correct fix — the topup button will surface the
-- permission error until a Stripe/payment-provider integration replaces
-- this direct-credit path.
REVOKE ALL ON FUNCTION public.topup_wallet(integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.topup_wallet(integer, text) TO service_role;

-- get_setting: exposes ALL rows in the settings table by key, including
-- sensitive economy/security values: resend_api_key, survival_probability,
-- blended_rtp_target, hard_rtp_cap, fraud_risk_buffer_rate,
-- jackpot_allocation_rate, payment_processing_rate, etc. Was callable by
-- authenticated — any player could read the game's RTP configuration and
-- API keys. Not called from the frontend (confirmed by grep). Restricting
-- to service_role only.
REVOKE ALL ON FUNCTION public.get_setting(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_setting(text) TO service_role;

-- ────────────────────────────────────────────────────────────────────────
-- Category B: Helper functions accepting arbitrary p_user_id
-- These read game-time/region info for any user. Not called from the
-- frontend (confirmed by grep). Called internally by SECURITY DEFINER
-- functions (owner: postgres) which don't need explicit grants.
-- Restricting to service_role prevents information leakage about other
-- users' region assignments and game state.
-- ────────────────────────────────────────────────────────────────────────

-- get_current_game_date_for_user(p_user_id): reads another user's game date
REVOKE ALL ON FUNCTION public.get_current_game_date_for_user(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_game_date_for_user(uuid) TO service_role;

-- get_current_week_start_for_user(p_user_id): reads another user's week start
REVOKE ALL ON FUNCTION public.get_current_week_start_for_user(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_week_start_for_user(uuid) TO service_role;

-- get_game_time_state_for_user(p_user_id): reads another user's full game-time state
REVOKE ALL ON FUNCTION public.get_game_time_state_for_user(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_game_time_state_for_user(uuid) TO service_role;

-- get_saturday_sunday_status_for_user(p_user_id): reads another user's weekend status
REVOKE ALL ON FUNCTION public.get_saturday_sunday_status_for_user(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_saturday_sunday_status_for_user(uuid) TO service_role;

-- get_user_game_time_region_info(p_user_id): reads another user's region assignment details
REVOKE ALL ON FUNCTION public.get_user_game_time_region_info(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_game_time_region_info(uuid) TO service_role;

-- resolve_user_game_time_region(p_user_id): resolves another user's region
REVOKE ALL ON FUNCTION public.resolve_user_game_time_region(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_user_game_time_region(uuid) TO service_role;

-- get_current_week_start(): was callable by anon. No-arg version used
-- internally by SECURITY DEFINER functions. Not called from frontend.
-- Close anon access; keep authenticated for any potential future admin
-- read path, plus service_role.
REVOKE ALL ON FUNCTION public.get_current_week_start() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_week_start() TO authenticated, service_role;

-- get_event_instance_derived_status(p_instance_id): reads event instance
-- status. Not called from frontend. Used internally by admin_finalize_event.
REVOKE ALL ON FUNCTION public.get_event_instance_derived_status(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_instance_derived_status(uuid) TO service_role;

-- ────────────────────────────────────────────────────────────────────────
-- Category D: set_notification_verification_code — KEEP authenticated
-- ────────────────────────────────────────────────────────────────────────
-- Audit: uses auth.uid() for self-scoping. Rate-limited (2 min between
-- sends). Stores a verification code the user chose themselves — this is
-- the existing notification channel verification flow (SMS/email). The
-- code is set by the user and verified by verify_notification_channel.
-- Not a security risk: the user can only set their own code, and the
-- channel must still be verified. NO CHANGE — keep authenticated.

-- ────────────────────────────────────────────────────────────────────────
-- Search path hardening
-- ────────────────────────────────────────────────────────────────────────

-- get_madrid_today: NOT SECURITY DEFINER but has mutable search_path.
-- The audit flagged it. Fix with SET search_path = '' and fully qualify
-- the internal references (already fully qualified in the body).
CREATE OR REPLACE FUNCTION public.get_madrid_today()
RETURNS date
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT ((public.get_game_time_state_for_region(
    (SELECT global_region_id FROM public.game_time_settings WHERE id = true)
  ))->>'game_date')::date;
$$;

REVOKE ALL ON FUNCTION public.get_madrid_today() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_madrid_today() TO authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────
-- Functions with search_path=public (not '') — report only, do not
-- rewrite in this migration unless they're high-risk.
--
-- The following SECURITY DEFINER functions use SET search_path = 'public'
-- instead of the safer SET search_path = '':
--   _upsert_game_progress, _upsert_weekly_qual, award_badge,
--   check_guest_merge_eligibility, execute_guest_merge, get_setting,
--   set_notification_verification_code, topup_wallet
--
-- Of these, the ones still callable by authenticated after this migration
-- are: check_guest_merge_eligibility, execute_guest_merge,
-- set_notification_verification_code.
--
-- These three all use auth.uid() for self-scoping and only reference
-- fully-qualified table names in their bodies, so the mutable search_path
-- is a low-risk warning, not an exploitable vector. They are left as-is
-- in this migration to avoid unnecessary rewrites. A future hardening
-- pass could set search_path = '' on them too.
--
-- topup_wallet and get_setting now have search_path = 'public' but are
-- service_role only after this migration, so the search_path warning is
-- no longer externally exploitable.
-- ────────────────────────────────────────────────────────────────────────

/*
  ## Rollback
  Re-grant the revoked privileges:
  GRANT EXECUTE ON FUNCTION admin_finalize_event(...) TO authenticated;
  GRANT EXECUTE ON FUNCTION claim_due_notification_jobs(integer) TO authenticated;
  GRANT EXECUTE ON FUNCTION update_weekly_qualification(uuid) TO anon, authenticated;
  GRANT EXECUTE ON FUNCTION topup_wallet(integer, text) TO authenticated;
  GRANT EXECUTE ON FUNCTION get_setting(text) TO authenticated;
  GRANT EXECUTE ON FUNCTION get_current_game_date_for_user(uuid) TO authenticated;
  GRANT EXECUTE ON FUNCTION get_current_week_start_for_user(uuid) TO authenticated;
  GRANT EXECUTE ON FUNCTION get_game_time_state_for_user(uuid) TO authenticated;
  GRANT EXECUTE ON FUNCTION get_saturday_sunday_status_for_user(uuid) TO authenticated;
  GRANT EXECUTE ON FUNCTION get_user_game_time_region_info(uuid) TO authenticated;
  GRANT EXECUTE ON FUNCTION resolve_user_game_time_region(uuid) TO authenticated;
  GRANT EXECUTE ON FUNCTION get_current_week_start() TO anon;
  GRANT EXECUTE ON FUNCTION get_event_instance_derived_status(uuid) TO authenticated;
  No data is rewritten — grants only.
*/
