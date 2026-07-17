/*
  # Add config_json column to games table

  Adds a config_json JSONB column to store per-game configuration
  such as points_on_play, points_on_win, win_chance, etc.
  This supports the admin game builder.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'config_json'
  ) THEN
    ALTER TABLE games ADD COLUMN config_json jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Set default config for active microgames
UPDATE games SET config_json = jsonb_build_object('points_on_play', 5, 'points_on_win', 15, 'win_chance', 0.25)
WHERE game_id IN ('daily_pick', 'daily_safebox') AND (config_json IS NULL OR config_json = '{}'::jsonb);

UPDATE games SET config_json = jsonb_build_object('points_on_play', 5, 'points_on_win', 10, 'win_chance', 0.5)
WHERE game_id IN ('daily_dice', 'daily_path') AND (config_json IS NULL OR config_json = '{}'::jsonb);

-- Add category column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'category'
  ) THEN
    ALTER TABLE games ADD COLUMN category text DEFAULT 'daily' CHECK (category IN ('daily','qualifier','weekend','special'));
  END IF;
END $$;

-- Update categories
UPDATE games SET category = 'daily'   WHERE game_id IN ('daily_pick','daily_safebox','daily_dice','daily_path','daily_puzzle','daily_gate');
UPDATE games SET category = 'weekend' WHERE game_id IN ('saturday_main_event','sunday_winners_event');
UPDATE games SET category = 'special' WHERE game_id IN ('shake_the_streak','climb_the_streak','multiplier_wheel','last_survivor');
