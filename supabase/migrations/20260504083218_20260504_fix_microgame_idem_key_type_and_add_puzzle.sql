/*
  # Fix microgame RPC idempotency parameter types + add Daily Puzzle to catalog

  ## Problem
  All five microgame RPCs declared p_idem_key as uuid, but the frontend passes
  crypto.randomUUID() as a plain text string. PostgREST rejects the call with
  "invalid input syntax for type uuid".

  ## Solution
  - daily_game_plays.idem_key column is uuid (unchanged — no data risk).
  - Each RPC now accepts p_idem_key text, then casts to uuid internally via
    v_idem_uuid := p_idem_key::uuid before any table operations.
  - Old uuid-signature overloads are explicitly dropped first to prevent
    ambiguous function resolution.
  - All existing logic (idempotency, one-play-per-day, progress, qual,
    return shapes) is preserved exactly.

  ## Also
  - Inserts daily_puzzle row into games catalog if not already present.
*/

-- ────────────────────────────────────────────────────────────────────────────
-- Drop old uuid-signature overloads
-- ────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.play_daily_dice(uuid);
DROP FUNCTION IF EXISTS public.play_daily_pick(uuid, integer);
DROP FUNCTION IF EXISTS public.play_daily_safebox(uuid, integer);
DROP FUNCTION IF EXISTS public.play_daily_path(uuid, integer);
DROP FUNCTION IF EXISTS public.play_daily_puzzle(uuid, text);

