/*
  # Fix get_or_assign_skull_gate_scene — cache path missing no_eligible

  ## Summary
  The from_cache=true branch returned a JSONB object without the no_eligible key.
  The client TypeScript interface expects no_eligible: boolean. When absent it
  coerces to undefined/falsy, but the defensive check
  `!gateAssignment.no_eligible` could silently pass even for a cached row that
  has a null scene_config (e.g. if the scene was later archived).

  This migration adds no_eligible: false explicitly to the cache-hit return path,
  making the contract consistent.

  ## Changes
  - get_or_assign_skull_gate_scene(): cache-hit branch now includes
    no_eligible: false in the returned JSONB.
*/

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
  -- Auth check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Use Madrid date (consistent with play_daily_gate)
  v_today := get_madrid_today();

  -- Return existing assignment for today if present
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
      'from_cache',     true,
      'no_eligible',    false   -- explicit: cached row always has an assigned scene
    );
  END IF;

  -- Get player's current streak for eligibility
  SELECT COALESCE(current_streak, 0)
  INTO v_streak
  FROM game_state
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    v_streak := 0;
  END IF;

  -- Get most recent assigned scene (for avoidance)
  SELECT scene_slug
  INTO v_prev_slug
  FROM player_skull_gate_assignments
  WHERE user_id = v_user_id
  ORDER BY play_date DESC
  LIMIT 1;

  -- First: try with avoidance (exclude prev_slug if alternatives exist)
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
    )
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

    -- No eligible scenes at all
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
      ORDER BY s.weight DESC, s.id
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

  -- Insert assignment row
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

GRANT EXECUTE ON FUNCTION get_or_assign_skull_gate_scene() TO authenticated;
