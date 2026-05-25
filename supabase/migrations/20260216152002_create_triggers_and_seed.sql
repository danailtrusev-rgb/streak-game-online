/*
  # Create Triggers and Seed Data

  1. Triggers
    - `handle_new_user` - Automatically creates user profile, game state, and wallet
      balance cache when a new auth user is created
    - Reads guest_id from user metadata

  2. Seed Data
    - `jackpot_state` - Initialized with 0 cents
    - `settings` - All configurable game parameters:
      - timezone: Europe/Madrid
      - daily_gate_survival_probability: 0.50
      - jackpot_contribution_pct: 5
      - stake_tiers_cents: [100, 200, 500]
      - tier_unlock_streaks: [0, 3, 7]
      - max_cashout_cents: 50000
    - `games` - Game module registry:
      - daily_gate (active)
      - daily_dice (coming_soon)
      - daily_pick (coming_soon)
      - daily_puzzle (coming_soon)

  3. Important Notes
    - Trigger uses SECURITY DEFINER to write across tables
    - All seed data uses INSERT ... ON CONFLICT to be idempotent
*/

-- Trigger function: handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_guest_id TEXT;
BEGIN
  v_guest_id := COALESCE(
    NEW.raw_user_meta_data->>'guest_id',
    'guest_' || LEFT(NEW.id::text, 8)
  );

  INSERT INTO users (id, guest_id)
  VALUES (NEW.id, v_guest_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO game_state (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO wallet_balance_cache (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if present, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Seed jackpot state
INSERT INTO jackpot_state (id, jackpot_cents)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- Seed settings
INSERT INTO settings (key, value_json) VALUES
  ('timezone', '"Europe/Madrid"'),
  ('daily_gate_survival_probability', '0.50'),
  ('jackpot_contribution_pct', '5'),
  ('stake_tiers_cents', '[100, 200, 500]'),
  ('tier_unlock_streaks', '[0, 3, 7]'),
  ('max_cashout_cents', '50000')
ON CONFLICT (key) DO NOTHING;

-- Seed games registry
INSERT INTO games (game_id, name, description, status, icon, sort_order) VALUES
  ('daily_gate', 'Daily Gate', 'Face the ancient skull gate. Survive to build your streak and grow your pot.', 'active', 'skull', 1),
  ('daily_dice', 'Daily Dice', 'Roll the bones of fate. Match the ancient symbols to win.', 'coming_soon', 'dice-6', 2),
  ('daily_pick', 'Daily Pick', 'Choose wisely from the jungle relics. One holds fortune, others hold ruin.', 'coming_soon', 'gem', 3),
  ('daily_puzzle', 'Daily Puzzle', 'Decode the temple inscriptions before time runs out.', 'coming_soon', 'puzzle', 4)
ON CONFLICT (game_id) DO NOTHING;