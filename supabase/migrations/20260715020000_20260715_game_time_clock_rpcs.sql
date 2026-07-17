/*
  # Game Time System — shared Game Clock RPCs

  Three functions, cleanly separated:
  1. `get_game_time_state_for_region(p_region_id)` — the actual clock math,
     given a region. Pure computation, no per-user cost — this is what
     makes set-based scheduler queries possible (compute once per DISTINCT
     region among candidates, not once per user).
  2. `get_game_time_state_for_user(p_user_id)` — resolves the user's
     effective region (their explicit assignment, or the global default),
     then delegates to (1). This is the "conceptually similar to
     get_game_time_state_for_user()" RPC the task asked for.
  3. `resolve_user_game_time_region(p_user_id)` — just the region
     resolution, reusable directly by set-based queries (see
     PROJECT_CHANGELOG.md "Scheduler efficiency" for how the notification
     scheduler uses this to group users by region without one RPC call
     per user).

  Plus `assign_user_game_time_region(...)` — the only write path for
  region assignment (SECURITY DEFINER, logs every change,
  requirement #6/#7), and `apply_pending_game_time_mode()` — the manual
  (not Cron-triggered) application of a scheduled mode switch.

  ## Rollover/game-date math
  For a region with IANA timezone `tz` and local rollover time-of-day `r`:
    local_date     = (now() AT TIME ZONE tz)::date
    local_time     = (now() AT TIME ZONE tz)::time
    game_date      = local_time < r ? local_date - 1 : local_date
    rollover_at    = (game_date + r) AT TIME ZONE tz         -- this game date's own start
    next_rollover  = (game_date + 1 + r) AT TIME ZONE tz     -- when this game date ends
  For the seeded default region (rollover = 00:00), `local_time < '00:00:00'`
  is never true, so `game_date` always equals `local_date` — this is
  BYTE-FOR-BYTE what `get_madrid_today()` already computed, confirming
  Global Game Time mode is unchanged by this migration. The formula
  generalizes correctly to any future region with a non-midnight rollover.
  Uses `AT TIME ZONE` throughout (never a fixed UTC offset), so DST
  transitions in any IANA zone are handled by Postgres's own tzdata, the
  same mechanism `get_madrid_today()` already relied on.
*/

