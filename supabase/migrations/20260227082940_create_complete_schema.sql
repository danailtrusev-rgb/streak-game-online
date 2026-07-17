/*
  # Complete Database Schema for Survive the Streak

  This migration creates the entire database schema including:
  
  ## New Tables
  
  1. **users** - User profiles
     - `id` (uuid, primary key, references auth.users)
     - `guest_id` (text, unique, indexed)
     - `status` (text, active/banned)
     - `risk_flags` (jsonb)
     - `created_at` (timestamptz)
  
  2. **game_state** - Player game state
     - `user_id` (uuid, primary key, references users)
     - `current_streak` (integer)
     - `pot_cents` (integer)
     - `last_play_date` (date, Europe/Madrid timezone)
     - `updated_at` (timestamptz)
  
  3. **plays** - Game play history
     - `id` (uuid, primary key)
     - `user_id` (uuid, references users)
     - `game_id` (text, references games)
     - `play_date` (date, Europe/Madrid timezone)
     - `outcome` (text, SURVIVE/DIE)
     - `stake_cents` (integer)
     - `pot_before_cents` (integer)
     - `pot_after_cents` (integer)
     - `streak_before` (integer)
     - `streak_after` (integer)
     - `milestone_hit` (integer, nullable)
     - `created_at` (timestamptz)
  
  4. **wallet_ledger** - Append-only transaction log
     - `id` (uuid, primary key)
     - `user_id` (uuid, references users)
     - `type` (text, TOPUP/STAKE/CASHOUT/ADMIN_ADJUST/JACKPOT_CONTRIB/JACKPOT_WIN)
     - `amount_cents` (integer, can be negative)
     - `meta` (jsonb)
     - `created_at` (timestamptz)
  
  5. **wallet_balance_cache** - Cached wallet balances
     - `user_id` (uuid, primary key, references users)
     - `balance_cents` (integer)
     - `updated_at` (timestamptz)
  
  6. **jackpot_state** - Global jackpot state
     - `id` (integer, primary key, always 1)
     - `balance_cents` (integer)
     - `updated_at` (timestamptz)
  
  7. **settings** - Global configuration
     - `key` (text, primary key)
     - `value_json` (jsonb)
     - `updated_at` (timestamptz)
  
  8. **games** - Game modules registry
     - `game_id` (text, primary key)
     - `name` (text)
     - `description` (text)
     - `status` (text, active/coming_soon/disabled)
     - `icon` (text)
     - `sort_order` (integer)
     - `created_at` (timestamptz)
  
  9. **idempotency_keys** - Idempotency tracking
     - `key` (text, primary key)
     - `user_id` (uuid, references users)
     - `created_at` (timestamptz)
     - `expires_at` (timestamptz)
  
  10. **admin_audit_log** - Admin action audit trail
      - `id` (uuid, primary key)
      - `admin_actor` (text)
      - `action` (text)
      - `payload_json` (jsonb)
      - `created_at` (timestamptz)

  ## Security
  
  - RLS enabled on all tables
  - Policies for authenticated users to access their own data
  - Admin functions use SECURITY DEFINER for privileged operations
  
  ## Helper Functions
  
  - `get_madrid_today()` - Returns current date in Europe/Madrid timezone
  - `secure_random_float()` - Generates cryptographically secure random float
  - `get_setting(key)` - Retrieves setting value
  
  ## Game Logic Functions
  
  - `get_my_state()` - Returns current player state
  - `play_daily_gate(tier, idempotency_key)` - Executes daily game play
  - `cashout_game()` - Cashes out current pot
  - `topup_wallet(amount_cents, idempotency_key)` - Adds credits to wallet
  - `get_global_leaderboard(limit)` - Returns top players by streak
  
  ## Triggers
  
  - `handle_new_user` - Auto-creates user profile on auth signup
  
  ## Seed Data
  
  - Initial jackpot state
  - Game settings (survival probability, stake tiers, jackpot contribution)
  - Game modules registry (daily_gate active, others coming soon)
*/