-- ────────────────────────────────────────────────────────────────────────────
-- play_daily_dice(p_idem_key text)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.play_daily_dice(p_idem_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
v_user_id    uuid;
v_today      date;
v_game_id    text := 'daily_dice';
v_rnd        float;
v_dice_value integer;
v_won        boolean;
v_pts_play   integer;
v_pts_win    integer;
v_pts_earned integer;
v_existing   jsonb;
v_idem_uuid  uuid;
BEGIN
v_user_id := auth.uid();
IF v_user_id IS NULL THEN
  RAISE EXCEPTION 'Not authenticated';
END IF;

v_idem_uuid := p_idem_key::uuid;
v_today     := get_madrid_today();

SELECT result_json INTO v_existing
FROM daily_game_plays
WHERE idem_key = v_idem_uuid AND user_id = v_user_id;

IF v_existing IS NOT NULL THEN
  RETURN v_existing;
END IF;

IF EXISTS (
  SELECT 1 FROM daily_game_plays
  WHERE user_id = v_user_id AND game_id = v_game_id AND play_date = v_today
) THEN
  RAISE EXCEPTION 'Already played today';
END IF;

SELECT
  COALESCE((config_json->>'points_on_play')::int, 5),
  COALESCE((config_json->>'points_on_win')::int,  10)
INTO v_pts_play, v_pts_win
FROM games WHERE game_id = v_game_id;

IF NOT FOUND THEN
  v_pts_play := 5;
  v_pts_win  := 10;
END IF;

v_rnd        := secure_random_float();
v_dice_value := floor(v_rnd * 6)::int + 1;
v_won        := v_dice_value >= 4;
v_pts_earned := v_pts_play + CASE WHEN v_won THEN v_pts_win ELSE 0 END;

DECLARE
  v_result jsonb := jsonb_build_object(
    'outcome',       CASE WHEN v_won THEN 'WIN' ELSE 'LOSE' END,
    'won',           v_won,
    'dice_value',    v_dice_value,
    'points_earned', v_pts_earned
  );
BEGIN
  INSERT INTO daily_game_plays
    (user_id, game_id, play_date, idem_key, outcome, result_json, points_earned)
  VALUES
    (v_user_id, v_game_id, v_today, v_idem_uuid,
     CASE WHEN v_won THEN 'WIN' ELSE 'LOSE' END,
     v_result, v_pts_earned);

  PERFORM _upsert_game_progress(v_user_id, v_game_id, v_won, v_pts_earned);
  PERFORM _upsert_weekly_qual(v_user_id, v_pts_earned, v_won);

  RETURN v_result;
END;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- play_daily_pick(p_idem_key text, p_choice integer)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.play_daily_pick(p_idem_key text, p_choice integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
v_user_id    uuid;
v_today      date;
v_game_id    text := 'daily_pick';
v_rnd        float;
v_winner_idx integer;
v_won        boolean;
v_pts_play   integer;
v_pts_win    integer;
v_pts_earned integer;
v_existing   jsonb;
v_idem_uuid  uuid;
BEGIN
v_user_id := auth.uid();
IF v_user_id IS NULL THEN
  RAISE EXCEPTION 'Not authenticated';
END IF;

IF p_choice < 0 OR p_choice > 3 THEN
  RAISE EXCEPTION 'Invalid choice: must be 0-3';
END IF;

v_idem_uuid := p_idem_key::uuid;
v_today     := get_madrid_today();

SELECT result_json INTO v_existing
FROM daily_game_plays
WHERE idem_key = v_idem_uuid AND user_id = v_user_id;

IF v_existing IS NOT NULL THEN
  RETURN v_existing;
END IF;

IF EXISTS (
  SELECT 1 FROM daily_game_plays
  WHERE user_id = v_user_id AND game_id = v_game_id AND play_date = v_today
) THEN
  RAISE EXCEPTION 'Already played today';
END IF;

SELECT
  COALESCE((config_json->>'points_on_play')::int, 5),
  COALESCE((config_json->>'points_on_win')::int,  15)
INTO v_pts_play, v_pts_win
FROM games WHERE game_id = v_game_id;

IF NOT FOUND THEN
  v_pts_play := 5;
  v_pts_win  := 15;
END IF;

v_rnd        := secure_random_float();
v_winner_idx := floor(v_rnd * 4)::int;
v_won        := p_choice = v_winner_idx;
v_pts_earned := v_pts_play + CASE WHEN v_won THEN v_pts_win ELSE 0 END;

DECLARE
  v_result jsonb := jsonb_build_object(
    'outcome',       CASE WHEN v_won THEN 'WIN' ELSE 'LOSE' END,
    'won',           v_won,
    'player_choice', p_choice,
    'winning_idx',   v_winner_idx,
    'points_earned', v_pts_earned
  );
BEGIN
  INSERT INTO daily_game_plays
    (user_id, game_id, play_date, idem_key, outcome, result_json, points_earned)
  VALUES
    (v_user_id, v_game_id, v_today, v_idem_uuid,
     CASE WHEN v_won THEN 'WIN' ELSE 'LOSE' END,
     v_result, v_pts_earned);

  PERFORM _upsert_game_progress(v_user_id, v_game_id, v_won, v_pts_earned);
  PERFORM _upsert_weekly_qual(v_user_id, v_pts_earned, v_won);

  RETURN v_result;
END;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- play_daily_safebox(p_idem_key text, p_choice integer)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.play_daily_safebox(p_idem_key text, p_choice integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
v_user_id    uuid;
v_today      date;
v_game_id    text := 'daily_safebox';
v_rnd        float;
v_winner_idx integer;
v_won        boolean;
v_pts_play   integer;
v_pts_win    integer;
v_pts_earned integer;
v_existing   jsonb;
v_idem_uuid  uuid;
BEGIN
v_user_id := auth.uid();
IF v_user_id IS NULL THEN
  RAISE EXCEPTION 'Not authenticated';
END IF;

IF p_choice < 0 OR p_choice > 3 THEN
  RAISE EXCEPTION 'Invalid choice: must be 0-3';
END IF;

v_idem_uuid := p_idem_key::uuid;
v_today     := get_madrid_today();

SELECT result_json INTO v_existing
FROM daily_game_plays
WHERE idem_key = v_idem_uuid AND user_id = v_user_id;

IF v_existing IS NOT NULL THEN
  RETURN v_existing;
END IF;

IF EXISTS (
  SELECT 1 FROM daily_game_plays
  WHERE user_id = v_user_id AND game_id = v_game_id AND play_date = v_today
) THEN
  RAISE EXCEPTION 'Already played today';
END IF;

SELECT
  COALESCE((config_json->>'points_on_play')::int, 5),
  COALESCE((config_json->>'points_on_win')::int,  15)
INTO v_pts_play, v_pts_win
FROM games WHERE game_id = v_game_id;

IF NOT FOUND THEN
  v_pts_play := 5;
  v_pts_win  := 15;
END IF;

v_rnd        := secure_random_float();
v_winner_idx := floor(v_rnd * 4)::int;
v_won        := p_choice = v_winner_idx;
v_pts_earned := v_pts_play + CASE WHEN v_won THEN v_pts_win ELSE 0 END;

DECLARE
  v_result jsonb := jsonb_build_object(
    'outcome',       CASE WHEN v_won THEN 'WIN' ELSE 'LOSE' END,
    'won',           v_won,
    'player_choice', p_choice,
    'winning_idx',   v_winner_idx,
    'points_earned', v_pts_earned
  );
BEGIN
  INSERT INTO daily_game_plays
    (user_id, game_id, play_date, idem_key, outcome, result_json, points_earned)
  VALUES
    (v_user_id, v_game_id, v_today, v_idem_uuid,
     CASE WHEN v_won THEN 'WIN' ELSE 'LOSE' END,
     v_result, v_pts_earned);

  PERFORM _upsert_game_progress(v_user_id, v_game_id, v_won, v_pts_earned);
  PERFORM _upsert_weekly_qual(v_user_id, v_pts_earned, v_won);

  RETURN v_result;
END;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- play_daily_path(p_idem_key text, p_choice integer)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.play_daily_path(p_idem_key text, p_choice integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
v_user_id    uuid;
v_today      date;
v_game_id    text := 'daily_path';
v_rnd        float;
v_winner_idx integer;
v_won        boolean;
v_pts_play   integer;
v_pts_win    integer;
v_pts_earned integer;
v_existing   jsonb;
v_idem_uuid  uuid;
BEGIN
v_user_id := auth.uid();
IF v_user_id IS NULL THEN
  RAISE EXCEPTION 'Not authenticated';
END IF;

IF p_choice < 0 OR p_choice > 1 THEN
  RAISE EXCEPTION 'Invalid choice: must be 0 or 1';
END IF;

v_idem_uuid := p_idem_key::uuid;
v_today     := get_madrid_today();

SELECT result_json INTO v_existing
FROM daily_game_plays
WHERE idem_key = v_idem_uuid AND user_id = v_user_id;

IF v_existing IS NOT NULL THEN
  RETURN v_existing;
END IF;

IF EXISTS (
  SELECT 1 FROM daily_game_plays
  WHERE user_id = v_user_id AND game_id = v_game_id AND play_date = v_today
) THEN
  RAISE EXCEPTION 'Already played today';
END IF;

SELECT
  COALESCE((config_json->>'points_on_play')::int, 5),
  COALESCE((config_json->>'points_on_win')::int,  10)
INTO v_pts_play, v_pts_win
FROM games WHERE game_id = v_game_id;

IF NOT FOUND THEN
  v_pts_play := 5;
  v_pts_win  := 10;
END IF;

v_rnd        := secure_random_float();
v_winner_idx := CASE WHEN v_rnd < 0.5 THEN 0 ELSE 1 END;
v_won        := p_choice = v_winner_idx;
v_pts_earned := v_pts_play + CASE WHEN v_won THEN v_pts_win ELSE 0 END;

DECLARE
  v_result jsonb := jsonb_build_object(
    'outcome',       CASE WHEN v_won THEN 'WIN' ELSE 'LOSE' END,
    'won',           v_won,
    'player_choice', p_choice,
    'winning_idx',   v_winner_idx,
    'points_earned', v_pts_earned
  );
BEGIN
  INSERT INTO daily_game_plays
    (user_id, game_id, play_date, idem_key, outcome, result_json, points_earned)
  VALUES
    (v_user_id, v_game_id, v_today, v_idem_uuid,
     CASE WHEN v_won THEN 'WIN' ELSE 'LOSE' END,
     v_result, v_pts_earned);

  PERFORM _upsert_game_progress(v_user_id, v_game_id, v_won, v_pts_earned);
  PERFORM _upsert_weekly_qual(v_user_id, v_pts_earned, v_won);

  RETURN v_result;
END;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- play_daily_puzzle(p_idem_key text, p_answer text)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.play_daily_puzzle(p_idem_key text, p_answer text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
v_user_id     uuid;
v_today       date;
v_game_id     text := 'daily_puzzle';
v_correct_ans text;
v_won         boolean;
v_pts_play    integer;
v_pts_win     integer;
v_pts_earned  integer;
v_existing    jsonb;
v_idem_uuid   uuid;
BEGIN
v_user_id := auth.uid();
IF v_user_id IS NULL THEN
  RAISE EXCEPTION 'Not authenticated';
END IF;

v_idem_uuid := p_idem_key::uuid;
v_today     := get_madrid_today();

SELECT result_json INTO v_existing
FROM daily_game_plays
WHERE idem_key = v_idem_uuid AND user_id = v_user_id;

IF v_existing IS NOT NULL THEN
  RETURN v_existing;
END IF;

IF EXISTS (
  SELECT 1 FROM daily_game_plays
  WHERE user_id = v_user_id AND game_id = v_game_id AND play_date = v_today
) THEN
  RAISE EXCEPTION 'Already played today';
END IF;

SELECT value_json->>'answer' INTO v_correct_ans
FROM settings WHERE key = 'puzzle_today';

IF v_correct_ans IS NULL THEN
  v_correct_ans := 'skull';
END IF;

SELECT
  COALESCE((config_json->>'points_on_play')::int, 5),
  COALESCE((config_json->>'points_on_win')::int,  20)
INTO v_pts_play, v_pts_win
FROM games WHERE game_id = v_game_id;

IF NOT FOUND THEN
  v_pts_play := 5;
  v_pts_win  := 20;
END IF;

v_won        := lower(trim(p_answer)) = lower(trim(v_correct_ans));
v_pts_earned := v_pts_play + CASE WHEN v_won THEN v_pts_win ELSE 0 END;

DECLARE
  v_result jsonb := jsonb_build_object(
    'outcome',        CASE WHEN v_won THEN 'CORRECT' ELSE 'WRONG' END,
    'won',            v_won,
    'correct_answer', v_correct_ans,
    'points_earned',  v_pts_earned
  );
BEGIN
  INSERT INTO daily_game_plays
    (user_id, game_id, play_date, idem_key, outcome, result_json, points_earned)
  VALUES
    (v_user_id, v_game_id, v_today, v_idem_uuid,
     CASE WHEN v_won THEN 'CORRECT' ELSE 'WRONG' END,
     v_result, v_pts_earned);

  PERFORM _upsert_game_progress(v_user_id, v_game_id, v_won, v_pts_earned);
  PERFORM _upsert_weekly_qual(v_user_id, v_pts_earned, v_won);

  RETURN v_result;
END;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- Add daily_puzzle to games catalog if missing
-- icon value matches the lucide icon name used in gameRegistry.ts
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO games (game_id, name, description, status, icon, category, sort_order, config_json)
SELECT
  'daily_puzzle',
  'Daily Puzzle',
  'Answer today''s riddle correctly to earn bonus qualification points.',
  'active',
  'puzzle',
  'daily',
  50,
  '{"points_on_play": 5, "points_on_win": 20, "win_chance": "varies"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM games WHERE game_id = 'daily_puzzle'
);
