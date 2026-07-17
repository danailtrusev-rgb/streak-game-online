/*
  # Survive the Streak — Ecosystem Phase 1 RPC Functions

  ## Summary
  Adds server-side functions for:
  1. Qualification engine (compute and upsert weekly qualification)
  2. play_daily_dice — daily dice game RPC
  3. play_daily_pick — daily pick game RPC
  4. play_daily_puzzle — daily puzzle game RPC
  5. enter_weekend_event — weekend event entry RPC
  6. get_my_qualification — player qualification state query
  7. get_ecosystem_state — full player ecosystem snapshot

  All functions use SECURITY DEFINER with search_path = ''
*/

-- ==========================================
-- HELPER: current week start (Monday)
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_current_week_start()
RETURNS date
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT date_trunc('week', (now() AT TIME ZONE 'Europe/Madrid'))::date;
$$;

-- ==========================================
-- HELPER: update_weekly_qualification
-- Called after any game play to recompute qualification status
-- ==========================================
CREATE OR REPLACE FUNCTION public.update_weekly_qualification(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_week_start    date;
  v_points        int;
  v_games_played  int;
  v_games_won     int;
  v_sat_qual      boolean;
  v_sun_qual      boolean;
  v_sat_pts_rule  int;
  v_sun_pts_rule  int;
  v_sat_gp_rule   int;
  v_sun_gp_rule   int;
BEGIN
  v_week_start := public.get_current_week_start();

  -- Aggregate from player_game_progress this week
  SELECT
    COALESCE(SUM(qualification_points_earned), 0),
    COUNT(*) FILTER (WHERE played_today),
    COUNT(*) FILTER (WHERE won_today)
  INTO v_points, v_games_played, v_games_won
  FROM public.player_game_progress
  WHERE user_id = p_user_id
    AND progress_date >= v_week_start
    AND progress_date < v_week_start + interval '7 days';

  -- Get active qualification rules thresholds
  SELECT COALESCE(MIN(threshold_value), 50)
  INTO v_sat_pts_rule
  FROM public.qualification_rules
  WHERE active AND target_event IN ('saturday_main_event','both') AND rule_type = 'points';

  SELECT COALESCE(MIN(threshold_value), 100)
  INTO v_sun_pts_rule
  FROM public.qualification_rules
  WHERE active AND target_event IN ('sunday_winners_event','both') AND rule_type = 'points';

  SELECT COALESCE(MIN(threshold_value), 2)
  INTO v_sat_gp_rule
  FROM public.qualification_rules
  WHERE active AND target_event IN ('saturday_main_event','both') AND rule_type = 'games_played';

  SELECT COALESCE(MIN(threshold_value), 3)
  INTO v_sun_gp_rule
  FROM public.qualification_rules
  WHERE active AND target_event IN ('sunday_winners_event','both') AND rule_type = 'games_played';

  v_sat_qual := (v_points >= v_sat_pts_rule) OR (v_games_played >= v_sat_gp_rule);
  v_sun_qual := (v_points >= v_sun_pts_rule) OR (v_games_played >= v_sun_gp_rule);

  INSERT INTO public.weekly_qualification_status
    (user_id, week_start_date, total_points, games_played_count, games_won_count, saturday_qualified, sunday_qualified, updated_at)
  VALUES
    (p_user_id, v_week_start, v_points, v_games_played, v_games_won, v_sat_qual, v_sun_qual, now())
  ON CONFLICT (user_id, week_start_date) DO UPDATE SET
    total_points       = EXCLUDED.total_points,
    games_played_count = EXCLUDED.games_played_count,
    games_won_count    = EXCLUDED.games_won_count,
    saturday_qualified = EXCLUDED.saturday_qualified,
    sunday_qualified   = EXCLUDED.sunday_qualified,
    updated_at         = now();
END;
$$;

-- ==========================================
-- HELPER: upsert_game_progress
-- ==========================================
CREATE OR REPLACE FUNCTION public.upsert_game_progress(
  p_user_id    uuid,
  p_game_id    text,
  p_won        boolean,
  p_points     int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_today date;
BEGIN
  v_today := (now() AT TIME ZONE 'Europe/Madrid')::date;

  INSERT INTO public.player_game_progress
    (user_id, game_id, progress_date, played_today, completed_today, won_today, qualified_today, qualification_points_earned)
  VALUES
    (p_user_id, p_game_id, v_today, true, true, p_won, p_won, p_points)
  ON CONFLICT (user_id, game_id, progress_date) DO NOTHING;
END;
$$;

-- ==========================================
-- get_my_qualification
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_my_qualification()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid         uuid;
  v_week_start  date;
  v_status      record;
  v_sat_pts_threshold int;
  v_sun_pts_threshold int;
  v_sat_gp_threshold  int;
  v_sun_gp_threshold  int;
BEGIN
  v_uid := (select auth.uid());
  IF v_uid IS NULL THEN RETURN '{}'::jsonb; END IF;

  v_week_start := public.get_current_week_start();

  SELECT * INTO v_status
  FROM public.weekly_qualification_status
  WHERE user_id = v_uid AND week_start_date = v_week_start;

  SELECT COALESCE(MIN(threshold_value), 50) INTO v_sat_pts_threshold
  FROM public.qualification_rules WHERE active AND target_event IN ('saturday_main_event','both') AND rule_type = 'points';

  SELECT COALESCE(MIN(threshold_value), 100) INTO v_sun_pts_threshold
  FROM public.qualification_rules WHERE active AND target_event IN ('sunday_winners_event','both') AND rule_type = 'points';

  SELECT COALESCE(MIN(threshold_value), 2) INTO v_sat_gp_threshold
  FROM public.qualification_rules WHERE active AND target_event IN ('saturday_main_event','both') AND rule_type = 'games_played';

  SELECT COALESCE(MIN(threshold_value), 3) INTO v_sun_gp_threshold
  FROM public.qualification_rules WHERE active AND target_event IN ('sunday_winners_event','both') AND rule_type = 'games_played';

  RETURN jsonb_build_object(
    'week_start',            v_week_start,
    'total_points',          COALESCE(v_status.total_points, 0),
    'games_played_count',    COALESCE(v_status.games_played_count, 0),
    'games_won_count',       COALESCE(v_status.games_won_count, 0),
    'saturday_qualified',    COALESCE(v_status.saturday_qualified, false),
    'sunday_qualified',      COALESCE(v_status.sunday_qualified, false),
    'saturday_entry_used',   COALESCE(v_status.saturday_entry_used, false),
    'sunday_entry_used',     COALESCE(v_status.sunday_entry_used, false),
    'sat_pts_threshold',     v_sat_pts_threshold,
    'sun_pts_threshold',     v_sun_pts_threshold,
    'sat_gp_threshold',      v_sat_gp_threshold,
    'sun_gp_threshold',      v_sun_gp_threshold
  );
END;
$$;

-- ==========================================
-- get_today_game_progress
-- Returns per-game played/won status for today
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_today_game_progress()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid   uuid;
  v_today date;
  v_result jsonb;
BEGIN
  v_uid := (select auth.uid());
  IF v_uid IS NULL THEN RETURN '[]'::jsonb; END IF;
  v_today := (now() AT TIME ZONE 'Europe/Madrid')::date;

  SELECT jsonb_agg(jsonb_build_object(
    'game_id',         pgp.game_id,
    'played_today',    pgp.played_today,
    'won_today',       pgp.won_today,
    'points_earned',   pgp.qualification_points_earned
  ))
  INTO v_result
  FROM public.player_game_progress pgp
  WHERE pgp.user_id = v_uid AND pgp.progress_date = v_today;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ==========================================
-- play_daily_dice
-- ==========================================
CREATE OR REPLACE FUNCTION public.play_daily_dice(p_idem_key uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid         uuid;
  v_today       date;
  v_win_prob    float8;
  v_rng         float8;
  v_won         boolean;
  v_dice_value  int;
  v_points_play int;
  v_points_win  int;
  v_pts_earned  int;
  v_outcome     text;
BEGIN
  v_uid := (select auth.uid());
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Check user not banned
  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_uid AND status = 'banned') THEN
    RAISE EXCEPTION 'Account suspended';
  END IF;

  v_today := (now() AT TIME ZONE 'Europe/Madrid')::date;

  -- Idempotency: return existing result if same key used
  IF EXISTS (SELECT 1 FROM public.daily_game_plays WHERE idem_key = p_idem_key) THEN
    SELECT result_json INTO v_won FROM public.daily_game_plays WHERE idem_key = p_idem_key;
    SELECT result_json FROM public.daily_game_plays WHERE idem_key = p_idem_key INTO v_outcome;
    RETURN (SELECT result_json FROM public.daily_game_plays WHERE idem_key = p_idem_key);
  END IF;

  -- Check already played today
  IF EXISTS (SELECT 1 FROM public.daily_game_plays WHERE user_id = v_uid AND game_id = 'daily_dice' AND play_date = v_today) THEN
    RAISE EXCEPTION 'Already played Daily Dice today';
  END IF;

  -- Get config
  SELECT COALESCE((config_json->>'win_probability')::float8, 0.45),
         COALESCE(points_on_play, 10),
         COALESCE(points_on_win, 25)
  INTO v_win_prob, v_points_play, v_points_win
  FROM public.games WHERE game_id = 'daily_dice';

  -- RNG
  v_rng := (get_byte(gen_random_bytes(8), 0)::float8 * 256 * 256 * 256 * 256 * 256 * 256 * 256 +
            get_byte(gen_random_bytes(8), 1)::float8 * 256 * 256 * 256 * 256 * 256 * 256 +
            get_byte(gen_random_bytes(8), 2)::float8 * 256 * 256 * 256 * 256 * 256 +
            get_byte(gen_random_bytes(8), 3)::float8 * 256 * 256 * 256 * 256 +
            get_byte(gen_random_bytes(8), 4)::float8 * 256 * 256 * 256 +
            get_byte(gen_random_bytes(8), 5)::float8 * 256 * 256 +
            get_byte(gen_random_bytes(8), 6)::float8 * 256 +
            get_byte(gen_random_bytes(8), 7)::float8) /
           (256.0^8 - 1);

  v_won := v_rng < v_win_prob;
  v_dice_value := floor(v_rng * 6 + 1)::int;
  v_outcome := CASE WHEN v_won THEN 'WIN' ELSE 'LOSE' END;
  v_pts_earned := v_points_play + CASE WHEN v_won THEN v_points_win ELSE 0 END;

  -- Record play
  INSERT INTO public.daily_game_plays (user_id, game_id, play_date, idem_key, outcome, result_json, points_earned)
  VALUES (v_uid, 'daily_dice', v_today, p_idem_key, v_outcome,
    jsonb_build_object('dice_value', v_dice_value, 'won', v_won, 'points_earned', v_pts_earned, 'outcome', v_outcome),
    v_pts_earned);

  -- Update progress
  PERFORM public.upsert_game_progress(v_uid, 'daily_dice', v_won, v_pts_earned);

  -- Recompute qualification
  PERFORM public.update_weekly_qualification(v_uid);

  RETURN jsonb_build_object(
    'outcome',        v_outcome,
    'won',            v_won,
    'dice_value',     v_dice_value,
    'points_earned',  v_pts_earned
  );
END;
$$;

-- ==========================================
-- play_daily_pick
-- ==========================================
CREATE OR REPLACE FUNCTION public.play_daily_pick(p_idem_key uuid, p_choice int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid           uuid;
  v_today         date;
  v_options_count int;
  v_winning_idx   int;
  v_won           boolean;
  v_points_play   int;
  v_points_win    int;
  v_pts_earned    int;
  v_outcome       text;
  v_rng           float8;
BEGIN
  v_uid := (select auth.uid());
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_uid AND status = 'banned') THEN
    RAISE EXCEPTION 'Account suspended';
  END IF;

  v_today := (now() AT TIME ZONE 'Europe/Madrid')::date;

  IF EXISTS (SELECT 1 FROM public.daily_game_plays WHERE idem_key = p_idem_key) THEN
    RETURN (SELECT result_json FROM public.daily_game_plays WHERE idem_key = p_idem_key);
  END IF;

  IF EXISTS (SELECT 1 FROM public.daily_game_plays WHERE user_id = v_uid AND game_id = 'daily_pick' AND play_date = v_today) THEN
    RAISE EXCEPTION 'Already played Daily Pick today';
  END IF;

  SELECT COALESCE((config_json->>'options_count')::int, 4),
         COALESCE(points_on_play, 10),
         COALESCE(points_on_win, 30)
  INTO v_options_count, v_points_play, v_points_win
  FROM public.games WHERE game_id = 'daily_pick';

  IF p_choice < 0 OR p_choice >= v_options_count THEN
    RAISE EXCEPTION 'Invalid choice';
  END IF;

  v_rng := (get_byte(gen_random_bytes(4), 0)::float8 * 256 * 256 * 256 +
            get_byte(gen_random_bytes(4), 1)::float8 * 256 * 256 +
            get_byte(gen_random_bytes(4), 2)::float8 * 256 +
            get_byte(gen_random_bytes(4), 3)::float8) / (256.0^4 - 1);

  v_winning_idx := floor(v_rng * v_options_count)::int;
  v_won := (p_choice = v_winning_idx);
  v_outcome := CASE WHEN v_won THEN 'WIN' ELSE 'LOSE' END;
  v_pts_earned := v_points_play + CASE WHEN v_won THEN v_points_win ELSE 0 END;

  INSERT INTO public.daily_game_plays (user_id, game_id, play_date, idem_key, outcome, result_json, points_earned)
  VALUES (v_uid, 'daily_pick', v_today, p_idem_key, v_outcome,
    jsonb_build_object('player_choice', p_choice, 'winning_idx', v_winning_idx, 'won', v_won, 'points_earned', v_pts_earned, 'outcome', v_outcome),
    v_pts_earned);

  PERFORM public.upsert_game_progress(v_uid, 'daily_pick', v_won, v_pts_earned);
  PERFORM public.update_weekly_qualification(v_uid);

  RETURN jsonb_build_object(
    'outcome',        v_outcome,
    'won',            v_won,
    'player_choice',  p_choice,
    'winning_idx',    v_winning_idx,
    'points_earned',  v_pts_earned
  );
END;
$$;

-- ==========================================
-- play_daily_puzzle
-- ==========================================
CREATE OR REPLACE FUNCTION public.play_daily_puzzle(p_idem_key uuid, p_answer text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid         uuid;
  v_today       date;
  v_correct_ans text;
  v_won         boolean;
  v_points_play int;
  v_points_win  int;
  v_pts_earned  int;
  v_outcome     text;
BEGIN
  v_uid := (select auth.uid());
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_uid AND status = 'banned') THEN
    RAISE EXCEPTION 'Account suspended';
  END IF;

  v_today := (now() AT TIME ZONE 'Europe/Madrid')::date;

  IF EXISTS (SELECT 1 FROM public.daily_game_plays WHERE idem_key = p_idem_key) THEN
    RETURN (SELECT result_json FROM public.daily_game_plays WHERE idem_key = p_idem_key);
  END IF;

  IF EXISTS (SELECT 1 FROM public.daily_game_plays WHERE user_id = v_uid AND game_id = 'daily_puzzle' AND play_date = v_today) THEN
    RAISE EXCEPTION 'Already played Daily Puzzle today';
  END IF;

  -- Get today's puzzle answer from settings (key: 'daily_puzzle_answer')
  SELECT value_json::text INTO v_correct_ans
  FROM public.settings WHERE key = 'daily_puzzle_answer';

  -- Default answer if not set
  v_correct_ans := COALESCE(trim('"' FROM v_correct_ans), '42');

  SELECT COALESCE(points_on_play, 15), COALESCE(points_on_win, 15)
  INTO v_points_play, v_points_win
  FROM public.games WHERE game_id = 'daily_puzzle';

  v_won := lower(trim(p_answer)) = lower(trim(v_correct_ans));
  v_outcome := CASE WHEN v_won THEN 'CORRECT' ELSE 'WRONG' END;
  v_pts_earned := v_points_play + CASE WHEN v_won THEN v_points_win ELSE 0 END;

  INSERT INTO public.daily_game_plays (user_id, game_id, play_date, idem_key, outcome, result_json, points_earned)
  VALUES (v_uid, 'daily_puzzle', v_today, p_idem_key, v_outcome,
    jsonb_build_object('answer_given', p_answer, 'correct_answer', v_correct_ans, 'won', v_won, 'points_earned', v_pts_earned, 'outcome', v_outcome),
    v_pts_earned);

  PERFORM public.upsert_game_progress(v_uid, 'daily_puzzle', v_won, v_pts_earned);
  PERFORM public.update_weekly_qualification(v_uid);

  RETURN jsonb_build_object(
    'outcome',        v_outcome,
    'won',            v_won,
    'correct_answer', v_correct_ans,
    'points_earned',  v_pts_earned
  );
END;
$$;

-- ==========================================
-- enter_weekend_event
-- ==========================================
CREATE OR REPLACE FUNCTION public.enter_weekend_event(
  p_event_game_id text,
  p_idem_key      uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid           uuid;
  v_week_start    date;
  v_qual          record;
  v_entry_id      uuid;
  v_can_enter     boolean := false;
  v_reason        text := '';
BEGIN
  v_uid := (select auth.uid());
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_uid AND status = 'banned') THEN
    RAISE EXCEPTION 'Account suspended';
  END IF;

  v_week_start := public.get_current_week_start();

  -- Get qualification status
  SELECT * INTO v_qual
  FROM public.weekly_qualification_status
  WHERE user_id = v_uid AND week_start_date = v_week_start;

  IF p_event_game_id = 'saturday_main_event' THEN
    IF v_qual IS NULL OR NOT v_qual.saturday_qualified THEN
      RAISE EXCEPTION 'Not qualified for Saturday Main Event';
    END IF;
    IF v_qual.saturday_entry_used THEN
      RAISE EXCEPTION 'Saturday entry already used this week';
    END IF;
    v_can_enter := true;
  ELSIF p_event_game_id = 'sunday_winners_event' THEN
    IF v_qual IS NULL OR NOT v_qual.sunday_qualified THEN
      RAISE EXCEPTION 'Not qualified for Sunday Winners Event';
    END IF;
    IF v_qual.sunday_entry_used THEN
      RAISE EXCEPTION 'Sunday entry already used this week';
    END IF;
    v_can_enter := true;
  ELSE
    RAISE EXCEPTION 'Unknown weekend event: %', p_event_game_id;
  END IF;

  -- Idempotency
  IF EXISTS (SELECT 1 FROM public.weekend_event_entries WHERE user_id = v_uid AND event_game_id = p_event_game_id AND week_start_date = v_week_start) THEN
    SELECT id INTO v_entry_id FROM public.weekend_event_entries WHERE user_id = v_uid AND event_game_id = p_event_game_id AND week_start_date = v_week_start;
    RETURN jsonb_build_object('entry_id', v_entry_id, 'status', 'already_entered');
  END IF;

  -- Record entry
  INSERT INTO public.weekend_event_entries
    (user_id, event_game_id, week_start_date, qualification_source_json, result_status)
  VALUES
    (v_uid, p_event_game_id, v_week_start,
     jsonb_build_object('points', v_qual.total_points, 'games_played', v_qual.games_played_count),
     'entered')
  RETURNING id INTO v_entry_id;

  -- Mark entry used
  IF p_event_game_id = 'saturday_main_event' THEN
    UPDATE public.weekly_qualification_status
    SET saturday_entry_used = true, updated_at = now()
    WHERE user_id = v_uid AND week_start_date = v_week_start;
  ELSE
    UPDATE public.weekly_qualification_status
    SET sunday_entry_used = true, updated_at = now()
    WHERE user_id = v_uid AND week_start_date = v_week_start;
  END IF;

  RETURN jsonb_build_object('entry_id', v_entry_id, 'status', 'entered');
END;
$$;

-- ==========================================
-- get_ecosystem_state
-- Full player snapshot: state + qualification + today progress
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_ecosystem_state()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid         uuid;
  v_my_state    jsonb;
  v_qual        jsonb;
  v_today_prog  jsonb;
  v_promos      jsonb;
  v_winners     jsonb;
BEGIN
  v_uid := (select auth.uid());
  IF v_uid IS NULL THEN RETURN '{}'::jsonb; END IF;

  v_my_state   := public.get_my_state();
  v_qual       := public.get_my_qualification();
  v_today_prog := public.get_today_game_progress();

  SELECT jsonb_agg(jsonb_build_object(
    'id', id, 'asset_type', asset_type, 'template_key', template_key,
    'title', title, 'subtitle', subtitle, 'body_json', body_json,
    'image_path', image_path, 'sort_order', sort_order
  ) ORDER BY sort_order)
  INTO v_promos
  FROM public.promotional_assets WHERE active = true;

  SELECT jsonb_agg(jsonb_build_object(
    'id', id, 'event_game_id', event_game_id, 'event_date', event_date,
    'display_name', display_name, 'result_summary', result_summary,
    'payout_cents', payout_cents, 'share_text', share_text, 'created_at', created_at
  ) ORDER BY created_at DESC)
  INTO v_winners
  FROM public.winner_announcements
  WHERE created_at >= now() - interval '14 days';

  RETURN jsonb_build_object(
    'player',      v_my_state,
    'qualification', v_qual,
    'today_progress', v_today_prog,
    'promotions',  COALESCE(v_promos, '[]'::jsonb),
    'winners',     COALESCE(v_winners, '[]'::jsonb)
  );
END;
$$;

-- Add puzzle answer default
INSERT INTO public.settings (key, value_json) VALUES ('daily_puzzle_answer', '"42"') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.settings (key, value_json) VALUES ('daily_puzzle_question', '"What is the answer to life, the universe, and everything?"') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.settings (key, value_json) VALUES ('daily_puzzle_hint', '"Think of Douglas Adams."') ON CONFLICT (key) DO NOTHING;
