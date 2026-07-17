/*
  # cashout_game records the authoritative Game Time region
  - v_region_id resolved once after authentication
  - game_time_region_id added to ledger meta for NEW cashout rows (audit only)
  - played_today uses get_current_game_date_for_user instead of get_madrid_today
  - All replay/context validation logic unchanged
*/

CREATE OR REPLACE FUNCTION public.cashout_game(
  p_game_id    text,
  p_idem_key   text,
  p_context_id timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id             uuid;
  v_region_id           uuid;
  v_current_streak      integer;
  v_pot_cents           integer;
  v_last_play_date      date;
  v_gs_updated_at       timestamptz;
  v_cashout_amount      integer;
  v_new_balance         integer;
  v_jackpot_cents       integer;
  v_ledger_id           uuid;
  v_existing_id         uuid;
  v_existing_amount     integer;
  v_existing_game_id    text;
  v_existing_context    timestamptz;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_region_id := public.resolve_user_game_time_region(v_user_id);

  IF p_game_id IS NULL OR btrim(p_game_id) = '' THEN
    RAISE EXCEPTION 'Invalid game id';
  END IF;
  IF p_idem_key IS NULL OR btrim(p_idem_key) = '' THEN
    RAISE EXCEPTION 'Missing idempotency key';
  END IF;
  IF p_idem_key !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RAISE EXCEPTION 'Invalid idempotency key';
  END IF;
  IF p_context_id IS NULL THEN
    RAISE EXCEPTION 'Missing cashout context';
  END IF;

  SELECT current_streak, pot_cents, last_play_date, updated_at
  INTO   v_current_streak, v_pot_cents, v_last_play_date, v_gs_updated_at
  FROM   public.game_state
  WHERE  user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No pot to cash out';
  END IF;

  SELECT id, amount_cents, meta->>'game_id', (meta->>'cashout_context_id')::timestamptz
  INTO   v_existing_id, v_existing_amount, v_existing_game_id, v_existing_context
  FROM   public.wallet_ledger
  WHERE  user_id = v_user_id
    AND  type = 'CASHOUT'
    AND  meta->>'idem_key' = p_idem_key
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    IF v_existing_game_id IS DISTINCT FROM p_game_id
       OR v_existing_context IS DISTINCT FROM p_context_id THEN
      RAISE EXCEPTION 'Idempotency key context mismatch';
    END IF;

    SELECT balance_cents INTO v_new_balance   FROM public.wallet_balance_cache WHERE user_id = v_user_id;
    SELECT balance_cents INTO v_jackpot_cents FROM public.jackpot_state        WHERE id = 1;
    RETURN jsonb_build_object(
      'streak',               0,
      'pot_cents',            0,
      'wallet_balance_cents', v_new_balance,
      'jackpot_cents',        v_jackpot_cents,
      'cashout_amount_cents', v_existing_amount,
      'played_today',         (v_last_play_date = public.get_current_game_date_for_user(v_user_id)),
      'transaction_id',       v_existing_id,
      'currency',             'EUR',
      'idempotent_replay',    true
    );
  END IF;

  IF p_context_id IS DISTINCT FROM v_gs_updated_at THEN
    RAISE EXCEPTION 'Stale cashout context';
  END IF;

  IF v_pot_cents IS NULL OR v_pot_cents = 0 THEN
    RAISE EXCEPTION 'No pot to cash out';
  END IF;

  v_cashout_amount := v_pot_cents;

  BEGIN
    INSERT INTO public.wallet_ledger (user_id, type, amount_cents, meta)
    VALUES (
      v_user_id, 'CASHOUT', v_cashout_amount,
      jsonb_build_object(
        'streak',              v_current_streak,
        'game_id',              p_game_id,
        'idem_key',             p_idem_key,
        'cashout_context_id',   p_context_id,
        'currency',             'EUR',
        'game_time_region_id',  v_region_id
      )
    )
    RETURNING id INTO v_ledger_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT id, amount_cents, meta->>'game_id', (meta->>'cashout_context_id')::timestamptz
    INTO   v_existing_id, v_existing_amount, v_existing_game_id, v_existing_context
    FROM public.wallet_ledger
    WHERE user_id = v_user_id AND type = 'CASHOUT' AND meta->>'idem_key' = p_idem_key
    LIMIT 1;

    IF v_existing_game_id IS DISTINCT FROM p_game_id OR v_existing_context IS DISTINCT FROM p_context_id THEN
      RAISE EXCEPTION 'Idempotency key context mismatch';
    END IF;

    SELECT balance_cents INTO v_new_balance   FROM public.wallet_balance_cache WHERE user_id = v_user_id;
    SELECT balance_cents INTO v_jackpot_cents FROM public.jackpot_state        WHERE id = 1;
    RETURN jsonb_build_object(
      'streak',               0,
      'pot_cents',            0,
      'wallet_balance_cents', v_new_balance,
      'jackpot_cents',        v_jackpot_cents,
      'cashout_amount_cents', v_existing_amount,
      'played_today',         (v_last_play_date = public.get_current_game_date_for_user(v_user_id)),
      'transaction_id',       v_existing_id,
      'currency',             'EUR',
      'idempotent_replay',    true
    );
  END;

  UPDATE public.wallet_balance_cache
  SET    balance_cents = balance_cents + v_cashout_amount,
         updated_at    = now()
  WHERE  user_id = v_user_id;

  UPDATE public.game_state
  SET    current_streak = 0,
         pot_cents      = 0,
         updated_at     = now()
  WHERE  user_id = v_user_id;

  SELECT balance_cents  INTO v_new_balance   FROM public.wallet_balance_cache WHERE user_id = v_user_id;
  SELECT balance_cents  INTO v_jackpot_cents FROM public.jackpot_state        WHERE id = 1;

  RETURN jsonb_build_object(
    'streak',               0,
    'pot_cents',            0,
    'wallet_balance_cents', v_new_balance,
    'jackpot_cents',        v_jackpot_cents,
    'cashout_amount_cents', v_cashout_amount,
    'played_today',         (v_last_play_date = public.get_current_game_date_for_user(v_user_id)),
    'transaction_id',       v_ledger_id,
    'currency',             'EUR',
    'idempotent_replay',    false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cashout_game(text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cashout_game(text, text, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.cashout_game(text, text, timestamptz) TO authenticated;