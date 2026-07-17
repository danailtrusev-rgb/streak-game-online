/*
  # Cashout context identifier — expose game_state.updated_at

  ## Why
  The cashout idempotency-key hardening pass needs a real, server-generated
  identifier that represents "the specific eligible game state a cashout
  decision was made against" — so a stale key from a previous, already-
  resolved cashout opportunity can never be silently reused for a new one
  (see PROJECT_CHANGELOG.md "Cashout Idempotency Context Scoping").

  Inspected the schema before writing this: `game_state.updated_at`
  already exists (added in the original schema migration) and is already
  updated on every play (`20260618112003_*.sql`) and every cashout
  (`20260713140000_*.sql`) — so it already changes exactly when the
  eligible pot/streak changes. It just was never returned by
  `get_my_state()`, the RPC the frontend actually reads player state
  from (confirmed by reading its live body in
  `20260409071643_20260409_fix_missing_ecosystem_tables_and_functions.sql`
  — the only migration that redefines its body; later migrations only
  touch its grants). This migration adds it to the response. No schema
  change, no new column, no new table.

  ## Why this identifier is unique enough for this purpose
  `updated_at` changes on every play and every cashout for a given user.
  A cashout decision's context is captured (client-side) as the
  `updated_at` value the frontend observed *before* attempting that
  cashout. A later cashout attempt only reuses a stored key when the
  freshly-observed `updated_at` still matches what was stored — meaning
  the DB has not changed since. It has already changed after any new
  play (a new streak/pot) or after the original cashout itself committed,
  so a stale key can never be mistaken for a genuinely new eligible pot.
  timestamptz has microsecond resolution and `now()` is called exactly
  once per state-changing statement here, so a same-user collision
  between two *different* real state changes is not a practical concern.

  ## Migration-replacement safety
  Same reasoning as the cashout_game migrations: `get_my_state()` keeps
  its exact signature (no arguments) and return type (`jsonb`) — only the
  jsonb *contents* gain one more field. `CREATE OR REPLACE FUNCTION` is
  valid and preserves existing GRANTs automatically.

  ## Not changed / explicitly out of scope
  While inspecting this function, also confirmed it does not return
  `max_streak` or `completed_cycles`, even though the TypeScript
  `GameState` type declares them and `game_state.max_streak` is relied on
  by `src/lib/resultMessages.ts`'s personal-best detection (from a
  previous, unrelated pass). That gap is real but is NOT fixed here —
  it's unrelated to cashout idempotency, and this pass's instructions are
  explicit about not touching unrelated game functionality. Flagged in
  PROJECT_CHANGELOG.md as a follow-up worth a dedicated small migration.

  ## Rollback
  Re-apply the function body from
  20260409071643_20260409_fix_missing_ecosystem_tables_and_functions.sql
  to remove `updated_at` from the response. No data is touched either way.
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

  SELECT current_streak, pot_cents, last_play_date, updated_at
  INTO v_gs
  FROM game_state WHERE user_id = v_uid;

  IF NOT FOUND THEN
    v_gs.current_streak := 0;
    v_gs.pot_cents := 0;
    v_gs.last_play_date := NULL;
    v_gs.updated_at := NULL;
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
      'last_play_date', v_gs.last_play_date,
      'updated_at',     v_gs.updated_at
    ),
    'wallet_balance_cents', v_balance,
    'jackpot_cents',        v_jackpot,
    'played_today',         v_played_today,
    'available_tiers',      COALESCE(v_tiers, '[]'::jsonb)
  );
END;
$$;