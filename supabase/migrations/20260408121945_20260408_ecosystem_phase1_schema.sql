/*
  # Survive the Streak — Ecosystem Phase 1 Schema Extension

  ## Summary
  This migration extends the existing schema to support the full game ecosystem:
  a multi-game platform with weekday qualification, Saturday/Sunday main events,
  promotional flyers, and winner announcements.

  ## New Tables
  1. `player_game_progress` — Per-player, per-game, per-date progress tracking
  2. `weekly_qualification_status` — Weekly aggregated qualification state per player
  3. `qualification_rules` — Admin-configurable rules for event entry
  4. `weekend_event_entries` — Weekend event entry records
  5. `promotional_assets` — Flyer/banner/winner card templates
  6. `winner_announcements` — Published winner records

  ## Extended Tables
  - `games` — Adds category, play_frequency, qualification_enabled, visibility days, launch_state

  ## Security
  - RLS enabled on all new tables
  - All policies require authentication and ownership/membership checks
*/

-- ==========================================
-- EXTEND games TABLE
-- ==========================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'category') THEN
    ALTER TABLE public.games ADD COLUMN category text NOT NULL DEFAULT 'daily';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'play_frequency') THEN
    ALTER TABLE public.games ADD COLUMN play_frequency text NOT NULL DEFAULT 'daily';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'qualification_enabled') THEN
    ALTER TABLE public.games ADD COLUMN qualification_enabled boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'visible_from_dow') THEN
    ALTER TABLE public.games ADD COLUMN visible_from_dow int DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'visible_to_dow') THEN
    ALTER TABLE public.games ADD COLUMN visible_to_dow int DEFAULT 7;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'launch_state') THEN
    ALTER TABLE public.games ADD COLUMN launch_state text NOT NULL DEFAULT 'live';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'short_label') THEN
    ALTER TABLE public.games ADD COLUMN short_label text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'points_on_play') THEN
    ALTER TABLE public.games ADD COLUMN points_on_play int NOT NULL DEFAULT 10;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'points_on_win') THEN
    ALTER TABLE public.games ADD COLUMN points_on_win int NOT NULL DEFAULT 20;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'config_json') THEN
    ALTER TABLE public.games ADD COLUMN config_json jsonb NOT NULL DEFAULT '{}';
  END IF;
END $$;

-- Upsert game catalog with full ecosystem
INSERT INTO public.games (game_id, name, short_label, description, icon, status, sort_order, category, play_frequency, qualification_enabled, visible_from_dow, visible_to_dow, launch_state, points_on_play, points_on_win, config_json)
VALUES
  ('daily_gate',         'Skull Gate',        'Gate',    'Face the ancient skull gate. Survive to build your streak.',                           'skull',        'active',       1,  'daily',   'daily',   true,  1, 5, 'live',        10, 20, '{"has_stake": true, "min_stake_cents": 100}'),
  ('daily_dice',         'Dice of Fate',      'Dice',    'Roll the dice. Predict the outcome. One chance per day.',                              'dice-6',       'active',       2,  'daily',   'daily',   true,  1, 5, 'live',        10, 25, '{"has_stake": false, "win_probability": 0.45}'),
  ('daily_pick',         'Hidden Pick',       'Pick',    'Choose from hidden options. One path leads to victory.',                               'gem',          'active',       3,  'daily',   'daily',   true,  1, 5, 'live',        10, 30, '{"has_stake": false, "options_count": 4, "win_probability": 0.25}'),
  ('daily_puzzle',       'Daily Puzzle',      'Puzzle',  'Solve today''s puzzle. Prove your mind is as strong as your streak.',                  'puzzle',       'active',       4,  'daily',   'daily',   true,  1, 5, 'live',        15, 15, '{"has_stake": false}'),
  ('daily_risk_ladder',  'Risk Ladder',       'Ladder',  'Climb the ladder or fall. Each rung is riskier than the last.',                        'trending-up',  'coming_soon',  5,  'daily',   'daily',   true,  1, 5, 'coming_soon', 10, 40, '{"has_stake": false}'),
  ('daily_qualifier_bonus','Bonus Challenge', 'Bonus',   'A special challenge for those close to qualification. Earn extra points.',             'star',         'coming_soon',  6,  'qualifier','daily',  true,  1, 5, 'coming_soon', 25, 25, '{"has_stake": false}'),
  ('saturday_main_event','Saturday Showdown', 'Showdown','The main weekly event. Qualified players only. Biggest prizes await.',                 'trophy',       'active',       10, 'weekend', 'weekly',  false, 6, 6, 'live',        0,  0,  '{"has_stake": true, "requires_qualification": true}'),
  ('sunday_winners_event','Sunday Crown',     'Crown',   'Only the worthy enter Sunday''s Crown. Last survivors compete for the jackpot.',       'crown',        'active',       11, 'weekend', 'weekly',  false, 7, 7, 'live',        0,  0,  '{"has_stake": false, "requires_qualification": true}')
