/*
  # Region-aware plays: schema + real duplicate-play protection

  ## What changes
  1. `plays.game_time_region_id uuid` — nullable, additive, references
     `game_time_regions`. Historic rows get NULL (never backfilled).
  2. A real unique constraint: `(user_id, game_id, play_date)` — Region is
     NOT part of the key, so a player cannot get a second play for the same
     game_date by having their region reassigned mid-day.
  3. Safety check before adding the constraint: only added if no existing
     violation. Preflight duplicate check confirmed zero duplicates.
*/

ALTER TABLE plays
  ADD COLUMN IF NOT EXISTS game_time_region_id uuid REFERENCES game_time_regions(id);

CREATE INDEX IF NOT EXISTS idx_plays_region_date ON plays(game_time_region_id, play_date);

DO $$
DECLARE
  v_duplicate_count integer;
BEGIN
  SELECT COUNT(*) INTO v_duplicate_count
  FROM (
    SELECT user_id, game_id, play_date
    FROM plays
    GROUP BY user_id, game_id, play_date
    HAVING COUNT(*) > 1
  ) dupes;

  IF v_duplicate_count = 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'plays_user_game_date_unique'
    ) THEN
      ALTER TABLE plays ADD CONSTRAINT plays_user_game_date_unique UNIQUE (user_id, game_id, play_date);
      RAISE NOTICE 'plays_user_game_date_unique constraint added successfully.';
    END IF;
  ELSE
    RAISE NOTICE 'SKIPPED adding plays_user_game_date_unique — % existing duplicate (user_id, game_id, play_date) group(s) found. Resolve manually, then re-run: ALTER TABLE plays ADD CONSTRAINT plays_user_game_date_unique UNIQUE (user_id, game_id, play_date);', v_duplicate_count;
  END IF;
END $$;