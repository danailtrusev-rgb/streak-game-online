/*
  # Guest Account Merge System

  ## Purpose
  Enables safe merging of eligible guest progress into an existing authenticated account
  after a player logs in. Prevents duplicate merges and ensures only the authenticated
  caller can initiate a merge.

  ## New Tables
  - `guest_account_merges`
    - `id` (uuid, primary key)
    - `guest_user_id` (uuid) — the @survive.local guest whose progress is being merged
    - `target_user_id` (uuid) — the logged-in account receiving the progress
    - `merged_wallet_cents` (int) — amount transferred from guest wallet
    - `merged_qualification_points` (int) — points transferred this week
    - `merged_badges_count` (int) — number of badges carried over
    - `status` ('completed' | 'failed') — outcome of the merge operation
    - `created_at` (timestamptz)
    - `completed_at` (timestamptz)
    - UNIQUE constraint on `guest_user_id` — each guest can only be merged once

  ## New RPCs
  - `check_guest_merge_eligibility(p_guest_user_id uuid)`
    Returns: { eligible, wallet_cents, qualification_points, badges_count, reason }
    Verifies the guest exists, is a @survive.local account, and has not been merged.

  - `execute_guest_merge(p_guest_user_id uuid)`
    Performs the merge atomically:
    - Verifies eligibility
    - Transfers wallet balance
    - Transfers current-week qualification points
    - Copies earned badges (skips duplicates)
    - Marks guest as merged
    - Does NOT touch streak, pot, played_today, or jackpot

  ## Security
  - Both RPCs run as SECURITY DEFINER to access all necessary tables
  - Both require auth.uid() to be present (authenticated caller)
  - Guest must end in @survive.local
  - Guest must not equal caller
  - Merge is idempotent — the unique constraint on guest_user_id prevents doubles
  - RLS enabled on guest_account_merges; callers can read their own records
*/

-- ── guest_account_merges table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.guest_account_merges (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_user_id               uuid NOT NULL,
  target_user_id              uuid NOT NULL,
  merged_wallet_cents         integer NOT NULL DEFAULT 0,
  merged_qualification_points integer NOT NULL DEFAULT 0,
  merged_badges_count         integer NOT NULL DEFAULT 0,
  status                      text NOT NULL DEFAULT 'completed',
  created_at                  timestamptz NOT NULL DEFAULT now(),
  completed_at                timestamptz,

  CONSTRAINT guest_account_merges_guest_unique UNIQUE (guest_user_id),
  CONSTRAINT guest_account_merges_status_check CHECK (status IN ('completed', 'failed'))
);

ALTER TABLE public.guest_account_merges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Target user can view own merge records"
  ON public.guest_account_merges
  FOR SELECT
  TO authenticated
  USING (auth.uid() = target_user_id);

-- ── check_guest_merge_eligibility ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_guest_merge_eligibility(
  p_guest_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id          uuid;
  v_guest_email        text;
  v_already_merged     boolean;
  v_wallet_cents       integer := 0;
  v_qual_points        integer := 0;
  v_badges_count       integer := 0;
  v_week_start         date;
BEGIN
  -- Must be authenticated
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'not_authenticated');
  END IF;

  -- Must not be merging into self
  IF v_caller_id = p_guest_user_id THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'same_user');
  END IF;

  -- Verify guest user exists and is a @survive.local guest account
  SELECT email INTO v_guest_email
  FROM auth.users
  WHERE id = p_guest_user_id;

  IF v_guest_email IS NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'guest_not_found');
  END IF;

  IF v_guest_email NOT LIKE '%@survive.local' THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'not_a_guest_account');
  END IF;

  -- Check if already merged
  SELECT EXISTS (
    SELECT 1 FROM public.guest_account_merges
    WHERE guest_user_id = p_guest_user_id AND status = 'completed'
  ) INTO v_already_merged;

  IF v_already_merged THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'already_merged');
  END IF;

  -- Get guest wallet balance
  SELECT COALESCE(balance_cents, 0) INTO v_wallet_cents
  FROM public.wallets
  WHERE user_id = p_guest_user_id;

  -- Get guest current-week qualification points
  v_week_start := date_trunc('week', now())::date;
  SELECT COALESCE(total_points, 0) INTO v_qual_points
  FROM public.qualification_progress
  WHERE user_id = p_guest_user_id
    AND week_start = v_week_start;

  -- Count guest badges earned through real play records
  SELECT COUNT(*) INTO v_badges_count
  FROM public.user_badges ub
  WHERE ub.user_id = p_guest_user_id
    AND (
      ub.source_play_id IS NULL  -- prestige/streak badges may not have play id
      OR EXISTS (
        SELECT 1 FROM public.plays p
        WHERE p.id = ub.source_play_id AND p.user_id = p_guest_user_id
      )
    );

  RETURN jsonb_build_object(
    'eligible',               true,
    'wallet_cents',           v_wallet_cents,
    'qualification_points',   v_qual_points,
    'badges_count',           v_badges_count,
    'reason',                 'eligible'
  );