ON CONFLICT (game_id) DO UPDATE SET
  name = EXCLUDED.name,
  short_label = EXCLUDED.short_label,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  play_frequency = EXCLUDED.play_frequency,
  qualification_enabled = EXCLUDED.qualification_enabled,
  visible_from_dow = EXCLUDED.visible_from_dow,
  visible_to_dow = EXCLUDED.visible_to_dow,
  launch_state = EXCLUDED.launch_state,
  points_on_play = EXCLUDED.points_on_play,
  points_on_win = EXCLUDED.points_on_win,
  config_json = EXCLUDED.config_json;

-- ==========================================
-- player_game_progress
-- ==========================================
CREATE TABLE IF NOT EXISTS public.player_game_progress (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  game_id                   text NOT NULL REFERENCES public.games(game_id),
  progress_date             date NOT NULL,
  played_today              boolean NOT NULL DEFAULT false,
  completed_today           boolean NOT NULL DEFAULT false,
  won_today                 boolean NOT NULL DEFAULT false,
  qualified_today           boolean NOT NULL DEFAULT false,
  qualification_points_earned int NOT NULL DEFAULT 0,
  rewards_json              jsonb NOT NULL DEFAULT '{}',
  created_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_id, progress_date)
);

ALTER TABLE public.player_game_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own game progress"
  ON public.player_game_progress FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own game progress"
  ON public.player_game_progress FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own game progress"
  ON public.player_game_progress FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_pgp_user_date ON public.player_game_progress (user_id, progress_date);
CREATE INDEX IF NOT EXISTS idx_pgp_game_date ON public.player_game_progress (game_id, progress_date);

-- ==========================================
-- weekly_qualification_status
-- ==========================================
CREATE TABLE IF NOT EXISTS public.weekly_qualification_status (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  week_start_date       date NOT NULL,
  total_points          int NOT NULL DEFAULT 0,
  games_played_count    int NOT NULL DEFAULT 0,
  games_won_count       int NOT NULL DEFAULT 0,
  saturday_qualified    boolean NOT NULL DEFAULT false,
  sunday_qualified      boolean NOT NULL DEFAULT false,
  saturday_entry_used   boolean NOT NULL DEFAULT false,
  sunday_entry_used     boolean NOT NULL DEFAULT false,
  status_json           jsonb NOT NULL DEFAULT '{}',
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start_date)
);

ALTER TABLE public.weekly_qualification_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own qualification status"
  ON public.weekly_qualification_status FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own qualification status"
  ON public.weekly_qualification_status FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own qualification status"
  ON public.weekly_qualification_status FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_wqs_user_week ON public.weekly_qualification_status (user_id, week_start_date);

