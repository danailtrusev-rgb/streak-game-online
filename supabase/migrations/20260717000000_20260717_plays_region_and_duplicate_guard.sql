/*
  # Region-aware plays: schema + real duplicate-play protection

  ## Audit finding (see PROJECT_CHANGELOG.md "Region-Aware Core Gameplay"
  for the full table): `play_daily_gate()`'s "already played today?" check
  (`SELECT 1 FROM plays WHERE user_id = ... AND play_date = ...`) runs
  BEFORE the `game_state` row is locked (`FOR UPDATE`), and there is NO
  database-level uniqueness constraint on `plays` at all — confirmed by
  searching every migration for a UNIQUE index/constraint on this table;
  none exists. This is a genuine pre-existing race-condition gap (two
  concurrent requests with different idempotency keys could both pass the
  check before either commits), not something introduced by the Game Time
  System work. This migration adds the real fix requirement #6 asks for.

  ## What changes
  1. `plays.game_time_region_id uuid` — nullable, additive, references
     `game_time_regions`. Historic rows get NULL (never backfilled/
     reinterpreted — see requirement #4's explicit instruction not to
     rewrite historical rows). New rows (once play_daily_gate is
     refactored in the next migration) always populate it.
  2. A real unique constraint: `(user_id, game_id, play_date)` — chosen
     over `(user_id, game_id, play_date, game_time_region_id)`
     deliberately. Per the task's own guidance: "the safest product
     behaviour is usually one daily play per user per game date, not one
     per region." Region is NOT part of the key, so a player cannot get a
     second play for the same game_date by having their region reassigned
     mid-day — the existing "safe future boundary" rule for region
     changes (previous pass) is the first line of defense; this
     constraint is the hard backstop that makes it impossible regardless.
  3. Safety check before adding the constraint: this table predates the
     July 2026 work and could theoretically already contain a duplicate
     row created during the identified race window before this fix
     existed. The constraint is only added if a check confirms no
     existing violation — if one is found, the migration logs a NOTICE
     and skips adding the constraint rather than failing the whole
     migration, and the duplicate must be resolved manually before
     re-attempting. This has not been possible to verify in this
     environment (no live database access) — flagged explicitly as
     something to confirm during real Supabase testing, not assumed safe.

  ## Not changed
  No change to `play_date`'s existing meaning, type, or values. No
  historic row is rewritten. No probability, wallet, pot, streak, or
  badge logic touched — schema only.
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

/*
  ## Rollback
  `ALTER TABLE plays DROP CONSTRAINT IF EXISTS plays_user_game_date_unique;`
  `DROP INDEX IF EXISTS idx_plays_region_date;`
  `ALTER TABLE plays DROP COLUMN IF EXISTS game_time_region_id;`
  No existing row is rewritten either way.
*/
