/*
  # Create Game Functions

  1. Helper Functions
    - `get_madrid_today()` - Returns current date in Europe/Madrid timezone
    - `secure_random_float()` - Cryptographically secure random number [0, 1)
    - `get_setting(key)` - Retrieves a configuration value from settings table

  2. Core Game Functions (all SECURITY DEFINER)
    - `get_my_state()` - Returns complete user state (profile, game, wallet, jackpot, tiers)
    - `play_daily_gate(stake_tier, idem_key)` - Full play transaction with:
      - Idempotency checking
      - User status validation
      - One-play-per-day enforcement
      - Stake tier unlock validation
      - Wallet balance check
      - Crypto-secure RNG outcome
      - Game state update
      - Jackpot contribution on DIE
    - `cashout_game(game_id, idem_key)` - Cashout transaction with:
      - Max cashout cap enforcement
      - Pot to wallet transfer via ledger
      - Streak/pot reset
    - `topup_wallet(amount_cents, idem_key)` - Wallet topup via ledger
    - `get_global_leaderboard(limit)` - Top players by streak

  3. Security
    - All state-changing functions use SECURITY DEFINER
    - All functions validate auth.uid() internally
    - Row locks (FOR UPDATE) prevent race conditions
    - Idempotency prevents duplicate operations
    - Banned users are blocked from all operations
*/

-- Helper: Get today in Europe/Madrid timezone
CREATE OR REPLACE FUNCTION get_madrid_today()
RETURNS DATE AS $$
BEGIN
  RETURN (now() AT TIME ZONE 'Europe/Madrid')::date;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper: Crypto-secure random float [0, 1)
