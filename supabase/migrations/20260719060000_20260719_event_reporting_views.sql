/*
  # Weekend event reporting/leaderboard foundation

  Plain, read-only views — no dashboard UI is built or redesigned here,
  per requirement #13's explicit scope. All use `security_invoker = true`
  so RLS on the underlying tables is respected, not bypassed.
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

-- Participant-level rows include user_id — not exposed beyond what the
-- underlying table's own RLS already allows (players see only their own
-- row; admin/service_role sees all, same as weekend_event_entries today).
ALTER VIEW public.v_event_participants_by_instance SET (security_invoker = true);

-- Region-scoped leaderboards — never mixes entries across regions, since
-- each row is already tied to exactly one event_instance_id, which is
-- itself tied to exactly one region. Ordered by reward (finalized
-- events) then entry time as a stable tiebreak — no new scoring logic
-- invented; this only orders and exposes what result_status/reward_cents
-- already record.
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

/*
  ## Rollback
  `DROP VIEW IF EXISTS public.v_event_instances_by_region;`
  `DROP VIEW IF EXISTS public.v_event_participants_by_instance;`
  `DROP VIEW IF EXISTS public.v_saturday_leaderboard_by_region;`
  `DROP VIEW IF EXISTS public.v_sunday_leaderboard_by_region;`
  No underlying data is touched — all four are read-only.
*/
