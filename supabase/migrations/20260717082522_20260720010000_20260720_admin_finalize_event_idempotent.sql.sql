/*
  # admin_finalize_event: idempotent, derived-status-gated, region-scoped
  - INSERT into event_finalizations FIRST as the atomic idempotency gate
  - unique_violation → already_finalized response, touch nothing
  - derived-status check for instance-scoped calls
  - no_entries safety check for both paths
  - Return shape: jsonb with status field
*/

CREATE OR REPLACE FUNCTION public.admin_finalize_event(
  p_event_game_id     text,
  p_winner_user_id    uuid,
  p_payout_cents      int,
  p_display_name      text,
  p_admin_actor       text DEFAULT 'admin',
  p_event_instance_id uuid DEFAULT NULL,
  p_force             boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_week_start        date;
  v_event_date        date;
  v_region_id         uuid;
  v_instance          record;
  v_derived_status     text;
  v_entry_count        integer;
  v_finalization_id     uuid;
  v_ledger_id            uuid;
  v_announcement_id       uuid;
  v_existing               record;
BEGIN
  IF p_event_instance_id IS NOT NULL THEN
    SELECT * INTO v_instance FROM public.event_instances WHERE id = p_event_instance_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Unknown event_instance_id: %', p_event_instance_id;
    END IF;
    v_event_date := v_instance.event_date;
    v_region_id  := v_instance.game_time_region_id;

    v_derived_status := public.get_event_instance_derived_status(p_event_instance_id);

    IF v_derived_status = 'cancelled' THEN
      RETURN jsonb_build_object('status', 'cancelled', 'event_instance_id', p_event_instance_id, 'event_game_id', p_event_game_id);
    END IF;
    IF v_derived_status IN ('scheduled', 'open') AND NOT p_force THEN
      RETURN jsonb_build_object('status', 'not_closed', 'event_instance_id', p_event_instance_id, 'event_game_id', p_event_game_id, 'derived_status', v_derived_status);
    END IF;
  ELSE
    v_week_start := public.get_current_week_start();
    v_event_date := v_week_start;
  END IF;

  IF p_event_instance_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_entry_count FROM public.weekend_event_entries WHERE event_instance_id = p_event_instance_id;
  ELSE
    SELECT COUNT(*) INTO v_entry_count FROM public.weekend_event_entries
    WHERE event_game_id = p_event_game_id AND week_start_date = v_week_start;
  END IF;
  IF v_entry_count = 0 THEN
    RETURN jsonb_build_object('status', 'no_entries', 'event_instance_id', p_event_instance_id, 'event_game_id', p_event_game_id);
  END IF;

  BEGIN
    INSERT INTO public.event_finalizations
      (event_instance_id, event_game_id, game_time_region_id, event_date, winner_user_id, reward_cents, finalized_by)
    VALUES
      (p_event_instance_id, p_event_game_id, v_region_id, v_event_date, p_winner_user_id, p_payout_cents, p_admin_actor)
    RETURNING id INTO v_finalization_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO v_existing FROM public.event_finalizations
    WHERE (p_event_instance_id IS NOT NULL AND event_instance_id = p_event_instance_id)
       OR (p_event_instance_id IS NULL AND event_instance_id IS NULL AND event_game_id = p_event_game_id AND event_date = v_event_date);
    RETURN jsonb_build_object(
      'status',            'already_finalized',
      'event_instance_id', p_event_instance_id,
      'event_game_id',     p_event_game_id,
      'winner_user_id',    v_existing.winner_user_id,
      'reward_cents',      v_existing.reward_cents,
      'wallet_ledger_id',  v_existing.wallet_ledger_id,
      'finalization_id',   v_existing.id
    );
  END;

  UPDATE public.weekend_event_entries
  SET result_status = 'completed', reward_cents = p_payout_cents
  WHERE user_id = p_winner_user_id
    AND event_game_id = p_event_game_id
    AND week_start_date = v_event_date
    AND (p_event_instance_id IS NULL OR event_instance_id = p_event_instance_id);

  UPDATE public.weekend_event_entries
  SET result_status = 'completed'
  WHERE event_game_id = p_event_game_id
    AND week_start_date = v_event_date
    AND result_status = 'entered'
    AND (p_event_instance_id IS NULL OR event_instance_id = p_event_instance_id);

  IF p_payout_cents > 0 THEN
    INSERT INTO public.wallet_ledger (user_id, type, amount_cents, meta)
    VALUES (
      p_winner_user_id, 'JACKPOT_WIN', p_payout_cents,
      jsonb_build_object(
        'event',               p_event_game_id,
        'event_date',           v_event_date,
        'event_instance_id',     p_event_instance_id,
        'game_time_region_id',    v_region_id,
        'finalization_id',          v_finalization_id
      )
    )
    RETURNING id INTO v_ledger_id;

    UPDATE public.event_finalizations SET wallet_ledger_id = v_ledger_id WHERE id = v_finalization_id;
  END IF;

  IF p_event_instance_id IS NOT NULL THEN
    UPDATE public.event_instances SET status = 'finalized', updated_at = now() WHERE id = p_event_instance_id;
  END IF;

  INSERT INTO public.winner_announcements
    (event_game_id, event_date, user_id, display_name, payout_cents, result_summary, share_text)
  VALUES
    (p_event_game_id, v_event_date,
     p_winner_user_id,
     p_display_name,
     p_payout_cents,
     'Won the ' || p_event_game_id || ' on ' || v_event_date::text,
     'I just won the Survive the Streak ' || p_event_game_id || '!')
  RETURNING id INTO v_announcement_id;

  INSERT INTO public.admin_audit_log (admin_actor, action, payload_json)
  VALUES (p_admin_actor, 'finalize_event',
    jsonb_build_object('event', p_event_game_id, 'winner', p_winner_user_id,
      'payout_cents', p_payout_cents, 'announcement_id', v_announcement_id,
      'event_instance_id', p_event_instance_id, 'finalization_id', v_finalization_id,
      'forced', p_force));

  RETURN jsonb_build_object(
    'status',            'finalized',
    'event_instance_id', p_event_instance_id,
    'event_game_id',     p_event_game_id,
    'winner_user_id',    p_winner_user_id,
    'reward_cents',      p_payout_cents,
    'wallet_ledger_id',  v_ledger_id,
    'finalization_id',   v_finalization_id,
    'announcement_id',   v_announcement_id
  );
END;
$$;