import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import type {
  PaymentConfig,
  PaymentOrder,
  WithdrawalRequest,
  WebhookEventPayload,
  CreateCreditOrderRequest,
  CreateWithdrawalRequest,
  SimulatePaymentRequest,
  SimulatePayoutRequest,
} from './_shared/paymentTypes.ts';
import {
  verifySignature,
  generateDummyPaymentId,
  generateDummyPayoutId,
  buildDummyCheckoutUrl,
  buildPaymentSucceededWebhook,
  buildPaymentFailedWebhook,
  buildPayoutPaidWebhook,
  buildPayoutFailedWebhook,
  DUMMY_PROVIDER_KEY,
} from './_shared/dummyProvider.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

function getServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );
}

async function getUserFromRequest(req: Request): Promise<{ id: string } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: { user } } = await supabase.auth.getUser(token);
  return user ? { id: user.id } : null;
}

async function getPaymentConfig(): Promise<PaymentConfig | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc('get_payment_config');
  if (error) return null;
  return data as PaymentConfig;
}

async function checkWithdrawalsEnabled(): Promise<boolean> {
  const config = await getPaymentConfig();
  return config?.withdrawals_enabled === true;
}

// ── Route handlers ────────────────────────────────────────────────────────────

async function handleGetConfig(): Promise<Response> {
  const config = await getPaymentConfig();
  if (!config) return errorResponse('Failed to load payment config', 500);
  return jsonResponse(config);
}

async function handleCreateCreditOrder(req: Request, userId: string): Promise<Response> {
  const body = await req.json() as CreateCreditOrderRequest;
  if (!body.package_key) return errorResponse('Missing package_key', 400);

  const config = await getPaymentConfig();
  if (!config?.payments_enabled || !config.credit_purchases_enabled) {
    return errorResponse('Credit purchases are not enabled', 403);
  }

  const pkg = config.credit_packages.find((p) => p.package_key === body.package_key);
  if (!pkg) return errorResponse('Invalid or unavailable package', 400);

  const providerKey = config.active_purchase_provider?.provider_key;
  if (!providerKey) return errorResponse('No active payment provider', 503);

  const supabase = getServiceClient();
  const idempotencyKey = crypto.randomUUID();
  const providerPaymentId = generateDummyPaymentId();
  const checkoutUrl = buildDummyCheckoutUrl(providerPaymentId);

  const { data: order, error } = await supabase
    .from('payment_orders')
    .insert({
      user_id: userId,
      provider_key: providerKey,
      provider_payment_id: providerPaymentId,
      status: 'pending',
      package_id: pkg.id,
      amount_cents: pkg.amount_cents,
      credits_cents: pkg.credits_cents,
      currency: pkg.currency,
      checkout_url: checkoutUrl,
      idempotency_key: idempotencyKey,
      provider_meta: { simulated: true },
    })
    .select()
    .single();

  if (error) return errorResponse(`Failed to create order: ${error.message}`, 500);

  return jsonResponse({
    order,
    checkout_url: checkoutUrl,
    provider_payment_id: providerPaymentId,
    is_dummy: providerKey === DUMMY_PROVIDER_KEY,
  });
}

async function handleGetCreditOrders(userId: string): Promise<Response> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('payment_orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ orders: data as PaymentOrder[] });
}

async function handleGetCreditOrder(userId: string, orderId: string): Promise<Response> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('payment_orders')
    .select('*')
    .eq('id', orderId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);
  if (!data) return errorResponse('Order not found', 404);
  return jsonResponse({ order: data as PaymentOrder });
}

