/*
  # Region-aware reporting view + region-assignment inspection utility

  ## Reporting (requirement #12)
  `v_plays_by_game_date_region` — a plain view over `plays`, joined to
  `game_time_regions` for the label/timezone dimensions the founder
  dashboard can group by later: `game_date` (this is `plays.play_date`,
  the authoritative field — see the naming note below), `region_key`,
  `timezone`, `game_id`, `outcome`, `stake_cents`, `streak_after`. Rows
  from before the region-aware `play_daily_gate` migration in this pass
  simply have `region_id`/`region_key`/`timezone` as NULL (LEFT JOIN) —
  Global-mode reporting (grouping by `game_date` alone) is completely
  unaffected and remains equivalent to existing Madrid-date reporting,
  since every row's `game_date` value is unchanged by this migration.
  No dashboard UX is rewritten — this is the data layer requirement #12
  asks to have ready, not a new admin screen.

  Naming note: the view exposes `plays.play_date` under the alias
  `game_date` specifically to make the view's intent unambiguous for
  reporting consumers, without renaming the underlying column (which
  would be a needless, riskier change touching every existing caller of
  `plays.play_date`).

  ## Region-assignment inspection (requirement #16)
  `assign_user_game_time_region(...)` (write path, SECURITY DEFINER,
  service_role-only, logs every change) already existed from the
  original Game Time System pass — untouched here. This migration adds
  its read-only companion, `get_user_game_time_region_info(p_user_id)`,
  for admin/test-account inspection: current resolved region, whether it
  came from an explicit assignment or the global default, and the most
  recent change-log entry if any.
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

-- Reporting views inherit RLS from their underlying tables' policies by
-- default in Postgres only if declared security_invoker; explicit here
-- so player-level access stays scoped exactly like direct plays access
-- (own rows only) and does not accidentally grant broader visibility.
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

/*
  ## Rollback
  `DROP VIEW IF EXISTS public.v_plays_by_game_date_region;`
  `DROP FUNCTION IF EXISTS public.get_user_game_time_region_info(uuid);`
  No underlying data is touched — both are read-only.
*/
