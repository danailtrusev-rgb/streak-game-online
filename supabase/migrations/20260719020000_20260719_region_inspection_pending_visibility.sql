/*
  # Region inspection: current + pending visibility

  `get_user_game_time_region_info(p_user_id)` (added in the Game Time
  System pass) previously read the single-row `user_game_time_region`
  table directly. Updated to read from
  `user_game_time_region_assignments` and report BOTH the currently
  resolved/effective assignment and any pending (not-yet-effective) one
  separately — satisfying "must remain queryable for admin/test
  visibility" for pending assignments specifically, which the old
  single-row table could never show (the pending assignment interpretation
  wasn't a real gap; there was no PAST assignment to show together with it).
*/

CREATE OR REPLACE FUNCTION public.get_user_game_time_region_info(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_region_id    uuid;
  v_region       record;
  v_active       record;
  v_pending      record;
  v_last_change  record;
BEGIN
  v_region_id := public.resolve_user_game_time_region(p_user_id);
  SELECT key, name, timezone INTO v_region FROM public.game_time_regions WHERE id = v_region_id;

  -- The row currently satisfying the resolution window (if any) — same
  -- condition resolve_user_game_time_region() itself uses.
  SELECT id, region_id, effective_from, effective_until, status, assigned_by, assignment_reason
  INTO v_active
  FROM public.user_game_time_region_assignments
  WHERE user_id = p_user_id
    AND status <> 'cancelled'
    AND effective_from <= now()
    AND (effective_until IS NULL OR effective_until > now())
  ORDER BY effective_from DESC
  LIMIT 1;

  -- Any row scheduled for the future — visible for admin/test purposes
  -- even though it does not affect resolution yet.
  SELECT id, region_id, effective_from, assigned_by, assignment_reason
  INTO v_pending
  FROM public.user_game_time_region_assignments
  WHERE user_id = p_user_id
    AND status <> 'cancelled'
    AND effective_from > now()
  ORDER BY effective_from ASC
  LIMIT 1;

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
    'active_assignment', CASE WHEN v_active.id IS NOT NULL THEN jsonb_build_object(
      'region_id',        v_active.region_id,
      'effective_from',    v_active.effective_from,
      'effective_until',    v_active.effective_until,
      'status',              v_active.status,
      'assigned_by',           v_active.assigned_by,
      'assignment_reason',      v_active.assignment_reason
    ) ELSE NULL END,
    'pending_assignment', CASE WHEN v_pending.id IS NOT NULL THEN jsonb_build_object(
      'region_id',        v_pending.region_id,
      'effective_from',    v_pending.effective_from,
      'assigned_by',         v_pending.assigned_by,
      'assignment_reason',     v_pending.assignment_reason
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

/*
  ## Rollback
  Re-apply the previous body from
  20260717070000_20260717_reporting_view_and_region_inspection.sql
  (reads from the deprecated single-row table, no pending-assignment
  visibility). No data is touched either way — read-only function.
*/
