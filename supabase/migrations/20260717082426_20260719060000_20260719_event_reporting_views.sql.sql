/*
  # Weekend event reporting/leaderboard foundation
  Four read-only views with security_invoker = true.
*/

CREATE OR REPLACE VIEW public.v_event_instances_by_region AS
SELECT
  ei.id,
  ei.event_type,
  ei.game_time_region_id AS region_id,
  gtr.key AS region_key,
  gtr.timezone,
  ei.event_date,
  ei.starts_at,
  ei.ends_at,
  ei.status,
  ei.rules_version,
  (SELECT COUNT(*) FROM public.weekend_event_entries wee WHERE wee.event_instance_id = ei.id) AS participant_count
FROM public.event_instances ei
JOIN public.game_time_regions gtr ON gtr.id = ei.game_time_region_id;

ALTER VIEW public.v_event_instances_by_region SET (security_invoker = true);

CREATE OR REPLACE VIEW public.v_event_participants_by_instance AS
SELECT
  wee.id AS entry_id,
  wee.event_instance_id,
  wee.user_id,
  wee.event_game_id,
  wee.week_start_date,
  wee.game_time_region_id AS region_id,
  wee.result_status,
  wee.reward_cents,
  wee.entered_at
FROM public.weekend_event_entries wee
WHERE wee.event_instance_id IS NOT NULL;

ALTER VIEW public.v_event_participants_by_instance SET (security_invoker = true);

CREATE OR REPLACE VIEW public.v_saturday_leaderboard_by_region AS
SELECT
  wee.event_instance_id,
  wee.game_time_region_id AS region_id,
  gtr.key AS region_key,
  wee.user_id,
  wee.result_status,
  wee.reward_cents,
  wee.entered_at
FROM public.weekend_event_entries wee
LEFT JOIN public.game_time_regions gtr ON gtr.id = wee.game_time_region_id
WHERE wee.event_game_id = 'saturday_main_event' AND wee.event_instance_id IS NOT NULL
ORDER BY wee.game_time_region_id, wee.reward_cents DESC NULLS LAST, wee.entered_at ASC;

ALTER VIEW public.v_saturday_leaderboard_by_region SET (security_invoker = true);

CREATE OR REPLACE VIEW public.v_sunday_leaderboard_by_region AS
SELECT
  wee.event_instance_id,
  wee.game_time_region_id AS region_id,
  gtr.key AS region_key,
  wee.user_id,
  wee.result_status,
  wee.reward_cents,
  wee.entered_at
FROM public.weekend_event_entries wee
LEFT JOIN public.game_time_regions gtr ON gtr.id = wee.game_time_region_id
WHERE wee.event_game_id = 'sunday_winners_event' AND wee.event_instance_id IS NOT NULL
ORDER BY wee.game_time_region_id, wee.reward_cents DESC NULLS LAST, wee.entered_at ASC;

ALTER VIEW public.v_sunday_leaderboard_by_region SET (security_invoker = true);