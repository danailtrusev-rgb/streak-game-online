/*
  # Region-aware date/week helpers for core gameplay

  ## Second hidden Madrid dependency found
  `get_current_week_start()` — used by the qualification engine —
  independently hardcodes `(now() AT TIME ZONE 'Europe/Madrid')`. Fixed
  the same way as `get_madrid_today()`: delegates to the Game Time
  System's global region.

  ## New helpers
  - `get_current_game_date_for_user(p_user_id)` — resolves the user's
    authoritative region and returns their current game date. Identical
    output to `get_madrid_today()` in Global mode.
  - `get_current_week_start_for_user(p_user_id)` — region-aware
    replacement for `get_current_week_start()`.
*/

CREATE OR REPLACE FUNCTION public.get_current_game_date_for_user(p_user_id uuid)
RETURNS date
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT ((public.get_game_time_state_for_user(p_user_id))->>'game_date')::date;
$$;

CREATE OR REPLACE FUNCTION public.get_current_week_start_for_user(p_user_id uuid)
RETURNS date
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_region_id uuid;
  v_timezone  text;
BEGIN
  v_region_id := public.resolve_user_game_time_region(p_user_id);
  SELECT timezone INTO v_timezone FROM public.game_time_regions WHERE id = v_region_id;

  IF v_timezone IS NULL THEN
    v_timezone := 'Europe/Madrid';
  END IF;

  RETURN date_trunc('week', (now() AT TIME ZONE v_timezone))::date;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_week_start()
RETURNS date
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_timezone text;
BEGIN
  SELECT gtr.timezone INTO v_timezone
  FROM public.game_time_settings gts
  JOIN public.game_time_regions gtr ON gtr.id = gts.global_region_id
  WHERE gts.id = true;

  IF v_timezone IS NULL THEN
    v_timezone := 'Europe/Madrid';
  END IF;

  RETURN date_trunc('week', (now() AT TIME ZONE v_timezone))::date;
END;
$$;

REVOKE ALL ON FUNCTION public.get_current_game_date_for_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_game_date_for_user(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_current_week_start_for_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_week_start_for_user(uuid) TO authenticated, service_role;