CREATE OR REPLACE FUNCTION secure_random_float()
RETURNS DOUBLE PRECISION AS $$
BEGIN
  RETURN (('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint)::double precision / 4294967295::double precision;
END;
$$ LANGUAGE plpgsql;

-- Helper: Get a setting value
CREATE OR REPLACE FUNCTION get_setting(p_key TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT value_json INTO result FROM settings WHERE key = p_key;
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get complete user state
CREATE OR REPLACE FUNCTION get_my_state()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_user RECORD;
  v_game RECORD;
  v_balance INT;
  v_jackpot INT;
  v_today DATE;
  v_played_today BOOLEAN;
  v_tiers JSONB;
  v_stake_tiers_json JSONB;
  v_tier_unlocks_json JSONB;
  v_i INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_user FROM users WHERE id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  SELECT * INTO v_game FROM game_state WHERE user_id = v_user_id;
  SELECT balance_cents INTO v_balance FROM wallet_balance_cache WHERE user_id = v_user_id;
  SELECT jackpot_cents INTO v_jackpot FROM jackpot_state WHERE id = 1;

  v_today := get_madrid_today();
  v_played_today := COALESCE(v_game.last_play_date = v_today, false);

  v_stake_tiers_json := get_setting('stake_tiers_cents');
  v_tier_unlocks_json := get_setting('tier_unlock_streaks');

  v_tiers := '[]'::jsonb;
  FOR v_i IN 0..(jsonb_array_length(v_stake_tiers_json) - 1) LOOP
    v_tiers := v_tiers || jsonb_build_object(
      'tier', v_i + 1,
      'stake_cents', (v_stake_tiers_json->>v_i)::int,
      'unlock_streak', (v_tier_unlocks_json->>v_i)::int,
      'unlocked', COALESCE(v_game.current_streak, 0) >= (v_tier_unlocks_json->>v_i)::int
    );
  END LOOP;

  RETURN jsonb_build_object(
    'user', jsonb_build_object(
      'id', v_user.id,
      'guest_id', v_user.guest_id,
      'status', v_user.status
    ),
    'game_state', jsonb_build_object(
      'current_streak', COALESCE(v_game.current_streak, 0),
      'pot_cents', COALESCE(v_game.pot_cents, 0),
      'last_play_date', v_game.last_play_date
    ),
    'wallet_balance_cents', COALESCE(v_balance, 0),
    'jackpot_cents', COALESCE(v_jackpot, 0),
    'played_today', v_played_today,
    'available_tiers', v_tiers
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Play Daily Gate
CREATE OR REPLACE FUNCTION play_daily_gate(
  p_stake_tier INT,
  p_idem_key TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_today DATE;
  v_user_status TEXT;
  v_game RECORD;
  v_stake_cents INT;
  v_stake_tiers_json JSONB;
  v_tier_unlocks_json JSONB;
  v_survival_prob DOUBLE PRECISION;
  v_jackpot_pct DOUBLE PRECISION;
  v_outcome TEXT;
  v_new_streak INT;
  v_new_pot INT;
  v_jackpot_delta INT;
  v_balance INT;
  v_play_id UUID;
  v_existing_response JSONB;
  v_request_hash TEXT;
  v_milestone_hit INT;
  v_jackpot_cents INT;
  v_response JSONB;
  v_unlock_streak INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_request_hash := md5(v_user_id::text || ':play:' || p_stake_tier::text);

  SELECT response_json INTO v_existing_response
  FROM idempotency_keys
  WHERE user_id = v_user_id AND endpoint = 'play' AND idem_key = p_idem_key;

  IF FOUND THEN
    RETURN v_existing_response;
  END IF;

  SELECT status INTO v_user_status FROM users WHERE id = v_user_id;
  IF v_user_status = 'banned' THEN
    RAISE EXCEPTION 'Account is banned';
  END IF;

  v_today := get_madrid_today();

  v_stake_tiers_json := get_setting('stake_tiers_cents');
  v_tier_unlocks_json := get_setting('tier_unlock_streaks');
  v_survival_prob := (get_setting('daily_gate_survival_probability'))::double precision;
  v_jackpot_pct := (get_setting('jackpot_contribution_pct'))::double precision;

  IF p_stake_tier < 1 OR p_stake_tier > jsonb_array_length(v_stake_tiers_json) THEN
    RAISE EXCEPTION 'Invalid stake tier';
  END IF;

  v_stake_cents := (v_stake_tiers_json->>(p_stake_tier - 1))::int;
  v_unlock_streak := (v_tier_unlocks_json->>(p_stake_tier - 1))::int;

  SELECT * INTO v_game FROM game_state WHERE user_id = v_user_id FOR UPDATE;

  IF v_game.current_streak < v_unlock_streak THEN
    RAISE EXCEPTION 'Stake tier locked: need streak >= %', v_unlock_streak;
  END IF;

  IF v_game.last_play_date = v_today THEN
    RAISE EXCEPTION 'Already played today';
  END IF;

  SELECT balance_cents INTO v_balance FROM wallet_balance_cache WHERE user_id = v_user_id FOR UPDATE;
  IF v_balance < v_stake_cents THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  INSERT INTO wallet_ledger (user_id, type, amount_cents, meta)
  VALUES (v_user_id, 'STAKE', -v_stake_cents, jsonb_build_object('game_id', 'daily_gate', 'play_date', v_today::text));

  UPDATE wallet_balance_cache
  SET balance_cents = balance_cents - v_stake_cents, updated_at = now()
  WHERE user_id = v_user_id;

  v_balance := v_balance - v_stake_cents;

  IF secure_random_float() < v_survival_prob THEN
    v_outcome := 'SURVIVE';
    v_new_streak := v_game.current_streak + 1;
    v_new_pot := v_game.pot_cents + v_stake_cents;
    v_jackpot_delta := 0;
  ELSE
    v_outcome := 'DIE';
    v_new_streak := 0;
    v_new_pot := 0;
    v_jackpot_delta := CEIL(v_stake_cents * v_jackpot_pct / 100.0)::int;
  END IF;

  UPDATE game_state SET
    current_streak = v_new_streak,
    pot_cents = v_new_pot,
    last_play_date = v_today,
    updated_at = now()
  WHERE user_id = v_user_id;

  v_play_id := gen_random_uuid();
  INSERT INTO plays (id, user_id, game_id, play_date, stake_cents, outcome, streak_after, pot_after_cents)
  VALUES (v_play_id, v_user_id, 'daily_gate', v_today, v_stake_cents, v_outcome, v_new_streak, v_new_pot);

  IF v_outcome = 'DIE' AND v_jackpot_delta > 0 THEN
    UPDATE jackpot_state SET jackpot_cents = jackpot_cents + v_jackpot_delta, updated_at = now() WHERE id = 1;
    INSERT INTO wallet_ledger (user_id, type, amount_cents, reference_id, meta)
    VALUES (v_user_id, 'JACKPOT_CONTRIB', 0, v_play_id, jsonb_build_object('game_id', 'daily_gate', 'amount', v_jackpot_delta));
  END IF;

  SELECT jackpot_cents INTO v_jackpot_cents FROM jackpot_state WHERE id = 1;

  v_milestone_hit := NULL;
  IF v_outcome = 'SURVIVE' AND v_new_streak IN (3, 7, 14, 30) THEN
    v_milestone_hit := v_new_streak;
  END IF;

  v_response := jsonb_build_object(
    'outcome', v_outcome,
    'streak', v_new_streak,
    'pot_cents', v_new_pot,
    'wallet_balance_cents', v_balance,
    'jackpot_cents', v_jackpot_cents,
    'milestone_hit', v_milestone_hit,
    'played_today', true,
    'play_id', v_play_id
  );

  INSERT INTO idempotency_keys (user_id, endpoint, idem_key, request_hash, response_json)
  VALUES (v_user_id, 'play', p_idem_key, v_request_hash, v_response);

  RETURN v_response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cashout Game
CREATE OR REPLACE FUNCTION cashout_game(
  p_game_id TEXT,
  p_idem_key TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_user_status TEXT;
  v_game RECORD;
  v_max_cashout INT;
  v_cashout_amount INT;
  v_balance INT;
  v_existing_response JSONB;
  v_request_hash TEXT;
  v_jackpot_cents INT;
  v_response JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_request_hash := md5(v_user_id::text || ':cashout:' || p_game_id);

  SELECT response_json INTO v_existing_response
  FROM idempotency_keys
  WHERE user_id = v_user_id AND endpoint = 'cashout' AND idem_key = p_idem_key;

  IF FOUND THEN
    RETURN v_existing_response;
  END IF;

  SELECT status INTO v_user_status FROM users WHERE id = v_user_id;
  IF v_user_status = 'banned' THEN
    RAISE EXCEPTION 'Account is banned';
  END IF;

  SELECT * INTO v_game FROM game_state WHERE user_id = v_user_id FOR UPDATE;

  IF v_game.pot_cents <= 0 THEN
    RAISE EXCEPTION 'No pot to cashout';
  END IF;

  v_max_cashout := (get_setting('max_cashout_cents'))::int;
  v_cashout_amount := LEAST(v_game.pot_cents, v_max_cashout);

  INSERT INTO wallet_ledger (user_id, type, amount_cents, meta)
  VALUES (v_user_id, 'CASHOUT', v_cashout_amount, jsonb_build_object('game_id', p_game_id, 'pot_was', v_game.pot_cents));

  SELECT balance_cents INTO v_balance FROM wallet_balance_cache WHERE user_id = v_user_id FOR UPDATE;
  UPDATE wallet_balance_cache
  SET balance_cents = balance_cents + v_cashout_amount, updated_at = now()
  WHERE user_id = v_user_id;

  v_balance := v_balance + v_cashout_amount;

  UPDATE game_state SET
    current_streak = 0,
    pot_cents = 0,
    updated_at = now()
  WHERE user_id = v_user_id;

  SELECT jackpot_cents INTO v_jackpot_cents FROM jackpot_state WHERE id = 1;

  v_response := jsonb_build_object(
    'streak', 0,
    'pot_cents', 0,
    'wallet_balance_cents', v_balance,
    'jackpot_cents', v_jackpot_cents,
    'cashout_amount_cents', v_cashout_amount,
    'played_today', COALESCE(v_game.last_play_date = get_madrid_today(), false)
  );

  INSERT INTO idempotency_keys (user_id, endpoint, idem_key, request_hash, response_json)
  VALUES (v_user_id, 'cashout', p_idem_key, v_request_hash, v_response);

  RETURN v_response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Topup Wallet (MVP: simulated credits)
CREATE OR REPLACE FUNCTION topup_wallet(
  p_amount_cents INT,
  p_idem_key TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_user_status TEXT;
  v_balance INT;
  v_existing_response JSONB;
  v_request_hash TEXT;
  v_response JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount_cents <= 0 OR p_amount_cents > 10000 THEN
    RAISE EXCEPTION 'Invalid topup amount';
  END IF;

  v_request_hash := md5(v_user_id::text || ':topup:' || p_amount_cents::text);

  SELECT response_json INTO v_existing_response
  FROM idempotency_keys
  WHERE user_id = v_user_id AND endpoint = 'topup' AND idem_key = p_idem_key;

  IF FOUND THEN
    RETURN v_existing_response;
  END IF;

  SELECT status INTO v_user_status FROM users WHERE id = v_user_id;
  IF v_user_status = 'banned' THEN
    RAISE EXCEPTION 'Account is banned';
  END IF;

  INSERT INTO wallet_ledger (user_id, type, amount_cents, meta)
  VALUES (v_user_id, 'TOPUP', p_amount_cents, jsonb_build_object('simulated', true));

  SELECT balance_cents INTO v_balance FROM wallet_balance_cache WHERE user_id = v_user_id FOR UPDATE;
  UPDATE wallet_balance_cache
  SET balance_cents = balance_cents + p_amount_cents, updated_at = now()
  WHERE user_id = v_user_id;

  v_balance := v_balance + p_amount_cents;

  v_response := jsonb_build_object(
    'balance_cents', v_balance,
    'topup_amount_cents', p_amount_cents
  );

  INSERT INTO idempotency_keys (user_id, endpoint, idem_key, request_hash, response_json)
  VALUES (v_user_id, 'topup', p_idem_key, v_request_hash, v_response);

  RETURN v_response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Global Leaderboard
CREATE OR REPLACE FUNCTION get_global_leaderboard(p_limit INT DEFAULT 50)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN COALESCE(
    (SELECT jsonb_agg(row_to_json(t))
    FROM (
      SELECT u.guest_id, gs.current_streak, gs.pot_cents,
        RANK() OVER (ORDER BY gs.current_streak DESC, gs.pot_cents DESC) as rank
      FROM game_state gs
      JOIN users u ON u.id = gs.user_id
      WHERE u.status = 'active' AND gs.current_streak > 0
      ORDER BY gs.current_streak DESC, gs.pot_cents DESC
      LIMIT p_limit
    ) t),
    '[]'::jsonb
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;