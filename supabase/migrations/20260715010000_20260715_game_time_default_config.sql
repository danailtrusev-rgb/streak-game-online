/*
  # Game Time System — safe default configuration

  Exactly what requirement #4 specifies, nothing more:
    mode = global
    global timezone = Europe/Madrid
    regional mode = disabled
  One default region (`global_madrid`) — daily rollover 00:00 local time,
  enabled. No Saturday/Sunday windows are seeded (NULL — "not configured"),
  since no existing time-boundary Saturday/Sunday logic exists to migrate
  in (confirmed in the core-schema migration's audit summary) — this is
  new foundation, not a replacement for something already running.

  No player rows are inserted into `user_game_time_region`. Every current
  and future player resolves to this default region automatically via
  `resolve_user_game_time_region()` (next migration) when they have no
  explicit assignment — zero risk to existing accounts, no manual
  assignment step required before play.
*/

INSERT INTO game_time_regions (key, name, timezone, daily_rollover_local_time, enabled, display_order)
VALUES ('global_madrid', 'Global Game Time', 'Europe/Madrid', '00:00:00', true, 0)
ON CONFLICT (key) DO NOTHING;

INSERT INTO game_time_settings (id, mode, global_region_id, regional_mode_enabled)
SELECT true, 'global', id, false
FROM game_time_regions WHERE key = 'global_madrid'
ON CONFLICT (id) DO NOTHING;
