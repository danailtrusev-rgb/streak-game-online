/*
  # Reporting: expose derived status alongside stored status

  `v_event_instances_by_region` gets a `derived_status` column computed
  via `get_event_instance_derived_status()` (previous migration in this
  pass) — the real-time scheduled/open/closed/finalized/cancelled state,
  since the stored `status` column is never advanced by anything while
  Cron remains inactive except at creation and finalization. Both are
  exposed; the stored column is not removed or reinterpreted.

  ## Note on DROP + CREATE
  `CREATE OR REPLACE VIEW` cannot rename an existing view column
  (`status` → `stored_status`) — Postgres rejects it with
  `42P16: cannot change name of view column`. The view is dropped first,
  then recreated with the new column names. This is safe because the view
  is read-only with no dependent objects.
*/

DROP VIEW IF EXISTS public.v_event_instances_by_region;

CREATE VIEW public.v_event_instances_by_region AS
SELECT
  ei.id,
  ei.event_type,
  ei.game_time_region_id AS region_id,
  gtr.key AS region_key,
  gtr.timezone,
  ei.event_date,
  ei.starts_at,
  ei.ends_at,
  ei.status AS stored_status,
  public.get_event_instance_derived_status(ei.id) AS derived_status,
  ei.rules_version,
  (SELECT COUNT(*) FROM public.weekend_event_entries wee WHERE wee.event_instance_id = ei.id) AS participant_count
FROM public.event_instances ei
JOIN public.game_time_regions gtr ON gtr.id = ei.game_time_region_id;

ALTER VIEW public.v_event_instances_by_region SET (security_invoker = true);

/*
  ## Rollback
  Re-apply the previous body from
  20260719060000_20260719_event_reporting_views.sql (drops the
  derived_status column, renames stored_status back to status). No
  underlying data is touched — read-only view.
*/
