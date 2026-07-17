/*
  # get_madrid_today() becomes Game-Time-System-authoritative

  Same signature (`get_madrid_today() RETURNS date`), same `LANGUAGE sql
  STABLE`, no grant changes (none existed to begin with — confirmed by
  searching every migration for an explicit GRANT/REVOKE on this function;
  none exists, so it always used Postgres's default grants, unchanged
  here). `CREATE OR REPLACE FUNCTION` is valid and safe.

  Only the BODY changes: instead of hardcoding `'Europe/Madrid'`, it now
  reads the Game Time System's configured global region and delegates to
  `get_game_time_state_for_region()` — the same rollover-math function
  used everywhere else in the Game Time System. In Global mode (the only
  active mode — this migration does not enable Regional mode), the global
  region is `global_madrid` (Europe/Madrid, 00:00 rollover), so this
  produces the EXACT SAME date every existing caller already received —
  confirmed by the identical-formula note in
  20260715020000_20260715_game_time_clock_rpcs.sql's header comment.

  This is intentionally the ONLY core-gameplay-adjacent function changed
  in this pass. `play_daily_gate`, `cashout_game`, `get_my_state`, and
  every other caller of `get_madrid_today()` are NOT modified — they keep
  calling this function exactly as before and automatically benefit from
  the underlying config becoming data-driven, with zero risk to gameplay
  or financial logic and zero need to individually verify ~18 other
  migrations' worth of RPC bodies. Making those RPCs genuinely per-user
  region-aware is required future work for when Regional mode is actually
  activated (not now) — documented in PROJECT_CHANGELOG.md, not silently
  deferred.

  ## Rollback
  Re-apply the body from 20260227082940_create_complete_schema.sql:
  `SELECT (now() AT TIME ZONE 'Europe/Madrid')::date;` — no data is
  touched either way; this only changes a computed value going forward.
*/

CREATE OR REPLACE FUNCTION get_madrid_today()
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT ((public.get_game_time_state_for_region(
            (SELECT global_region_id FROM public.game_time_settings WHERE id = true)
          ))->>'game_date')::date;
$$;
