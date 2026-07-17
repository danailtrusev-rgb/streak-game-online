/*
  # Duplicate-play constraint chain: audit and explicit final-state assertion
  Re-verifies plays_user_game_date_unique exists; fails loudly if not + duplicates remain.
*/

DO $$
DECLARE
  v_constraint_exists boolean;
  v_duplicate_count    integer;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'plays_user_game_date_unique'
  ) INTO v_constraint_exists;

  IF v_constraint_exists THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_duplicate_count FROM public.v_duplicate_daily_plays;

  IF v_duplicate_count > 0 THEN
    RAISE EXCEPTION
      'plays_user_game_date_unique still does not exist because % duplicate (user_id, game_id, play_date) group(s) remain. Duplicate-play protection is NOT active. Inspect with: SELECT * FROM public.v_duplicate_daily_plays; resolve, then re-run 20260718000000_20260718_duplicate_play_hard_guard.sql.',
      v_duplicate_count;
  ELSE
    ALTER TABLE public.plays ADD CONSTRAINT plays_user_game_date_unique UNIQUE (user_id, game_id, play_date);
  END IF;
END $$;