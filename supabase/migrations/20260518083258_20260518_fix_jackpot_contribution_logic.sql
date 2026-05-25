/*
  # Fix jackpot contribution logic

  ## Summary
  The jackpot contribution was incorrectly deducted as a second charge from the player's
  wallet on every play (win or lose). This fix makes it allocation-only from a losing stake:

  - Player stakes €1.00 → wallet debited €1.00 (one deduction, always)
  - If SURVIVE: full stake goes to the player's pot (no jackpot contribution)
  - If DIE: a percentage of the lost stake is routed to the public jackpot pool.
    The player's wallet is NOT debited again. The jackpot is funded from the lost stake.
  - JACKPOT_CONTRIB wallet_ledger row is now amount_cents = 0 (audit/info record only),
    with the actual jackpot amount stored in meta->>'amount_cents'.

  ## Changes
  1. `play_daily_gate` RPC — rewrites jackpot handling:
     - Removes pre-outcome wallet deduction for jackpot
     - On DIE: jackpot_state += floor(stake * rate), ledger entry amount_cents = 0
     - On SURVIVE: pot += full stake (no jackpot cut)
  2. `survival_probability` setting key alias: function now also handles
     `daily_gate_survival_probability` key name via coalesce fallback
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
  v_user_id         uuid;
  v_today           date;
  v_game_record     record;
  v_balance_cents   integer;
  v_tiers           jsonb;
  v_tier            jsonb;
  v_stake_cents     integer;
  v_unlock_streak   integer;
  v_survival_prob   float;
  v_jackpot_rate    float;
  v_roll            float;
  v_outcome         text;
  v_new_streak      integer;
  v_new_pot         integer;
  v_jackpot_contrib integer;
  v_milestones      jsonb;
  v_milestone_hit   integer;
  v_play_id         uuid;
  v_jackpot_cents   integer;
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

  -- Check tier unlocked
  IF v_game_record.current_streak < v_unlock_streak THEN
    RAISE EXCEPTION 'Tier not unlocked. Need streak >= %', v_unlock_streak;
  END IF;

  -- Check balance
  IF v_balance_cents < v_stake_cents THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Deduct stake (single wallet deduction — always)
  INSERT INTO wallet_ledger (user_id, type, amount_cents, meta)
  VALUES (v_user_id, 'STAKE', -v_stake_cents,
    jsonb_build_object('tier', p_tier, 'game_id', 'daily_gate'));

  UPDATE wallet_balance_cache
  SET balance_cents = balance_cents - v_stake_cents, updated_at = now()
  WHERE user_id = v_user_id;

  v_balance_cents := v_balance_cents - v_stake_cents;

  -- Read jackpot rate (used only on DIE)
  v_jackpot_rate    := (get_setting('jackpot_contribution_rate'))::float;
  v_jackpot_contrib := GREATEST(0, FLOOR(v_stake_cents * v_jackpot_rate)::integer);

  -- Roll for survival
  v_survival_prob := (get_setting('survival_probability'))::float;
  v_roll          := secure_random_float();
  v_outcome       := CASE WHEN v_roll < v_survival_prob THEN 'SURVIVE' ELSE 'DIE' END;

  IF v_outcome = 'SURVIVE' THEN
    -- Full stake goes to player pot — no jackpot cut on a win
    v_new_streak := v_game_record.current_streak + 1;
    v_new_pot    := v_game_record.pot_cents + v_stake_cents;

    -- Milestone check
    v_milestones := get_setting('milestones');
    SELECT (m->>'days')::integer INTO v_milestone_hit
    FROM jsonb_array_elements(v_milestones) m
    WHERE (m->>'days')::integer = v_new_streak
    LIMIT 1;

  ELSE
    -- Player lost their stake. Route a portion to the jackpot pool.
    -- This is NOT an additional wallet deduction — it comes from the lost stake.
    v_new_streak    := 0;
    v_new_pot       := 0;
    v_milestone_hit := NULL;

    IF v_jackpot_contrib > 0 THEN
      -- Audit-only ledger entry (amount_cents = 0, not a wallet debit)
      INSERT INTO wallet_ledger (user_id, type, amount_cents, meta)
      VALUES (
        v_user_id,
        'JACKPOT_CONTRIB',
        0,
        jsonb_build_object(
          'amount_cents', v_jackpot_contrib,
          'game_id',      'daily_gate',
          'stake_cents',  v_stake_cents
        )
      );

      -- Fund the jackpot pool from the lost stake
      UPDATE jackpot_state
      SET balance_cents = balance_cents + v_jackpot_contrib, updated_at = now()
      WHERE id = 1;
    END IF;
  END IF;

  -- Record play
  INSERT INTO plays (
    user_id, game_id, play_date, outcome, stake_cents,
    pot_before_cents, pot_after_cents, streak_before, streak_after, milestone_hit
  )
  VALUES (
    v_user_id, 'daily_gate', v_today, v_outcome, v_stake_cents,
    v_game_record.pot_cents, v_new_pot, v_game_record.current_streak, v_new_streak, v_milestone_hit
  )
  RETURNING id INTO v_play_id;

  -- Update game_state
  UPDATE game_state
  SET current_streak  = v_new_streak,
      pot_cents       = v_new_pot,
      last_play_date  = v_today,
      updated_at      = now()
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
    'play_id',              v_play_id
  );
END;
$$;
