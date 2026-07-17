/*
  # Skull Gate Assignment System

  ## Summary
  Adds the assignment infrastructure for dynamically assigning Skull Gate scene
  configs to players each day. This sits behind a feature flag and does NOT
  affect the current live play_daily_gate flow.

  ## New Tables
  - `player_skull_gate_assignments`
    - One row per (user_id, play_date) — enforced by UNIQUE constraint
    - Tracks which scene was assigned, its current status, and the result
    - scene_id / scene_slug reference the assigned skull_gate_scenes row
    - status: assigned → started → completed | skipped
    - result: survive | die | NULL (set when play_daily_gate completes, future prompt)

  ## New RPC
  - `get_or_assign_skull_gate_scene()`
    - Authenticated, SECURITY DEFINER
    - Uses get_madrid_today() for date consistency with play_daily_gate
    - Returns existing assignment if one already exists for today
    - Otherwise runs weighted random selection from eligible published scenes:
      * status = 'published', enabled = true, published_config_json NOT NULL
      * Respects min_streak / max_streak from player's game_state
      * Respects cooldown_days (skips scenes assigned within cooldown window)
      * Avoids repeating the player's most recent scene if alternatives exist
      * Uses weight column for weighted random (higher weight = more likely)
    - Returns NULL safely if no eligible scene exists
    - Does NOT touch play_daily_gate, wallet, streak, or result logic

  ## Security
  - RLS enabled on assignments table
  - Players can SELECT their own assignments only
  - INSERT/UPDATE done only via SECURITY DEFINER RPC (bypasses RLS)
  - No player can insert or update assignment rows directly

  ## Notes
  - Live gameplay is gated by USE_SCENE_BASED_SKULL_GATE feature flag (client constant)
  - This migration does not modify any existing tables or RPCs
  - get_madrid_today() already exists from play_daily_gate infrastructure
*/

