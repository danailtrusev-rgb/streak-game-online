/*
  # Fix Missing Ecosystem Tables and RPC Functions

  ## Summary
  The ecosystem Phase 1 schema migration did not fully apply, leaving several
  tables and functions missing. This migration:
  1. Creates all missing ecosystem tables
  2. Drops and recreates get_my_state (was returning SETOF users, needs jsonb)
  3. Fixes get_global_leaderboard search_path
  4. Adds get_my_qualification and get_today_game_progress functions

  ## New Tables
  - player_game_progress, weekly_qualification_status, qualification_rules
  - weekend_event_entries, promotional_assets, winner_announcements, daily_game_plays

  ## Fixed Functions
  - get_my_state: now returns full PlayerState jsonb including jackpot_cents
  - get_global_leaderboard: fixed search_path = 'public'
  - get_my_qualification: new, returns weekly qualification data
  - get_today_game_progress: new, returns today's game progress array
*/

-- ==========================================
-- player_game_progress
-- ==========================================
CREATE TABLE IF NOT EXISTS public.player_game_progress (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  game_id                     text NOT NULL REFERENCES public.games(game_id),
  progress_date               date NOT NULL,
  played_today                boolean NOT NULL DEFAULT false,
  completed_today             boolean NOT NULL DEFAULT false,
  won_today                   boolean NOT NULL DEFAULT false,
  qualified_today             boolean NOT NULL DEFAULT false,
  qualification_points_earned int NOT NULL DEFAULT 0,
  rewards_json                jsonb NOT NULL DEFAULT '{}',
  created_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_id, progress_date)
);

ALTER TABLE public.player_game_progress ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'player_game_progress' AND policyname = 'Users can view own game progress') THEN
    CREATE POLICY "Users can view own game progress"
      ON public.player_game_progress FOR SELECT TO authenticated
      USING ((select auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'player_game_progress' AND policyname = 'Users can insert own game progress') THEN
    CREATE POLICY "Users can insert own game progress"
      ON public.player_game_progress FOR INSERT TO authenticated
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'player_game_progress' AND policyname = 'Users can update own game progress') THEN
    CREATE POLICY "Users can update own game progress"
      ON public.player_game_progress FOR UPDATE TO authenticated
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pgp_user_date ON public.player_game_progress (user_id, progress_date);
CREATE INDEX IF NOT EXISTS idx_pgp_game_date ON public.player_game_progress (game_id, progress_date);

-- ==========================================
-- weekly_qualification_status
-- ==========================================
CREATE TABLE IF NOT EXISTS public.weekly_qualification_status (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  week_start_date     date NOT NULL,
  total_points        int NOT NULL DEFAULT 0,
  games_played_count  int NOT NULL DEFAULT 0,
  games_won_count     int NOT NULL DEFAULT 0,
  saturday_qualified  boolean NOT NULL DEFAULT false,
  sunday_qualified    boolean NOT NULL DEFAULT false,
  saturday_entry_used boolean NOT NULL DEFAULT false,
  sunday_entry_used   boolean NOT NULL DEFAULT false,
  status_json         jsonb NOT NULL DEFAULT '{}',
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start_date)
);

