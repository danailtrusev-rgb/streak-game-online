/*
  # Admin: Regional Game Time testing unlock + region management RPCs

  Adds a service-role-only RPC to toggle the
  regional_game_time_live_enabled flag for dev/test controlled testing.
  Also adds region management and user assignment RPCs.

  Does NOT:
  - Set regional_game_time_live_enabled=true as a default
  - Enable Cron
  - Enable scheduled push
  - Change economy/wallet/RTP/gameplay logic
  - Expose any RPC to anon or authenticated
*/

-- ────────────────────────────────────────────────────────────────────────
-- admin_set_regional_game_time_testing_unlock
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_set_regional_game_time_testing_unlock(
  p_enabled boolean,
  p_admin_actor text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current boolean;
BEGIN
  SELECT regional_game_time_live_enabled INTO v_current
  FROM public.game_time_settings
  WHERE id = true;

  IF v_current IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'game_time_settings row not found');
  END IF;

  UPDATE public.game_time_settings
  SET regional_game_time_live_enabled = p_enabled,
      updated_at = now(),
      updated_by = p_admin_actor
  WHERE id = true;

  INSERT INTO public.admin_audit_log (admin_actor, action, payload_json)
  VALUES (
    p_admin_actor,
    'set_regional_game_time_testing_unlock',
    jsonb_build_object('enabled', p_enabled, 'previous_value', v_current)
  );

  RETURN jsonb_build_object(
    'success', true,
    'regional_game_time_live_enabled', p_enabled,
    'previous_value', v_current
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_regional_game_time_testing_unlock(boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_regional_game_time_testing_unlock(boolean, text) TO service_role;

-- ────────────────────────────────────────────────────────────────────────
-- admin_create_game_time_region
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_create_game_time_region(
  p_key text,
  p_name text,
  p_timezone text,
  p_daily_rollover_local_time time DEFAULT '00:00:00',
  p_saturday_start_local_time time DEFAULT NULL,
  p_saturday_end_local_time time DEFAULT NULL,
  p_sunday_start_local_time time DEFAULT NULL,
  p_sunday_end_local_time time DEFAULT NULL,
  p_enabled boolean DEFAULT true,
  p_display_order integer DEFAULT 0,
  p_admin_actor text DEFAULT 'admin'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_key IS NULL OR p_name IS NULL OR p_timezone IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing required fields: key, name, timezone');
  END IF;

  INSERT INTO public.game_time_regions (
    key, name, timezone, daily_rollover_local_time,
    saturday_start_local_time, saturday_end_local_time,
    sunday_start_local_time, sunday_end_local_time,
    enabled, display_order
  )
  VALUES (
    p_key, p_name, p_timezone, p_daily_rollover_local_time,
    p_saturday_start_local_time, p_saturday_end_local_time,
    p_sunday_start_local_time, p_sunday_end_local_time,
    p_enabled, p_display_order
  )
  RETURNING id INTO v_id;

  INSERT INTO public.admin_audit_log (admin_actor, action, payload_json)
  VALUES (
    p_admin_actor,
    'create_game_time_region',
    jsonb_build_object('id', v_id, 'key', p_key, 'name', p_name, 'timezone', p_timezone)
  );

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_game_time_region(text, text, text, time, time, time, time, time, boolean, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_game_time_region(text, text, text, time, time, time, time, time, boolean, integer, text) TO service_role;

-- ────────────────────────────────────────────────────────────────────────
-- admin_update_game_time_region
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_update_game_time_region(
  p_region_id uuid,
  p_key text DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_timezone text DEFAULT NULL,
  p_daily_rollover_local_time time DEFAULT NULL,
  p_saturday_start_local_time time DEFAULT NULL,
  p_saturday_end_local_time time DEFAULT NULL,
  p_sunday_start_local_time time DEFAULT NULL,
  p_sunday_end_local_time time DEFAULT NULL,
  p_enabled boolean DEFAULT NULL,
  p_display_order integer DEFAULT NULL,
  p_admin_actor text DEFAULT 'admin'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_region_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing region_id');
  END IF;

  UPDATE public.game_time_regions
  SET
    key = COALESCE(p_key, key),
    name = COALESCE(p_name, name),
    timezone = COALESCE(p_timezone, timezone),
    daily_rollover_local_time = COALESCE(p_daily_rollover_local_time, daily_rollover_local_time),
    saturday_start_local_time = COALESCE(p_saturday_start_local_time, saturday_start_local_time),
    saturday_end_local_time = COALESCE(p_saturday_end_local_time, saturday_end_local_time),
    sunday_start_local_time = COALESCE(p_sunday_start_local_time, sunday_start_local_time),
    sunday_end_local_time = COALESCE(p_sunday_end_local_time, sunday_end_local_time),
    enabled = COALESCE(p_enabled, enabled),
    display_order = COALESCE(p_display_order, display_order),
    updated_at = now()
  WHERE id = p_region_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Region not found');
  END IF;

  INSERT INTO public.admin_audit_log (admin_actor, action, payload_json)
  VALUES (
    p_admin_actor,
    'update_game_time_region',
    jsonb_build_object('region_id', p_region_id)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_game_time_region(uuid, text, text, text, time, time, time, time, time, boolean, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_game_time_region(uuid, text, text, text, time, time, time, time, time, boolean, integer, text) TO service_role;

-- ────────────────────────────────────────────────────────────────────────
-- admin_assign_user_game_time_region
-- Wraps assign_user_game_time_region with audit logging + test override option
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_assign_user_to_region(
  p_user_id uuid,
  p_region_id uuid,
  p_assigned_by text DEFAULT 'admin',
  p_assignment_reason text DEFAULT 'manual_admin_assignment',
  p_force_effective_immediately_for_test boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.assign_user_game_time_region(
    p_user_id, p_region_id, p_assigned_by, p_assignment_reason,
    p_force_effective_immediately_for_test
  );

  INSERT INTO public.admin_audit_log (admin_actor, action, payload_json)
  VALUES (
    p_assigned_by,
    'assign_user_game_time_region',
    jsonb_build_object(
      'user_id', p_user_id,
      'region_id', p_region_id,
      'reason', p_assignment_reason,
      'force_immediate', p_force_effective_immediately_for_test
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_assign_user_to_region(uuid, uuid, text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_user_to_region(uuid, uuid, text, text, boolean) TO service_role;
