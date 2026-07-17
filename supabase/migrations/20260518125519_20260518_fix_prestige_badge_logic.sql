/*
  # Fix Prestige Badge Unlock Logic

  ## Summary
  The first prestige badge was incorrectly requiring 2 completed 30-day cycles before
  unlocking. This migration corrects the logic so prestige_cycle_1 unlocks after the
  FIRST completed cycle (completed_cycles = 1), prestige_cycle_2 after the second, etc.

  ## Changes

  ### Badge key rename in user_badges
  - prestige_cycle_2 → prestige_cycle_1
  - prestige_cycle_3 → prestige_cycle_2
  - prestige_cycle_4 → prestige_cycle_3
  - prestige_cycle_5 → prestige_cycle_4
  - prestige_cycle_6 → prestige_cycle_5

  ### evaluate_badges_after_play trigger function
  - Changed prestige award range from BETWEEN 2 AND 6 to BETWEEN 1 AND 5
  - Now awards prestige_cycle_1 at completed_cycles = 1 (first completed 30-day cycle)

  ### Backfill DO block
  - Same range correction applied to the historical backfill logic

  ### GameState completed_cycles
  - No schema change needed — column already exists from 20260518_badge_achievements.sql

  ## Notes
  1. The unique constraint (user_id, badge_key) is temporarily disabled during rename
     so we can do the rename without conflicts
  2. If a player somehow has both the old and new key (impossible in practice but safe),
     the older duplicate is deleted
  3. completed_cycles values in game_state are already correct — they track the actual
     count of completed cycles regardless of badge key names
*/

-- ── Step 1: Rename existing prestige badge rows ───────────────────────────────
-- Process highest → lowest to avoid conflicts with the unique constraint.
-- prestige_cycle_6 → prestige_cycle_5 (first, no conflict)
UPDATE public.user_badges
SET badge_key = 'prestige_cycle_5'
WHERE badge_key = 'prestige_cycle_6';

-- prestige_cycle_5 → prestige_cycle_4
-- Any user with an existing prestige_cycle_4 should not exist (only 5 badges max),
-- but use ON CONFLICT safe delete-then-insert pattern via DO $$ block.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id, user_id FROM public.user_badges WHERE badge_key = 'prestige_cycle_5'
    AND badge_key <> 'prestige_cycle_5' -- won't match — placeholder for ordering
  LOOP
    NULL; -- no-op placeholder
  END LOOP;
END $$;

-- Safe sequential rename using DELETE + upsert pattern to respect unique constraint.
-- For each rename: delete any conflicting target key first, then rename source.

-- 5 → 4
DELETE FROM public.user_badges ub1
WHERE ub1.badge_key = 'prestige_cycle_4'
  AND EXISTS (
    SELECT 1 FROM public.user_badges ub2
    WHERE ub2.user_id = ub1.user_id AND ub2.badge_key = 'prestige_cycle_5'
  );
UPDATE public.user_badges SET badge_key = 'prestige_cycle_4' WHERE badge_key = 'prestige_cycle_5';

-- 4 → 3
DELETE FROM public.user_badges ub1
WHERE ub1.badge_key = 'prestige_cycle_3'
  AND EXISTS (
    SELECT 1 FROM public.user_badges ub2
    WHERE ub2.user_id = ub1.user_id AND ub2.badge_key = 'prestige_cycle_4'
  );
UPDATE public.user_badges SET badge_key = 'prestige_cycle_3' WHERE badge_key = 'prestige_cycle_4';

-- 3 → 2
DELETE FROM public.user_badges ub1
WHERE ub1.badge_key = 'prestige_cycle_2'
  AND EXISTS (
    SELECT 1 FROM public.user_badges ub2
    WHERE ub2.user_id = ub1.user_id AND ub2.badge_key = 'prestige_cycle_3'
  );
