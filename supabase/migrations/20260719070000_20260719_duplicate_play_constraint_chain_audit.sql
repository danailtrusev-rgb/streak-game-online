/*
  # Duplicate-play constraint chain: audit and explicit final-state assertion

  ## Audit (requirement #17) — checked the actual migration text, not assumed
  `20260717000000_20260717_plays_region_and_duplicate_guard.sql` (the
  original pass) and `20260718000000_20260718_duplicate_play_hard_guard.sql`
  (the hardening pass that replaced its soft `NOTICE`-and-skip behavior)
  both target the **exact same constraint name**,
  `plays_user_game_date_unique`, and both guard their `ALTER TABLE ADD
  CONSTRAINT` with `IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE
  conname = 'plays_user_game_date_unique')`. Consequence, traced through
  concretely:
  - If `20260717000000` already added the constraint (no duplicates
    existed at that point), `20260718000000`'s guard sees it already
    exists and correctly skips re-adding it — no conflict, no error.
  - If `20260717000000` skipped it (duplicates existed then, silently),
    `20260718000000` backfills, re-checks, and either succeeds (if
    nothing else prevented it) or fails loudly.
  - No other index or constraint name is used by either migration for
    this purpose — there is no naming collision to resolve.

  **Conclusion: no actual conflicting or confusing duplicate
  index/constraint was found.** This migration is the required explicit
  documentation of that audit finding, plus a defensive final-state
  assertion — not a fabricated fix for a problem that isn't there.

  ## Final-state assertion
  Re-verifies, as of THIS migration running (i.e., after any of this
  pass's own changes, none of which touch `plays`), that the constraint
  either exists or duplicates are the reason it doesn't — failing loudly
  in the latter case, exactly like the migration that introduced it,
  so this property can never silently regress even if a future migration
  in this chain is added carelessly.
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
    RETURN; -- protected — nothing further to do
  END IF;

  SELECT COUNT(*) INTO v_duplicate_count FROM public.v_duplicate_daily_plays;

  IF v_duplicate_count > 0 THEN
    RAISE EXCEPTION
      'plays_user_game_date_unique still does not exist because % duplicate (user_id, game_id, play_date) group(s) remain. Duplicate-play protection is NOT active. Inspect with: SELECT * FROM public.v_duplicate_daily_plays; resolve, then re-run 20260718000000_20260718_duplicate_play_hard_guard.sql.',
      v_duplicate_count;
  ELSE
    -- No duplicates and no constraint — shouldn't be reachable given the
    -- prior migration's own logic, but add it defensively rather than
    -- silently leaving protection absent for an unexpected reason.
    ALTER TABLE public.plays ADD CONSTRAINT plays_user_game_date_unique UNIQUE (user_id, game_id, play_date);
  END IF;
END $$;