CREATE OR REPLACE FUNCTION public.get_game_time_state_for_region(p_region_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_region        record;
  v_local_date    date;
  v_local_time    time;
  v_game_date     date;
  v_prev_game_date date;
  v_rollover_at   timestamptz;
  v_next_rollover timestamptz;
  v_sat_date      date;
  v_sun_date      date;
  v_sat_start     timestamptz;
  v_sat_end       timestamptz;
  v_sat_status    text;
  v_sun_start     timestamptz;
  v_sun_end       timestamptz;
  v_sun_status    text;
BEGIN
  SELECT * INTO v_region FROM public.game_time_regions WHERE id = p_region_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown game time region';
  END IF;

  v_local_date := (now() AT TIME ZONE v_region.timezone)::date;
  v_local_time := (now() AT TIME ZONE v_region.timezone)::time;

  IF v_local_time < v_region.daily_rollover_local_time THEN
    v_game_date := v_local_date - 1;
  ELSE
    v_game_date := v_local_date;
  END IF;
  v_prev_game_date := v_game_date - 1;

  v_rollover_at   := (v_game_date + v_region.daily_rollover_local_time) AT TIME ZONE v_region.timezone;
  v_next_rollover := (v_game_date + 1 + v_region.daily_rollover_local_time) AT TIME ZONE v_region.timezone;

  -- Saturday/Sunday of the CURRENT region-local week (ISO weeks: Monday=0 offset, Saturday=+5, Sunday=+6).
  v_sat_date := (date_trunc('week', v_local_date::timestamp))::date + 5;
  v_sun_date := (date_trunc('week', v_local_date::timestamp))::date + 6;

  IF v_region.saturday_start_local_time IS NULL THEN
    v_sat_status := 'not_configured';
  ELSE
    v_sat_start := (v_sat_date + v_region.saturday_start_local_time) AT TIME ZONE v_region.timezone;
    v_sat_end   := (v_sat_date + COALESCE(v_region.saturday_end_local_time, '23:59:59'::time)) AT TIME ZONE v_region.timezone;
    v_sat_status := CASE
      WHEN now() < v_sat_start THEN 'upcoming'
      WHEN now() BETWEEN v_sat_start AND v_sat_end THEN 'active'
      ELSE 'ended'
    END;
  END IF;

  IF v_region.sunday_start_local_time IS NULL THEN
    v_sun_status := 'not_configured';
  ELSE
    v_sun_start := (v_sun_date + v_region.sunday_start_local_time) AT TIME ZONE v_region.timezone;
    v_sun_end   := (v_sun_date + COALESCE(v_region.sunday_end_local_time, '23:59:59'::time)) AT TIME ZONE v_region.timezone;
    v_sun_status := CASE
      WHEN now() < v_sun_start THEN 'upcoming'
      WHEN now() BETWEEN v_sun_start AND v_sun_end THEN 'active'
      ELSE 'ended'
    END;
  END IF;

  RETURN jsonb_build_object(
    'region_id',              v_region.id,
    'region_key',             v_region.key,
    'timezone',                v_region.timezone,
    'local_now',                now(),
    'game_date',                v_game_date,
    'previous_game_date',       v_prev_game_date,
    'daily_rollover_at',         v_rollover_at,
    'next_daily_rollover_at',    v_next_rollover,
    'daily_window_open',          true,  -- the full game date is one open window in this Phase 1 model
    'daily_window_closed',        false,
    'saturday_status',            v_sat_status,
    'saturday_start_at',          v_sat_start,
    'saturday_end_at',            v_sat_end,
    'sunday_status',               v_sun_status,
    'sunday_start_at',             v_sun_start,
    'sunday_end_at',               v_sun_end
  );
END;
$$;

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
       WHERE ugtr.user_id = p_user_id AND gtr.enabled = true),
    (SELECT global_region_id FROM public.game_time_settings WHERE id = true)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_game_time_state_for_user(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_settings  record;
  v_region_id uuid;
BEGIN
  SELECT * INTO v_settings FROM public.game_time_settings WHERE id = true;

  IF v_settings.mode = 'regional' AND p_user_id IS NOT NULL THEN
    v_region_id := public.resolve_user_game_time_region(p_user_id);
  ELSE
    -- Global mode (the only active mode today) — every player uses the
    -- global region regardless of any individual assignment. This is
    -- what makes "Preserve current behaviour in Global Game Time mode"
    -- true even for a player who already has an explicit (but currently
    -- inert) region row.
    v_region_id := v_settings.global_region_id;
  END IF;

  RETURN public.get_game_time_state_for_region(v_region_id) || jsonb_build_object('mode', v_settings.mode);
END;
$$;

-- ── Region assignment — the only write path (requirement #6/#7) ────────
CREATE OR REPLACE FUNCTION public.assign_user_game_time_region(
  p_user_id           uuid,
  p_region_id         uuid,
  p_effective_from    timestamptz,
  p_assigned_by       text,
  p_assignment_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_previous_region_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_region_id IS NULL OR p_assigned_by IS NULL THEN
    RAISE EXCEPTION 'user_id, region_id, and assigned_by are required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.game_time_regions WHERE id = p_region_id AND enabled = true) THEN
    RAISE EXCEPTION 'Region does not exist or is not enabled';
  END IF;

  SELECT region_id INTO v_previous_region_id FROM public.user_game_time_region WHERE user_id = p_user_id;

  INSERT INTO public.user_game_time_region (user_id, region_id, effective_from, assigned_by, assignment_reason)
  VALUES (p_user_id, p_region_id, p_effective_from, p_assigned_by, p_assignment_reason)
  ON CONFLICT (user_id) DO UPDATE SET
    region_id         = EXCLUDED.region_id,
    effective_from    = EXCLUDED.effective_from,
    assigned_by        = EXCLUDED.assigned_by,
    assignment_reason  = EXCLUDED.assignment_reason;

  INSERT INTO public.user_game_time_region_change_log (user_id, previous_region_id, new_region_id, effective_from, changed_by, change_reason)
  VALUES (p_user_id, v_previous_region_id, p_region_id, p_effective_from, p_assigned_by, p_assignment_reason);
END;
$$;

-- ── Scheduled mode switch — applied manually, never by a background job ─
-- (Cron stays inactive per this task's instructions; this function exists
-- so the effective-time boundary is enforced even when applied by hand.)
CREATE OR REPLACE FUNCTION public.apply_pending_game_time_mode(p_applied_by text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_settings record;
BEGIN
  SELECT * INTO v_settings FROM public.game_time_settings WHERE id = true;
  IF v_settings.pending_mode IS NULL OR v_settings.pending_mode_effective_at IS NULL THEN
    RETURN false; -- nothing pending
  END IF;
  IF now() < v_settings.pending_mode_effective_at THEN
    RETURN false; -- boundary not reached yet — refuse to apply early
  END IF;

  UPDATE public.game_time_settings
  SET mode = v_settings.pending_mode,
      regional_mode_enabled = (v_settings.pending_mode = 'regional'),
      pending_mode = NULL,
      pending_mode_effective_at = NULL,
      pending_mode_requested_by = NULL,
      pending_mode_requested_at = NULL,
      updated_at = now(),
      updated_by = p_applied_by
  WHERE id = true;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.get_game_time_state_for_region(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_game_time_state_for_region(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_game_time_state_for_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_game_time_state_for_user(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.resolve_user_game_time_region(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_user_game_time_region(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.assign_user_game_time_region(uuid, uuid, timestamptz, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_user_game_time_region(uuid, uuid, timestamptz, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.apply_pending_game_time_mode(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_pending_game_time_mode(text) TO service_role;
