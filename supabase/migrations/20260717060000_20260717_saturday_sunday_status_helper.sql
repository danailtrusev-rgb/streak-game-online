/*
  # Saturday Showdown / Sunday Crown — region-aware status helper

  ## Scope (foundation only, per requirement #10/#11 — no redesign)
  This does NOT change qualification thresholds, does NOT create event
  participation records, and does NOT implement "regional event
  instances" — it adds one read-only helper that combines two things
  that already independently exist and were made region-aware earlier in
  this pass:
  - The player's region's actual Saturday/Sunday time window
    (`get_game_time_state_for_region()` — `saturday_status`/
    `sunday_status`/`*_start_at`/`*_end_at`, already region-aware from the
    original Game Time System pass).
  - The player's points-based qualification for this week
    (`weekly_qualification_status.saturday_qualified`/`sunday_qualified`,
    now computed against a region-aware week boundary as of the previous
    migration in this pass).

  ## Recommended MVP model (documented per requirement #10, not built)
  "Regional Saturday Showdown / Sunday Crown instances using the same
  content and rules" — i.e. each region runs its own event window
  independently once Regional mode is real, rather than one global
  leaderboard staggered by time zone. This pass does not implement event
  instances, participation recording, or region-scoped leaderboards —
  that is real future work, listed explicitly in
  PROJECT_CHANGELOG.md "Remaining limitations."

  ## Duplicate-entry prevention (already covered, not newly built here)
  A player cannot "enter Saturday twice through region switching" or
  receive a duplicate Saturday/Sunday qualification because:
  - Region changes only take effect from a safe future boundary (Game
    Time System, previous pass) — never mid-day.
  - `weekly_qualification_status` has a real `UNIQUE (user_id,
    week_start_date)` constraint (original schema) — one qualification
    record per player per week, and `week_start_date` is now itself
    region-resolved consistently for that player.
  No new uniqueness rule was needed for this pass's scope; if a future
  pass adds real event-instance participation records, THAT table will
  need its own region-aware uniqueness at that time.
*/

CREATE OR REPLACE FUNCTION public.get_saturday_sunday_status_for_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_region_id   uuid;
  v_game_time   jsonb;
  v_week_start  date;
  v_qual        record;
BEGIN
  v_region_id  := public.resolve_user_game_time_region(p_user_id);
  v_game_time  := public.get_game_time_state_for_region(v_region_id);
  v_week_start := public.get_current_week_start_for_user(p_user_id);

  SELECT saturday_qualified, sunday_qualified, total_points, games_played_count
  INTO   v_qual
  FROM   public.weekly_qualification_status
  WHERE  user_id = p_user_id AND week_start_date = v_week_start;

  RETURN jsonb_build_object(
    'region_id',           v_region_id,
    'week_start_date',      v_week_start,
    'saturday_window_status', v_game_time->>'saturday_status',
    'saturday_start_at',       v_game_time->>'saturday_start_at',
    'saturday_end_at',          v_game_time->>'saturday_end_at',
    'saturday_qualified',        COALESCE(v_qual.saturday_qualified, false),
    'sunday_window_status',        v_game_time->>'sunday_status',
    'sunday_start_at',               v_game_time->>'sunday_start_at',
    'sunday_end_at',                  v_game_time->>'sunday_end_at',
    'sunday_qualified',                COALESCE(v_qual.sunday_qualified, false),
    'total_points',                     COALESCE(v_qual.total_points, 0),
    'games_played_count',                 COALESCE(v_qual.games_played_count, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_saturday_sunday_status_for_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_saturday_sunday_status_for_user(uuid) TO authenticated, service_role;

/*
  ## Rollback
  `DROP FUNCTION IF EXISTS public.get_saturday_sunday_status_for_user(uuid);`
  No data is touched — this is a read-only helper.
*/
