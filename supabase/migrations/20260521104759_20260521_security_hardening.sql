/*
  # Security Hardening — Function Grants, Search Path Fixes, RLS Policy Cleanup

  ## Summary
  Addresses all Supabase security audit warnings:

  1. Revoke anon EXECUTE from all SECURITY DEFINER functions
  2. Fix mutable search_path on handle_new_user, verify_admin_password, update_admin_password
  3. Fix search_path='' on topup_wallet and cashout_game() (no-arg legacy version)
  4. Lock down internal/helper/trigger functions from direct authenticated calls
  5. Lock down admin password functions to service_role only
  6. Lock down update_game_fields to service_role only
  7. Remove unrestricted UPDATE policy on onboarding_slides
  8. Keep EXECUTE for authenticated on all legitimate player-facing RPCs

  ## Classification

  ### A. Player-facing authenticated RPCs — GRANT authenticated, REVOKE anon
  - play_daily_gate, play_daily_dice, play_daily_pick, play_daily_path,
    play_daily_safebox, play_daily_puzzle
  - cashout_game (both signatures)
  - topup_wallet
  - get_my_state, get_global_leaderboard
  - get_my_badges, get_my_notification_prefs, get_my_qualification,
    get_today_game_progress
  - get_or_assign_skull_gate_scene, update_skull_gate_assignment_status
  - enter_weekend_event
  - upsert_notification_channel, set_notification_verification_code,
    verify_notification_channel, toggle_notification_channel

  ### B. Internal helpers — REVOKE anon AND authenticated
  - _upsert_game_progress, _upsert_weekly_qual
  - award_badge (called only from trigger)
  - evaluate_badges_after_play (trigger function)
  - update_skull_gate_scenes_updated_at (trigger function)
  - rls_auto_enable (internal utility)
  - secure_random_float (called only from other SECURITY DEFINER functions)

  ### C. Admin-only — REVOKE anon AND authenticated, keep service_role
  - verify_admin_password, update_admin_password
  - update_game_fields

  ### D. Public read-only — GRANT authenticated, REVOKE anon
  - get_setting (used by server-side RPCs, not directly by frontend)

  ## Notes
  1. get_setting is called internally by play_daily_puzzle and other SECURITY DEFINER
     functions; it does not need to be callable by the client directly, so we revoke
     anon. Authenticated access kept because some internal RPCs call it.
  2. update_game_fields is admin-only via service role edge function — revoke all direct.
  3. Admin edge function uses service_role key, so service_role keeps EXECUTE implicitly.
  4. Trigger functions (handle_new_user, evaluate_badges_after_play,
     update_skull_gate_scenes_updated_at) are only invoked by the trigger mechanism,
     not directly. We revoke anon and authenticated; postgres/service_role retain access
     through ownership.
  5. The no-arg cashout_game() is a legacy function that is superseded by
     cashout_game(p_game_id, p_idem_key). Both are kept but legacy one gets search_path fix.
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1: REVOKE anon FROM ALL SECURITY DEFINER FUNCTIONS
-- The =X/postgres entry in ACL grants EXECUTE to PUBLIC (which includes anon).
-- We revoke from PUBLIC explicitly, then re-grant to specific roles as needed.
-- ═══════════════════════════════════════════════════════════════════════════

-- Player-facing game RPCs
REVOKE EXECUTE ON FUNCTION public.play_daily_gate(integer, text)              FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.play_daily_dice(text)                       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.play_daily_pick(text, integer)              FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.play_daily_path(text, integer)              FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.play_daily_safebox(text, integer)           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.play_daily_puzzle(text, text)               FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cashout_game()                              FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cashout_game(text, text)                    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.topup_wallet(integer, text)                 FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.enter_weekend_event(text)                   FROM PUBLIC, anon;

-- Player state / read RPCs
REVOKE EXECUTE ON FUNCTION public.get_my_state()                              FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_global_leaderboard(integer)             FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_badges()                             FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_notification_prefs()                 FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_qualification()                      FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_today_game_progress()                   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_setting(text)                           FROM PUBLIC, anon;

-- Skull gate assignment
REVOKE EXECUTE ON FUNCTION public.get_or_assign_skull_gate_scene()            FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_skull_gate_assignment_status(text, text) FROM PUBLIC, anon;

-- Notification preference functions
REVOKE EXECUTE ON FUNCTION public.upsert_notification_channel(text, text)     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_notification_verification_code(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.verify_notification_channel(text, text)     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.toggle_notification_channel(text, boolean)  FROM PUBLIC, anon;

-- Internal helpers
REVOKE EXECUTE ON FUNCTION public._upsert_game_progress(uuid, text, boolean, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public._upsert_weekly_qual(uuid, integer, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.award_badge(uuid, text, uuid)               FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.secure_random_float()                       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()                           FROM PUBLIC, anon;

-- Trigger functions (not directly callable anyway, but revoke for hygiene)
REVOKE EXECUTE ON FUNCTION public.evaluate_badges_after_play()                FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_skull_gate_scenes_updated_at()       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                           FROM PUBLIC, anon;

-- Admin-only functions
REVOKE EXECUTE ON FUNCTION public.verify_admin_password(text, text)           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_admin_password(text, text)           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_game_fields(text, text, text, integer, integer, integer, boolean) FROM PUBLIC, anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2: REVOKE authenticated FROM INTERNAL / ADMIN-ONLY FUNCTIONS
-- These should never be called directly from the frontend client.
-- ═══════════════════════════════════════════════════════════════════════════

-- Internal helpers (only called from other SECURITY DEFINER functions / triggers)
REVOKE EXECUTE ON FUNCTION public._upsert_game_progress(uuid, text, boolean, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public._upsert_weekly_qual(uuid, integer, boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.award_badge(uuid, text, uuid)               FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.secure_random_float()                       FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()                           FROM authenticated;

-- Trigger functions (never directly called from client)
REVOKE EXECUTE ON FUNCTION public.evaluate_badges_after_play()                FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_skull_gate_scenes_updated_at()       FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                           FROM authenticated;

-- Admin-only functions (called via service_role edge function, not from client)
REVOKE EXECUTE ON FUNCTION public.verify_admin_password(text, text)           FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_admin_password(text, text)           FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_game_fields(text, text, text, integer, integer, integer, boolean) FROM authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 3: ENSURE authenticated STILL HAS EXECUTE ON ALL PLAYER-FACING RPCS
-- (Explicit grants in case the revoke above touched them via PUBLIC cascade)
-- ═══════════════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION public.play_daily_gate(integer, text)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.play_daily_dice(text)                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.play_daily_pick(text, integer)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.play_daily_path(text, integer)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.play_daily_safebox(text, integer)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.play_daily_puzzle(text, text)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.cashout_game()                               TO authenticated;
GRANT EXECUTE ON FUNCTION public.cashout_game(text, text)                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.topup_wallet(integer, text)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.enter_weekend_event(text)                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_state()                               TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_global_leaderboard(integer)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_badges()                              TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_notification_prefs()                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_qualification()                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_today_game_progress()                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_assign_skull_gate_scene()             TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_skull_gate_assignment_status(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_notification_channel(text, text)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_notification_verification_code(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_notification_channel(text, text)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_notification_channel(text, boolean)   TO authenticated;

-- get_setting: kept for authenticated (internally used by puzzle RPC via SECURITY DEFINER chain)
GRANT EXECUTE ON FUNCTION public.get_setting(text)                            TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 4: FIX MUTABLE SEARCH_PATH
-- Functions flagged by the audit for missing or mutable search_path
-- ═══════════════════════════════════════════════════════════════════════════

-- Fix handle_new_user — currently has no search_path config at all
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_id uuid;
BEGIN
  v_guest_id := (new.raw_user_meta_data->>'guest_id')::uuid;

  INSERT INTO public.users (id, guest_id, status)
  VALUES (new.id, v_guest_id, 'active');

  RETURN new;
END;
$$;

-- Fix verify_admin_password — no search_path; uses unqualified admin_credentials and extensions.*
CREATE OR REPLACE FUNCTION public.verify_admin_password(
  p_username text,
  p_password text
)
RETURNS TABLE(valid boolean, must_change_password boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash         text;
  v_must_change  boolean;
BEGIN
  SELECT password_hash, ac.must_change_password
  INTO   v_hash, v_must_change
  FROM   public.admin_credentials ac
  WHERE  ac.username = p_username;

  IF v_hash IS NULL THEN
    RETURN QUERY SELECT false::boolean, false::boolean;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    (extensions.crypt(p_password, v_hash) = v_hash),
    v_must_change;
END;
$$;

-- Fix update_admin_password — no search_path; uses unqualified admin_credentials and extensions.*
CREATE OR REPLACE FUNCTION public.update_admin_password(
  p_username    text,
  p_new_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE public.admin_credentials
  SET
    password_hash        = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
    must_change_password = false,
    updated_at           = now()
  WHERE username = p_username;
END;
$$;

-- Fix topup_wallet — has search_path='' but uses unqualified table names
-- Upgrade to explicit search_path = public
CREATE OR REPLACE FUNCTION public.topup_wallet(
  p_amount_cents    integer,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid;
  v_new_balance integer;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF p_amount_cents > 1000000 THEN
    RAISE EXCEPTION 'Amount exceeds maximum';
  END IF;

  -- Idempotency check
  IF EXISTS (
    SELECT 1 FROM public.idempotency_keys
    WHERE key = p_idempotency_key AND user_id = v_user_id
  ) THEN
    -- Return current balance (idempotent response)
    SELECT balance_cents INTO v_new_balance
    FROM public.wallet_balance_cache
    WHERE user_id = v_user_id;
    RETURN jsonb_build_object(
      'balance_cents',     v_new_balance,
      'topup_amount_cents', p_amount_cents
    );
  END IF;

  INSERT INTO public.idempotency_keys (key, user_id, expires_at)
  VALUES (p_idempotency_key, v_user_id, now() + interval '24 hours');

  INSERT INTO public.wallet_ledger (user_id, type, amount_cents, meta)
  VALUES (v_user_id, 'TOPUP', p_amount_cents, '{}');

  UPDATE public.wallet_balance_cache
  SET balance_cents = balance_cents + p_amount_cents,
      updated_at    = now()
  WHERE user_id = v_user_id;

  SELECT balance_cents INTO v_new_balance
  FROM public.wallet_balance_cache
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'balance_cents',     v_new_balance,
    'topup_amount_cents', p_amount_cents
  );
END;
$$;

-- Fix cashout_game() no-arg legacy — has search_path='' but uses unqualified references
-- This is the old no-arg version. Fix its search_path to prevent runtime failures.
CREATE OR REPLACE FUNCTION public.cashout_game()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        uuid;
  v_game_record    public.game_state;
  v_cashout_amount integer;
  v_new_balance    integer;
  v_jackpot_cents  integer;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_game_record
  FROM public.game_state
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_game_record.pot_cents = 0 THEN
    RAISE EXCEPTION 'No pot to cash out';
  END IF;

  v_cashout_amount := v_game_record.pot_cents;

  INSERT INTO public.wallet_ledger (user_id, type, amount_cents, meta)
  VALUES (v_user_id, 'CASHOUT', v_cashout_amount,
          jsonb_build_object('streak', v_game_record.current_streak));

  UPDATE public.wallet_balance_cache
  SET balance_cents = balance_cents + v_cashout_amount,
      updated_at    = now()
  WHERE user_id = v_user_id;

  UPDATE public.game_state
  SET current_streak = 0,
      pot_cents      = 0,
      updated_at     = now()
  WHERE user_id = v_user_id;

  SELECT balance_cents INTO v_new_balance
  FROM public.wallet_balance_cache
  WHERE user_id = v_user_id;

  SELECT balance_cents INTO v_jackpot_cents
  FROM public.jackpot_state
  WHERE id = 1;

  RETURN jsonb_build_object(
    'streak',               0,
    'pot_cents',            0,
    'wallet_balance_cents', v_new_balance,
    'jackpot_cents',        v_jackpot_cents,
    'cashout_amount_cents', v_cashout_amount,
    'played_today',         (v_game_record.last_play_date = public.get_madrid_today())
  );
END;
$$;

-- Re-apply grants after function recreation (CREATE OR REPLACE resets ACL to owner-only)
GRANT EXECUTE ON FUNCTION public.handle_new_user()                            TO postgres;
-- handle_new_user is trigger-only; no grant to authenticated or anon

GRANT EXECUTE ON FUNCTION public.topup_wallet(integer, text)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.cashout_game()                               TO authenticated;
-- verify/update admin password: service_role only (implicit via ownership for edge function)
-- No GRANT needed — service_role runs as superuser equivalent for edge functions

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 5: FIX onboarding_slides RLS — remove unrestricted UPDATE policy
-- Players should read slides (for the onboarding modal) but NOT update them.
-- Admin updates go through the service_role edge function (no client policy needed).
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Authenticated users can update slides" ON public.onboarding_slides;

-- The two SELECT policies remain:
-- "Authenticated users can read active slides"  (USING is_active = true)
-- "Authenticated users can read all slides"     (USING true)
-- These allow the player app to load onboarding slides for display.
-- Admin uses service_role for INSERT/UPDATE/DELETE — no additional policy needed.
