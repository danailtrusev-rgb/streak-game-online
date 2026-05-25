/*
  # Fix cashout_game function

  Two bugs in the live cashout_game function:
  1. search_path = '' (empty) — causes "type game_state does not exist" because the
     composite row type from the game_state table can't be resolved without a schema path.
  2. Signature is cashout_game() with no parameters — but the frontend calls it with
     p_game_id and p_idem_key. This causes a "function does not exist" error.
  3. Uses `v_game_record game_state` composite type — replaced with explicit scalar
     variable declarations to avoid any composite-type resolution issues.

  Fix: replace with correct signature + search_path = public + scalar variables.
*/

CREATE OR REPLACE FUNCTION public.cashout_game(
  p_game_id  text DEFAULT 'daily_gate',
  p_idem_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        uuid;
  v_current_streak integer;
  v_pot_cents      integer;
  v_last_play_date date;
  v_cashout_amount integer;
  v_new_balance    integer;
  v_jackpot_cents  integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT current_streak, pot_cents, last_play_date
  INTO   v_current_streak, v_pot_cents, v_last_play_date
  FROM   game_state
  WHERE  user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_pot_cents IS NULL OR v_pot_cents = 0 THEN
    RAISE EXCEPTION 'No pot to cash out';
  END IF;

  v_cashout_amount := v_pot_cents;

  INSERT INTO wallet_ledger (user_id, type, amount_cents, meta)
  VALUES (v_user_id, 'CASHOUT', v_cashout_amount,
          jsonb_build_object('streak', v_current_streak, 'game_id', p_game_id));

  UPDATE wallet_balance_cache
  SET    balance_cents = balance_cents + v_cashout_amount,
         updated_at    = now()
  WHERE  user_id = v_user_id;

  UPDATE game_state
  SET    current_streak = 0,
         pot_cents      = 0,
         updated_at     = now()
  WHERE  user_id = v_user_id;

  SELECT balance_cents  INTO v_new_balance  FROM wallet_balance_cache WHERE user_id = v_user_id;
  SELECT balance_cents  INTO v_jackpot_cents FROM jackpot_state        WHERE id = 1;

  RETURN jsonb_build_object(
    'streak',               0,
    'pot_cents',            0,
    'wallet_balance_cents', v_new_balance,
    'jackpot_cents',        v_jackpot_cents,
    'cashout_amount_cents', v_cashout_amount,
    'played_today',         (v_last_play_date = get_madrid_today())
  );
END;
$$;
