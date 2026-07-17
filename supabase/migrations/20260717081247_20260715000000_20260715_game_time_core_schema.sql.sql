/*
  # Game Time System — core schema

  ## Audit summary (full table in PROJECT_CHANGELOG.md "Existing Madrid
  dependencies found" — this is the short version)
  `get_madrid_today()` is called directly by ~18 migrations' worth of core
  RPCs (`play_daily_gate`, `cashout_game`, `get_my_state`, microgame RPCs,
  skull-gate assignment, guest-merge, etc.) — it is the single authoritative
  "what day is it" function for gameplay today. `Europe/Madrid` and
  `midnight` are hardcoded inside it and inside the Reactivation System's
  `_shared/gameDay.ts` independently. No configurable rollover time, no
  region concept, no Saturday/Sunday TIME-WINDOW logic exists anywhere —
  the current qualification system (`qualification_status`,
  `saturday_qualified`/`sunday_qualified`) is a weekly POINTS threshold,
  not a time-boundary gate, so there is no existing Saturday/Sunday timing
  logic to preserve or conflict with.

  ## Design decision: additive layer, not a rewrite of core gameplay RPCs
  This migration adds the Game Time System as a new, data-driven layer.
  `get_madrid_today()` itself is updated (next migration) to internally
  read from `game_time_regions` instead of hardcoding the string
  `'Europe/Madrid'` — every existing caller (play_daily_gate, cashout_game,
  get_my_state, etc.) keeps working completely unchanged, with zero risk
  to gameplay/financial logic, while the underlying timezone/rollover
  becomes configuration instead of a hardcoded literal. Making those core
  RPCs genuinely per-user region-aware is explicitly NOT done in this pass
  — Regional mode is not being activated, so there is no player yet whose
  game date could differ from the global one. This is documented as
  required future work, not an oversight.

  ## Tables
  - `game_time_regions` — one row per configurable region (IANA timezone,
    rollover time, Saturday/Sunday windows).
  - `game_time_settings` — singleton config row (mode, global region,
    regional-mode enabled flag, pending-mode-switch fields).
  - `user_game_time_region` — current region assignment per player.
    Absence of a row means "resolves to the global region" — no backfill
    needed for existing players (see the resolution functions in the next
    migration).
  - `user_game_time_region_change_log` — append-only audit trail of every
    assignment/change, per the "region changes are logged" requirement.
*/

-- ── game_time_regions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_time_regions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key                       text UNIQUE NOT NULL,
  name                      text NOT NULL,
  timezone                  text NOT NULL, -- IANA identifier, e.g. 'Europe/Madrid' — never a fixed UTC offset
  daily_rollover_local_time time NOT NULL DEFAULT '00:00:00',
  saturday_start_local_time time,
  saturday_end_local_time   time,
  sunday_start_local_time   time,
  sunday_end_local_time     time,
  enabled                   boolean NOT NULL DEFAULT true,
  display_order             integer NOT NULL DEFAULT 0,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_time_regions_enabled ON game_time_regions(enabled, display_order);

ALTER TABLE game_time_regions ENABLE ROW LEVEL SECURITY;

-- Regions are public, read-only configuration — any authenticated client
-- may read them (needed to display a region label), but only service-role
-- (admin Edge Function, which bypasses RLS) may write.
CREATE POLICY game_time_regions_select_all ON game_time_regions
  FOR SELECT TO authenticated, anon
  USING (true);

-- ── game_time_settings (singleton) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_time_settings (
  id                          boolean PRIMARY KEY DEFAULT true CHECK (id), -- enforces exactly one row
  mode                        text NOT NULL DEFAULT 'global' CHECK (mode IN ('global', 'regional')),
  global_region_id            uuid NOT NULL REFERENCES game_time_regions(id),
  regional_mode_enabled       boolean NOT NULL DEFAULT false,
  -- Scheduled, safe-boundary mode switching (see requirement #14) — a
  -- pending switch is recorded here but is NOT applied automatically by
  -- any background job (Cron stays inactive per this task's instructions);
  -- applying it is an explicit admin action once the effective time has
  -- passed. See apply_pending_game_time_mode() in the next migration.
  pending_mode                text CHECK (pending_mode IN ('global', 'regional')),
  pending_mode_effective_at   timestamptz,
  pending_mode_requested_by   text,
  pending_mode_requested_at   timestamptz,
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  updated_by                  text
);

ALTER TABLE game_time_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY game_time_settings_select_all ON game_time_settings
  FOR SELECT TO authenticated, anon
  USING (true);

-- ── user_game_time_region ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_game_time_region (
  user_id            uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  region_id          uuid NOT NULL REFERENCES game_time_regions(id),
  effective_from     timestamptz NOT NULL DEFAULT now(),
  assigned_by        text NOT NULL DEFAULT 'system_default',
  assignment_reason  text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_game_time_region ENABLE ROW LEVEL SECURITY;

-- Players may read their own assignment (for display) but never write to
-- it — region assignment is admin/server-controlled only (requirement #7:
-- "Players cannot change their own authoritative region").
CREATE POLICY user_game_time_region_select_own ON user_game_time_region
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ── user_game_time_region_change_log (append-only audit) ────────────────
CREATE TABLE IF NOT EXISTS user_game_time_region_change_log (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  previous_region_id uuid REFERENCES game_time_regions(id),
  new_region_id      uuid NOT NULL REFERENCES game_time_regions(id),
  effective_from     timestamptz NOT NULL,
  changed_by         text NOT NULL,
  change_reason      text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_game_time_region_log_user ON user_game_time_region_change_log(user_id, created_at DESC);

ALTER TABLE user_game_time_region_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_game_time_region_log_select_own ON user_game_time_region_change_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policy on either table for `authenticated` —
-- all writes happen through the assignment RPC in the next migration
-- (SECURITY DEFINER, admin/server-only), consistent with
-- "Players cannot change their own authoritative region."