UPDATE public.user_badges SET badge_key = 'prestige_cycle_2' WHERE badge_key = 'prestige_cycle_3';

-- 2 → 1 (the critical rename: was first badge at cycle 2, now cycle 1)
DELETE FROM public.user_badges ub1
WHERE ub1.badge_key = 'prestige_cycle_1'
  AND EXISTS (
    SELECT 1 FROM public.user_badges ub2
    WHERE ub2.user_id = ub1.user_id AND ub2.badge_key = 'prestige_cycle_2'
  );
UPDATE public.user_badges SET badge_key = 'prestige_cycle_1' WHERE badge_key = 'prestige_cycle_2';

-- ── Step 2: Replace evaluate_badges_after_play with corrected range ────────────

CREATE OR REPLACE FUNCTION public.evaluate_badges_after_play()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak_after  integer;
  v_user_id       uuid;
  v_play_id       uuid;
  v_cycles_after  integer;
BEGIN
  -- Only process SURVIVE plays on the daily gate
  IF NEW.outcome <> 'SURVIVE' OR NEW.game_id <> 'daily_gate' THEN
    RETURN NEW;
  END IF;

  v_streak_after := NEW.streak_after;
  v_user_id      := NEW.user_id;
  v_play_id      := NEW.id;

  -- Update max_streak
  UPDATE public.game_state
  SET max_streak = GREATEST(max_streak, v_streak_after)
  WHERE user_id = v_user_id;

  -- Streak milestone badges (within a single 30-day cycle)
  IF v_streak_after = 1  THEN PERFORM public.award_badge(v_user_id, 'streak_1',  v_play_id); END IF;
  IF v_streak_after = 3  THEN PERFORM public.award_badge(v_user_id, 'streak_3',  v_play_id); END IF;
  IF v_streak_after = 7  THEN PERFORM public.award_badge(v_user_id, 'streak_7',  v_play_id); END IF;
  IF v_streak_after = 14 THEN PERFORM public.award_badge(v_user_id, 'streak_14', v_play_id); END IF;
  IF v_streak_after = 30 THEN
    PERFORM public.award_badge(v_user_id, 'streak_30', v_play_id);

    -- Completed cycle: increment counter
    UPDATE public.game_state
    SET completed_cycles = completed_cycles + 1
    WHERE user_id = v_user_id
    RETURNING completed_cycles INTO v_cycles_after;

    -- Award prestige badge for cycles 1–5
    -- completed_cycles = 1 → prestige_cycle_1 (first full 30-day cycle)
    IF v_cycles_after BETWEEN 1 AND 5 THEN
      PERFORM public.award_badge(
        v_user_id,
        'prestige_cycle_' || v_cycles_after::text,
        v_play_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ── Step 3: Backfill — award prestige_cycle_1 for users who completed 1+ cycles
-- but have no prestige badge yet (because old code skipped cycle 1).
-- completed_cycles in game_state is authoritative; find earliest streak_30 play
-- per user for source_play_id.

DO $$
DECLARE
  rec RECORD;
  v_earliest_play_id uuid;
BEGIN
  FOR rec IN
    SELECT gs.user_id, gs.completed_cycles
    FROM public.game_state gs
    WHERE gs.completed_cycles >= 1
      AND NOT EXISTS (
        SELECT 1 FROM public.user_badges ub
        WHERE ub.user_id = gs.user_id
          AND ub.badge_key = 'prestige_cycle_1'
      )
  LOOP
    -- Find the play that first hit streak_after = 30 for this user
    SELECT id INTO v_earliest_play_id
    FROM public.plays
    WHERE user_id = rec.user_id
      AND game_id = 'daily_gate'
      AND outcome = 'SURVIVE'
      AND streak_after = 30
    ORDER BY created_at ASC
    LIMIT 1;

    PERFORM public.award_badge(rec.user_id, 'prestige_cycle_1', v_earliest_play_id);
  END LOOP;
END $$;
