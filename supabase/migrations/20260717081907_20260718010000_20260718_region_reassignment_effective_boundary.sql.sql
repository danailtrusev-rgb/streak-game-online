/*
  # Region reassignment: enforce the safe-boundary rule in code, not just docs
  - resolve_user_game_time_region adds effective_from <= now() check
  - assign_user_game_time_region: drops caller-supplied p_effective_from, computes
    safe boundary = GREATEST(old_region_next_rollover, new_region_next_rollover)
  - New p_force_effective_immediately_for_test parameter (service_role only)
*/

CREATE OR REPLACE FUNCTION public.resolve_user_game_time_region(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT ugtr.region_id FROM public.user_game_time_region ugtr
       JOIN public.game_time_regions gtr ON gtr.id = ugtr.region_id
       WHERE ugtr.user_id = p_user_id
         AND gtr.enabled = true
         AND ugtr.effective_from <= now()),
    (SELECT global_region_id FROM public.game_time_settings WHERE id = true)
  );
$$;

DROP FUNCTION IF EXISTS public.assign_user_game_time_region(uuid, uuid, timestamptz, text, text);

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
  v_old_next_rollover    timestamptz;
  v_new_next_rollover    timestamptz;
  v_effective_from       timestamptz;
  v_reason                text;
BEGIN
  IF p_user_id IS NULL OR p_region_id IS NULL OR p_assigned_by IS NULL THEN
    RAISE EXCEPTION 'user_id, region_id, and assigned_by are required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.game_time_regions WHERE id = p_region_id AND enabled = true) THEN
    RAISE EXCEPTION 'Region does not exist or is not enabled';
  END IF;

  SELECT region_id INTO v_previous_region_id FROM public.user_game_time_region WHERE user_id = p_user_id;

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

  INSERT INTO public.user_game_time_region (user_id, region_id, effective_from, assigned_by, assignment_reason)
  VALUES (p_user_id, p_region_id, v_effective_from, p_assigned_by, v_reason)
  ON CONFLICT (user_id) DO UPDATE SET
    region_id         = EXCLUDED.region_id,
    effective_from    = EXCLUDED.effective_from,
    assigned_by        = EXCLUDED.assigned_by,
    assignment_reason  = EXCLUDED.assignment_reason;

  INSERT INTO public.user_game_time_region_change_log (user_id, previous_region_id, new_region_id, effective_from, changed_by, change_reason)
  VALUES (p_user_id, v_previous_region_id, p_region_id, v_effective_from, p_assigned_by, v_reason);
END;
$$;

REVOKE ALL ON FUNCTION public.assign_user_game_time_region(uuid, uuid, text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_user_game_time_region(uuid, uuid, text, text, boolean) TO service_role;