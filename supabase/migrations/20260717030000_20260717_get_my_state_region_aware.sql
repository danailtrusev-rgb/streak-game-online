/*
  # get_my_state() becomes region-aware

  ## Third hidden Madrid dependency found
  `get_my_state()` computed its own `v_today := (now() AT TIME ZONE
  'Europe/Madrid')::date;` INLINE — completely independent of both
  `get_madrid_today()` and `get_current_week_start()`. Never delegated by
  either of the previous two fixes, since neither touches this function's
  body. Found by re-reading this function's actual current source in
  full while implementing this pass, not by re-running the same grep
  search that found the first two.

  ## What changes
  - `v_today` now comes from `get_current_game_date_for_user(v_uid)` —
    identical output in Global mode.
  - `played_today` now correctly means "played during the player's
    current authoritative game date" (was already true in spirit for
    Global mode, now genuinely true for any mode) — the query itself is
    unchanged (`EXISTS (... WHERE play_date = v_today)`), only what
    `v_today` resolves to changes.
  - A new `game_time` object is added to the response, per requirement
    #7's exact field list, sourced directly from
    `get_game_time_state_for_user()` (no duplicated computation).
  - Every existing field — `user`, `game_state` (including `updated_at`,
    `max_streak`, `completed_cycles` from the prior passes),
    `wallet_balance_cents`, `jackpot_cents`, `played_today`,
    `available_tiers` — is preserved exactly, same keys, same values,
    same fallback behavior for a missing game_state row. Diffed against
    the live version while writing this migration, not just described as
    unchanged.
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
  v_game_time    jsonb;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RETURN NULL; END IF;

  -- Region-aware authoritative game date (was: inline hardcoded Madrid literal).
  v_today := public.get_current_game_date_for_user(v_uid);
  v_game_time := public.get_game_time_state_for_user(v_uid);

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
    'available_tiers',      COALESCE(v_tiers, '[]'::jsonb),
    'game_time', jsonb_build_object(
      'mode',                    v_game_time->>'mode',
      'region_id',                v_game_time->>'region_id',
      'region_key',                v_game_time->>'region_key',
      'timezone',                   v_game_time->>'timezone',
      'game_date',                   v_game_time->>'game_date',
      'previous_game_date',           v_game_time->>'previous_game_date',
      'local_now',                     v_game_time->>'local_now',
      'next_daily_rollover_at',         v_game_time->>'next_daily_rollover_at',
      'daily_window_open',               v_game_time->'daily_window_open',
      'daily_window_closed',              v_game_time->'daily_window_closed',
      'saturday_status',                   v_game_time->>'saturday_status',
      'saturday_start_at',                  v_game_time->>'saturday_start_at',
      'saturday_end_at',                     v_game_time->>'saturday_end_at',
      'sunday_status',                        v_game_time->>'sunday_status',
      'sunday_start_at',                       v_game_time->>'sunday_start_at',
      'sunday_end_at',                          v_game_time->>'sunday_end_at'
    )
  );
END;
$$;

/*
  ## Rollback
  Re-apply the previous body from
  20260713180000_20260713_expose_max_streak_and_completed_cycles.sql
  (drops the `game_time` object, restores the inline hardcoded Madrid
  computation). No data is touched either way — this function has no
  side effects, it only reads and formats state.
*/
