/*
  # Region resolution and assignment: history-aware rewrite
  - Data migration: old single-row table → new history table
  - resolve_user_game_time_region: selects row whose effective window contains now
  - assign_user_game_time_region: closes previous open-ended row, inserts new one
*/

-- Data migration: copy old single-row table forward
INSERT INTO user_game_time_region_assignments
  (user_id, region_id, effective_from, effective_until, status, assigned_by, assignment_reason, created_at)
SELECT
  user_id, region_id, effective_from, NULL,
  CASE WHEN effective_from <= now() THEN 'active' ELSE 'pending' END,
  assigned_by, assignment_reason, created_at
FROM user_game_time_region;

-- History-aware resolution
CREATE OR REPLACE FUNCTION public.resolve_user_game_time_region(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT a.region_id
       FROM public.user_game_time_region_assignments a
       JOIN public.game_time_regions gtr ON gtr.id = a.region_id
       WHERE a.user_id = p_user_id
         AND a.status <> 'cancelled'
         AND gtr.enabled = true
         AND a.effective_from <= now()
         AND (a.effective_until IS NULL OR a.effective_until > now())
       ORDER BY a.effective_from DESC
       LIMIT 1),
    (SELECT global_region_id FROM public.game_time_settings WHERE id = true)
  );
$$;

-- History-aware assignment
CREATE OR REPLACE FUNCTION public.assign_user_game_time_region(
  p_user_id                          uuid,
  p_region_id                        uuid,
  p_assigned_by                      text,
  p_assignment_reason                text DEFAULT NULL,
  p_force_effective_immediately_for_test boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_previous_region_id   uuid;
  v_open_row_id           uuid;
  v_open_row_effective_from timestamptz;
  v_old_next_rollover     timestamptz;
  v_new_next_rollover     timestamptz;
  v_effective_from        timestamptz;
  v_reason                 text;
  v_new_status              text;
BEGIN
  IF p_user_id IS NULL OR p_region_id IS NULL OR p_assigned_by IS NULL THEN
    RAISE EXCEPTION 'user_id, region_id, and assigned_by are required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.game_time_regions WHERE id = p_region_id AND enabled = true) THEN
    RAISE EXCEPTION 'Region does not exist or is not enabled';
  END IF;

  SELECT id, region_id, effective_from
  INTO v_open_row_id, v_previous_region_id, v_open_row_effective_from
  FROM public.user_game_time_region_assignments
  WHERE user_id = p_user_id AND effective_until IS NULL AND status <> 'cancelled'
  ORDER BY effective_from DESC
  LIMIT 1;

  IF p_force_effective_immediately_for_test THEN
    v_effective_from := now();
    v_reason := '[IMMEDIATE TEST OVERRIDE] ' || COALESCE(p_assignment_reason, '');
  ELSE
    IF v_previous_region_id IS NOT NULL THEN
      v_old_next_rollover := ((public.get_game_time_state_for_region(v_previous_region_id))->>'next_daily_rollover_at')::timestamptz;
    END IF;
    v_new_next_rollover := ((public.get_game_time_state_for_region(p_region_id))->>'next_daily_rollover_at')::timestamptz;

    v_effective_from := GREATEST(
      COALESCE(v_old_next_rollover, v_new_next_rollover),
      v_new_next_rollover
    );
    v_reason := p_assignment_reason;
  END IF;

  IF v_open_row_id IS NOT NULL THEN
    UPDATE public.user_game_time_region_assignments
    SET effective_until = v_effective_from,
        status = CASE WHEN v_open_row_effective_from <= now() THEN 'active' ELSE 'cancelled' END,
        updated_at = now()
    WHERE id = v_open_row_id;
  END IF;

  v_new_status := CASE WHEN v_effective_from <= now() THEN 'active' ELSE 'pending' END;

  INSERT INTO public.user_game_time_region_assignments
    (user_id, region_id, effective_from, effective_until, status, assigned_by, assignment_reason, force_effective_immediately_for_test)
  VALUES
    (p_user_id, p_region_id, v_effective_from, NULL, v_new_status, p_assigned_by, v_reason, p_force_effective_immediately_for_test);

  INSERT INTO public.user_game_time_region_change_log (user_id, previous_region_id, new_region_id, effective_from, changed_by, change_reason)
  VALUES (p_user_id, v_previous_region_id, p_region_id, v_effective_from, p_assigned_by, v_reason);
END;
$$;

REVOKE ALL ON FUNCTION public.assign_user_game_time_region(uuid, uuid, text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_user_game_time_region(uuid, uuid, text, text, boolean) TO service_role;