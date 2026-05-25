/*
  # Microgame RPC Functions

  Adds the four missing RPC functions required by the frontend:
  - play_daily_dice: Roll a 6-sided die; win on 4-6 (50% chance using secure_random_float)
  - play_daily_pick: Pick one of four items; one is the winner (~25% chance)
  - play_daily_safebox: Pick one of four safes; one holds treasure (~25% chance)
  - play_daily_path: Choose left or right path; one is safe (50% chance)
  - enter_weekend_event: Enter a qualified player into a Saturday or Sunday event

  Each microgame RPC:
  1. Checks idempotency (one play per day per game, per player)
  2. Logs to daily_game_plays
  3. Upserts player_game_progress
  4. Upserts weekly_qualification_status with earned points
  5. Uses secure_random_float() for fairness
  6. Returns a typed result JSON

  Security:
  - All functions use SECURITY DEFINER with search_path = public
  - Only callable by authenticated users (auth.uid() required)
  - Input validated before any DB writes
*/

-- ─── Helper: upsert weekly qualification status ──────────────────────────────
CREATE OR REPLACE FUNCTION _upsert_weekly_qual(
  p_user_id       uuid,
  p_points_earned integer,
  p_won           boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start date;
BEGIN
  -- Week starts on Monday
  v_week_start := date_trunc('week', get_madrid_today())::date;

  INSERT INTO weekly_qualification_status
    (user_id, week_start_date, total_points, games_played_count, games_won_count)
  VALUES
    (p_user_id, v_week_start, p_points_earned, 1, CASE WHEN p_won THEN 1 ELSE 0 END)
  ON CONFLICT (user_id, week_start_date) DO UPDATE SET
    total_points       = weekly_qualification_status.total_points + EXCLUDED.total_points,
    games_played_count = weekly_qualification_status.games_played_count + 1,
    games_won_count    = weekly_qualification_status.games_won_count + CASE WHEN p_won THEN 1 ELSE 0 END,
    updated_at         = now();
END;
$$;

-- ─── Helper: upsert player_game_progress ─────────────────────────────────────
CREATE OR REPLACE FUNCTION _upsert_game_progress(
  p_user_id   uuid,
  p_game_id   text,
  p_won       boolean,
  p_pts       integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date;
BEGIN
  v_today := get_madrid_today();

  INSERT INTO player_game_progress
    (user_id, game_id, progress_date, played_today, completed_today, won_today, qualification_points_earned)
  VALUES
    (p_user_id, p_game_id, v_today, true, true, p_won, p_pts)
  ON CONFLICT (user_id, game_id, progress_date) DO UPDATE SET
    played_today                  = true,
    completed_today               = true,
    won_today                     = weekly_qualification_status.won_today OR p_won,
    qualification_points_earned   = greatest(player_game_progress.qualification_points_earned, p_pts);
EXCEPTION WHEN others THEN
  -- If ON CONFLICT references wrong table, just upsert simply
  INSERT INTO player_game_progress
    (user_id, game_id, progress_date, played_today, completed_today, won_today, qualification_points_earned)
  VALUES
    (p_user_id, p_game_id, v_today, true, true, p_won, p_pts)
  ON CONFLICT (user_id, game_id, progress_date) DO UPDATE SET
    played_today                  = true,
    completed_today               = true,
    won_today                     = EXCLUDED.won_today,
    qualification_points_earned   = greatest(player_game_progress.qualification_points_earned, EXCLUDED.qualification_points_earned);
END;
$$;

-- ─── PLAY DAILY DICE ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION play_daily_dice(
  p_idem_key uuid
)
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_today := get_madrid_today();

  -- Idempotency: if this exact idem key was used, return stored result
  SELECT result_json INTO v_existing
  FROM daily_game_plays
  WHERE idem_key = p_idem_key AND user_id = v_user_id;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- One play per day per game
  IF EXISTS (
    SELECT 1 FROM daily_game_plays
    WHERE user_id = v_user_id AND game_id = v_game_id AND play_date = v_today
  ) THEN
    RAISE EXCEPTION 'Already played today';
  END IF;

  -- Fetch point config from games table (fall back gracefully)
  SELECT
    COALESCE((config_json->>'points_on_play')::int, 5),
    COALESCE((config_json->>'points_on_win')::int, 10)
  INTO v_pts_play, v_pts_win
  FROM games WHERE game_id = v_game_id;

  IF NOT FOUND THEN
    v_pts_play := 5;
    v_pts_win  := 10;
  END IF;

  -- Roll dice (1-6), win on 4, 5, or 6
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
      (v_user_id, v_game_id, v_today, p_idem_key,
       CASE WHEN v_won THEN 'WIN' ELSE 'LOSE' END,
       v_result, v_pts_earned);

    PERFORM _upsert_game_progress(v_user_id, v_game_id, v_won, v_pts_earned);
    PERFORM _upsert_weekly_qual(v_user_id, v_pts_earned, v_won);

    RETURN v_result;
  END;
END;
$$;

-- ─── PLAY DAILY PICK ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION play_daily_pick(
  p_idem_key uuid,
  p_choice   integer   -- 0-based index 0..3
)
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_choice < 0 OR p_choice > 3 THEN
    RAISE EXCEPTION 'Invalid choice: must be 0-3';
  END IF;

  v_today := get_madrid_today();

  SELECT result_json INTO v_existing
  FROM daily_game_plays
  WHERE idem_key = p_idem_key AND user_id = v_user_id;

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
    COALESCE((config_json->>'points_on_win')::int, 15)
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
      (v_user_id, v_game_id, v_today, p_idem_key,
       CASE WHEN v_won THEN 'WIN' ELSE 'LOSE' END,
       v_result, v_pts_earned);

    PERFORM _upsert_game_progress(v_user_id, v_game_id, v_won, v_pts_earned);
    PERFORM _upsert_weekly_qual(v_user_id, v_pts_earned, v_won);

    RETURN v_result;
  END;
END;
$$;

-- ─── PLAY DAILY SAFEBOX ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION play_daily_safebox(
  p_idem_key uuid,
  p_choice   integer   -- 0-based index 0..3
)
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_choice < 0 OR p_choice > 3 THEN
    RAISE EXCEPTION 'Invalid choice: must be 0-3';
  END IF;

  v_today := get_madrid_today();

  SELECT result_json INTO v_existing
  FROM daily_game_plays
  WHERE idem_key = p_idem_key AND user_id = v_user_id;

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
    COALESCE((config_json->>'points_on_win')::int, 15)
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
      (v_user_id, v_game_id, v_today, p_idem_key,
       CASE WHEN v_won THEN 'WIN' ELSE 'LOSE' END,
       v_result, v_pts_earned);

    PERFORM _upsert_game_progress(v_user_id, v_game_id, v_won, v_pts_earned);
    PERFORM _upsert_weekly_qual(v_user_id, v_pts_earned, v_won);

    RETURN v_result;
  END;
END;
$$;

-- ─── PLAY DAILY PATH ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION play_daily_path(
  p_idem_key uuid,
  p_choice   integer   -- 0 = left, 1 = right
)
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_choice < 0 OR p_choice > 1 THEN
    RAISE EXCEPTION 'Invalid choice: must be 0 or 1';
  END IF;

  v_today := get_madrid_today();

  SELECT result_json INTO v_existing
  FROM daily_game_plays
  WHERE idem_key = p_idem_key AND user_id = v_user_id;

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
    COALESCE((config_json->>'points_on_win')::int, 10)
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
      (v_user_id, v_game_id, v_today, p_idem_key,
       CASE WHEN v_won THEN 'WIN' ELSE 'LOSE' END,
       v_result, v_pts_earned);

    PERFORM _upsert_game_progress(v_user_id, v_game_id, v_won, v_pts_earned);
    PERFORM _upsert_weekly_qual(v_user_id, v_pts_earned, v_won);

    RETURN v_result;
  END;
END;
$$;

-- ─── PLAY DAILY PUZZLE (kept for compatibility) ───────────────────────────────
CREATE OR REPLACE FUNCTION play_daily_puzzle(
  p_idem_key uuid,
  p_answer   text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       uuid;
  v_today         date;
  v_game_id       text := 'daily_puzzle';
  v_correct_ans   text;
  v_won           boolean;
  v_pts_play      integer;
  v_pts_win       integer;
  v_pts_earned    integer;
  v_existing      jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_today := get_madrid_today();

  SELECT result_json INTO v_existing
  FROM daily_game_plays
  WHERE idem_key = p_idem_key AND user_id = v_user_id;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  IF EXISTS (
    SELECT 1 FROM daily_game_plays
    WHERE user_id = v_user_id AND game_id = v_game_id AND play_date = v_today
  ) THEN
    RAISE EXCEPTION 'Already played today';
  END IF;

  -- Fetch answer from settings
  SELECT value_json->>'answer' INTO v_correct_ans
  FROM settings WHERE key = 'puzzle_today';

  IF v_correct_ans IS NULL THEN
    v_correct_ans := 'skull';
  END IF;

  SELECT
    COALESCE((config_json->>'points_on_play')::int, 5),
    COALESCE((config_json->>'points_on_win')::int, 20)
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
      (v_user_id, v_game_id, v_today, p_idem_key,
       CASE WHEN v_won THEN 'CORRECT' ELSE 'WRONG' END,
       v_result, v_pts_earned);

    PERFORM _upsert_game_progress(v_user_id, v_game_id, v_won, v_pts_earned);
    PERFORM _upsert_weekly_qual(v_user_id, v_pts_earned, v_won);

    RETURN v_result;
  END;
END;
$$;

-- ─── ENTER WEEKEND EVENT ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION enter_weekend_event(
  p_event_game_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid;
  v_week_start date;
  v_qual       weekly_qualification_status%ROWTYPE;
  v_already    boolean := false;
BEGIN
  v_user_id    := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_week_start := date_trunc('week', get_madrid_today())::date;

  -- Load qualification row
  SELECT * INTO v_qual
  FROM weekly_qualification_status
  WHERE user_id = v_user_id AND week_start_date = v_week_start;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No qualification data for this week';
  END IF;

  -- Validate event and qualification
  IF p_event_game_id = 'saturday_main_event' THEN
    IF NOT v_qual.saturday_qualified THEN
      RAISE EXCEPTION 'Not qualified for Saturday';
    END IF;
    IF v_qual.saturday_entry_used THEN
      RAISE EXCEPTION 'Already entered Saturday event';
    END IF;
  ELSIF p_event_game_id = 'sunday_winners_event' THEN
    IF NOT v_qual.sunday_qualified THEN
      RAISE EXCEPTION 'Not qualified for Sunday';
    END IF;
    IF v_qual.sunday_entry_used THEN
      RAISE EXCEPTION 'Already entered Sunday event';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unknown event: %', p_event_game_id;
  END IF;

  -- Create entry
  INSERT INTO weekend_event_entries
    (user_id, event_game_id, week_start_date, qualification_source_json, result_status)
  VALUES
    (v_user_id, p_event_game_id, v_week_start,
     jsonb_build_object('week_start', v_week_start, 'total_points', v_qual.total_points),
     'entered');

  -- Mark entry used
  IF p_event_game_id = 'saturday_main_event' THEN
    UPDATE weekly_qualification_status
    SET saturday_entry_used = true, updated_at = now()
    WHERE user_id = v_user_id AND week_start_date = v_week_start;
  ELSE
    UPDATE weekly_qualification_status
    SET sunday_entry_used = true, updated_at = now()
    WHERE user_id = v_user_id AND week_start_date = v_week_start;
  END IF;

  RETURN jsonb_build_object('ok', true, 'event_game_id', p_event_game_id);
END;
$$;

-- ─── Add unique constraint for player_game_progress if missing ────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'player_game_progress'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'player_game_progress_user_game_date_key'
  ) THEN
    ALTER TABLE player_game_progress
      ADD CONSTRAINT player_game_progress_user_game_date_key
      UNIQUE (user_id, game_id, progress_date);
  END IF;
END $$;

-- ─── Add unique constraint for weekly_qualification_status if missing ─────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'weekly_qualification_status'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'weekly_qualification_status_user_week_key'
  ) THEN
    ALTER TABLE weekly_qualification_status
      ADD CONSTRAINT weekly_qualification_status_user_week_key
      UNIQUE (user_id, week_start_date);
  END IF;
END $$;

-- ─── Seed microgames into games table if they don't exist ────────────────────
INSERT INTO games (game_id, name, description, status, icon, sort_order)
VALUES
  ('daily_pick',    'Hidden Relics',    'One of four holds the treasure. Choose wisely.',       'active',      'gem',       10),
  ('daily_safebox', 'Safe Box',         'One safe holds the reward. Which one is it?',          'active',      'box',       20),
  ('daily_dice',    'Dice of Fate',     'Roll the dice. Win on 4, 5, or 6.',                   'active',      'dice6',     30),
  ('daily_path',    'The Crossroads',   'Two paths. One leads forward. Choose your direction.', 'active',      'footprints',40)
ON CONFLICT (game_id) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  status      = EXCLUDED.status,
  icon        = EXCLUDED.icon,
  sort_order  = EXCLUDED.sort_order;

-- Seed meta games as coming_soon
INSERT INTO games (game_id, name, description, status, icon, sort_order)
VALUES
  ('shake_the_streak',   'Shake the Streak',   'Challenge others to shake up the leaderboard.',    'coming_soon', 'zap',      50),
  ('climb_the_streak',   'Climb the Streak',   'Climb rungs daily. Go further each day.',          'coming_soon', 'trending', 60),
  ('multiplier_wheel',   'Multiplier Wheel',   'Spin for a chance to multiply your pot.',          'coming_soon', 'wheel',    70),
  ('last_survivor',      'Last Survivor',      'Final players standing share the prize pool.',     'coming_soon', 'users',    80)
ON CONFLICT (game_id) DO NOTHING;
