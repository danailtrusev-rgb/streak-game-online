/*
  # admin_finalize_event: optional region/instance scoping
  - Adds optional p_event_instance_id parameter (DEFAULT NULL)
  - When omitted: byte-for-byte identical to previous behavior
  - When provided: scopes UPDATE statements + records instance/region in meta
  - Payout amount always admin-supplied, never computed from region/instance
*/

CREATE OR REPLACE FUNCTION public.admin_finalize_event(
  p_event_game_id     text,
  p_winner_user_id    uuid,
  p_payout_cents      int,
  p_display_name      text,
  p_admin_actor       text DEFAULT 'admin',
  p_event_instance_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_week_start  date;
  v_winner_id   uuid;
  v_region_id   uuid;
  v_meta        jsonb;
BEGIN
  v_week_start := public.get_current_week_start();

  IF p_event_instance_id IS NOT NULL THEN
    SELECT game_time_region_id INTO v_region_id FROM public.event_instances WHERE id = p_event_instance_id;
    IF v_region_id IS NULL THEN
      RAISE EXCEPTION 'Unknown event_instance_id: %', p_event_instance_id;
    END IF;
  END IF;

  UPDATE public.weekend_event_entries
  SET result_status = 'completed', reward_cents = p_payout_cents
  WHERE user_id = p_winner_user_id
    AND event_game_id = p_event_game_id
    AND week_start_date = v_week_start
    AND (p_event_instance_id IS NULL OR event_instance_id = p_event_instance_id);

  UPDATE public.weekend_event_entries
  SET result_status = 'completed'
  WHERE event_game_id = p_event_game_id
    AND week_start_date = v_week_start
    AND result_status = 'entered'
    AND (p_event_instance_id IS NULL OR event_instance_id = p_event_instance_id);

  IF p_payout_cents > 0 THEN
    v_meta := jsonb_build_object('event', p_event_game_id, 'week_start', v_week_start);
    IF p_event_instance_id IS NOT NULL THEN
      v_meta := v_meta || jsonb_build_object('event_instance_id', p_event_instance_id, 'game_time_region_id', v_region_id);
    END IF;

    INSERT INTO public.wallet_ledger (user_id, type, amount_cents, meta)
    VALUES (p_winner_user_id, 'JACKPOT_WIN', p_payout_cents, v_meta);
  END IF;

  IF p_event_instance_id IS NOT NULL THEN
    UPDATE public.event_instances SET status = 'finalized', updated_at = now() WHERE id = p_event_instance_id;
  END IF;

  INSERT INTO public.winner_announcements
    (event_game_id, event_date, user_id, display_name, payout_cents, result_summary, share_text)
  VALUES
    (p_event_game_id, v_week_start,
     p_winner_user_id,
     p_display_name,
     p_payout_cents,
     'Won the ' || p_event_game_id || ' on ' || v_week_start::text,
     'I just won the Survive the Streak ' || p_event_game_id || '!')
  RETURNING id INTO v_winner_id;

  INSERT INTO public.admin_audit_log (admin_actor, action, payload_json)
  VALUES (p_admin_actor, 'finalize_event',
    jsonb_build_object('event', p_event_game_id, 'winner', p_winner_user_id,
      'payout_cents', p_payout_cents, 'announcement_id', v_winner_id,
      'event_instance_id', p_event_instance_id));

  RETURN v_winner_id;
END;
$$;