/*
  # Notification dedupe includes the authoritative Game Time region

  Adds `region_id` (nullable — historic rows predate this column and are
  never rewritten) and re-scopes the unique dedupe index to
  `(user_id, notification_type, game_date, region_id)`. In Global mode
  (the only active mode), every row's `region_id` is the same global
  region, so this is a no-op in practice today.
*/

ALTER TABLE notification_delivery_log
  ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES game_time_regions(id);

DROP INDEX IF EXISTS idx_notification_delivery_dedupe;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_delivery_dedupe
  ON notification_delivery_log (user_id, notification_type, game_date, region_id)
  WHERE notification_type <> 'test';