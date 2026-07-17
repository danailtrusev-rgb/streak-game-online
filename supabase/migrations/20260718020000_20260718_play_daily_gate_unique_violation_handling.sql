/*
  # play_daily_gate: clean handling when the real unique constraint fires

  ## Why this is needed now
  Before this pass, `plays` had no database-level uniqueness constraint
  at all, so the application-level "already played?" check was the only
  protection — a genuine (if narrow) race condition. Now that
  `plays_user_game_date_unique` is a real, mandatory constraint (see
  20260718000000_*.sql), a concurrent duplicate request that slips past
  the application-level check will hit that constraint on INSERT. This
  migration ensures that failure is caught and turned into the same
  clean "Already played today" error the application-level check already
  produces — not a raw, confusing Postgres constraint-violation message
  leaking to the client — and, critically, that everything already
  committed earlier in the SAME transaction (the wallet deduction, pool
  contributions, jackpot contribution) is rolled back with it, since a
  single failed statement inside a function's implicit transaction rolls
  back the whole function call in Postgres — confirmed behavior, not
  reliant on defensive plpgsql exception recovery to "undo" anything
  manually.

  ## What changes (and nothing else)
  The `INSERT INTO plays (...)` statement is wrapped in a nested `BEGIN
  ... EXCEPTION WHEN unique_violation THEN ... END` block, mirroring the
  exact pattern already used in `cashout_game()`'s ledger insert. On a
  unique_violation, it raises the same `'Already played today'` message
  the pre-existing application-level check already used — so from the
  caller's point of view, both paths (the early check and this backstop)
  produce an identical, already-expected error. No other line in the
  function changes — diffed against the previous
  region-aware version to confirm.
*/

