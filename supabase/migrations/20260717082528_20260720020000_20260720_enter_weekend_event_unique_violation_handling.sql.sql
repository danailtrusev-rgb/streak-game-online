/*
  # enter_weekend_event: unique_violation backstop
  Wraps the INSERT in a unique_violation handler returning 'already_entered'.
  Every other line unchanged from the region-aware version.
*/

CREATE OR REPLACE FUNCTION public.enter_weekend_event(p_event_game_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id           uuid;
  v_region_id         uuid;
  v_region            record;
  v_week_start        date;
  v_event_date        date;
  v_qual              record;
  v_game_time         jsonb;
  v_window_status     text;
  v_window_configured boolean;
  v_instance_id       uuid;
  v_existing_entry_id uuid;
  v_entry_id          uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_event_game_id NOT IN ('saturday_main_event', 'sunday_winners_event') THEN
    RAISE EXCEPTION 'Unknown event: %', p_event_game_id;
  END IF;

  v_region_id  := public.resolve_user_game_time_region(v_user_id);
  SELECT * INTO v_region FROM public.game_time_regions WHERE id = v_region_id;
  v_week_start := public.get_current_week_start_for_user(v_user_id);
  v_event_date := v_week_start + (CASE WHEN p_event_game_id = 'saturday_main_event' THEN 5 ELSE 6 END);
  v_game_time  := public.get_game_time_state_for_region(v_region_id);

  SELECT * INTO v_qual FROM public.weekly_qualification_status
  WHERE user_id = v_user_id AND week_start_date = v_week_start;

  IF p_event_game_id = 'saturday_main_event' THEN
    IF v_qual IS NULL OR NOT v_qual.saturday_qualified THEN
      RAISE EXCEPTION 'Not qualified for Saturday Showdown';
    END IF;
    IF v_qual.saturday_entry_used THEN
      RAISE EXCEPTION 'Already entered Saturday Showdown this week';
    END IF;
    v_window_status     := v_game_time->>'saturday_status';
    v_window_configured := v_region.saturday_start_local_time IS NOT NULL;
  ELSE
    IF v_qual IS NULL OR NOT v_qual.sunday_qualified THEN
      RAISE EXCEPTION 'Not qualified for Sunday Crown';
    END IF;
    IF v_qual.sunday_entry_used THEN
      RAISE EXCEPTION 'Already entered Sunday Crown this week';
    END IF;
    v_window_status     := v_game_time->>'sunday_status';
    v_window_configured := v_region.sunday_start_local_time IS NOT NULL;
  END IF;

  SELECT id INTO v_existing_entry_id FROM public.weekend_event_entries
  WHERE user_id = v_user_id AND event_game_id = p_event_game_id AND week_start_date = v_week_start;
  IF v_existing_entry_id IS NOT NULL THEN
    RETURN jsonb_build_object('entry_id', v_existing_entry_id, 'status', 'already_entered');
  END IF;

  IF v_window_configured THEN
    IF v_window_status <> 'active' THEN
      RAISE EXCEPTION 'This event is not currently open in your region (status: %)', v_window_status;
    END IF;
    v_instance_id := public.get_or_create_event_instance(p_event_game_id, v_region_id, v_event_date);
  ELSE
    v_instance_id := NULL;
  END IF;

  BEGIN
    INSERT INTO public.weekend_event_entries
      (user_id, event_game_id, week_start_date, qualification_source_json, result_status, event_instance_id, game_time_region_id)
    VALUES
      (v_user_id, p_event_game_id, v_week_start,
       jsonb_build_object('week_start', v_week_start, 'total_points', v_qual.total_points),
       'entered', v_instance_id, v_region_id)
    RETURNING id INTO v_entry_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT id INTO v_existing_entry_id FROM public.weekend_event_entries
    WHERE user_id = v_user_id AND event_game_id = p_event_game_id AND week_start_date = v_week_start;
    RETURN jsonb_build_object('entry_id', v_existing_entry_id, 'status', 'already_entered');
  END;

  IF p_event_game_id = 'saturday_main_event' THEN
    UPDATE public.weekly_qualification_status
    SET saturday_entry_used = true, updated_at = now()
    WHERE user_id = v_user_id AND week_start_date = v_week_start;
  ELSE
    UPDATE public.weekly_qualification_status
    SET sunday_entry_used = true, updated_at = now()
    WHERE user_id = v_user_id AND week_start_date = v_week_start;
  END IF;

  RETURN jsonb_build_object('entry_id', v_entry_id, 'status', 'entered');
END;
$$;

REVOKE ALL ON FUNCTION public.enter_weekend_event(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enter_weekend_event(text) TO authenticated;