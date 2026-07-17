/*
  # Expose game_state.max_streak and completed_cycles via get_my_state()

  ## Why
  Flagged as a known gap in
  20260713160000_20260713_expose_game_state_updated_at.sql: `get_my_state()`
  never returned `max_streak` or `completed_cycles`, even though:
  - Both columns exist on `game_state` (added in
    `20260518082324_20260518_badge_achievements.sql`) and are actively
    maintained — `max_streak` via `GREATEST(max_streak, streak_after)` on
    every play, `completed_cycles` incremented whenever a 30-day cycle
    completes.
  - The frontend `GameState` TypeScript type already declares both as
    required fields.
  - Personal-best detection in `src/lib/resultMessages.ts` (added in the
    "Result Messaging Phase 1" pass) already reads
    `game_state.max_streak` to decide whether a result is a new personal
    best.

  Without this, `max_streak` was `undefined` at runtime for every player,
  so `isPersonalBest()` always fell through the `previousBestStreak ===
  null` guard added in "Result Messaging Phase 1 — Audit and Hardening"
  and the personal-best message category could never actually be
  selected. This migration fixes that at the source.

  ## What changes
  Adds `max_streak` and `completed_cycles` to the `SELECT ... INTO v_gs`
  read and to the returned `game_state` jsonb object. Both are `NOT NULL
  DEFAULT 0` columns, so the `NOT FOUND` fallback branch (no game_state
  row yet) can safely default them to `0` — a real, correct value for a
  player who has never played, not a placeholder standing in for unknown
  data.

  ## Migration-replacement safety
  Same reasoning as every other function migration in this project so
  far: `get_my_state()` keeps its exact signature (no arguments) and
  return type (`jsonb`) — only the jsonb *contents* gain two more fields.
  `CREATE OR REPLACE FUNCTION` is valid and preserves existing GRANTs
  automatically.

  ## Not changed / explicitly out of scope
  No change to how `max_streak`/`completed_cycles` are computed or
  updated elsewhere (badge/prestige logic, play RPC) — this migration
  only changes what `get_my_state()` returns. No cashout, economy, or UI
  changes.

  ## Rollback
  Re-apply the function body from
  20260713160000_20260713_expose_game_state_updated_at.sql to remove
  `max_streak`/`completed_cycles` from the response (keeps `updated_at`).
  No data is touched either way.
*/

CREATE OR REPLACE FUNCTION public.get_my_state()
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

  SELECT current_streak, pot_cents, last_play_date, updated_at, max_streak, completed_cycles
  INTO v_gs
  FROM game_state WHERE user_id = v_uid;

  IF NOT FOUND THEN
    v_gs.current_streak := 0;
    v_gs.pot_cents := 0;
    v_gs.last_play_date := NULL;
    v_gs.updated_at := NULL;
    v_gs.max_streak := 0;
    v_gs.completed_cycles := 0;
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
      'current_streak',   v_gs.current_streak,
      'pot_cents',        v_gs.pot_cents,
      'last_play_date',   v_gs.last_play_date,
      'updated_at',       v_gs.updated_at,
      'max_streak',       v_gs.max_streak,
      'completed_cycles', v_gs.completed_cycles
    ),
    'wallet_balance_cents', v_balance,
    'jackpot_cents',        v_jackpot,
    'played_today',         v_played_today,
    'available_tiers',      COALESCE(v_tiers, '[]'::jsonb)
  );
END;
$$;