async function handleCreateWithdrawal(req: Request, userId: string): Promise<Response> {
  const body = await req.json() as CreateWithdrawalRequest;

  if (!body.amount_cents || body.amount_cents <= 0) {
    return errorResponse('Invalid amount', 400);
  }

  const withdrawalsEnabled = await checkWithdrawalsEnabled();
  if (!withdrawalsEnabled) {
    return errorResponse('Withdrawals are not enabled', 403);
  }

  const config = await getPaymentConfig();
  const providerKey = config?.active_withdrawal_provider?.provider_key;
  if (!providerKey) return errorResponse('No active withdrawal provider', 503);

  const idempotencyKey = crypto.randomUUID();

  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc('create_withdrawal_request', {
    p_user_id: userId,
    p_amount_cents: body.amount_cents,
    p_idempotency_key: idempotencyKey,
    p_provider_key: providerKey,
    p_destination_type: body.destination_type ?? 'dummy',
    p_destination_label: body.destination_label ?? 'Dummy Test Account',
  });

  if (error) return errorResponse(error.message, 500);

  const result = data as Record<string, unknown>;
  const withdrawalId = result.withdrawal_id as string;
  const payoutId = generateDummyPayoutId();

  await supabase
    .from('withdrawal_requests')
    .update({ provider_payout_id: payoutId, status: 'processing', processing_at: new Date().toISOString() })
    .eq('id', withdrawalId);

  return jsonResponse({
    withdrawal_id: withdrawalId,
    provider_payout_id: payoutId,
    status: 'processing',
    balance_cents: result.balance_cents,
    is_dummy: providerKey === DUMMY_PROVIDER_KEY,
  });
}

async function handleGetWithdrawalRequests(userId: string): Promise<Response> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ withdrawals: data as WithdrawalRequest[] });
}