-- =====================================================
-- TABLES
-- =====================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  guest_id text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'banned')),
  risk_flags jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_guest_id ON users(guest_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Game state table
CREATE TABLE IF NOT EXISTS game_state (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  pot_cents integer NOT NULL DEFAULT 0,
  last_play_date date,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_state_streak ON game_state(current_streak DESC);

-- Plays table
CREATE TABLE IF NOT EXISTS plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id text NOT NULL,
  play_date date NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('SURVIVE', 'DIE')),
  stake_cents integer NOT NULL,
  pot_before_cents integer NOT NULL,
  pot_after_cents integer NOT NULL,
  streak_before integer NOT NULL,
  streak_after integer NOT NULL,
  milestone_hit integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plays_user_date ON plays(user_id, play_date DESC);
CREATE INDEX IF NOT EXISTS idx_plays_date ON plays(play_date DESC);
CREATE INDEX IF NOT EXISTS idx_plays_outcome ON plays(outcome);

-- Wallet ledger table
CREATE TABLE IF NOT EXISTS wallet_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('TOPUP', 'STAKE', 'CASHOUT', 'ADMIN_ADJUST', 'JACKPOT_CONTRIB', 'JACKPOT_WIN')),
  amount_cents integer NOT NULL,
  meta jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user ON wallet_ledger(user_id, created_at DESC);

