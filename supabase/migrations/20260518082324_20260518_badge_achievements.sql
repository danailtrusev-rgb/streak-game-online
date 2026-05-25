/*
  # Badge Achievement System

  ## Summary
  Adds persistent badge/achievement tracking for streak milestones and prestige cycles.

  ## Changes

  ### game_state table
  - Adds `max_streak` (integer, default 0) — highest streak ever reached by the player
  - Adds `completed_cycles` (integer, default 0) — number of completed 30-day streak cycles (independent of current_streak reset)

  ### New table: user_badges
  - `id` — uuid primary key
  - `user_id` — uuid, FK to users
  - `badge_key` — text, e.g. 'streak_1', 'prestige_cycle_2'
  - `unlocked_at` — timestamptz
  - `source_play_id` — uuid nullable, the plays.id that triggered the unlock
  - Unique constraint: (user_id, badge_key) — a badge can only be earned once

  ## Badge Keys
  Streak milestones (within a single 30-day cycle):
    streak_1, streak_3, streak_7, streak_14, streak_30

  Prestige cycle badges (for repeated completed 30-day cycles):
    prestige_cycle_2 through prestige_cycle_6

  ## Security
  - RLS enabled on user_badges
  - Users can only read their own badges
  - Inserts are server-side only (via RPC/trigger) — no direct insert policy for authenticated users
*/

-- ── Add columns to game_state ─────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'game_state' AND column_name = 'max_streak'
  ) THEN
    ALTER TABLE public.game_state ADD COLUMN max_streak integer NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'game_state' AND column_name = 'completed_cycles'
  ) THEN
    ALTER TABLE public.game_state ADD COLUMN completed_cycles integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Backfill max_streak from existing plays history
UPDATE public.game_state gs
SET max_streak = GREATEST(gs.max_streak, sub.best)
FROM (
  SELECT user_id, MAX(streak_after) AS best
  FROM public.plays
  WHERE game_id = 'daily_gate'
  GROUP BY user_id
) sub
WHERE gs.user_id = sub.user_id;

-- ── Create user_badges table ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_badges (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  badge_key      text        NOT NULL,
  unlocked_at    timestamptz NOT NULL DEFAULT now(),
  source_play_id uuid        REFERENCES public.plays(id) ON DELETE SET NULL,
  CONSTRAINT uq_user_badge UNIQUE (user_id, badge_key)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Users can read their own badges
CREATE POLICY "Users can read own badges"
  ON public.user_badges
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role (used by RPCs with SECURITY DEFINER) handles inserts — no direct insert for anon/authenticated

-- ── RPC: award_badge ──────────────────────────────────────────────────────────
-- Called internally from play_daily_gate or the trigger below.
-- Idempotent: does nothing if badge already exists.

CREATE OR REPLACE FUNCTION public.award_badge(
  p_user_id      uuid,
  p_badge_key    text,
  p_source_play_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_badges (user_id, badge_key, source_play_id)
  VALUES (p_user_id, p_badge_key, p_source_play_id)
  ON CONFLICT (user_id, badge_key) DO NOTHING;

  RETURN FOUND;
END;
$$;

-- ── Function: evaluate_badges_after_play ─────────────────────────────────────
-- Evaluates which badges to award after a SURVIVE play.
-- Also updates max_streak and completed_cycles on game_state.

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
  v_cycles_before integer;
  v_cycles_after  integer;
  v_cycle_num     integer;
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
  -- We only grant these when streak_after is exactly the milestone value
  IF v_streak_after = 1  THEN PERFORM public.award_badge(v_user_id, 'streak_1',  v_play_id); END IF;
  IF v_streak_after = 3  THEN PERFORM public.award_badge(v_user_id, 'streak_3',  v_play_id); END IF;
  IF v_streak_after = 7  THEN PERFORM public.award_badge(v_user_id, 'streak_7',  v_play_id); END IF;
  IF v_streak_after = 14 THEN PERFORM public.award_badge(v_user_id, 'streak_14', v_play_id); END IF;
  IF v_streak_after = 30 THEN
    PERFORM public.award_badge(v_user_id, 'streak_30', v_play_id);

    -- This is a completed cycle. Increment completed_cycles.
    UPDATE public.game_state
    SET completed_cycles = completed_cycles + 1
    WHERE user_id = v_user_id
    RETURNING completed_cycles INTO v_cycles_after;

    -- Award prestige badge for cycles 2-6
    -- completed_cycles now equals the cycle just finished (e.g. 2 means 2nd full cycle)
    IF v_cycles_after BETWEEN 2 AND 6 THEN
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

-- ── Attach trigger to plays ───────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_evaluate_badges ON public.plays;

CREATE TRIGGER trg_evaluate_badges
  AFTER INSERT ON public.plays
  FOR EACH ROW
  EXECUTE FUNCTION public.evaluate_badges_after_play();

-- ── RPC: get_my_badges ────────────────────────────────────────────────────────
-- Returns all badges for the calling user (used by client).

CREATE OR REPLACE FUNCTION public.get_my_badges()
RETURNS TABLE(
  badge_key      text,
  unlocked_at    timestamptz,
  source_play_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT badge_key, unlocked_at, source_play_id
  FROM public.user_badges
  WHERE user_id = auth.uid()
  ORDER BY unlocked_at;
$$;

-- ── Backfill existing plays into user_badges ──────────────────────────────────
-- Process all historical SURVIVE daily_gate plays in chronological order
-- to grant any badges players have already earned.

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id, user_id, streak_after, created_at
    FROM public.plays
    WHERE outcome = 'SURVIVE' AND game_id = 'daily_gate'
    ORDER BY created_at ASC
  LOOP
    -- Update max_streak
    UPDATE public.game_state
    SET max_streak = GREATEST(max_streak, rec.streak_after)
    WHERE user_id = rec.user_id;

    -- Streak milestones
    IF rec.streak_after = 1  THEN PERFORM public.award_badge(rec.user_id, 'streak_1',  rec.id); END IF;
    IF rec.streak_after = 3  THEN PERFORM public.award_badge(rec.user_id, 'streak_3',  rec.id); END IF;
    IF rec.streak_after = 7  THEN PERFORM public.award_badge(rec.user_id, 'streak_7',  rec.id); END IF;
    IF rec.streak_after = 14 THEN PERFORM public.award_badge(rec.user_id, 'streak_14', rec.id); END IF;

    -- At streak_after = 30, award streak_30 AND count a completed cycle
    IF rec.streak_after = 30 THEN
      PERFORM public.award_badge(rec.user_id, 'streak_30', rec.id);

      UPDATE public.game_state
      SET completed_cycles = completed_cycles + 1
      WHERE user_id = rec.user_id;

      -- Award prestige badge if cycles 2-6
      DECLARE
        v_cycles integer;
      BEGIN
        SELECT completed_cycles INTO v_cycles
        FROM public.game_state
        WHERE user_id = rec.user_id;

        IF v_cycles BETWEEN 2 AND 6 THEN
          PERFORM public.award_badge(
            rec.user_id,
            'prestige_cycle_' || v_cycles::text,
            rec.id
          );
        END IF;
      END;
    END IF;
  END LOOP;
END $$;