async function handleDummyWebhookPayment(req: Request): Promise<Response> {
  const rawBody = await req.text();
  const signature = req.headers.get('x-sts-dummy-signature');
  const timestamp = req.headers.get('x-sts-dummy-timestamp');

  const sigValid = await verifySignature(rawBody, signature, timestamp);
  if (!sigValid) return errorResponse('Invalid signature', 401);

  const payload = JSON.parse(rawBody) as WebhookEventPayload;

  if (!payload.event_id || !payload.event_type) {
    return errorResponse('Missing event_id or event_type', 400);
  }

  const supabase = getServiceClient();

  const { data: existingEvent } = await supabase
    .from('payment_webhook_events')
    .select('id, processed')
    .eq('provider_key', DUMMY_PROVIDER_KEY)
    .eq('event_id', payload.event_id)
    .maybeSingle();

  if (existingEvent?.processed) {
    return jsonResponse({ status: 'already_processed', event_id: payload.event_id });
  }

  const { data: webhookEvent, error: webhookError } = await supabase
    .from('payment_webhook_events')
    .insert({
      provider_key: DUMMY_PROVIDER_KEY,
      event_id: payload.event_id,
      event_type: payload.event_type,
      payload: payload,
      signature_valid: true,
    })
    .select()
    .single();

  if (webhookError) {
    if (webhookError.code === '23505') {
      return jsonResponse({ status: 'already_processed', event_id: payload.event_id });
    }
    return errorResponse(`Webhook log failed: ${webhookError.message}`, 500);
  }

  const eventId = webhookEvent.id;

  try {
    if (payload.event_type === 'payment.succeeded') {
      if (!payload.payment_order_id) throw new Error('Missing payment_order_id');

      const { data: order } = await supabase
        .from('payment_orders')
        .select('amount_cents, currency, provider_payment_id')
        .eq('id', payload.payment_order_id)
        .maybeSingle();

      if (!order) throw new Error('Order not found');

      if (payload.provider_payment_id && order.provider_payment_id !== payload.provider_payment_id) {
        throw new Error('Provider payment ID mismatch');
      }

      if (payload.amount_cents && payload.amount_cents !== order.amount_cents) {
        throw new Error('Amount mismatch');
      }

      const { error: rpcError } = await supabase.rpc('finalize_credit_purchase', {
        p_order_id: payload.payment_order_id,
        p_webhook_event_id: eventId,
      });

      if (rpcError) throw rpcError;
    } else if (payload.event_type === 'payment.failed') {
      if (!payload.payment_order_id) throw new Error('Missing payment_order_id');

      await supabase
        .from('payment_orders')
        .update({ status: 'failed', failed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', payload.payment_order_id);
    } else {
      throw new Error(`Unsupported event_type: ${payload.event_type}`);
    }

    await supabase
      .from('payment_webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('id', eventId);

    return jsonResponse({ status: 'processed', event_id: payload.event_id });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    await supabase
      .from('payment_webhook_events')
      .update({ processing_error: errMsg })
      .eq('id', eventId);
    return errorResponse(`Webhook processing failed: ${errMsg}`, 500);
  }
}

async function handleDummyWebhookPayout(req: Request): Promise<Response> {
  const rawBody = await req.text();
  const signature = req.headers.get('x-sts-dummy-signature');
  const timestamp = req.headers.get('x-sts-dummy-timestamp');

  const sigValid = await verifySignature(rawBody, signature, timestamp);
  if (!sigValid) return errorResponse('Invalid signature', 401);

  const payload = JSON.parse(rawBody) as WebhookEventPayload;

  if (!payload.event_id || !payload.event_type) {
    return errorResponse('Missing event_id or event_type', 400);
  }

  const supabase = getServiceClient();

  const { data: existingEvent } = await supabase
    .from('payment_webhook_events')
    .select('id, processed')
    .eq('provider_key', DUMMY_PROVIDER_KEY)
    .eq('event_id', payload.event_id)
    .maybeSingle();

  if (existingEvent?.processed) {
    return jsonResponse({ status: 'already_processed', event_id: payload.event_id });
  }

  const { data: webhookEvent, error: webhookError } = await supabase
    .from('payment_webhook_events')
    .insert({
      provider_key: DUMMY_PROVIDER_KEY,
      event_id: payload.event_id,
      event_type: payload.event_type,
      payload: payload,
      signature_valid: true,
    })
    .select()
    .single();

  if (webhookError) {
    if (webhookError.code === '23505') {
      return jsonResponse({ status: 'already_processed', event_id: payload.event_id });
    }
    return errorResponse(`Webhook log failed: ${webhookError.message}`, 500);
  }

  const eventId = webhookEvent.id;

  try {
    if (payload.event_type === 'payout.paid') {
      if (!payload.withdrawal_request_id) throw new Error('Missing withdrawal_request_id');

      const { data: wr } = await supabase
        .from('withdrawal_requests')
        .select('amount_cents, currency, provider_payout_id')
        .eq('id', payload.withdrawal_request_id)
        .maybeSingle();

      if (!wr) throw new Error('Withdrawal request not found');

      if (payload.provider_payout_id && wr.provider_payout_id !== payload.provider_payout_id) {
        throw new Error('Provider payout ID mismatch');
      }

      if (payload.amount_cents && payload.amount_cents !== wr.amount_cents) {
        throw new Error('Amount mismatch');
      }

      const { error: rpcError } = await supabase.rpc('finalize_withdrawal_paid', {
        p_withdrawal_id: payload.withdrawal_request_id,
        p_webhook_event_id: eventId,
      });

      if (rpcError) throw rpcError;
    } else if (payload.event_type === 'payout.failed') {
      if (!payload.withdrawal_request_id) throw new Error('Missing withdrawal_request_id');

      const { error: rpcError } = await supabase.rpc('reverse_withdrawal_failed', {
        p_withdrawal_id: payload.withdrawal_request_id,
        p_webhook_event_id: eventId,
      });

      if (rpcError) throw rpcError;
    } else {
      throw new Error(`Unsupported event_type: ${payload.event_type}`);
    }

    await supabase
      .from('payment_webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('id', eventId);

    return jsonResponse({ status: 'processed', event_id: payload.event_id });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    await supabase
      .from('payment_webhook_events')
      .update({ processing_error: errMsg })
      .eq('id', eventId);
    return errorResponse(`Webhook processing failed: ${errMsg}`, 500);
  }
}

async function handleSimulatePayment(req: Request, userId: string): Promise<Response> {
  const body = await req.json() as SimulatePaymentRequest;
  if (!body.order_id) return errorResponse('Missing order_id', 400);
  if (!body.outcome || !['succeeded', 'failed'].includes(body.outcome)) {
    return errorResponse('Invalid outcome', 400);
  }

  const supabase = getServiceClient();
  const { data: order } = await supabase
    .from('payment_orders')
    .select('id, provider_payment_id, amount_cents, currency, status, user_id')
    .eq('id', body.order_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!order) return errorResponse('Order not found', 404);
  if (order.status !== 'pending') return errorResponse('Order is not pending', 400);

  let webhookPayload: WebhookEventPayload;
  if (body.outcome === 'succeeded') {
    webhookPayload = buildPaymentSucceededWebhook(order.id, order.provider_payment_id, order.amount_cents, order.currency);
  } else {
    webhookPayload = buildPaymentFailedWebhook(order.id, order.provider_payment_id);
  }

  const webhookBody = JSON.stringify(webhookPayload);
  const { signPayload } = await import('./_shared/dummyProvider.ts');
  const signature = await signPayload(webhookBody);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/payments/webhooks/dummy/payment`;
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sts-dummy-signature': signature,
      'x-sts-dummy-timestamp': timestamp,
    },
    body: webhookBody,
  });

  const result = await response.json();
  return jsonResponse({ simulated: true, outcome: body.outcome, webhook_result: result });
}

async function handleSimulatePayout(req: Request, userId: string): Promise<Response> {
  const body = await req.json() as SimulatePayoutRequest;
  if (!body.withdrawal_id) return errorResponse('Missing withdrawal_id', 400);
  if (!body.outcome || !['paid', 'failed'].includes(body.outcome)) {
    return errorResponse('Invalid outcome', 400);
  }

  const supabase = getServiceClient();
  const { data: wr } = await supabase
    .from('withdrawal_requests')
    .select('id, provider_payout_id, amount_cents, currency, status, user_id')
    .eq('id', body.withdrawal_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!wr) return errorResponse('Withdrawal not found', 404);
  if (!['processing', 'requested'].includes(wr.status)) return errorResponse('Withdrawal is not processing', 400);

  let webhookPayload: WebhookEventPayload;
  if (body.outcome === 'paid') {
    webhookPayload = buildPayoutPaidWebhook(wr.id, wr.provider_payout_id, wr.amount_cents, wr.currency);
  } else {
    webhookPayload = buildPayoutFailedWebhook(wr.id, wr.provider_payout_id);
  }

  const webhookBody = JSON.stringify(webhookPayload);
  const { signPayload } = await import('./_shared/dummyProvider.ts');
  const signature = await signPayload(webhookBody);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/payments/webhooks/dummy/payout`;
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sts-dummy-signature': signature,
      'x-sts-dummy-timestamp': timestamp,
    },
    body: webhookBody,
  });

  const result = await response.json();
  return jsonResponse({ simulated: true, outcome: body.outcome, webhook_result: result });
}

// ── Main router ────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/payments/, '');

    // Public routes (no auth)
    if (path === '/config' && req.method === 'GET') {
      return await handleGetConfig();
    }

    // Webhook routes (no player JWT, signature-verified)
    if (path === '/webhooks/dummy/payment' && req.method === 'POST') {
      return await handleDummyWebhookPayment(req);
    }
    if (path === '/webhooks/dummy/payout' && req.method === 'POST') {
      return await handleDummyWebhookPayout(req);
    }

    // Authenticated routes
    const user = await getUserFromRequest(req);
    if (!user) return errorResponse('Unauthorized', 401);

    if (path === '/create-credit-order' && req.method === 'POST') {
      return await handleCreateCreditOrder(req, user.id);
    }
    if (path === '/credit-orders' && req.method === 'GET') {
      return await handleGetCreditOrders(user.id);
    }
    if (path.startsWith('/credit-orders/') && req.method === 'GET') {
      const orderId = path.split('/')[2];
      return await handleGetCreditOrder(user.id, orderId);
    }
    if (path === '/create-withdrawal-request' && req.method === 'POST') {
      return await handleCreateWithdrawal(req, user.id);
    }
    if (path === '/withdrawal-requests' && req.method === 'GET') {
      return await handleGetWithdrawalRequests(user.id);
    }
    if (path === '/dummy/simulate-payment' && req.method === 'POST') {
      return await handleSimulatePayment(req, user.id);
    }
    if (path === '/dummy/simulate-payout' && req.method === 'POST') {
      return await handleSimulatePayout(req, user.id);
    }

    return errorResponse('Not found', 404);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return errorResponse(msg, 500);
  }
});
