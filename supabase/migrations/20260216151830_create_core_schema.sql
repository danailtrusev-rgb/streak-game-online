/*
  # Create Core Schema for Survive the Streak

  1. New Tables
    - `users` - Player profiles linked to auth.users
      - `id` (uuid, primary key, references auth.users)
      - `guest_id` (text, unique) - Display identifier for guest users
      - `email` (text, nullable, unique) - For future account upgrade
      - `token_version` (int) - JWT version for token invalidation
      - `status` (text) - active or banned
      - `risk_flags` (jsonb) - Suspicious behavior tracking
      - `created_at` (timestamptz)

    - `game_state` - Current game progress per user
      - `user_id` (uuid, primary key, references users)
      - `current_streak` (int) - Current survival streak
      - `pot_cents` (int) - Accumulated pot in cents
      - `last_play_date` (date) - Last play date in Europe/Madrid timezone
      - `updated_at` (timestamptz)

    - `plays` - Historical record of all plays
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `game_id` (text) - Game module identifier
      - `play_date` (date) - Play date in Europe/Madrid timezone
      - `stake_cents` (int) - Stake amount in cents
      - `outcome` (text) - SURVIVE or DIE
      - `streak_after` (int) - Streak count after this play
      - `pot_after_cents` (int) - Pot value after this play
      - Unique constraint on (user_id, game_id, play_date)

    - `wallet_ledger` - Append-only financial transaction log
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `type` (text) - Transaction type
      - `amount_cents` (int) - Amount (positive or negative)
      - `reference_id` (uuid, nullable) - Reference to related record
      - `meta` (jsonb) - Additional metadata
      - `created_at` (timestamptz)

    - `wallet_balance_cache` - Cached wallet balance for performance
      - `user_id` (uuid, primary key, references users)
      - `balance_cents` (int) - Current cached balance
      - `updated_at` (timestamptz)

    - `jackpot_state` - Single-row jackpot accumulator
      - `id` (int, primary key, always 1)
      - `jackpot_cents` (int) - Current jackpot pool
      - `updated_at` (timestamptz)

    - `settings` - Key-value configuration store
      - `key` (text, primary key)
      - `value_json` (jsonb)
      - `updated_at` (timestamptz)

    - `games` - Game module registry for multi-game architecture
      - `game_id` (text, primary key)
      - `name` (text) - Display name
      - `description` (text)
      - `status` (text) - active, coming_soon, or disabled
      - `icon` (text) - Icon identifier
      - `sort_order` (int)
      - `created_at` (timestamptz)

    - `idempotency_keys` - Request deduplication for state-changing operations
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `endpoint` (text) - API endpoint identifier
      - `idem_key` (text) - Client-provided idempotency key
      - `request_hash` (text) - Hash of request parameters
      - `response_json` (jsonb) - Stored response for replay
      - Unique constraint on (user_id, endpoint, idem_key)

    - `admin_audit_log` - Audit trail for all admin actions
      - `id` (uuid, primary key)
      - `admin_actor` (text) - Admin identifier
      - `action` (text) - Action performed
      - `payload_json` (jsonb) - Action details
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on ALL tables
    - Users can only read their own data
    - No direct client writes (handled by SECURITY DEFINER functions)
    - Jackpot and settings readable by active authenticated users
    - Games readable by authenticated users
    - Admin audit log and idempotency keys have no client policies

  3. Indexes
    - plays(user_id, play_date) for daily play lookups
    - plays(game_id, play_date) for game analytics
    - wallet_ledger(user_id, created_at) for ledger queries
    - game_state(current_streak DESC) for leaderboard
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  token_version INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'banned')),
  risk_flags JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON users FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Game state table
CREATE TABLE IF NOT EXISTS game_state (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak INT NOT NULL DEFAULT 0,
  pot_cents INT NOT NULL DEFAULT 0,
  last_play_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own game state"
  ON game_state FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Plays table
CREATE TABLE IF NOT EXISTS plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  play_date DATE NOT NULL,
  stake_cents INT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('SURVIVE', 'DIE')),
  streak_after INT NOT NULL,
  pot_after_cents INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT plays_unique_per_day UNIQUE (user_id, game_id, play_date)
);

ALTER TABLE plays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own plays"
  ON plays FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_plays_user_date ON plays(user_id, play_date);
CREATE INDEX IF NOT EXISTS idx_plays_game_date ON plays(game_id, play_date);

-- Wallet ledger (append-only)
CREATE TABLE IF NOT EXISTS wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('TOPUP', 'STAKE', 'CASHOUT', 'ADMIN_ADJUST', 'JACKPOT_CONTRIB', 'JACKPOT_WIN')),
  amount_cents INT NOT NULL,
  reference_id UUID,
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE wallet_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own ledger"
  ON wallet_ledger FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user ON wallet_ledger(user_id, created_at);

-- Wallet balance cache
CREATE TABLE IF NOT EXISTS wallet_balance_cache (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance_cents INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE wallet_balance_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own balance"
  ON wallet_balance_cache FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Jackpot state (single row)
CREATE TABLE IF NOT EXISTS jackpot_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  jackpot_cents INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE jackpot_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can read jackpot"
  ON jackpot_state FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND status = 'active'
    )
  );

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can read settings"
  ON settings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND status = 'active'
    )
  );

-- Games registry
CREATE TABLE IF NOT EXISTS games (
  game_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'coming_soon' CHECK (status IN ('active', 'coming_soon', 'disabled')),
  icon TEXT NOT NULL DEFAULT 'skull',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read games"
  ON games FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND status = 'active'
    )
  );

-- Idempotency keys
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  idem_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT idempotency_unique UNIQUE (user_id, endpoint, idem_key)
);

ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Admin audit log
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_actor TEXT NOT NULL,
  action TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Leaderboard index
CREATE INDEX IF NOT EXISTS idx_game_state_streak ON game_state(current_streak DESC);