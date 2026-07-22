/*
# Payments Foundation — Provider-Agnostic Payment Architecture

## Purpose

Adds the minimum safe schema for a provider-agnostic payment system:
- Credit purchases (buy credits with real/dummy money)
- Withdrawal requests (cash out wallet balance externally)
- Multiple provider support with admin-selectable active provider
- Dummy provider seeded for dev/testing only
- Idempotent webhook processing
- Wallet ledger integration (server-side only — no client-callable topup)

## New Tables

1. **payment_providers** — Registry of payment providers (dummy, future real PSPs)
2. **credit_packages** — Purchasable credit bundles
3. **payment_orders** — Credit purchase orders
4. **payment_webhook_events** — Idempotent webhook processing log
5. **withdrawal_requests** — External wallet withdrawal requests

## Modified Tables

- **wallet_ledger** — CHECK constraint on `type` column expanded to add:
  CREDIT_PURCHASE, WITHDRAWAL_REQUEST, WITHDRAWAL_REVERSAL

- **settings** — Seeds new payment config keys:
  payments_enabled, credit_purchases_enabled, withdrawals_enabled, dummy_payments_enabled

## Security (RLS)

All new tables have RLS enabled.
- payment_providers: SELECT for authenticated (see active provider)
- credit_packages: SELECT for authenticated (see enabled packages)
- payment_orders: SELECT own rows only
- payment_webhook_events: No authenticated policies (service-role only)
- withdrawal_requests: SELECT own rows only
- No INSERT/UPDATE/DELETE for authenticated on any payment table

## RPCs

1. finalize_credit_purchase(p_order_id, p_webhook_event_id) — service-role only
2. create_withdrawal_request(p_user_id, p_amount_cents, p_idempotency_key, ...) — service-role only
3. finalize_withdrawal_paid(p_withdrawal_id, p_webhook_event_id) — service-role only
4. reverse_withdrawal_failed(p_withdrawal_id, p_webhook_event_id) — service-role only
5. get_payment_config() — authenticated, returns safe non-secret config

## Important Notes

1. topup_wallet is NOT re-granted to authenticated. Remains service-role only.
2. cashout_game(text, text, timestamptz) is NOT altered.
3. All wallet crediting happens server-side via SECURITY DEFINER RPCs.
4. Players cannot directly INSERT/UPDATE payment tables.
5. Dummy provider seeded as enabled + active for credit purchase, withdrawals disabled.
6. No cron, no scheduled push, no regional game time changes.
*/

-- ── Expand wallet_ledger type constraint ──────────────────────────────────────

ALTER TABLE public.wallet_ledger DROP CONSTRAINT IF EXISTS wallet_ledger_type_check;
ALTER TABLE public.wallet_ledger ADD CONSTRAINT wallet_ledger_type_check
  CHECK (type = ANY (ARRAY[
    'TOPUP'::text, 'STAKE'::text, 'CASHOUT'::text,
    'ADMIN_ADJUST'::text, 'JACKPOT_CONTRIB'::text, 'JACKPOT_WIN'::text,
    'POOL_CONTRIB'::text,
    'CREDIT_PURCHASE'::text,
    'WITHDRAWAL_REQUEST'::text,
    'WITHDRAWAL_REVERSAL'::text
  ]));

