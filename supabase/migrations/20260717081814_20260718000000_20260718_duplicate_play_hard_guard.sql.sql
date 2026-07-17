/*
  # Duplicate-play protection becomes mandatory (no silent skip)
  1. Backfill: every plays row with NULL game_time_region_id gets the global region
  2. Create v_duplicate_daily_plays audit view (service_role only)
  3. Add UNIQUE constraint if no duplicates; fail loudly if duplicates exist
*/

-- Step 1: backfill
UPDATE plays
SET game_time_region_id = (SELECT global_region_id FROM game_time_settings WHERE id = true)
WHERE game_time_region_id IS NULL;

-- Step 2: duplicate-audit view
CREATE OR REPLACE VIEW public.v_duplicate_daily_plays AS
SELECT
  user_id,
  game_id,
  play_date,
  COUNT(*) AS duplicate_count,
  array_agg(id ORDER BY created_at) AS play_ids,
  MIN(created_at) AS created_at_min,
  MAX(created_at) AS created_at_max
FROM public.plays
GROUP BY user_id, game_id, play_date
HAVING COUNT(*) > 1;

REVOKE ALL ON public.v_duplicate_daily_plays FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_duplicate_daily_plays TO service_role;

-- Step 3: detect and either protect or fail loudly
DO $$
DECLARE
  v_duplicate_count integer;
BEGIN
  SELECT COUNT(*) INTO v_duplicate_count FROM public.v_duplicate_daily_plays;

  IF v_duplicate_count = 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'plays_user_game_date_unique'
    ) THEN
      ALTER TABLE public.plays ADD CONSTRAINT plays_user_game_date_unique UNIQUE (user_id, game_id, play_date);
    END IF;
  ELSE
    RAISE EXCEPTION
      'Cannot add plays_user_game_date_unique: % duplicate (user_id, game_id, play_date) group(s) found. Inspect them with: SELECT * FROM public.v_duplicate_daily_plays; — resolve (review and remove/merge the extra row(s) per group) before re-running this migration. Duplicate-play protection is NOT active until this constraint is successfully added; do not proceed to a live deployment in this state.',
      v_duplicate_count;
  END IF;
END $$;