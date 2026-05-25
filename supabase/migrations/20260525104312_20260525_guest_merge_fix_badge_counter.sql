/*
  # Fix badge counter accumulation in execute_guest_merge

  GET DIAGNOSTICS inside a loop only captures the last statement's row count.
  Fix: use a separate integer counter that increments conditionally.
*/

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
  v_badge_key          text;
  v_source_play_id     uuid;
  v_rows               integer;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF v_caller_id = p_guest_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'same_user');
  END IF;

  SELECT email INTO v_guest_email
  FROM auth.users
  WHERE id = p_guest_user_id;

  IF v_guest_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'guest_not_found');
  END IF;

  IF v_guest_email NOT LIKE '%@survive.local' THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_a_guest_account');
  END IF;

  -- Idempotency check
  SELECT EXISTS (
    SELECT 1 FROM public.guest_account_merges
    WHERE guest_user_id = p_guest_user_id AND status = 'completed'
  ) INTO v_already_merged;

  IF v_already_merged THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_merged');
  END IF;

  -- ── Wallet merge ──────────────────────────────────────────────────────────
  SELECT COALESCE(balance_cents, 0) INTO v_wallet_cents
  FROM public.wallet_balance_cache
  WHERE user_id = p_guest_user_id;

  IF v_wallet_cents > 0 THEN
    UPDATE public.wallet_balance_cache
    SET balance_cents = 0, updated_at = now()
    WHERE user_id = p_guest_user_id;

    INSERT INTO public.wallet_balance_cache (user_id, balance_cents)
    VALUES (v_caller_id, v_wallet_cents)
    ON CONFLICT (user_id) DO UPDATE
      SET balance_cents = public.wallet_balance_cache.balance_cents + EXCLUDED.balance_cents,
          updated_at    = now();

    INSERT INTO public.wallet_ledger (user_id, type, amount_cents, meta)
    VALUES
      (p_guest_user_id, 'ADMIN_ADJUST', -v_wallet_cents,
       jsonb_build_object('reason', 'guest_merge_debit',  'target_user_id', v_caller_id::text)),
      (v_caller_id,     'ADMIN_ADJUST',  v_wallet_cents,
       jsonb_build_object('reason', 'guest_merge_credit', 'guest_user_id', p_guest_user_id::text));
  END IF;

  -- ── Qualification points merge ────────────────────────────────────────────
  v_week_start := date_trunc('week', now())::date;

  SELECT COALESCE(total_points, 0) INTO v_qual_points
  FROM public.weekly_qualification_status
  WHERE user_id = p_guest_user_id AND week_start_date = v_week_start;

  IF v_qual_points > 0 THEN
    INSERT INTO public.weekly_qualification_status (user_id, week_start_date, total_points)
    VALUES (v_caller_id, v_week_start, v_qual_points)
    ON CONFLICT (user_id, week_start_date) DO UPDATE
      SET total_points = public.weekly_qualification_status.total_points + EXCLUDED.total_points,
          updated_at   = now();

    UPDATE public.weekly_qualification_status
    SET total_points = 0, updated_at = now()
    WHERE user_id = p_guest_user_id AND week_start_date = v_week_start;
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
    INSERT INTO public.user_badges (user_id, badge_key, source_play_id)
    VALUES (v_caller_id, v_badge_key, v_source_play_id)
    ON CONFLICT (user_id, badge_key) DO NOTHING;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_badges_count := v_badges_count + v_rows;
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
  ON CONFLICT (guest_user_id) DO NOTHING;

  RETURN jsonb_build_object(
    'success',                     true,
    'merged_wallet_cents',         v_wallet_cents,
    'merged_qualification_points', v_qual_points,
    'merged_badges_count',         v_badges_count
  );
END;
$$;