ALTER TABLE public.weekly_qualification_status ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weekly_qualification_status' AND policyname = 'Users can view own qualification status') THEN
    CREATE POLICY "Users can view own qualification status"
      ON public.weekly_qualification_status FOR SELECT TO authenticated
      USING ((select auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weekly_qualification_status' AND policyname = 'Users can insert own qualification status') THEN
    CREATE POLICY "Users can insert own qualification status"
      ON public.weekly_qualification_status FOR INSERT TO authenticated
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weekly_qualification_status' AND policyname = 'Users can update own qualification status') THEN
    CREATE POLICY "Users can update own qualification status"
      ON public.weekly_qualification_status FOR UPDATE TO authenticated
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wqs_user_week ON public.weekly_qualification_status (user_id, week_start_date);

-- ==========================================
-- qualification_rules
-- ==========================================
CREATE TABLE IF NOT EXISTS public.qualification_rules (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name           text NOT NULL,
  target_event        text NOT NULL DEFAULT 'both',
  rule_type           text NOT NULL DEFAULT 'points',
  threshold_value     int NOT NULL DEFAULT 100,
  required_games_json jsonb NOT NULL DEFAULT '[]',
  active              boolean NOT NULL DEFAULT true,
  priority            int NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.qualification_rules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'qualification_rules' AND policyname = 'Authenticated users can read qualification rules') THEN
    CREATE POLICY "Authenticated users can read qualification rules"
      ON public.qualification_rules FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

INSERT INTO public.qualification_rules (rule_name, target_event, rule_type, threshold_value, required_games_json, active, priority)
VALUES
  ('Saturday Points Threshold', 'saturday_main_event', 'points',       50,  '[]', true, 1),
  ('Sunday Points Threshold',   'sunday_winners_event','points',       100, '[]', true, 1),
  ('Saturday Games Played',     'saturday_main_event', 'games_played', 2,   '[]', true, 2),
  ('Sunday Games Played',       'sunday_winners_event','games_played', 3,   '[]', true, 2)
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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weekend_event_entries' AND policyname = 'Users can view own event entries') THEN
    CREATE POLICY "Users can view own event entries"
      ON public.weekend_event_entries FOR SELECT TO authenticated
      USING ((select auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weekend_event_entries' AND policyname = 'Users can insert own event entries') THEN
    CREATE POLICY "Users can insert own event entries"
      ON public.weekend_event_entries FOR INSERT TO authenticated
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;
END $$;

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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'promotional_assets' AND policyname = 'Authenticated users can read active promotional assets') THEN
    CREATE POLICY "Authenticated users can read active promotional assets"
      ON public.promotional_assets FOR SELECT TO authenticated
      USING (active = true);
  END IF;
END $$;

INSERT INTO public.promotional_assets (asset_type, template_key, title, subtitle, body_json, active, sort_order)
VALUES
  ('event_banner', 'saturday_banner', 'Saturday Showdown',   'This Saturday. Qualified players only.',    '{"cta": "Check Qualification", "theme": "gold"}', true, 1),
  ('event_banner', 'sunday_banner',   'Sunday Crown',        'The final test. Only the worthy survive.', '{"cta": "Enter Sunday Crown", "theme": "dark"}',  true, 2),
  ('flyer',        'qualify_push',    'Qualify This Week',   'Play daily games to earn your spot.',      '{"cta": "Play Now", "theme": "jungle"}',           true, 3),
  ('winner_card',  'winner_template', 'This Week''s Champion','They faced the gate and conquered.',      '{"theme": "gold", "show_prize": true}',            true, 4)
ON CONFLICT DO NOTHING;

-- ==========================================
-- winner_announcements
-- ==========================================
CREATE TABLE IF NOT EXISTS public.winner_announcements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_game_id  text NOT NULL REFERENCES public.games(game_id),
  event_date     date NOT NULL,
  user_id        uuid REFERENCES public.users(id),
  display_name   text NOT NULL DEFAULT 'Anonymous',
  result_summary text DEFAULT '',
  payout_cents   int NOT NULL DEFAULT 0,
  image_asset_id uuid REFERENCES public.promotional_assets(id),
  share_text     text DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.winner_announcements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'winner_announcements' AND policyname = 'Authenticated users can read winner announcements') THEN
    CREATE POLICY "Authenticated users can read winner announcements"
      ON public.winner_announcements FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wa_event_date ON public.winner_announcements (event_game_id, event_date DESC);

-- ==========================================
-- daily_game_plays
-- ==========================================
CREATE TABLE IF NOT EXISTS public.daily_game_plays (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  game_id       text NOT NULL REFERENCES public.games(game_id),
  play_date     date NOT NULL,
  idem_key      uuid NOT NULL UNIQUE,
  outcome       text NOT NULL DEFAULT 'PENDING',
  result_json   jsonb NOT NULL DEFAULT '{}',
  points_earned int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_id, play_date)
);

ALTER TABLE public.daily_game_plays ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_game_plays' AND policyname = 'Users can view own game plays') THEN
    CREATE POLICY "Users can view own game plays"
      ON public.daily_game_plays FOR SELECT TO authenticated
      USING ((select auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_game_plays' AND policyname = 'Users can insert own game plays') THEN
    CREATE POLICY "Users can insert own game plays"
      ON public.daily_game_plays FOR INSERT TO authenticated
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_dgp_user_date ON public.daily_game_plays (user_id, play_date);
CREATE INDEX IF NOT EXISTS idx_dgp_game_date ON public.daily_game_plays (game_id, play_date);

-- ==========================================
-- Extend settings
-- ==========================================
INSERT INTO public.settings (key, value_json) VALUES
  ('qualification_week_start_day',  '1'),
  ('saturday_qualification_cutoff', '"23:59"'),
  ('sunday_qualification_cutoff',   '"23:59"'),
  ('ecosystem_active',              'true'),
  ('onboarding_enabled',            'true')
ON CONFLICT (key) DO NOTHING;

-- ==========================================
-- FIX get_global_leaderboard search_path
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_global_leaderboard(p_limit int DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'guest_id',       u.guest_id,
        'current_streak', gs.current_streak,
        'pot_cents',      gs.pot_cents,
        'rank',           ROW_NUMBER() OVER (ORDER BY gs.current_streak DESC, gs.pot_cents DESC)
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

-- ==========================================
-- DROP + RECREATE get_my_state (return type change)
-- ==========================================
DROP FUNCTION IF EXISTS public.get_my_state();

CREATE FUNCTION public.get_my_state()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_uid          uuid;
  v_user         record;
  v_gs           record;
  v_balance      int;
  v_jackpot      int;
  v_played_today boolean;
  v_today        date;
  v_tiers        jsonb;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RETURN NULL; END IF;

  v_today := (now() AT TIME ZONE 'Europe/Madrid')::date;

  SELECT * INTO v_user FROM users WHERE id = v_uid;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT current_streak, pot_cents, last_play_date
  INTO v_gs
  FROM game_state WHERE user_id = v_uid;

  IF NOT FOUND THEN
    v_gs.current_streak := 0;
    v_gs.pot_cents := 0;
    v_gs.last_play_date := NULL;
  END IF;

  SELECT COALESCE(balance_cents, 0) INTO v_balance
  FROM wallet_balance_cache WHERE user_id = v_uid;

  SELECT COALESCE(balance_cents, 0) INTO v_jackpot
  FROM jackpot_state WHERE id = 1;

  SELECT EXISTS(
    SELECT 1 FROM plays WHERE user_id = v_uid AND play_date = v_today
  ) INTO v_played_today;

  SELECT jsonb_agg(
    jsonb_build_object(
      'tier',          t.tier_num,
      'stake_cents',   t.stake_cents,
      'unlock_streak', t.unlock_streak,
      'unlocked',      v_gs.current_streak >= t.unlock_streak
    )
  ) INTO v_tiers
  FROM (VALUES (1, 100, 0), (2, 200, 3), (3, 500, 7), (4, 1000, 14)) AS t(tier_num, stake_cents, unlock_streak);

  RETURN jsonb_build_object(
    'user', jsonb_build_object(
      'id',       v_user.id,
      'guest_id', v_user.guest_id,
      'status',   v_user.status
    ),
    'game_state', jsonb_build_object(
      'current_streak', v_gs.current_streak,
      'pot_cents',      v_gs.pot_cents,
      'last_play_date', v_gs.last_play_date
    ),
    'wallet_balance_cents', v_balance,
    'jackpot_cents',        v_jackpot,
    'played_today',         v_played_today,
    'available_tiers',      COALESCE(v_tiers, '[]'::jsonb)
  );
END;
$$;

-- ==========================================
-- get_my_qualification
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_my_qualification()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_uid        uuid;
  v_week_start date;
  v_row        record;
  v_sat_pts    int;
  v_sun_pts    int;
  v_sat_gp     int;
  v_sun_gp     int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RETURN NULL; END IF;

  v_week_start := date_trunc('week', (now() AT TIME ZONE 'Europe/Madrid'))::date;

  SELECT COALESCE(MIN(threshold_value), 50) INTO v_sat_pts
  FROM qualification_rules WHERE active AND target_event IN ('saturday_main_event','both') AND rule_type = 'points';

  SELECT COALESCE(MIN(threshold_value), 100) INTO v_sun_pts
  FROM qualification_rules WHERE active AND target_event IN ('sunday_winners_event','both') AND rule_type = 'points';

  SELECT COALESCE(MIN(threshold_value), 2) INTO v_sat_gp
  FROM qualification_rules WHERE active AND target_event IN ('saturday_main_event','both') AND rule_type = 'games_played';

  SELECT COALESCE(MIN(threshold_value), 3) INTO v_sun_gp
  FROM qualification_rules WHERE active AND target_event IN ('sunday_winners_event','both') AND rule_type = 'games_played';

  SELECT * INTO v_row
  FROM weekly_qualification_status
  WHERE user_id = v_uid AND week_start_date = v_week_start;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'week_start',          v_week_start,
      'total_points',        0,
      'games_played_count',  0,
      'games_won_count',     0,
      'saturday_qualified',  false,
      'sunday_qualified',    false,
      'saturday_entry_used', false,
      'sunday_entry_used',   false,
      'sat_pts_threshold',   v_sat_pts,
      'sun_pts_threshold',   v_sun_pts,
      'sat_gp_threshold',    v_sat_gp,
      'sun_gp_threshold',    v_sun_gp
    );
  END IF;

  RETURN jsonb_build_object(
    'week_start',          v_row.week_start_date,
    'total_points',        v_row.total_points,
    'games_played_count',  v_row.games_played_count,
    'games_won_count',     v_row.games_won_count,
    'saturday_qualified',  v_row.saturday_qualified,
    'sunday_qualified',    v_row.sunday_qualified,
    'saturday_entry_used', v_row.saturday_entry_used,
    'sunday_entry_used',   v_row.sunday_entry_used,
    'sat_pts_threshold',   v_sat_pts,
    'sun_pts_threshold',   v_sun_pts,
    'sat_gp_threshold',    v_sat_gp,
    'sun_gp_threshold',    v_sun_gp
  );
END;
$$;

-- ==========================================
-- get_today_game_progress
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_today_game_progress()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_uid    uuid;
  v_today  date;
  v_result jsonb;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RETURN '[]'::jsonb; END IF;

  v_today := (now() AT TIME ZONE 'Europe/Madrid')::date;

  SELECT jsonb_agg(
    jsonb_build_object(
      'game_id',      g.game_id,
      'played_today', COALESCE(dgp.outcome IS NOT NULL, false),
      'won_today',    COALESCE(dgp.outcome = 'WIN', false),
      'points_earned',COALESCE(dgp.points_earned, 0)
    )
  ) INTO v_result
  FROM games g
  LEFT JOIN daily_game_plays dgp
    ON dgp.game_id = g.game_id
   AND dgp.user_id = v_uid
   AND dgp.play_date = v_today
  WHERE g.category = 'daily'
    AND g.status = 'active';

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