-- Wallet balance cache table
CREATE TABLE IF NOT EXISTS wallet_balance_cache (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance_cents integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Jackpot state table
CREATE TABLE IF NOT EXISTS jackpot_state (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  balance_cents integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value_json jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Games registry table
CREATE TABLE IF NOT EXISTS games (
  game_id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'coming_soon' CHECK (status IN ('active', 'coming_soon', 'disabled')),
  icon text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_games_status ON games(status, sort_order);

-- Idempotency keys table
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON idempotency_keys(expires_at);

-- Admin audit log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_actor text NOT NULL,
  action text NOT NULL,
  payload_json jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_balance_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE jackpot_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Game state policies
CREATE POLICY "Users can view own game state" ON game_state FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Plays policies
CREATE POLICY "Users can view own plays" ON plays FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Wallet ledger policies
CREATE POLICY "Users can view own ledger" ON wallet_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Wallet balance cache policies
CREATE POLICY "Users can view own balance" ON wallet_balance_cache FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Jackpot state policies
CREATE POLICY "Anyone can view jackpot" ON jackpot_state FOR SELECT TO authenticated USING (true);

-- Settings policies
CREATE POLICY "Anyone can view settings" ON settings FOR SELECT TO authenticated USING (true);

-- Games policies
CREATE POLICY "Anyone can view games" ON games FOR SELECT TO authenticated USING (true);

-- Idempotency keys policies
CREATE POLICY "Users can view own keys" ON idempotency_keys FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Admin audit log policies (no public access)

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get current date in Madrid timezone
CREATE OR REPLACE FUNCTION get_madrid_today()
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT (now() AT TIME ZONE 'Europe/Madrid')::date;
$$;

-- Generate secure random float between 0 and 1
CREATE OR REPLACE FUNCTION secure_random_float()
RETURNS float
LANGUAGE plpgsql
AS $$
DECLARE
  random_bytes bytea;
  random_int bigint;
BEGIN
  random_bytes := gen_random_bytes(8);
  random_int := (get_byte(random_bytes, 0)::bigint << 56) |
                (get_byte(random_bytes, 1)::bigint << 48) |
                (get_byte(random_bytes, 2)::bigint << 40) |
                (get_byte(random_bytes, 3)::bigint << 32) |
                (get_byte(random_bytes, 4)::bigint << 24) |
                (get_byte(random_bytes, 5)::bigint << 16) |
                (get_byte(random_bytes, 6)::bigint << 8) |
                get_byte(random_bytes, 7)::bigint;
  RETURN abs(random_int::float / 9223372036854775807::float);
END;
$$;

-- Get setting value
CREATE OR REPLACE FUNCTION get_setting(setting_key text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT value_json FROM settings WHERE key = setting_key;
$$;

-- =====================================================
-- GAME LOGIC FUNCTIONS
-- =====================================================

-- Get player state
CREATE OR REPLACE FUNCTION get_my_state()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_result jsonb;
  v_user_record users;
  v_game_record game_state;
  v_balance_cents integer;
  v_jackpot_cents integer;
  v_played_today boolean;
  v_today date;
  v_tiers jsonb;
BEGIN
  v_user_id := auth.uid();
  v_today := get_madrid_today();
  
  SELECT * INTO v_user_record FROM users WHERE id = v_user_id;
  SELECT * INTO v_game_record FROM game_state WHERE user_id = v_user_id;
  SELECT balance_cents INTO v_balance_cents FROM wallet_balance_cache WHERE user_id = v_user_id;
  SELECT balance_cents INTO v_jackpot_cents FROM jackpot_state WHERE id = 1;
  
  v_played_today := EXISTS (
    SELECT 1 FROM plays WHERE user_id = v_user_id AND play_date = v_today
  );
  
  v_tiers := get_setting('stake_tiers');
  
  v_result := jsonb_build_object(
    'user', jsonb_build_object(
      'id', v_user_record.id,
      'guest_id', v_user_record.guest_id,
      'status', v_user_record.status
    ),
    'game_state', jsonb_build_object(
      'current_streak', COALESCE(v_game_record.current_streak, 0),
      'pot_cents', COALESCE(v_game_record.pot_cents, 0),
      'last_play_date', v_game_record.last_play_date
    ),
    'wallet_balance_cents', COALESCE(v_balance_cents, 0),
    'jackpot_cents', COALESCE(v_jackpot_cents, 0),
    'played_today', v_played_today,
    'available_tiers', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'tier', t->>'tier',
          'stake_cents', (t->>'stake_cents')::integer,
          'unlock_streak', (t->>'unlock_streak')::integer,
          'unlocked', COALESCE(v_game_record.current_streak, 0) >= (t->>'unlock_streak')::integer
        )
      )
      FROM jsonb_array_elements(v_tiers) AS t
    )
  );
  
  RETURN v_result;
END;
$$;

-- Play daily gate
CREATE OR REPLACE FUNCTION play_daily_gate(p_tier integer, p_idempotency_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_today date;
  v_game_record game_state;
  v_balance_cents integer;
  v_tiers jsonb;
  v_tier jsonb;
  v_stake_cents integer;
  v_survival_prob float;
  v_roll float;
  v_outcome text;
  v_new_streak integer;
  v_new_pot integer;
  v_jackpot_contrib integer;
  v_milestones jsonb;
  v_milestone_hit integer;
  v_play_id uuid;
  v_jackpot_cents integer;
BEGIN
  v_user_id := auth.uid();
  v_today := get_madrid_today();
  
  -- Check idempotency
  IF EXISTS (SELECT 1 FROM idempotency_keys WHERE key = p_idempotency_key AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Duplicate request';
  END IF;
  
  INSERT INTO idempotency_keys (key, user_id, expires_at)
  VALUES (p_idempotency_key, v_user_id, now() + interval '24 hours');
  
  -- Check already played today
  IF EXISTS (SELECT 1 FROM plays WHERE user_id = v_user_id AND play_date = v_today) THEN
    RAISE EXCEPTION 'Already played today';
  END IF;
  
  -- Lock game state
  SELECT * INTO v_game_record FROM game_state WHERE user_id = v_user_id FOR UPDATE;
  
  -- Get wallet balance
  SELECT balance_cents INTO v_balance_cents FROM wallet_balance_cache WHERE user_id = v_user_id FOR UPDATE;
  
  -- Get tier info
  v_tiers := get_setting('stake_tiers');
  SELECT t INTO v_tier FROM jsonb_array_elements(v_tiers) t WHERE (t->>'tier')::integer = p_tier;
  
  IF v_tier IS NULL THEN
    RAISE EXCEPTION 'Invalid tier';
  END IF;
  
  v_stake_cents := (v_tier->>'stake_cents')::integer;
  
  -- Check tier unlocked
  IF v_game_record.current_streak < (v_tier->>'unlock_streak')::integer THEN
    RAISE EXCEPTION 'Tier not unlocked';
  END IF;
  
  -- Check sufficient balance
  IF v_balance_cents < v_stake_cents THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  -- Deduct stake
  INSERT INTO wallet_ledger (user_id, type, amount_cents, meta)
  VALUES (v_user_id, 'STAKE', -v_stake_cents, jsonb_build_object('tier', p_tier));
  
  UPDATE wallet_balance_cache
  SET balance_cents = balance_cents - v_stake_cents, updated_at = now()
  WHERE user_id = v_user_id;
  
  v_balance_cents := v_balance_cents - v_stake_cents;
  
  -- Jackpot contribution
  v_jackpot_contrib := (v_stake_cents * (get_setting('jackpot_contribution_rate')->>0)::float)::integer;
  
  INSERT INTO wallet_ledger (user_id, type, amount_cents, meta)
  VALUES (v_user_id, 'JACKPOT_CONTRIB', -v_jackpot_contrib, '{}');
  
  UPDATE wallet_balance_cache
  SET balance_cents = balance_cents - v_jackpot_contrib, updated_at = now()
  WHERE user_id = v_user_id;
  
  UPDATE jackpot_state
  SET balance_cents = balance_cents + v_jackpot_contrib, updated_at = now()
  WHERE id = 1;
  
  v_balance_cents := v_balance_cents - v_jackpot_contrib;
  
  -- Roll for survival
  v_survival_prob := (get_setting('survival_probability')->>0)::float;
  v_roll := secure_random_float();
  v_outcome := CASE WHEN v_roll < v_survival_prob THEN 'SURVIVE' ELSE 'DIE' END;
  
  IF v_outcome = 'SURVIVE' THEN
    v_new_streak := v_game_record.current_streak + 1;
    v_new_pot := v_game_record.pot_cents + (v_stake_cents - v_jackpot_contrib);
    
    -- Check milestone
    v_milestones := get_setting('milestones');
    SELECT (m->>'days')::integer INTO v_milestone_hit
    FROM jsonb_array_elements(v_milestones) m
    WHERE (m->>'days')::integer = v_new_streak;
    
  ELSE
    v_new_streak := 0;
    v_new_pot := 0;
    v_milestone_hit := NULL;
  END IF;
  
  -- Record play
  INSERT INTO plays (user_id, game_id, play_date, outcome, stake_cents, pot_before_cents, pot_after_cents, streak_before, streak_after, milestone_hit)
  VALUES (v_user_id, 'daily_gate', v_today, v_outcome, v_stake_cents, v_game_record.pot_cents, v_new_pot, v_game_record.current_streak, v_new_streak, v_milestone_hit)
  RETURNING id INTO v_play_id;
  
  -- Update game state
  UPDATE game_state
  SET current_streak = v_new_streak, pot_cents = v_new_pot, last_play_date = v_today, updated_at = now()
  WHERE user_id = v_user_id;
  
  SELECT balance_cents INTO v_jackpot_cents FROM jackpot_state WHERE id = 1;
  
  RETURN jsonb_build_object(
    'outcome', v_outcome,
    'streak', v_new_streak,
    'pot_cents', v_new_pot,
    'wallet_balance_cents', v_balance_cents,
    'jackpot_cents', v_jackpot_cents,
    'milestone_hit', v_milestone_hit,
    'played_today', true,
    'play_id', v_play_id
  );
END;
$$;

-- Cashout game
CREATE OR REPLACE FUNCTION cashout_game()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_game_record game_state;
  v_cashout_amount integer;
  v_new_balance integer;
  v_jackpot_cents integer;
BEGIN
  v_user_id := auth.uid();
  
  SELECT * INTO v_game_record FROM game_state WHERE user_id = v_user_id FOR UPDATE;
  
  IF v_game_record.pot_cents = 0 THEN
    RAISE EXCEPTION 'No pot to cash out';
  END IF;
  
  v_cashout_amount := v_game_record.pot_cents;
  
  INSERT INTO wallet_ledger (user_id, type, amount_cents, meta)
  VALUES (v_user_id, 'CASHOUT', v_cashout_amount, jsonb_build_object('streak', v_game_record.current_streak));
  
  UPDATE wallet_balance_cache
  SET balance_cents = balance_cents + v_cashout_amount, updated_at = now()
  WHERE user_id = v_user_id;
  
  UPDATE game_state
  SET current_streak = 0, pot_cents = 0, updated_at = now()
  WHERE user_id = v_user_id;
  
  SELECT balance_cents INTO v_new_balance FROM wallet_balance_cache WHERE user_id = v_user_id;
  SELECT balance_cents INTO v_jackpot_cents FROM jackpot_state WHERE id = 1;
  
  RETURN jsonb_build_object(
    'streak', 0,
    'pot_cents', 0,
    'wallet_balance_cents', v_new_balance,
    'jackpot_cents', v_jackpot_cents,
    'cashout_amount_cents', v_cashout_amount,
    'played_today', v_game_record.last_play_date = get_madrid_today()
  );
END;
$$;

-- Topup wallet
CREATE OR REPLACE FUNCTION topup_wallet(p_amount_cents integer, p_idempotency_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_new_balance integer;
BEGIN
  v_user_id := auth.uid();
  
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  
  -- Check idempotency
  IF EXISTS (SELECT 1 FROM idempotency_keys WHERE key = p_idempotency_key AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Duplicate request';
  END IF;
  
  INSERT INTO idempotency_keys (key, user_id, expires_at)
  VALUES (p_idempotency_key, v_user_id, now() + interval '24 hours');
  
  INSERT INTO wallet_ledger (user_id, type, amount_cents, meta)
  VALUES (v_user_id, 'TOPUP', p_amount_cents, '{}');
  
  UPDATE wallet_balance_cache
  SET balance_cents = balance_cents + p_amount_cents, updated_at = now()
  WHERE user_id = v_user_id;
  
  SELECT balance_cents INTO v_new_balance FROM wallet_balance_cache WHERE user_id = v_user_id;
  
  RETURN jsonb_build_object(
    'balance_cents', v_new_balance,
    'topup_amount_cents', p_amount_cents
  );
END;
$$;

-- Get global leaderboard
CREATE OR REPLACE FUNCTION get_global_leaderboard(p_limit integer DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'guest_id', u.guest_id,
        'current_streak', gs.current_streak,
        'pot_cents', gs.pot_cents,
        'rank', ROW_NUMBER() OVER (ORDER BY gs.current_streak DESC, gs.pot_cents DESC)
      )
    )
    FROM game_state gs
    JOIN users u ON gs.user_id = u.id
    WHERE gs.current_streak > 0
    ORDER BY gs.current_streak DESC, gs.pot_cents DESC
    LIMIT p_limit
  );
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_guest_id text;
BEGIN
  v_guest_id := COALESCE(NEW.raw_user_meta_data->>'guest_id', gen_random_uuid()::text);
  
  INSERT INTO users (id, guest_id)
  VALUES (NEW.id, v_guest_id);
  
  INSERT INTO game_state (user_id)
  VALUES (NEW.id);
  
  INSERT INTO wallet_balance_cache (user_id, balance_cents)
  VALUES (NEW.id, 0);
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- SEED DATA
-- =====================================================

-- Initialize jackpot
INSERT INTO jackpot_state (id, balance_cents)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- Settings
INSERT INTO settings (key, value_json) VALUES
  ('survival_probability', '0.50'),
  ('stake_tiers', '[
    {"tier":1,"stake_cents":100,"unlock_streak":0},
    {"tier":2,"stake_cents":200,"unlock_streak":3},
    {"tier":3,"stake_cents":500,"unlock_streak":7}
  ]'),
  ('jackpot_contribution_rate', '0.10'),
  ('milestones', '[
    {"days":3,"reward_multiplier":1.0},
    {"days":7,"reward_multiplier":1.5},
    {"days":14,"reward_multiplier":2.0},
    {"days":30,"reward_multiplier":3.0}
  ]')
ON CONFLICT (key) DO NOTHING;

-- Games registry
INSERT INTO games (game_id, name, description, status, icon, sort_order) VALUES
  ('daily_gate', 'Daily Gate', 'Face the skull gate once per day. Survive to build your streak and pot.', 'active', '💀', 1),
  ('weekly_gauntlet', 'Weekly Gauntlet', 'Seven consecutive days of survival. Coming soon.', 'coming_soon', '🔥', 2),
  ('jackpot_rush', 'Jackpot Rush', 'Winner-takes-all global jackpot mode. Coming soon.', 'coming_soon', '💰', 3),
  ('streak_duel', 'Streak Duel', 'Challenge another player to a head-to-head streak battle. Coming soon.', 'coming_soon', '⚔️', 4)
ON CONFLICT (game_id) DO NOTHING;
