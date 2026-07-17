/*
  # Qualification becomes region-aware (week boundary only — no value changes)

  ## Current data model (confirmed by inspection, not assumed)
  - Qualification points are stored per (user, week_start_date) in
    `weekly_qualification_status` — points-based, not active-day-based
    (confirmed again this pass — nothing here changes that model).
  - `player_game_progress` (progress_date, qualification_points_earned)
    is written by the `after_gate_play_qualification()` trigger on
    `plays` insert, using `NEW.play_date` — already the authoritative
    game date as of the `play_daily_gate` region-aware migration in this
    same pass. No change needed here.
  - `update_weekly_qualification(p_user_id)` aggregates
    `player_game_progress` rows for the current week and upserts
    `weekly_qualification_status`, using `get_current_week_start()` — the
    GLOBAL-only week-start function. This is the one piece that needed to
    become region-aware.
  - Saturday/Sunday qualification (`saturday_qualified`/`sunday_qualified`)
    are threshold checks (points OR games-played, read from
    `qualification_rules`) against the SAME aggregated week — not a
    separate time-window mechanism. Thresholds are NOT changed by this
    migration.

  ## What changes
  1. `weekly_qualification_status.region_id uuid` — nullable, additive,
     references `game_time_regions`. For reporting/audit; the natural
     `(user_id, week_start_date)` uniqueness already correctly separates
     different regions' weeks once `week_start_date` itself is
     region-aware (two regions with meaningfully different week
     boundaries produce different `week_start_date` values for the "same"
     real period) — this column does not change that logic, it documents
     it.
  2. `update_weekly_qualification(p_user_id)` — same signature, same
     return type (`void`), `CREATE OR REPLACE` — now calls
     `get_current_week_start_for_user(p_user_id)` instead of the global
     `get_current_week_start()`, and records the resolved region on the
     upserted row. In Global mode, byte-for-byte identical week boundary
     to before (same underlying region, same formula).
  3. Every threshold read, aggregation query, and the
     `saturday_qualified`/`sunday_qualified` boolean computation is
     otherwise unchanged — diffed against the live version while writing
     this migration.

  ## Not changed
  Point values, `qualification_rules` thresholds, the trigger chain from
  `plays` to `player_game_progress`, badge logic, Day 30 logic. Region
  reassignment mid-week does not create duplicate qualification records
  for the same `week_start_date` — the existing `UNIQUE (user_id,
  week_start_date)` constraint on `weekly_qualification_status` (from the
  original schema, untouched) already prevents that; this migration adds
  no new uniqueness rule because none was needed.
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
  -- Region-aware week boundary (was: public.get_current_week_start(), global-only).
  v_region_id  := public.resolve_user_game_time_region(p_user_id);
  v_week_start := public.get_current_week_start_for_user(p_user_id);

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

/*
  ## Rollback
  Re-apply the previous body from
  20260408122105_20260408_ecosystem_phase1_rpc.sql (drops region
  resolution, restores the global-only get_current_week_start() call).
  `ALTER TABLE weekly_qualification_status DROP COLUMN IF EXISTS region_id;`
  No existing qualification row is rewritten either way.
*/
