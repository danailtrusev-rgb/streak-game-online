/*
  # Duplicate-play protection becomes mandatory (no silent skip)

  ## What was wrong with the previous approach
  `20260717000000_20260717_plays_region_and_duplicate_guard.sql` checked
  for existing duplicate `(user_id, game_id, play_date)` rows and, if any
  were found, logged a `NOTICE` and **skipped adding the constraint
  entirely** — leaving the system with NO database-level duplicate-play
  protection if that branch was ever taken. A `NOTICE` is easy to miss in
  a deployment log; this is not an acceptable failure mode for something
  that exists specifically to prevent a financial/gameplay integrity bug.
  This migration replaces that behavior.

  ## What changes
  1. **Backfill**: every existing `plays` row with `game_time_region_id
     IS NULL` is set to the current global region
     (`game_time_settings.global_region_id`). This is safe, not a
     reinterpretation of history — every play ever made in this project
     WAS made under the global Madrid region, since no other mode has
     ever been active. After this, every row has a real region.
  2. **Detect duplicates** (same check as before: `(user_id, game_id,
     play_date)` groups with `COUNT(*) > 1`).
  3. **If none found**: add the real, full, mandatory
     `UNIQUE (user_id, game_id, play_date)` constraint —
     `plays_user_game_date_unique`. No partial index is needed once every
     row has a region, since the backfill above already eliminated the
     one case a partial index would have been protecting against.
  4. **If duplicates ARE found**: the migration **fails outright** with a
     clear, actionable `RAISE EXCEPTION` — naming the exact duplicate
     count and pointing at the new `v_duplicate_daily_plays` audit view
     for inspection. This deliberately blocks the migration chain rather
     than silently continuing without protection — exactly what was
     asked for. If this happens during real deployment, the duplicates
     must be resolved (manually reviewed and one row per group deleted
     or merged) and this migration re-run before proceeding.

  ## Duplicate-audit view
  `v_duplicate_daily_plays` — for deployment validation before
  production, not exposed to normal application roles (see grants
  below). Columns: `user_id, game_id, play_date, duplicate_count,
  play_ids, created_at_min, created_at_max` — exactly the shape
  requested. No other user data (wallet, streak, outcome, etc.) is
  exposed by this view.
*/

-- ── Step 1: backfill ─────────────────────────────────────────────────────
UPDATE plays
SET game_time_region_id = (SELECT global_region_id FROM game_time_settings WHERE id = true)
WHERE game_time_region_id IS NULL;

-- ── Step 2: duplicate-audit view (created before the check, so it's
--    available for inspection immediately if the migration below fails) ──
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

-- Admin/service-role inspection only — this view can reveal an
-- individual player's play pattern across dates, so it is not exposed to
-- normal authenticated clients.
REVOKE ALL ON public.v_duplicate_daily_plays FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_duplicate_daily_plays TO service_role;

-- ── Step 3: detect and either protect or fail loudly ────────────────────
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

/*
  ## Rollback
  `ALTER TABLE public.plays DROP CONSTRAINT IF EXISTS plays_user_game_date_unique;`
  `DROP VIEW IF EXISTS public.v_duplicate_daily_plays;`
  The backfill (`game_time_region_id` population) is not reversed by
  rollback — it is a safe, one-directional correction (every historic row
  genuinely was played under the global region), not a behavioral change
  to undo.
*/
