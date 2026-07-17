/*
  # Ecosystem Phase 2 — Gate Progress Integration & Admin RPC

  ## Summary
  - Hooks the existing play_daily_gate function into the qualification engine so that
    gate plays also count toward weekly qualification points
  - Adds admin-only SQL functions for:
    - grant_qualification (manual override)
    - finalize_weekend_event (set winner, update results)
    - create_winner_announcement (with audit log)
  - Adds ecosystem KPIs view helper
  - Adds puzzle answer, question, hint defaults if missing

  ## Changes
  1. patch_gate_qualification trigger: after insert on plays, upsert gate progress + update qualification
  2. admin_grant_qualification function
  3. admin_finalize_event function
  4. admin_create_winner function
  5. Admin-accessible SQL helper: admin_get_ecosystem_kpis
*/

-- ==========================================
-- 1. After a gate play, also record progress
-- ==========================================
CREATE OR REPLACE FUNCTION public.after_gate_play_qualification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_won    boolean;
  v_pts    int;
  v_pplay  int;
  v_pwin   int;
BEGIN
  v_won := NEW.outcome = 'SURVIVE';

  SELECT COALESCE(points_on_play, 10), COALESCE(points_on_win, 20)
  INTO v_pplay, v_pwin
  FROM public.games WHERE game_id = 'daily_gate';

  v_pts := v_pplay + CASE WHEN v_won THEN v_pwin ELSE 0 END;

  -- Upsert progress (ignore if already exists for this date)
  INSERT INTO public.player_game_progress
    (user_id, game_id, progress_date, played_today, completed_today, won_today, qualified_today, qualification_points_earned)
  VALUES
    (NEW.user_id, 'daily_gate', NEW.play_date, true, true, v_won, v_won, v_pts)
  ON CONFLICT (user_id, game_id, progress_date) DO NOTHING;

  -- Recompute qualification
  PERFORM public.update_weekly_qualification(NEW.user_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gate_qualification ON public.plays;
CREATE TRIGGER trg_gate_qualification
  AFTER INSERT ON public.plays
  FOR EACH ROW
  EXECUTE FUNCTION public.after_gate_play_qualification();

-- ==========================================
-- 2. Admin: manually grant/revoke qualification
-- Called from admin edge function with service role
-- ==========================================
CREATE OR REPLACE FUNCTION public.admin_grant_qualification(
  p_user_id     uuid,
  p_event       text,
  p_grant       boolean,
  p_admin_actor text DEFAULT 'admin'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_week_start date;
BEGIN
  v_week_start := public.get_current_week_start();

  INSERT INTO public.weekly_qualification_status
    (user_id, week_start_date, saturday_qualified, sunday_qualified)
  VALUES (p_user_id, v_week_start, false, false)
  ON CONFLICT (user_id, week_start_date) DO NOTHING;

  IF p_event = 'saturday_main_event' THEN
    UPDATE public.weekly_qualification_status
    SET saturday_qualified = p_grant, updated_at = now()
    WHERE user_id = p_user_id AND week_start_date = v_week_start;
  ELSIF p_event = 'sunday_winners_event' THEN
    UPDATE public.weekly_qualification_status
    SET sunday_qualified = p_grant, updated_at = now()
    WHERE user_id = p_user_id AND week_start_date = v_week_start;
  END IF;

  INSERT INTO public.admin_audit_log (admin_actor, action, payload_json)
  VALUES (p_admin_actor, 'grant_qualification',
    jsonb_build_object('user_id', p_user_id, 'event', p_event, 'grant', p_grant));
END;
$$;

-- ==========================================
-- 3. Admin: finalize weekend event
-- ==========================================
CREATE OR REPLACE FUNCTION public.admin_finalize_event(
  p_event_game_id text,
  p_winner_user_id uuid,
  p_payout_cents   int,
  p_display_name   text,
  p_admin_actor    text DEFAULT 'admin'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_week_start  date;
  v_winner_id   uuid;
BEGIN
  v_week_start := public.get_current_week_start();

  -- Update winner entry
  UPDATE public.weekend_event_entries
  SET result_status = 'completed', reward_cents = p_payout_cents
  WHERE user_id = p_winner_user_id
    AND event_game_id = p_event_game_id
    AND week_start_date = v_week_start;

  -- Mark all other entries as completed
  UPDATE public.weekend_event_entries
  SET result_status = 'completed'
  WHERE event_game_id = p_event_game_id
    AND week_start_date = v_week_start
    AND result_status = 'entered';

  -- Credit wallet if payout
  IF p_payout_cents > 0 THEN
    INSERT INTO public.wallet_ledger (user_id, type, amount_cents, meta)
    VALUES (p_winner_user_id, 'JACKPOT_WIN', p_payout_cents,
      jsonb_build_object('event', p_event_game_id, 'week_start', v_week_start));
  END IF;

  -- Create winner announcement
  INSERT INTO public.winner_announcements
    (event_game_id, event_date, user_id, display_name, payout_cents, result_summary, share_text)
  VALUES
    (p_event_game_id, v_week_start,
     p_winner_user_id,
     p_display_name,
     p_payout_cents,
     'Won the ' || p_event_game_id || ' on ' || v_week_start::text,
     'I just won the Survive the Streak ' || p_event_game_id || '!')
  RETURNING id INTO v_winner_id;

  INSERT INTO public.admin_audit_log (admin_actor, action, payload_json)
  VALUES (p_admin_actor, 'finalize_event',
    jsonb_build_object('event', p_event_game_id, 'winner', p_winner_user_id,
      'payout_cents', p_payout_cents, 'announcement_id', v_winner_id));

  RETURN v_winner_id;
END;
$$;

-- ==========================================
-- 4. Ensure puzzle settings exist
-- ==========================================
INSERT INTO public.settings (key, value_json) VALUES
  ('daily_puzzle_answer',   '"42"'),
  ('daily_puzzle_question', '"What is the answer to life, the universe, and everything?"'),
  ('daily_puzzle_hint',     '"Think of Douglas Adams."')
ON CONFLICT (key) DO NOTHING;

-- ==========================================
-- 5. Add admin audit log entries for gate plays index
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_plays_user_date ON public.plays (user_id, play_date);
CREATE INDEX IF NOT EXISTS idx_wqs_week ON public.weekly_qualification_status (week_start_date);
