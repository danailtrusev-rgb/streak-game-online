/*
  # Reporting: expose derived status alongside stored status
  v_event_instances_by_region gains derived_status column.
  Must DROP VIEW first — CREATE OR REPLACE cannot rename columns.
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