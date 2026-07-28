-- Hosted Dummy PSP Integration — applied via MCP apply_migration
-- Reference copy for static verification scripts

CREATE OR REPLACE FUNCTION public.process_payment_webhook(
  p_provider_key       text,
  p_event_id           text,
  p_event_type         text,
  p_payload            jsonb,
  p_payment_order_id   text,
  p_provider_payment_id text,
  p_amount_cents       integer,
  p_currency           text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event_uuid    uuid;
  v_order         public.payment_orders;
  v_balance       integer;
  v_ledger_id     uuid;
BEGIN
  BEGIN
    INSERT INTO public.payment_webhook_events (
      provider_key, event_id, event_type, payload, signature_valid, processed
    ) VALUES (
      p_provider_key, p_event_id, p_event_type, p_payload, true, false
    )
    RETURNING id INTO v_event_uuid;
  EXCEPTION WHEN unique_violation THEN
    SELECT balance_cents INTO v_balance
    FROM public.wallet_balance_cache wbc
    JOIN public.payment_orders po ON po.user_id = wbc.user_id
    WHERE po.id = p_payment_order_id::uuid
    LIMIT 1;
    RETURN jsonb_build_object(
      'status', 'duplicate',
      'event_id', p_event_id,
      'idempotent_replay', true,
      'balance_cents', v_balance
    );
  END;

  SELECT * INTO v_order FROM public.payment_orders
  WHERE id = p_payment_order_id::uuid FOR UPDATE;

  IF NOT FOUND THEN
    UPDATE public.payment_webhook_events
    SET processing_error = 'Payment order not found', processed = true, processed_at = now()
    WHERE id = v_event_uuid;
    RETURN jsonb_build_object('status', 'error', 'error', 'Payment order not found');
  END IF;

  IF v_order.provider_payment_id IS NOT NULL AND v_order.provider_payment_id != p_provider_payment_id THEN
    UPDATE public.payment_webhook_events
    SET processing_error = 'Provider payment ID mismatch', processed = true, processed_at = now()
    WHERE id = v_event_uuid;
    RETURN jsonb_build_object('status', 'error', 'error', 'Provider payment ID mismatch');
  END IF;

  IF p_event_type = 'payment.succeeded' THEN
    IF p_amount_cents IS NOT NULL AND p_amount_cents != v_order.amount_cents THEN
      UPDATE public.payment_webhook_events
      SET processing_error = 'Amount mismatch', processed = true, processed_at = now()
      WHERE id = v_event_uuid;
      RETURN jsonb_build_object('status', 'error', 'error', 'Amount mismatch');
    END IF;

    IF v_order.status = 'succeeded' THEN
      UPDATE public.payment_webhook_events SET processed = true, processed_at = now() WHERE id = v_event_uuid;
      SELECT balance_cents INTO v_balance FROM public.wallet_balance_cache WHERE user_id = v_order.user_id;
      RETURN jsonb_build_object('status', 'succeeded', 'order_id', v_order.id, 'balance_cents', v_balance, 'idempotent_replay', true);
    END IF;

    IF v_order.status NOT IN ('pending', 'created') THEN
      UPDATE public.payment_webhook_events
      SET processing_error = 'Order not in finalizable state: ' || v_order.status, processed = true, processed_at = now()
      WHERE id = v_event_uuid;
      RETURN jsonb_build_object('status', 'error', 'error', 'Order not in finalizable state');
    END IF;

    INSERT INTO public.wallet_ledger (user_id, type, amount_cents, meta)
    VALUES (v_order.user_id, 'CREDIT_PURCHASE', v_order.credits_cents,
      jsonb_build_object('order_id', v_order.id, 'webhook_event_id', v_event_uuid, 'provider_key', v_order.provider_key, 'provider_payment_id', v_order.provider_payment_id, 'package_id', v_order.package_id, 'currency', v_order.currency))
    RETURNING id INTO v_ledger_id;

    UPDATE public.wallet_balance_cache SET balance_cents = balance_cents + v_order.credits_cents, updated_at = now() WHERE user_id = v_order.user_id;
    UPDATE public.payment_orders SET status = 'succeeded', completed_at = now(), updated_at = now() WHERE id = v_order.id;
    SELECT balance_cents INTO v_balance FROM public.wallet_balance_cache WHERE user_id = v_order.user_id;
    UPDATE public.payment_webhook_events SET processed = true, processed_at = now() WHERE id = v_event_uuid;

    RETURN jsonb_build_object('status', 'succeeded', 'order_id', v_order.id, 'ledger_id', v_ledger_id, 'balance_cents', v_balance, 'credits_cents', v_order.credits_cents, 'idempotent_replay', false);

  ELSIF p_event_type = 'payment.failed' THEN
    IF v_order.status = 'failed' THEN
      UPDATE public.payment_webhook_events SET processed = true, processed_at = now() WHERE id = v_event_uuid;
      RETURN jsonb_build_object('status', 'failed', 'order_id', v_order.id, 'idempotent_replay', true);
    END IF;

    UPDATE public.payment_orders SET status = 'failed', failed_at = now(), updated_at = now() WHERE id = v_order.id;
    UPDATE public.payment_webhook_events SET processed = true, processed_at = now() WHERE id = v_event_uuid;
    RETURN jsonb_build_object('status', 'failed', 'order_id', v_order.id, 'idempotent_replay', false);
  ELSE
    UPDATE public.payment_webhook_events SET processing_error = 'Unsupported event_type: ' || p_event_type, processed = true, processed_at = now() WHERE id = v_event_uuid;
    RETURN jsonb_build_object('status', 'error', 'error', 'Unsupported event_type');
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.process_payment_webhook(text, text, text, jsonb, text, text, integer, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.process_payout_webhook(
  p_provider_key        text,
  p_event_id            text,
  p_event_type          text,
  p_payload             jsonb,
  p_withdrawal_request_id text,
  p_provider_payout_id  text,
  p_amount_cents        integer,
  p_currency            text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event_uuid   uuid;
  v_wr           public.withdrawal_requests;
  v_balance      integer;
  v_ledger_id    uuid;
BEGIN
  BEGIN
    INSERT INTO public.payment_webhook_events (provider_key, event_id, event_type, payload, signature_valid, processed)
    VALUES (p_provider_key, p_event_id, p_event_type, p_payload, true, false)
    RETURNING id INTO v_event_uuid;
  EXCEPTION WHEN unique_violation THEN
    SELECT balance_cents INTO v_balance
    FROM public.wallet_balance_cache wbc
    JOIN public.withdrawal_requests wr ON wr.user_id = wbc.user_id
    WHERE wr.id = p_withdrawal_request_id::uuid LIMIT 1;
    RETURN jsonb_build_object('status', 'duplicate', 'event_id', p_event_id, 'idempotent_replay', true, 'balance_cents', v_balance);
  END;

  SELECT * INTO v_wr FROM public.withdrawal_requests WHERE id = p_withdrawal_request_id::uuid FOR UPDATE;

  IF NOT FOUND THEN
    UPDATE public.payment_webhook_events SET processing_error = 'Withdrawal request not found', processed = true, processed_at = now() WHERE id = v_event_uuid;
    RETURN jsonb_build_object('status', 'error', 'error', 'Withdrawal request not found');
  END IF;

  IF v_wr.provider_payout_id IS NOT NULL AND v_wr.provider_payout_id != p_provider_payout_id THEN
    UPDATE public.payment_webhook_events SET processing_error = 'Provider payout ID mismatch', processed = true, processed_at = now() WHERE id = v_event_uuid;
    RETURN jsonb_build_object('status', 'error', 'error', 'Provider payout ID mismatch');
  END IF;

  IF p_event_type = 'payout.paid' THEN
    IF p_amount_cents IS NOT NULL AND p_amount_cents != v_wr.amount_cents THEN
      UPDATE public.payment_webhook_events SET processing_error = 'Amount mismatch', processed = true, processed_at = now() WHERE id = v_event_uuid;
      RETURN jsonb_build_object('status', 'error', 'error', 'Amount mismatch');
    END IF;
    IF v_wr.status = 'paid' THEN
      UPDATE public.payment_webhook_events SET processed = true, processed_at = now() WHERE id = v_event_uuid;
      RETURN jsonb_build_object('status', 'paid', 'withdrawal_id', v_wr.id, 'idempotent_replay', true);
    END IF;
    IF v_wr.status NOT IN ('requested', 'processing') THEN
      UPDATE public.payment_webhook_events SET processing_error = 'Withdrawal not in payable state: ' || v_wr.status, processed = true, processed_at = now() WHERE id = v_event_uuid;
      RETURN jsonb_build_object('status', 'error', 'error', 'Withdrawal not in payable state');
    END IF;
    UPDATE public.withdrawal_requests SET status = 'paid', paid_at = now(), updated_at = now() WHERE id = v_wr.id;
    UPDATE public.payment_webhook_events SET processed = true, processed_at = now() WHERE id = v_event_uuid;
    RETURN jsonb_build_object('status', 'paid', 'withdrawal_id', v_wr.id, 'idempotent_replay', false);

  ELSIF p_event_type = 'payout.failed' THEN
    IF v_wr.status = 'failed' THEN
      UPDATE public.payment_webhook_events SET processed = true, processed_at = now() WHERE id = v_event_uuid;
      SELECT balance_cents INTO v_balance FROM public.wallet_balance_cache WHERE user_id = v_wr.user_id;
      RETURN jsonb_build_object('status', 'failed', 'withdrawal_id', v_wr.id, 'balance_cents', v_balance, 'idempotent_replay', true);
    END IF;
    IF v_wr.status NOT IN ('requested', 'processing') THEN
      UPDATE public.payment_webhook_events SET processing_error = 'Withdrawal not in reversible state: ' || v_wr.status, processed = true, processed_at = now() WHERE id = v_event_uuid;
      RETURN jsonb_build_object('status', 'error', 'error', 'Withdrawal not in reversible state');
    END IF;
    INSERT INTO public.wallet_ledger (user_id, type, amount_cents, meta)
    VALUES (v_wr.user_id, 'WITHDRAWAL_REVERSAL', v_wr.amount_cents,
      jsonb_build_object('withdrawal_id', v_wr.id, 'webhook_event_id', v_event_uuid, 'provider_key', v_wr.provider_key, 'currency', v_wr.currency))
    RETURNING id INTO v_ledger_id;
    UPDATE public.wallet_balance_cache SET balance_cents = balance_cents + v_wr.amount_cents, updated_at = now() WHERE user_id = v_wr.user_id;
    UPDATE public.withdrawal_requests SET status = 'failed', failed_at = now(), updated_at = now() WHERE id = v_wr.id;
    SELECT balance_cents INTO v_balance FROM public.wallet_balance_cache WHERE user_id = v_wr.user_id;
    UPDATE public.payment_webhook_events SET processed = true, processed_at = now() WHERE id = v_event_uuid;
    RETURN jsonb_build_object('status', 'failed', 'withdrawal_id', v_wr.id, 'ledger_id', v_ledger_id, 'balance_cents', v_balance, 'idempotent_replay', false);
  ELSE
    UPDATE public.payment_webhook_events SET processing_error = 'Unsupported event_type: ' || p_event_type, processed = true, processed_at = now() WHERE id = v_event_uuid;
    RETURN jsonb_build_object('status', 'error', 'error', 'Unsupported event_type');
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.process_payout_webhook(text, text, text, jsonb, text, text, integer, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.cancel_withdrawal_provider_error(p_withdrawal_id uuid, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_wr public.withdrawal_requests; v_balance integer; v_ledger_id uuid;
BEGIN
  SELECT * INTO v_wr FROM public.withdrawal_requests WHERE id = p_withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal request not found'; END IF;
  IF v_wr.provider_payout_id IS NOT NULL THEN RETURN jsonb_build_object('status', 'skipped', 'reason', 'provider_payout_id already set'); END IF;
  IF v_wr.status NOT IN ('requested', 'processing') THEN RETURN jsonb_build_object('status', 'skipped', 'reason', 'withdrawal not in reversible state: ' || v_wr.status); END IF;
  INSERT INTO public.wallet_ledger (user_id, type, amount_cents, meta)
  VALUES (v_wr.user_id, 'WITHDRAWAL_REVERSAL', v_wr.amount_cents, jsonb_build_object('withdrawal_id', p_withdrawal_id, 'provider_key', v_wr.provider_key, 'currency', v_wr.currency, 'reason', p_reason))
  RETURNING id INTO v_ledger_id;
  UPDATE public.wallet_balance_cache SET balance_cents = balance_cents + v_wr.amount_cents, updated_at = now() WHERE user_id = v_wr.user_id;
  UPDATE public.withdrawal_requests SET status = 'cancelled', cancelled_at = now(), updated_at = now() WHERE id = p_withdrawal_id;
  SELECT balance_cents INTO v_balance FROM public.wallet_balance_cache WHERE user_id = v_wr.user_id;
  RETURN jsonb_build_object('status', 'cancelled', 'withdrawal_id', p_withdrawal_id, 'ledger_id', v_ledger_id, 'balance_cents', v_balance);
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_withdrawal_provider_error(uuid, text) FROM PUBLIC, anon, authenticated;

INSERT INTO public.settings (key, value_json) VALUES ('dummy_simulation_enabled', 'false'::jsonb) ON CONFLICT (key) DO UPDATE SET value_json = 'false'::jsonb;
REVOKE ALL ON FUNCTION public.topup_wallet(integer, text) FROM PUBLIC, anon, authenticated;