END;
$$;

-- ── execute_guest_merge ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.execute_guest_merge(
  p_guest_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id          uuid;
  v_guest_email        text;
  v_already_merged     boolean;
  v_wallet_cents       integer := 0;
  v_qual_points        integer := 0;
  v_badges_count       integer := 0;
  v_week_start         date;
  v_merge_id           uuid;
  v_badge_key          text;
  v_source_play_id     uuid;
BEGIN
  -- Must be authenticated
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Must not merge into self
  IF v_caller_id = p_guest_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'same_user');
  END IF;

  -- Verify guest is a @survive.local account
  SELECT email INTO v_guest_email
  FROM auth.users
  WHERE id = p_guest_user_id
  FOR UPDATE;  -- row lock to prevent concurrent merges

  IF v_guest_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'guest_not_found');
  END IF;

  IF v_guest_email NOT LIKE '%@survive.local' THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_a_guest_account');
  END IF;

  -- Idempotency check with lock
  SELECT EXISTS (
    SELECT 1 FROM public.guest_account_merges
    WHERE guest_user_id = p_guest_user_id AND status = 'completed'
    FOR UPDATE
  ) INTO v_already_merged;

  IF v_already_merged THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_merged');
  END IF;

  -- ── Wallet merge ──────────────────────────────────────────────────────────
  SELECT COALESCE(balance_cents, 0) INTO v_wallet_cents
  FROM public.wallets
  WHERE user_id = p_guest_user_id;

  IF v_wallet_cents > 0 THEN
    -- Debit guest wallet
    UPDATE public.wallets
    SET balance_cents = 0
    WHERE user_id = p_guest_user_id;

    -- Credit target wallet
    INSERT INTO public.wallets (user_id, balance_cents)
    VALUES (v_caller_id, v_wallet_cents)
    ON CONFLICT (user_id) DO UPDATE
      SET balance_cents = public.wallets.balance_cents + EXCLUDED.balance_cents;

    -- Log wallet entries
    INSERT INTO public.wallet_entries (user_id, type, amount_cents, meta)
    VALUES
      (p_guest_user_id, 'ADMIN_ADJUST', -v_wallet_cents, jsonb_build_object('reason', 'guest_merge_debit', 'target_user_id', v_caller_id)),
      (v_caller_id,     'ADMIN_ADJUST',  v_wallet_cents, jsonb_build_object('reason', 'guest_merge_credit', 'guest_user_id', p_guest_user_id));
  END IF;

  -- ── Qualification points merge ────────────────────────────────────────────
  v_week_start := date_trunc('week', now())::date;

  SELECT COALESCE(total_points, 0) INTO v_qual_points
  FROM public.qualification_progress
  WHERE user_id = p_guest_user_id AND week_start = v_week_start;

  IF v_qual_points > 0 THEN
    -- Add points to target (upsert, preserve existing points)
    INSERT INTO public.qualification_progress (user_id, week_start, total_points)
    VALUES (v_caller_id, v_week_start, v_qual_points)
    ON CONFLICT (user_id, week_start) DO UPDATE
      SET total_points = public.qualification_progress.total_points + EXCLUDED.total_points;

    -- Zero out guest points
    UPDATE public.qualification_progress
    SET total_points = 0
    WHERE user_id = p_guest_user_id AND week_start = v_week_start;
  END IF;

  -- ── Badge merge ───────────────────────────────────────────────────────────
  v_badges_count := 0;

  FOR v_badge_key, v_source_play_id IN
    SELECT ub.badge_key, ub.source_play_id
    FROM public.user_badges ub
    WHERE ub.user_id = p_guest_user_id
      AND (
        ub.source_play_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.plays p
          WHERE p.id = ub.source_play_id AND p.user_id = p_guest_user_id
        )
      )
  LOOP
    -- Only insert if target does not already have this badge
    INSERT INTO public.user_badges (user_id, badge_key, source_play_id)
    VALUES (v_caller_id, v_badge_key, v_source_play_id)
    ON CONFLICT (user_id, badge_key) DO NOTHING;

    IF FOUND THEN
      v_badges_count := v_badges_count + 1;
    END IF;
  END LOOP;

  -- ── Record merge ─────────────────────────────────────────────────────────
  INSERT INTO public.guest_account_merges (
    guest_user_id,
    target_user_id,
    merged_wallet_cents,
    merged_qualification_points,
    merged_badges_count,
    status,
    completed_at
  )
  VALUES (
    p_guest_user_id,
    v_caller_id,
    v_wallet_cents,
    v_qual_points,
    v_badges_count,
    'completed',
    now()
  )
  ON CONFLICT (guest_user_id) DO NOTHING;  -- idempotency guard

  RETURN jsonb_build_object(
    'success',                  true,
    'merged_wallet_cents',      v_wallet_cents,
    'merged_qualification_points', v_qual_points,
    'merged_badges_count',      v_badges_count
  );
END;
$$;