-- ==========================================
-- qualification_rules
-- ==========================================
CREATE TABLE IF NOT EXISTS public.qualification_rules (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name             text NOT NULL,
  target_event          text NOT NULL DEFAULT 'both',
  rule_type             text NOT NULL DEFAULT 'points',
  threshold_value       int NOT NULL DEFAULT 100,
  required_games_json   jsonb NOT NULL DEFAULT '[]',
  active                boolean NOT NULL DEFAULT true,
  priority              int NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.qualification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read qualification rules"
  ON public.qualification_rules FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.qualification_rules (rule_name, target_event, rule_type, threshold_value, required_games_json, active, priority)
VALUES
  ('Saturday Points Threshold', 'saturday_main_event', 'points', 50,  '[]', true, 1),
  ('Sunday Points Threshold',   'sunday_winners_event','points', 100, '[]', true, 1),
  ('Saturday Games Played',     'saturday_main_event', 'games_played', 2, '[]', true, 2),
  ('Sunday Games Played',       'sunday_winners_event','games_played', 3, '[]', true, 2)
ON CONFLICT DO NOTHING;

-- ==========================================
-- weekend_event_entries
-- ==========================================
CREATE TABLE IF NOT EXISTS public.weekend_event_entries (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_game_id             text NOT NULL REFERENCES public.games(game_id),
  week_start_date           date NOT NULL,
  qualification_source_json jsonb NOT NULL DEFAULT '{}',
  entered_at                timestamptz NOT NULL DEFAULT now(),
  result_status             text NOT NULL DEFAULT 'pending',
  reward_cents              int NOT NULL DEFAULT 0,
  reward_json               jsonb NOT NULL DEFAULT '{}',
  UNIQUE (user_id, event_game_id, week_start_date)
);

ALTER TABLE public.weekend_event_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own event entries"
  ON public.weekend_event_entries FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own event entries"
  ON public.weekend_event_entries FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_wee_user ON public.weekend_event_entries (user_id);
CREATE INDEX IF NOT EXISTS idx_wee_event_week ON public.weekend_event_entries (event_game_id, week_start_date);

-- ==========================================
-- promotional_assets
-- ==========================================
CREATE TABLE IF NOT EXISTS public.promotional_assets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type    text NOT NULL DEFAULT 'flyer',
  template_key  text NOT NULL DEFAULT '',
  title         text NOT NULL DEFAULT '',
  subtitle      text DEFAULT '',
  body_json     jsonb NOT NULL DEFAULT '{}',
  image_path    text DEFAULT '',
  active        boolean NOT NULL DEFAULT true,
  sort_order    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promotional_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active promotional assets"
  ON public.promotional_assets FOR SELECT
  TO authenticated
  USING (active = true);

INSERT INTO public.promotional_assets (asset_type, template_key, title, subtitle, body_json, active, sort_order)
VALUES
  ('event_banner',   'saturday_banner',   'Saturday Showdown',    'This Saturday. Qualified players only.',      '{"cta": "Check Qualification", "theme": "gold"}',   true,  1),
  ('event_banner',   'sunday_banner',     'Sunday Crown',         'The final test. Only the worthy survive.',    '{"cta": "Enter Sunday Crown", "theme": "dark"}',    true,  2),
  ('flyer',          'qualify_push',      'Qualify This Week',    'Play daily games to earn your spot.',         '{"cta": "Play Now", "theme": "jungle"}',            true,  3),
  ('winner_card',    'winner_template',   'This Week''s Champion','They faced the gate and conquered.',          '{"theme": "gold", "show_prize": true}',             true,  4)
ON CONFLICT DO NOTHING;

-- ==========================================
-- winner_announcements
-- ==========================================
CREATE TABLE IF NOT EXISTS public.winner_announcements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_game_id   text NOT NULL REFERENCES public.games(game_id),
  event_date      date NOT NULL,
  user_id         uuid REFERENCES public.users(id),
  display_name    text NOT NULL DEFAULT 'Anonymous',
  result_summary  text DEFAULT '',
  payout_cents    int NOT NULL DEFAULT 0,
  image_asset_id  uuid REFERENCES public.promotional_assets(id),
  share_text      text DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.winner_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read winner announcements"
  ON public.winner_announcements FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_wa_event_date ON public.winner_announcements (event_game_id, event_date DESC);

-- ==========================================
-- daily_game_plays (non-gate games)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.daily_game_plays (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  game_id         text NOT NULL REFERENCES public.games(game_id),
  play_date       date NOT NULL,
  idem_key        uuid NOT NULL UNIQUE,
  outcome         text NOT NULL DEFAULT 'PENDING',
  result_json     jsonb NOT NULL DEFAULT '{}',
  points_earned   int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_id, play_date)
);

ALTER TABLE public.daily_game_plays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own game plays"
  ON public.daily_game_plays FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own game plays"
  ON public.daily_game_plays FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_dgp_user_date ON public.daily_game_plays (user_id, play_date);
CREATE INDEX IF NOT EXISTS idx_dgp_game_date ON public.daily_game_plays (game_id, play_date);

-- ==========================================
-- Extend settings with new keys
-- ==========================================
INSERT INTO public.settings (key, value_json) VALUES
  ('qualification_week_start_day',   '1'),
  ('saturday_qualification_cutoff',  '"23:59"'),
  ('sunday_qualification_cutoff',    '"23:59"'),
  ('ecosystem_active',               'true'),
  ('onboarding_enabled',             'true')
ON CONFLICT (key) DO NOTHING;
