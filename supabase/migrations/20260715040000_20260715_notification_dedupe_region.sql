/*
  # Notification dedupe includes the authoritative Game Time region

  ## Why
  Requirement: "Dedupe should include the authoritative: User, Notification
  type, Game date, Region or schedule version if necessary... A player
  must not receive duplicates after a region reassignment." Since a game
  date is only meaningful relative to a specific region's rollover, the
  dedupe key needs the region too, not just the date string.

  ## What changes
  Adds `region_id` (nullable — historic rows predate this column and are
  never rewritten) and re-scopes the unique dedupe index to
  `(user_id, notification_type, game_date, region_id)`.

  In Global mode (the only active mode), every row's `region_id` is the
  same global region, so this is a no-op in practice today — it only
  matters once Regional mode is active and a player's region can change.
  Combined with requirement #7's rule that region changes only take
  effect from a safe future boundary (never mid-day), this closes the
  described exploit path: a region reassignment cannot retroactively
  create a second valid game_date for the period that already had a
  notification sent.

  `region_id` is populated by the scheduler going forward (see the
  Reactivation System refactor in this same pass) — not backfilled for
  historic rows, since backfilling would mean asserting which region a
  past notification "belongs to" retroactively, which requirement #10
  explicitly warns against for play/financial data and is unnecessary
  here (historic dedupe correctness for already-sent notifications isn't
  affected by a NULL region_id on old rows — the new index simply
  couldn't be violated by two old rows sharing a NULL region_id in a
  meaningful way, since NULL is never equal to NULL in a unique index
  check, and no old row will ever be re-inserted anyway).
*/

ALTER TABLE notification_delivery_log
  ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES game_time_regions(id);

DROP INDEX IF EXISTS idx_notification_delivery_dedupe;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_delivery_dedupe
  ON notification_delivery_log (user_id, notification_type, game_date, region_id)
  WHERE notification_type <> 'test';

/*
  ## Rollback
  `DROP INDEX IF EXISTS idx_notification_delivery_dedupe;`
  `CREATE UNIQUE INDEX idx_notification_delivery_dedupe ON notification_delivery_log
   (user_id, notification_type, game_date) WHERE notification_type <> 'test';`
  `ALTER TABLE notification_delivery_log DROP COLUMN IF EXISTS region_id;`
  No existing row's meaning changes either way.
*/
