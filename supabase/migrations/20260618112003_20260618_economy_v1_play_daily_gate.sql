/*
  # Economy v1 — Live play_daily_gate

  ## What changed and why

  ### Part 2 — Daily/Streak Player Value Rate
  Old: pot += stake_cents (100% of stake to pot on every survive)
  New: pot += floor(stake_cents * daily_streak_value_rate / 100)
       e.g. €1 stake × 35% = €0.35 pot increment

  ### Part 3 — Derived Jackpot Contribution Rate
  Old: jackpot contribution = stake × jackpot_contribution_rate (read directly from settings)
  New: effective rate derived from jackpot_allocation_rate and survival_probability:
       eff_jackpot_rate = (jackpot_allocation_rate / 100) / fail_rate
       e.g. 6% target / 50% fail rate = 12% of losing stakes
       This ensures jackpot_allocation_rate is the realized share of total stakes.

  ### Part 4 — Saturday/Sunday Pool Contributions
  New: both pools receive a share from every stake (survive and die):
       sat_contrib = floor(stake_cents * saturday_pool_allocation_rate / 100)
       sun_contrib = floor(stake_cents * sunday_pool_allocation_rate / 100)
  Written to economy_pools table. Audit-only POOL_CONTRIB ledger entries.

  ### Part 7 — Full audit metadata in plays.meta
  Every play now records: survival_probability, all rates (as fractions), all
  contribution amounts, and modeled_player_value_rate at time of play.

  ## Invariants preserved
  - Single wallet deduction of stake_cents — always
  - No extra wallet debits for jackpot or pool contributions
  - Idempotency via idempotency_keys table
  - Duplicate-play prevention via plays table
  - SECURITY DEFINER + search_path = public
  - Return shape unchanged (same JSON keys as before + pot_increment_cents)
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

  v_today := get_madrid_today();

  -- Idempotency check
  IF EXISTS (
    SELECT 1 FROM idempotency_keys
    WHERE key = p_idempotency_key AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Duplicate request';
  END IF;

  INSERT INTO idempotency_keys (key, user_id, expires_at)
  VALUES (p_idempotency_key, v_user_id, now() + interval '24 hours');

  -- Already played today?
  IF EXISTS (SELECT 1 FROM plays WHERE user_id = v_user_id AND play_date = v_today) THEN
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
      (v_streak_value_rate + v_jackpot_alloc_rate + v_sat_alloc_rate + v_sun_alloc_rate)
  );

  -- ── Record play ───────────────────────────────────────────────────────────
  INSERT INTO plays (
    user_id, game_id, play_date, outcome, stake_cents,
    pot_before_cents, pot_after_cents, streak_before, streak_after, milestone_hit,
    meta
  )
  VALUES (
    v_user_id, 'daily_gate', v_today, v_outcome, v_stake_cents,
    v_game_record.pot_cents, v_new_pot,
    v_game_record.current_streak, v_new_streak,
    v_milestone_hit,
    v_play_meta
  )
  RETURNING id INTO v_play_id;

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
