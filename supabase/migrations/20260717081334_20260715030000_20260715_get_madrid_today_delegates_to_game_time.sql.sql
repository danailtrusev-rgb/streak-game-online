/*
  # get_madrid_today() becomes Game-Time-System-authoritative

  Same signature (`get_madrid_today() RETURNS date`), same `LANGUAGE sql
  STABLE`, no grant changes. `CREATE OR REPLACE FUNCTION` is valid and safe.

  Only the BODY changes: instead of hardcoding `'Europe/Madrid'`, it now
  reads the Game Time System's configured global region and delegates to
  `get_game_time_state_for_region()`. In Global mode (the only active mode),
  the global region is `global_madrid` (Europe/Madrid, 00:00 rollover), so
  this produces the EXACT SAME date every existing caller already received.
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