-- ── payment_providers ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payment_providers (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key                text UNIQUE NOT NULL,
  display_name                text NOT NULL,
  mode                        text NOT NULL DEFAULT 'sandbox'
    CHECK (mode IN ('sandbox', 'live')),
  enabled                     boolean NOT NULL DEFAULT false,
  supports_credit_purchase    boolean NOT NULL DEFAULT false,
  supports_withdrawal         boolean NOT NULL DEFAULT false,
  is_active_for_credit_purchase boolean NOT NULL DEFAULT false,
  is_active_for_withdrawal    boolean NOT NULL DEFAULT false,
  config_json                 jsonb NOT NULL DEFAULT '{}',
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_payment_providers" ON public.payment_providers;
CREATE POLICY "select_payment_providers" ON public.payment_providers
  FOR SELECT TO authenticated USING (true);

-- ── credit_packages ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.credit_packages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_key   text UNIQUE NOT NULL,
  display_name  text NOT NULL,
  amount_cents  integer NOT NULL CHECK (amount_cents > 0),
  currency      text NOT NULL DEFAULT 'EUR',
  credits_cents integer NOT NULL CHECK (credits_cents > 0),
  enabled       boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_credit_packages" ON public.credit_packages;
CREATE POLICY "select_credit_packages" ON public.credit_packages
  FOR SELECT TO authenticated USING (enabled = true);

-- ── payment_orders ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payment_orders (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider_key       text NOT NULL,
  provider_payment_id text,
  status             text NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'pending', 'succeeded', 'failed', 'cancelled', 'expired')),
  package_id         uuid REFERENCES public.credit_packages(id) ON DELETE SET NULL,
  amount_cents       integer NOT NULL CHECK (amount_cents > 0),
  credits_cents      integer NOT NULL CHECK (credits_cents > 0),
  currency           text NOT NULL DEFAULT 'EUR',
  checkout_url       text,
  idempotency_key    text NOT NULL,
  provider_meta      jsonb NOT NULL DEFAULT '{}',
  completed_at       timestamptz,
  failed_at          timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_orders_user_idem_unique UNIQUE (user_id, idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_provider_pay_id_uniq
  ON public.payment_orders (provider_key, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_orders_user
  ON public.payment_orders (user_id, created_at DESC);

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_payment_orders" ON public.payment_orders;
CREATE POLICY "select_own_payment_orders" ON public.payment_orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ── payment_webhook_events ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key    text NOT NULL,
  event_id        text NOT NULL,
  event_type      text NOT NULL,
  payload         jsonb NOT NULL,
  signature_valid boolean NOT NULL DEFAULT false,
  processed       boolean NOT NULL DEFAULT false,
  processed_at    timestamptz,
  processing_error text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_webhook_events_provider_event_unique UNIQUE (provider_key, event_id)
);

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

-- ── withdrawal_requests ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider_key       text NOT NULL,
  provider_payout_id text,
  status             text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'processing', 'paid', 'failed', 'cancelled')),
  amount_cents       integer NOT NULL CHECK (amount_cents > 0),
  currency           text NOT NULL DEFAULT 'EUR',
  idempotency_key    text NOT NULL,
  destination_type   text,
  destination_label  text,
  provider_meta      jsonb NOT NULL DEFAULT '{}',
  requested_at       timestamptz NOT NULL DEFAULT now(),
  processing_at      timestamptz,
  paid_at            timestamptz,
  failed_at          timestamptz,
  cancelled_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT withdrawal_requests_user_idem_unique UNIQUE (user_id, idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS withdrawal_requests_provider_payout_id_uniq
  ON public.withdrawal_requests (provider_key, provider_payout_id)
  WHERE provider_payout_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user
  ON public.withdrawal_requests (user_id, created_at DESC);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_withdrawal_requests" ON public.withdrawal_requests;
CREATE POLICY "select_own_withdrawal_requests" ON public.withdrawal_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ── Seed: dummy provider ──────────────────────────────────────────────────────

INSERT INTO public.payment_providers (
  provider_key, display_name, mode, enabled,
  supports_credit_purchase, supports_withdrawal,
  is_active_for_credit_purchase, is_active_for_withdrawal,
  config_json
) VALUES (
  'dummy',
  'Dummy Payment Provider',
  'sandbox',
  true,
  true,
  true,
  true,
  false,
  '{"description": "Dev/test only. No real money moves.", "webhook_secret_env": "DUMMY_PROVIDER_WEBHOOK_SECRET"}'
) ON CONFLICT (provider_key) DO NOTHING;

-- ── Seed: credit packages ─────────────────────────────────────────────────────

INSERT INTO public.credit_packages (package_key, display_name, amount_cents, credits_cents, display_order) VALUES
  ('credits_10_eur', '€10 Credits', 1000, 1000, 10),
  ('credits_25_eur', '€25 Credits', 2500, 2500, 20),
  ('credits_50_eur', '€50 Credits', 5000, 5000, 30)
ON CONFLICT (package_key) DO NOTHING;

-- ── Seed: payment settings ─────────────────────────────────────────────────────

INSERT INTO public.settings (key, value_json) VALUES
  ('payments_enabled', 'true'::jsonb),
  ('credit_purchases_enabled', 'true'::jsonb),
  ('withdrawals_enabled', 'false'::jsonb),
  ('dummy_payments_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ── RPC: finalize_credit_purchase ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.finalize_credit_purchase(
  p_order_id         uuid,
  p_webhook_event_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order          public.payment_orders;
  v_balance        integer;
  v_ledger_id      uuid;
BEGIN
  SELECT * INTO v_order FROM public.payment_orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment order not found';
  END IF;

  IF v_order.status = 'succeeded' THEN
    SELECT balance_cents INTO v_balance FROM public.wallet_balance_cache WHERE user_id = v_order.user_id;
    RETURN jsonb_build_object(
      'status', 'succeeded',
      'order_id', p_order_id,
      'balance_cents', v_balance,
      'idempotent_replay', true
    );
  END IF;

  IF v_order.status NOT IN ('pending', 'created') THEN
    RAISE EXCEPTION 'Order is not in a finalizable state: %', v_order.status;
  END IF;

  INSERT INTO public.wallet_ledger (user_id, type, amount_cents, meta)
  VALUES (
    v_order.user_id, 'CREDIT_PURCHASE', v_order.credits_cents,
    jsonb_build_object(
      'order_id', p_order_id,
      'webhook_event_id', p_webhook_event_id,
      'provider_key', v_order.provider_key,
      'provider_payment_id', v_order.provider_payment_id,
      'package_id', v_order.package_id,
      'currency', v_order.currency
    )
  )
  RETURNING id INTO v_ledger_id;

  UPDATE public.wallet_balance_cache
  SET balance_cents = balance_cents + v_order.credits_cents,
      updated_at = now()
  WHERE user_id = v_order.user_id;

  UPDATE public.payment_orders
  SET status = 'succeeded',
      completed_at = now(),
      updated_at = now()
  WHERE id = p_order_id;

  SELECT balance_cents INTO v_balance FROM public.wallet_balance_cache WHERE user_id = v_order.user_id;

  RETURN jsonb_build_object(
    'status', 'succeeded',
    'order_id', p_order_id,
    'ledger_id', v_ledger_id,
    'balance_cents', v_balance,
    'credits_cents', v_order.credits_cents,
    'idempotent_replay', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_credit_purchase(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- ── RPC: create_withdrawal_request ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_withdrawal_request(
  p_user_id          uuid,
  p_amount_cents     integer,
  p_idempotency_key  text,
  p_provider_key     text,
  p_destination_type text,
  p_destination_label text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_balance         integer;
  v_withdrawal_id   uuid;
  v_existing_id     uuid;
BEGIN
  SELECT id INTO v_existing_id FROM public.withdrawal_requests
  WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF v_existing_id IS NOT NULL THEN
    SELECT balance_cents INTO v_balance FROM public.wallet_balance_cache WHERE user_id = p_user_id;
    RETURN jsonb_build_object(
      'withdrawal_id', v_existing_id,
      'status', 'idempotent_replay',
      'balance_cents', v_balance
    );
  END IF;

  SELECT balance_cents INTO v_balance FROM public.wallet_balance_cache
  WHERE user_id = p_user_id FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  IF v_balance < p_amount_cents THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  INSERT INTO public.wallet_ledger (user_id, type, amount_cents, meta)
  VALUES (
    p_user_id, 'WITHDRAWAL_REQUEST', -p_amount_cents,
    jsonb_build_object(
      'provider_key', p_provider_key,
      'destination_type', p_destination_type,
      'destination_label', p_destination_label,
      'currency', 'EUR'
    )
  );

  UPDATE public.wallet_balance_cache
  SET balance_cents = balance_cents - p_amount_cents,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.withdrawal_requests (
    user_id, provider_key, status, amount_cents, currency,
    idempotency_key, destination_type, destination_label
  ) VALUES (
    p_user_id, p_provider_key, 'requested', p_amount_cents, 'EUR',
    p_idempotency_key, p_destination_type, p_destination_label
  )
  RETURNING id INTO v_withdrawal_id;

  SELECT balance_cents INTO v_balance FROM public.wallet_balance_cache WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'withdrawal_id', v_withdrawal_id,
    'status', 'requested',
    'balance_cents', v_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_withdrawal_request(uuid, integer, text, text, text, text) FROM PUBLIC, anon, authenticated;

-- ── RPC: finalize_withdrawal_paid ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.finalize_withdrawal_paid(
  p_withdrawal_id    uuid,
  p_webhook_event_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_wr  public.withdrawal_requests;
BEGIN
  SELECT * INTO v_wr FROM public.withdrawal_requests WHERE id = p_withdrawal_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  IF v_wr.status = 'paid' THEN
    RETURN jsonb_build_object(
      'status', 'paid',
      'withdrawal_id', p_withdrawal_id,
      'idempotent_replay', true
    );
  END IF;

  IF v_wr.status NOT IN ('requested', 'processing') THEN
    RAISE EXCEPTION 'Withdrawal is not in a payable state: %', v_wr.status;
  END IF;

  UPDATE public.withdrawal_requests
  SET status = 'paid',
      paid_at = now(),
      updated_at = now()
  WHERE id = p_withdrawal_id;

  RETURN jsonb_build_object(
    'status', 'paid',
    'withdrawal_id', p_withdrawal_id,
    'idempotent_replay', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_withdrawal_paid(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- ── RPC: reverse_withdrawal_failed ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.reverse_withdrawal_failed(
  p_withdrawal_id    uuid,
  p_webhook_event_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_wr      public.withdrawal_requests;
  v_balance integer;
BEGIN
  SELECT * INTO v_wr FROM public.withdrawal_requests WHERE id = p_withdrawal_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  IF v_wr.status = 'failed' THEN
    SELECT balance_cents INTO v_balance FROM public.wallet_balance_cache WHERE user_id = v_wr.user_id;
    RETURN jsonb_build_object(
      'status', 'failed',
      'withdrawal_id', p_withdrawal_id,
      'balance_cents', v_balance,
      'idempotent_replay', true
    );
  END IF;

  IF v_wr.status NOT IN ('requested', 'processing') THEN
    RAISE EXCEPTION 'Withdrawal is not in a reversible state: %', v_wr.status;
  END IF;

  INSERT INTO public.wallet_ledger (user_id, type, amount_cents, meta)
  VALUES (
    v_wr.user_id, 'WITHDRAWAL_REVERSAL', v_wr.amount_cents,
    jsonb_build_object(
      'withdrawal_id', p_withdrawal_id,
      'webhook_event_id', p_webhook_event_id,
      'provider_key', v_wr.provider_key,
      'currency', v_wr.currency
    )
  );

  UPDATE public.wallet_balance_cache
  SET balance_cents = balance_cents + v_wr.amount_cents,
      updated_at = now()
  WHERE user_id = v_wr.user_id;

  UPDATE public.withdrawal_requests
  SET status = 'failed',
      failed_at = now(),
      updated_at = now()
  WHERE id = p_withdrawal_id;

  SELECT balance_cents INTO v_balance FROM public.wallet_balance_cache WHERE user_id = v_wr.user_id;

  RETURN jsonb_build_object(
    'status', 'failed',
    'withdrawal_id', p_withdrawal_id,
    'balance_cents', v_balance,
    'idempotent_replay', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reverse_withdrawal_failed(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- ── RPC: get_payment_config ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_payment_config()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payments_enabled       boolean;
  v_credit_purchases_enabled boolean;
  v_withdrawals_enabled    boolean;
  v_dummy_payments_enabled boolean;
  v_active_purchase_provider jsonb;
  v_active_withdrawal_provider jsonb;
  v_packages               jsonb;
BEGIN
  v_payments_enabled          := COALESCE((public.get_setting('payments_enabled'))::boolean, false);
  v_credit_purchases_enabled := COALESCE((public.get_setting('credit_purchases_enabled'))::boolean, false);
  v_withdrawals_enabled      := COALESCE((public.get_setting('withdrawals_enabled'))::boolean, false);
  v_dummy_payments_enabled   := COALESCE((public.get_setting('dummy_payments_enabled'))::boolean, false);

  SELECT jsonb_build_object(
    'provider_key', pp.provider_key,
    'display_name', pp.display_name,
    'mode', pp.mode,
    'supports_credit_purchase', pp.supports_credit_purchase,
    'supports_withdrawal', pp.supports_withdrawal
  )
  INTO v_active_purchase_provider
  FROM public.payment_providers pp
  WHERE pp.is_active_for_credit_purchase = true AND pp.enabled = true
  LIMIT 1;

  SELECT jsonb_build_object(
    'provider_key', pp.provider_key,
    'display_name', pp.display_name,
    'mode', pp.mode,
    'supports_credit_purchase', pp.supports_credit_purchase,
    'supports_withdrawal', pp.supports_withdrawal
  )
  INTO v_active_withdrawal_provider
  FROM public.payment_providers pp
  WHERE pp.is_active_for_withdrawal = true AND pp.enabled = true
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', cp.id,
    'package_key', cp.package_key,
    'display_name', cp.display_name,
    'amount_cents', cp.amount_cents,
    'credits_cents', cp.credits_cents,
    'currency', cp.currency
  ) ORDER BY cp.display_order), '[]'::jsonb)
  INTO v_packages
  FROM public.credit_packages cp
  WHERE cp.enabled = true;

  RETURN jsonb_build_object(
    'payments_enabled', v_payments_enabled,
    'credit_purchases_enabled', v_credit_purchases_enabled,
    'withdrawals_enabled', v_withdrawals_enabled,
    'dummy_payments_enabled', v_dummy_payments_enabled,
    'active_purchase_provider', COALESCE(v_active_purchase_provider, 'null'::jsonb),
    'active_withdrawal_provider', COALESCE(v_active_withdrawal_provider, 'null'::jsonb),
    'credit_packages', v_packages
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_payment_config() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_payment_config() TO authenticated;

-- ── Confirm topup_wallet remains service-role only ────────────────────────────
REVOKE ALL ON FUNCTION public.topup_wallet(integer, text) FROM PUBLIC, anon, authenticated;