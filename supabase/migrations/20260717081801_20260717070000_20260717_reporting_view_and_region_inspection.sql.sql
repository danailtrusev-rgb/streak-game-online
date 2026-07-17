/*
  # Region-aware reporting view + region-assignment inspection utility
  - v_plays_by_game_date_region: view over plays joined to game_time_regions
  - get_user_game_time_region_info: admin/test inspection RPC
*/

CREATE OR REPLACE VIEW public.v_plays_by_game_date_region AS
SELECT
  p.id,
  p.user_id,
  p.game_id,
  p.play_date AS game_date,
  p.game_time_region_id AS region_id,
  gtr.key AS region_key,
  gtr.timezone,
  p.outcome,
  p.stake_cents,
  p.streak_before,
  p.streak_after,
  p.milestone_hit,
  p.created_at
FROM public.plays p
LEFT JOIN public.game_time_regions gtr ON gtr.id = p.game_time_region_id;

ALTER VIEW public.v_plays_by_game_date_region SET (security_invoker = true);

CREATE OR REPLACE FUNCTION public.get_user_game_time_region_info(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_explicit   record;
  v_region_id  uuid;
  v_region     record;
  v_last_change record;
BEGIN
  v_region_id := public.resolve_user_game_time_region(p_user_id);
  SELECT key, name, timezone INTO v_region FROM public.game_time_regions WHERE id = v_region_id;

  SELECT region_id, effective_from, assigned_by, assignment_reason
  INTO v_explicit
  FROM public.user_game_time_region WHERE user_id = p_user_id;

  SELECT previous_region_id, new_region_id, effective_from, changed_by, change_reason, created_at
  INTO v_last_change
  FROM public.user_game_time_region_change_log
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'user_id',              p_user_id,
    'resolved_region_id',    v_region_id,
    'resolved_region_key',    v_region.key,
    'resolved_region_name',    v_region.name,
    'resolved_timezone',         v_region.timezone,
    'has_explicit_assignment',    v_explicit.region_id IS NOT NULL,
    'explicit_assignment', CASE WHEN v_explicit.region_id IS NOT NULL THEN jsonb_build_object(
      'region_id',        v_explicit.region_id,
      'effective_from',    v_explicit.effective_from,
      'assigned_by',        v_explicit.assigned_by,
      'assignment_reason',   v_explicit.assignment_reason
    ) ELSE NULL END,
    'last_change_log_entry', CASE WHEN v_last_change.new_region_id IS NOT NULL THEN jsonb_build_object(
      'previous_region_id', v_last_change.previous_region_id,
      'new_region_id',       v_last_change.new_region_id,
      'effective_from',       v_last_change.effective_from,
      'changed_by',             v_last_change.changed_by,
      'change_reason',           v_last_change.change_reason,
      'created_at',                v_last_change.created_at
    ) ELSE NULL END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_game_time_region_info(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_game_time_region_info(uuid) TO service_role;