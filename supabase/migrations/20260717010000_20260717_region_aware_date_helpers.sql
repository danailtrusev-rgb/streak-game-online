/*
  # Region-aware date/week helpers for core gameplay

  ## Second hidden Madrid dependency found (not caught in the previous
  pass's audit)
  `get_current_week_start()` — used by the qualification engine
  (`update_weekly_qualification()`) — independently hardcodes
  `(now() AT TIME ZONE 'Europe/Madrid')` in its own body, completely
  separate from `get_madrid_today()`. It was never touched by the Game
  Time System work because the previous audit searched for
  `get_madrid_today` call sites specifically, not every independent
  Madrid literal. Found this pass by inspecting the actual qualification
  trigger chain end to end, not by re-running the same search. Fixed the
  same way as `get_madrid_today()`: same signature, same return type,
  `CREATE OR REPLACE`, delegates to the Game Time System's global region
  instead of hardcoding the literal.

  ## New helpers
  - `get_current_game_date_for_user(p_user_id)` — resolves the user's
    authoritative region and returns their current game date. This is
    the function `play_daily_gate`/`get_my_state` should call going
    forward instead of `get_madrid_today()` directly. In Global mode
    (the only active mode), it returns byte-for-byte the same value as
    `get_madrid_today()`, by construction (same underlying formula,
    same global region).
  - `get_current_week_start_for_user(p_user_id)` — the region-aware
    replacement for `get_current_week_start()`, used by qualification.
    Computes the ISO week start (Monday) in the user's resolved region's
    timezone, mirroring `get_game_time_state_for_region()`'s own
    Saturday/Sunday week-anchor derivation (`date_trunc('week', ...)`)
    for consistency.

  Both helpers currently produce IDENTICAL output for every player,
  since every player resolves to the same global region while
  `regional_game_time_live_enabled` is false — this migration makes the
  underlying computation genuinely per-user-capable without changing any
  current player's actual values.
*/

CREATE OR REPLACE FUNCTION public.get_current_game_date_for_user(p_user_id uuid)
RETURNS date
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT ((public.get_game_time_state_for_user(p_user_id))->>'game_date')::date;
$$;

CREATE OR REPLACE FUNCTION public.get_current_week_start_for_user(p_user_id uuid)
RETURNS date
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_region_id uuid;
  v_timezone  text;
BEGIN
  v_region_id := public.resolve_user_game_time_region(p_user_id);
  SELECT timezone INTO v_timezone FROM public.game_time_regions WHERE id = v_region_id;

  IF v_timezone IS NULL THEN
    -- Defensive fallback — should not happen given resolve_user_game_time_region()
    -- always falls back to the configured global region, but never let a
    -- qualification computation error out entirely because of it.
    v_timezone := 'Europe/Madrid';
  END IF;

  RETURN date_trunc('week', (now() AT TIME ZONE v_timezone))::date;
END;
$$;

-- get_current_week_start() itself — same signature/return type, now
-- delegates to the Game Time System's global region instead of hardcoding
-- 'Europe/Madrid'. Any caller that doesn't (yet) pass a user_id keeps
-- working unchanged; identical output in Global mode.
CREATE OR REPLACE FUNCTION public.get_current_week_start()
RETURNS date
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_timezone text;
BEGIN
  SELECT gtr.timezone INTO v_timezone
  FROM public.game_time_settings gts
  JOIN public.game_time_regions gtr ON gtr.id = gts.global_region_id
  WHERE gts.id = true;

  IF v_timezone IS NULL THEN
    v_timezone := 'Europe/Madrid'; -- defensive fallback only
  END IF;

  RETURN date_trunc('week', (now() AT TIME ZONE v_timezone))::date;
END;
$$;

REVOKE ALL ON FUNCTION public.get_current_game_date_for_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_game_date_for_user(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_current_week_start_for_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_week_start_for_user(uuid) TO authenticated, service_role;

/*
  ## Rollback
  Re-apply get_current_week_start()'s previous body:
  `SELECT date_trunc('week', (now() AT TIME ZONE 'Europe/Madrid'))::date;`
  Drop the two new functions:
  `DROP FUNCTION IF EXISTS public.get_current_game_date_for_user(uuid);`
  `DROP FUNCTION IF EXISTS public.get_current_week_start_for_user(uuid);`
  No data is touched either way.
*/
