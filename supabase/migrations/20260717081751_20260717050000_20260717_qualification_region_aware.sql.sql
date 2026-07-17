/*
  # Qualification becomes region-aware (week boundary only — no value changes)
  - weekly_qualification_status.region_id added (nullable, additive)
  - update_weekly_qualification uses get_current_week_start_for_user
  - Threshold reads, aggregation, sat/sun qual booleans unchanged
*/

ALTER TABLE weekly_qualification_status
  ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES game_time_regions(id);

CREATE OR REPLACE FUNCTION public.update_weekly_qualification(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_week_start    date;
  v_region_id     uuid;
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
  v_region_id  := public.resolve_user_game_time_region(p_user_id);
  v_week_start := public.get_current_week_start_for_user(p_user_id);

  SELECT
    COALESCE(SUM(qualification_points_earned), 0),
    COUNT(*) FILTER (WHERE played_today),
    COUNT(*) FILTER (WHERE won_today)
  INTO v_points, v_games_played, v_games_won
  FROM public.player_game_progress
  WHERE user_id = p_user_id
    AND progress_date >= v_week_start
    AND progress_date < v_week_start + interval '7 days';

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
    (user_id, week_start_date, total_points, games_played_count, games_won_count, saturday_qualified, sunday_qualified, region_id, updated_at)
  VALUES
    (p_user_id, v_week_start, v_points, v_games_played, v_games_won, v_sat_qual, v_sun_qual, v_region_id, now())
  ON CONFLICT (user_id, week_start_date) DO UPDATE SET
    total_points       = EXCLUDED.total_points,
    games_played_count = EXCLUDED.games_played_count,
    games_won_count    = EXCLUDED.games_won_count,
    saturday_qualified = EXCLUDED.saturday_qualified,
    sunday_qualified   = EXCLUDED.sunday_qualified,
    region_id           = EXCLUDED.region_id,
    updated_at         = now();
END;
$$;