-- ── Assignment table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS player_skull_gate_assignments (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  play_date     date        NOT NULL,
  scene_id      uuid        REFERENCES skull_gate_scenes(id) ON DELETE SET NULL,
  scene_slug    text        NOT NULL,
  status        text        NOT NULL DEFAULT 'assigned'
                            CHECK (status IN ('assigned', 'started', 'completed', 'skipped')),
  result        text        CHECK (result IN ('survive', 'die')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  started_at    timestamptz,
  completed_at  timestamptz,

  CONSTRAINT uq_user_play_date UNIQUE (user_id, play_date)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_psga_user_id    ON player_skull_gate_assignments (user_id);
CREATE INDEX IF NOT EXISTS idx_psga_play_date  ON player_skull_gate_assignments (play_date);
CREATE INDEX IF NOT EXISTS idx_psga_scene_slug ON player_skull_gate_assignments (scene_slug);
CREATE INDEX IF NOT EXISTS idx_psga_user_date  ON player_skull_gate_assignments (user_id, play_date DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE player_skull_gate_assignments ENABLE ROW LEVEL SECURITY;

-- Players may only read their own assignments
CREATE POLICY "Users can view own skull gate assignments"
  ON player_skull_gate_assignments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- No direct INSERT/UPDATE/DELETE from clients — handled by SECURITY DEFINER RPC only

-- ── Assignment RPC ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_or_assign_skull_gate_scene()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       uuid;
  v_today         date;
  v_streak        integer;
  v_existing      record;
  v_scene         record;
  v_prev_slug     text;
  v_assignment_id uuid;
  v_result        jsonb;

  -- Weighted selection variables
  v_total_weight  numeric;
  v_roll          numeric;
  v_running       numeric;
  v_candidate     record;
BEGIN
  -- ── Auth check ────────────────────────────────────────────────────────────
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- ── Use Madrid date (consistent with play_daily_gate) ─────────────────────
  v_today := get_madrid_today();

  -- ── Return existing assignment for today if present ───────────────────────
  SELECT a.*, s.published_config_json AS scene_config
  INTO v_existing
  FROM player_skull_gate_assignments a
  LEFT JOIN skull_gate_scenes s ON s.id = a.scene_id
  WHERE a.user_id = v_user_id
    AND a.play_date = v_today;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'assignment_id',  v_existing.id,
      'scene_id',       v_existing.scene_id,
      'scene_slug',     v_existing.scene_slug,
      'status',         v_existing.status,
      'result',         v_existing.result,
      'play_date',      v_existing.play_date,
      'scene_config',   v_existing.scene_config,
      'from_cache',     true
    );
  END IF;

  -- ── Get player's current streak for eligibility ───────────────────────────
  SELECT COALESCE(current_streak, 0)
  INTO v_streak
  FROM game_state
  WHERE user_id = v_user_id;

  -- Default to 0 if no game_state row yet
  IF NOT FOUND THEN
    v_streak := 0;
  END IF;

  -- ── Get most recent assigned scene (for avoidance) ───────────────────────
  SELECT scene_slug
  INTO v_prev_slug
  FROM player_skull_gate_assignments
  WHERE user_id = v_user_id
  ORDER BY play_date DESC
  LIMIT 1;

  -- ── Build eligible scene set ──────────────────────────────────────────────
  -- Eligible: published, enabled, config not null, streak in range,
  --           not in cooldown, weighted > 0
  --
  -- Cooldown check: scene was last assigned to THIS user within cooldown_days.
  -- We look at their assignment history for the scene slug.
  --
  -- We collect all eligible candidates into a temp structure for weighted pick.

  -- First: try with avoidance (exclude prev_slug if alternatives exist)
  -- Then:  fall back to full set if avoidance would leave nothing

  -- Compute total weight of eligible scenes (with avoidance)
  SELECT COALESCE(SUM(s.weight), 0)
  INTO v_total_weight
  FROM skull_gate_scenes s
  WHERE s.status = 'published'
    AND s.enabled = true
    AND s.published_config_json IS NOT NULL
    AND s.weight > 0
    -- Streak bounds
    AND (s.min_streak IS NULL OR v_streak >= s.min_streak)
    AND (s.max_streak IS NULL OR v_streak <= s.max_streak)
    -- Cooldown: no assignment for this scene in the last cooldown_days days
    AND NOT EXISTS (
      SELECT 1
      FROM player_skull_gate_assignments pa
      WHERE pa.user_id = v_user_id
        AND pa.scene_slug = s.slug
        AND pa.play_date > (v_today - s.cooldown_days)
        AND pa.play_date < v_today
    )
    -- Avoidance: skip previous scene if alternatives exist (checked below)
    AND (v_prev_slug IS NULL OR s.slug <> v_prev_slug);

  -- If avoidance removes everything, recompute without it
  IF v_total_weight = 0 THEN
    SELECT COALESCE(SUM(s.weight), 0)
    INTO v_total_weight
    FROM skull_gate_scenes s
    WHERE s.status = 'published'
      AND s.enabled = true
      AND s.published_config_json IS NOT NULL
      AND s.weight > 0
      AND (s.min_streak IS NULL OR v_streak >= s.min_streak)
      AND (s.max_streak IS NULL OR v_streak <= s.max_streak)
      AND NOT EXISTS (
        SELECT 1
        FROM player_skull_gate_assignments pa
        WHERE pa.user_id = v_user_id
          AND pa.scene_slug = s.slug
          AND pa.play_date > (v_today - s.cooldown_days)
          AND pa.play_date < v_today
      );

    -- No eligible scenes at all — return null safely
    IF v_total_weight = 0 THEN
      RETURN jsonb_build_object(
        'assignment_id',  NULL,
        'scene_id',       NULL,
        'scene_slug',     NULL,
        'status',         NULL,
        'result',         NULL,
        'play_date',      v_today,
        'scene_config',   NULL,
        'from_cache',     false,
        'no_eligible',    true
      );
    END IF;

    -- Roll without avoidance
    v_roll := secure_random_float() * v_total_weight;
    v_running := 0;

    FOR v_candidate IN
      SELECT s.id, s.slug, s.weight, s.published_config_json
      FROM skull_gate_scenes s
      WHERE s.status = 'published'
        AND s.enabled = true
        AND s.published_config_json IS NOT NULL
        AND s.weight > 0
        AND (s.min_streak IS NULL OR v_streak >= s.min_streak)
        AND (s.max_streak IS NULL OR v_streak <= s.max_streak)
        AND NOT EXISTS (
          SELECT 1
          FROM player_skull_gate_assignments pa
          WHERE pa.user_id = v_user_id
            AND pa.scene_slug = s.slug
            AND pa.play_date > (v_today - s.cooldown_days)
            AND pa.play_date < v_today
        )
      ORDER BY s.weight DESC, s.id  -- deterministic tiebreak
    LOOP
      v_running := v_running + v_candidate.weight;
      IF v_roll <= v_running THEN
        v_scene := v_candidate;
        EXIT;
      END IF;
    END LOOP;

  ELSE
    -- Roll with avoidance
    v_roll := secure_random_float() * v_total_weight;
    v_running := 0;

    FOR v_candidate IN
      SELECT s.id, s.slug, s.weight, s.published_config_json
      FROM skull_gate_scenes s
      WHERE s.status = 'published'
        AND s.enabled = true
        AND s.published_config_json IS NOT NULL
        AND s.weight > 0
        AND (s.min_streak IS NULL OR v_streak >= s.min_streak)
        AND (s.max_streak IS NULL OR v_streak <= s.max_streak)
        AND NOT EXISTS (
          SELECT 1
          FROM player_skull_gate_assignments pa
          WHERE pa.user_id = v_user_id
            AND pa.scene_slug = s.slug
            AND pa.play_date > (v_today - s.cooldown_days)
            AND pa.play_date < v_today
        )
        AND (v_prev_slug IS NULL OR s.slug <> v_prev_slug)
      ORDER BY s.weight DESC, s.id
    LOOP
      v_running := v_running + v_candidate.weight;
      IF v_roll <= v_running THEN
        v_scene := v_candidate;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  -- Safety: if loop exited without selecting (floating point edge), pick last candidate
  IF v_scene IS NULL THEN
    SELECT s.id, s.slug, s.weight, s.published_config_json
    INTO v_scene
    FROM skull_gate_scenes s
    WHERE s.status = 'published'
      AND s.enabled = true
      AND s.published_config_json IS NOT NULL
      AND s.weight > 0
      AND (s.min_streak IS NULL OR v_streak >= s.min_streak)
      AND (s.max_streak IS NULL OR v_streak <= s.max_streak)
    ORDER BY s.weight DESC, s.id
    LIMIT 1;

    IF v_scene IS NULL THEN
      RETURN jsonb_build_object(
        'assignment_id',  NULL,
        'scene_id',       NULL,
        'scene_slug',     NULL,
        'status',         NULL,
        'play_date',      v_today,
        'scene_config',   NULL,
        'from_cache',     false,
        'no_eligible',    true
      );
    END IF;
  END IF;

  -- ── Insert assignment row ─────────────────────────────────────────────────
  INSERT INTO player_skull_gate_assignments (
    user_id, play_date, scene_id, scene_slug, status
  )
  VALUES (
    v_user_id, v_today, v_scene.id, v_scene.slug, 'assigned'
  )
  ON CONFLICT (user_id, play_date) DO UPDATE
    SET scene_id   = EXCLUDED.scene_id,
        scene_slug = EXCLUDED.scene_slug
  RETURNING id INTO v_assignment_id;

  RETURN jsonb_build_object(
    'assignment_id',  v_assignment_id,
    'scene_id',       v_scene.id,
    'scene_slug',     v_scene.slug,
    'status',         'assigned',
    'result',         NULL,
    'play_date',      v_today,
    'scene_config',   v_scene.published_config_json,
    'from_cache',     false,
    'no_eligible',    false
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_or_assign_skull_gate_scene() TO authenticated;
