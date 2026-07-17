/*
  # Saturday Showdown / Sunday Crown — region-aware status helper
  Read-only helper combining region-aware time windows + points-based qualification.
*/

CREATE OR REPLACE FUNCTION public.get_saturday_sunday_status_for_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_region_id   uuid;
  v_game_time   jsonb;
  v_week_start  date;
  v_qual        record;
BEGIN
  v_region_id  := public.resolve_user_game_time_region(p_user_id);
  v_game_time  := public.get_game_time_state_for_region(v_region_id);
  v_week_start := public.get_current_week_start_for_user(p_user_id);

  SELECT saturday_qualified, sunday_qualified, total_points, games_played_count
  INTO   v_qual
  FROM   public.weekly_qualification_status
  WHERE  user_id = p_user_id AND week_start_date = v_week_start;

  RETURN jsonb_build_object(
    'region_id',           v_region_id,
    'week_start_date',      v_week_start,
    'saturday_window_status', v_game_time->>'saturday_status',
    'saturday_start_at',       v_game_time->>'saturday_start_at',
    'saturday_end_at',          v_game_time->>'saturday_end_at',
    'saturday_qualified',        COALESCE(v_qual.saturday_qualified, false),
    'sunday_window_status',        v_game_time->>'sunday_status',
    'sunday_start_at',               v_game_time->>'sunday_start_at',
    'sunday_end_at',                  v_game_time->>'sunday_end_at',
    'sunday_qualified',                COALESCE(v_qual.sunday_qualified, false),
    'total_points',                     COALESCE(v_qual.total_points, 0),
    'games_played_count',                 COALESCE(v_qual.games_played_count, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_saturday_sunday_status_for_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_saturday_sunday_status_for_user(uuid) TO authenticated, service_role;