CREATE OR REPLACE FUNCTION public.play_daily_gate(
  p_tier              integer,
  p_idempotency_key   text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id                   uuid;
  v_today                     date;
  v_region_id                 uuid;
  v_game_record               record;
  v_balance_cents             integer;
  v_tiers                     jsonb;
  v_tier                      jsonb;
  v_stake_cents               integer;
  v_unlock_streak             integer;

  -- Economy v1 rates (all stored as fractions after normalization)
  v_survival_prob             float;
  v_fail_rate                 float;
  v_streak_value_rate         float;   -- daily_streak_value_rate / 100
  v_jackpot_alloc_rate        float;   -- jackpot_allocation_rate / 100
  v_eff_jackpot_rate          float;   -- derived: jackpot_alloc_rate / fail_rate
  v_sat_alloc_rate            float;   -- saturday_pool_allocation_rate / 100
  v_sun_alloc_rate            float;   -- sunday_pool_allocation_rate / 100

  -- Outcome
  v_roll                      float;
  v_outcome                   text;
  v_new_streak                integer;

  -- Allocation amounts
  v_pot_increment_cents       integer;
  v_new_pot                   integer;
  v_jackpot_contrib           integer;
  v_sat_contrib               integer;
  v_sun_contrib               integer;

  v_milestones                jsonb;
  v_milestone_hit             integer;
  v_play_id                   uuid;
  v_jackpot_cents             integer;
  v_play_meta                 jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Region-aware authoritative game date (was: get_madrid_today()).
  v_region_id := public.resolve_user_game_time_region(v_user_id);
  v_today     := public.get_current_game_date_for_user(v_user_id);

  -- Idempotency check
  IF EXISTS (
    SELECT 1 FROM idempotency_keys
    WHERE key = p_idempotency_key AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Duplicate request';
  END IF;

  INSERT INTO idempotency_keys (key, user_id, expires_at)
  VALUES (p_idempotency_key, v_user_id, now() + interval '24 hours');

  -- Already played today? (application-level check — the real backstop
  -- against a concurrent-request race is the plays_user_game_date_unique
  -- constraint, handled below via unique_violation)
  IF EXISTS (SELECT 1 FROM plays WHERE user_id = v_user_id AND game_id = 'daily_gate' AND play_date = v_today) THEN
    RAISE EXCEPTION 'Already played today';
  END IF;

  -- Lock game state row
  SELECT current_streak, pot_cents, last_play_date
  INTO v_game_record
  FROM game_state WHERE user_id = v_user_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO game_state (user_id, current_streak, pot_cents, last_play_date)
    VALUES (v_user_id, 0, 0, NULL)
    ON CONFLICT (user_id) DO NOTHING;
    v_game_record.current_streak := 0;
    v_game_record.pot_cents := 0;
    v_game_record.last_play_date := NULL;
  END IF;

  -- Get wallet balance
  SELECT COALESCE(balance_cents, 0) INTO v_balance_cents
  FROM wallet_balance_cache WHERE user_id = v_user_id FOR UPDATE;

  -- Get tier config
  v_tiers := get_setting('stake_tiers');
  SELECT t INTO v_tier
  FROM jsonb_array_elements(v_tiers) t
  WHERE (t->>'tier')::integer = p_tier;

  IF v_tier IS NULL THEN
    RAISE EXCEPTION 'Invalid tier: %', p_tier;
  END IF;

  v_stake_cents   := (v_tier->>'stake_cents')::integer;
  v_unlock_streak := COALESCE((v_tier->>'unlock_streak')::integer, 0);

  IF v_game_record.current_streak < v_unlock_streak THEN
    RAISE EXCEPTION 'Tier not unlocked. Need streak >= %', v_unlock_streak;
  END IF;

  IF v_balance_cents < v_stake_cents THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- ── Read Economy v1 settings ───────────────────────────────────────────────
  -- survival_probability stored as decimal (0.5 = 50%)
  v_survival_prob   := GREATEST(0.0, LEAST(1.0,
    COALESCE((get_setting('survival_probability'))::float, 0.5)
  ));
  v_fail_rate       := GREATEST(0.0001, 1.0 - v_survival_prob);  -- guard against div/0

  -- Economy rates stored as integer percentages (35 = 35%); normalize to fraction
  v_streak_value_rate  := GREATEST(0.0, LEAST(1.0,
    COALESCE((get_setting('daily_streak_value_rate'))::float, 35.0) / 100.0
  ));
  v_jackpot_alloc_rate := GREATEST(0.0, LEAST(1.0,
    COALESCE((get_setting('jackpot_allocation_rate'))::float, 6.0) / 100.0
  ));
  v_sat_alloc_rate := GREATEST(0.0, LEAST(1.0,
    COALESCE((get_setting('saturday_pool_allocation_rate'))::float, 3.0) / 100.0
  ));
  v_sun_alloc_rate := GREATEST(0.0, LEAST(1.0,
    COALESCE((get_setting('sunday_pool_allocation_rate'))::float, 4.0) / 100.0
  ));

  -- Derived jackpot contribution rate for losing stakes:
  -- ensures jackpot_allocation_rate% of TOTAL stakes flows to jackpot
  -- cap at 1.0 to prevent over-allocation on extreme survival_probability values
  v_eff_jackpot_rate := LEAST(1.0, v_jackpot_alloc_rate / v_fail_rate);

  -- ── Single wallet deduction (always — before RNG) ─────────────────────────
  INSERT INTO wallet_ledger (user_id, type, amount_cents, meta)
  VALUES (v_user_id, 'STAKE', -v_stake_cents,
    jsonb_build_object('tier', p_tier, 'game_id', 'daily_gate'));

  UPDATE wallet_balance_cache
  SET balance_cents = balance_cents - v_stake_cents, updated_at = now()
  WHERE user_id = v_user_id;

  v_balance_cents := v_balance_cents - v_stake_cents;

  -- ── Saturday and Sunday pool contributions (all plays, survive and die) ────
  v_sat_contrib := GREATEST(0, FLOOR(v_stake_cents * v_sat_alloc_rate)::integer);
  v_sun_contrib := GREATEST(0, FLOOR(v_stake_cents * v_sun_alloc_rate)::integer);

  IF v_sat_contrib > 0 THEN
    INSERT INTO wallet_ledger (user_id, type, amount_cents, meta)
    VALUES (v_user_id, 'POOL_CONTRIB', 0, jsonb_build_object(
      'pool', 'saturday_pool', 'amount_cents', v_sat_contrib,
      'game_id', 'daily_gate', 'alloc_rate', v_sat_alloc_rate
    ));
    UPDATE economy_pools
    SET balance_cents = balance_cents + v_sat_contrib, updated_at = now()
    WHERE pool_key = 'saturday_pool';
  END IF;

  IF v_sun_contrib > 0 THEN
    INSERT INTO wallet_ledger (user_id, type, amount_cents, meta)
    VALUES (v_user_id, 'POOL_CONTRIB', 0, jsonb_build_object(
      'pool', 'sunday_pool', 'amount_cents', v_sun_contrib,
      'game_id', 'daily_gate', 'alloc_rate', v_sun_alloc_rate
    ));
    UPDATE economy_pools
    SET balance_cents = balance_cents + v_sun_contrib, updated_at = now()
    WHERE pool_key = 'sunday_pool';
  END IF;

  -- ── RNG roll ──────────────────────────────────────────────────────────────
  v_roll    := secure_random_float();
  v_outcome := CASE WHEN v_roll < v_survival_prob THEN 'SURVIVE' ELSE 'DIE' END;

  IF v_outcome = 'SURVIVE' THEN
    -- Pot accrues daily_streak_value_rate fraction of stake (Economy v1)
    v_pot_increment_cents := GREATEST(0, FLOOR(v_stake_cents * v_streak_value_rate)::integer);
    v_new_streak          := v_game_record.current_streak + 1;
    v_new_pot             := v_game_record.pot_cents + v_pot_increment_cents;
    v_jackpot_contrib     := 0;

    -- Milestone check
    v_milestones := get_setting('milestones');
    IF v_milestones IS NOT NULL THEN
      SELECT (m->>'days')::integer INTO v_milestone_hit
      FROM jsonb_array_elements(v_milestones) m
      WHERE (m->>'days')::integer = v_new_streak
      LIMIT 1;
    END IF;

  ELSE
    -- Player lost their stake
    v_pot_increment_cents := 0;
    v_new_streak          := 0;
    v_new_pot             := 0;
    v_milestone_hit       := NULL;

    -- Jackpot: derived rate ensures jackpot_allocation_rate% of total stakes flows to jackpot
    v_jackpot_contrib := GREATEST(0, FLOOR(v_stake_cents * v_eff_jackpot_rate)::integer);

    IF v_jackpot_contrib > 0 THEN
      -- Audit-only ledger entry (amount_cents = 0; no additional wallet debit)
      INSERT INTO wallet_ledger (user_id, type, amount_cents, meta)
      VALUES (v_user_id, 'JACKPOT_CONTRIB', 0, jsonb_build_object(
        'amount_cents',          v_jackpot_contrib,
        'game_id',               'daily_gate',
        'stake_cents',           v_stake_cents,
        'eff_jackpot_rate',      v_eff_jackpot_rate,
        'jackpot_alloc_rate',    v_jackpot_alloc_rate,
        'fail_rate',             v_fail_rate
      ));

      UPDATE jackpot_state
      SET balance_cents = balance_cents + v_jackpot_contrib, updated_at = now()
      WHERE id = 1;
    END IF;
  END IF;

  -- ── Full audit metadata ───────────────────────────────────────────────────
  v_play_meta := jsonb_build_object(
    'survival_probability',              v_survival_prob,
    'daily_streak_value_rate',           v_streak_value_rate,
    'pot_increment_cents',               v_pot_increment_cents,
    'jackpot_allocation_rate',           v_jackpot_alloc_rate,
    'eff_jackpot_contribution_rate',     v_eff_jackpot_rate,
    'jackpot_contribution_cents',        v_jackpot_contrib,
    'saturday_pool_allocation_rate',     v_sat_alloc_rate,
    'saturday_pool_contribution_cents',  v_sat_contrib,
    'sunday_pool_allocation_rate',       v_sun_alloc_rate,
    'sunday_pool_contribution_cents',    v_sun_contrib,
    'modeled_player_value_rate',
      (v_streak_value_rate + v_jackpot_alloc_rate + v_sat_alloc_rate + v_sun_alloc_rate),
    'game_time_region_id',               v_region_id
  );

  -- ── Record play — now defends against the real unique constraint firing
  --    on a genuine concurrent-request race (defense in depth; the
  --    application-level check above is still the first line and handles
  --    the common case cleanly and earlier). ─────────────────────────────
  BEGIN
    INSERT INTO plays (
      user_id, game_id, play_date, outcome, stake_cents,
      pot_before_cents, pot_after_cents, streak_before, streak_after, milestone_hit,
      meta, game_time_region_id
    )
    VALUES (
      v_user_id, 'daily_gate', v_today, v_outcome, v_stake_cents,
      v_game_record.pot_cents, v_new_pot,
      v_game_record.current_streak, v_new_streak,
      v_milestone_hit,
      v_play_meta, v_region_id
    )
    RETURNING id INTO v_play_id;
  EXCEPTION WHEN unique_violation THEN
    -- Same message the early application-level check already uses — the
    -- caller sees one consistent error regardless of which layer caught
    -- it. Everything already done earlier in this function call (wallet
    -- deduction, pool contributions, jackpot contribution) is rolled
    -- back automatically as part of this failed statement's containing
    -- transaction.
    RAISE EXCEPTION 'Already played today';
  END;

  -- ── Update game_state ─────────────────────────────────────────────────────
  UPDATE game_state
  SET current_streak = v_new_streak,
      pot_cents      = v_new_pot,
      last_play_date = v_today,
      updated_at     = now()
  WHERE user_id = v_user_id;

  SELECT COALESCE(balance_cents, 0) INTO v_jackpot_cents
  FROM jackpot_state WHERE id = 1;

  RETURN jsonb_build_object(
    'outcome',              v_outcome,
    'streak',               v_new_streak,
    'pot_cents',            v_new_pot,
    'wallet_balance_cents', v_balance_cents,
    'jackpot_cents',        v_jackpot_cents,
    'milestone_hit',        v_milestone_hit,
    'played_today',         true,
    'play_id',              v_play_id,
    'pot_increment_cents',  v_pot_increment_cents
  );
END;
$$;

/*
  ## Rollback
  Re-apply the previous body from
  20260717020000_20260717_play_daily_gate_region_aware.sql (drops the
  unique_violation handler, restores a plain INSERT). No data is
  rewritten either way.
*/
