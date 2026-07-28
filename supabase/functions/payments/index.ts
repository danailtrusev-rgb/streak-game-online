import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import type {
  PaymentConfig,
  PaymentOrder,
  WithdrawalRequest,
  WebhookEventPayload,
  CreateCreditOrderRequest,
  CreateWithdrawalRequest,
} from './_shared/paymentTypes.ts';
import {
  createPayment,
  createPayout,
  verifyWebhookSignature,
} from './_shared/dummyProviderClient.ts';

const DUMMY_PROVIDER_KEY = 'dummy';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, x-admin-session',
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

  const providerKey = config.active_purchase_provider?.provider_key;
  if (!providerKey) return errorResponse('No active payment provider', 503);

  if (providerKey === DUMMY_PROVIDER_KEY && !config.dummy_payments_enabled) {
    return errorResponse('Dummy payments are not enabled', 403);
  }

  const pkg = config.credit_packages.find((p) => p.package_key === body.package_key);
  if (!pkg) return errorResponse('Invalid or unavailable package', 400);

  const supabase = getServiceClient();
  const idempotencyKey = crypto.randomUUID();

  // 1. Create STS payment_orders row first (status: pending, no provider_payment_id yet)
  const { data: order, error } = await supabase
    .from('payment_orders')
    .insert({
      user_id: userId,
      provider_key: providerKey,
      provider_payment_id: null,
      status: 'pending',
      package_id: pkg.id,
      amount_cents: pkg.amount_cents,
      credits_cents: pkg.credits_cents,
      currency: pkg.currency,
      checkout_url: null,
      idempotency_key: idempotencyKey,
      provider_meta: {},
    })
    .select()
    .single();

  if (error) return errorResponse(`Failed to create order: ${error.message}`, 500);

  // 2. Call hosted dummy PSP to create the payment
  try {
    const providerResponse = await createPayment({
      payment_order_id: order.id,
      amount_cents: pkg.amount_cents,
      currency: pkg.currency,
      customer: {
        user_id: userId,
      },
      metadata: { source: 'wallet_topup' },
    });

    // 3. Store provider_payment_id on the order
    await supabase
      .from('payment_orders')
      .update({
        provider_payment_id: providerResponse.id,
        provider_meta: { provider_status: providerResponse.status },
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    // Return order without checkout_url — player never sees provider checkout_url
    return jsonResponse({
      order: { ...order, provider_payment_id: providerResponse.id },
      provider_payment_id: providerResponse.id,
      is_dummy: providerKey === DUMMY_PROVIDER_KEY,
    });
  } catch (err) {
    // Provider call failed — mark order as failed
    const errMsg = err instanceof Error ? err.message : 'Provider call failed';
    await supabase
      .from('payment_orders')
      .update({
        status: 'failed',
        failed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        provider_meta: { error: errMsg },
      })
      .eq('id', order.id);

    return errorResponse(`Payment provider error: ${errMsg}`, 502);
  }
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

  const config = await getPaymentConfig();
  if (!config?.payments_enabled) {
    return errorResponse('Payments are not enabled', 403);
  }
  if (!config.withdrawals_enabled) {
    return errorResponse('Withdrawals are not enabled', 403);
  }

  const providerKey = config.active_withdrawal_provider?.provider_key;
  if (!providerKey) return errorResponse('No active withdrawal provider', 503);

  if (providerKey === DUMMY_PROVIDER_KEY && !config.dummy_payments_enabled) {
    return errorResponse('Dummy payments are not enabled', 403);
  }

  const idempotencyKey = crypto.randomUUID();

  const supabase = getServiceClient();

  // 1. Reserve/deduct wallet balance + create withdrawal_requests row (atomic RPC)
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

  // 2. Call hosted dummy PSP to create the payout
  try {
    const providerResponse = await createPayout({
      withdrawal_request_id: withdrawalId,
      amount_cents: body.amount_cents,
      currency: 'EUR',
      destination: { type: 'dummy' },
      metadata: {},
    });

    // 3. Store provider_payout_id and mark as processing
    await supabase
      .from('withdrawal_requests')
      .update({
        provider_payout_id: providerResponse.id,
        status: 'processing',
        processing_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', withdrawalId);

    return jsonResponse({
      withdrawal_id: withdrawalId,
      provider_payout_id: providerResponse.id,
      status: 'processing',
      balance_cents: result.balance_cents,
      is_dummy: providerKey === DUMMY_PROVIDER_KEY,
    });
  } catch (err) {
    // Provider payout creation failed — reverse wallet reservation
    const errMsg = err instanceof Error ? err.message : 'Provider payout call failed';

    await supabase.rpc('cancel_withdrawal_provider_error', {
      p_withdrawal_id: withdrawalId,
      p_reason: errMsg,
    });

    return errorResponse(`Withdrawal provider error: ${errMsg}`, 502);
  }
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

// ── Webhook handlers ──────────────────────────────────────────────────────────

async function handleDummyWebhookPayment(req: Request): Promise<Response> {
  const rawBody = await req.text();
  const signature = req.headers.get('x-sts-dummy-signature');

  const sigValid = await verifyWebhookSignature(rawBody, signature);
  if (!sigValid) return errorResponse('Invalid signature', 401);

  const payload = JSON.parse(rawBody) as WebhookEventPayload;

  if (!payload.event_id || !payload.event_type) {
    return errorResponse('Missing event_id or event_type', 400);
  }

  if (!payload.payment_order_id) {
    return errorResponse('Missing payment_order_id', 400);
  }

  const supabase = getServiceClient();

  const { data: rpcResult, error: rpcError } = await supabase.rpc('process_payment_webhook', {
    p_provider_key: DUMMY_PROVIDER_KEY,
    p_event_id: payload.event_id,
    p_event_type: payload.event_type,
    p_payload: payload,
    p_payment_order_id: payload.payment_order_id,
    p_provider_payment_id: payload.provider_payment_id ?? '',
    p_amount_cents: payload.amount_cents ?? null,
    p_currency: payload.currency ?? '',
  });

  if (rpcError) {
    return errorResponse(`Webhook processing failed: ${rpcError.message}`, 500);
  }

  const result = rpcResult as Record<string, unknown>;
  const status = result.status as string;

  // Duplicate event_id → 200 (idempotent, no duplicate wallet movement)
  if (status === 'duplicate') {
    return jsonResponse({ status: 'already_processed', event_id: payload.event_id });
  }

  // Success or already-processed → 200
  return jsonResponse({ status: 'processed', event_id: payload.event_id, result });
}

async function handleDummyWebhookPayout(req: Request): Promise<Response> {
  const rawBody = await req.text();
  const signature = req.headers.get('x-sts-dummy-signature');

  const sigValid = await verifyWebhookSignature(rawBody, signature);
  if (!sigValid) return errorResponse('Invalid signature', 401);

  const payload = JSON.parse(rawBody) as WebhookEventPayload;

  if (!payload.event_id || !payload.event_type) {
    return errorResponse('Missing event_id or event_type', 400);
  }

  if (!payload.withdrawal_request_id) {
    return errorResponse('Missing withdrawal_request_id', 400);
  }

  const supabase = getServiceClient();

  const { data: rpcResult, error: rpcError } = await supabase.rpc('process_payout_webhook', {
    p_provider_key: DUMMY_PROVIDER_KEY,
    p_event_id: payload.event_id,
    p_event_type: payload.event_type,
    p_payload: payload,
    p_withdrawal_request_id: payload.withdrawal_request_id,
    p_provider_payout_id: payload.provider_payout_id ?? '',
    p_amount_cents: payload.amount_cents ?? null,
    p_currency: payload.currency ?? '',
  });

  if (rpcError) {
    return errorResponse(`Webhook processing failed: ${rpcError.message}`, 500);
  }

  const result = rpcResult as Record<string, unknown>;
  const status = result.status as string;

  if (status === 'duplicate') {
    return jsonResponse({ status: 'already_processed', event_id: payload.event_id });
  }

  return jsonResponse({ status: 'processed', event_id: payload.event_id, result });
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

    // Webhook routes (no player JWT, HMAC signature-verified)
    if (path === '/webhooks/dummy/payment' && req.method === 'POST') {
      return await handleDummyWebhookPayment(req);
    }
    if (path === '/webhooks/dummy/payout' && req.method === 'POST') {
      return await handleDummyWebhookPayout(req);
    }

    // Internal STS simulation routes — disabled (410 Gone)
    // Use the hosted dummy PSP dashboard to resolve pending payments/payouts.
    if (path === '/dummy/simulate-payment' && req.method === 'POST') {
      return errorResponse('Gone: Use the hosted dummy PSP dashboard to resolve pending payments.', 410);
    }
    if (path === '/dummy/simulate-payout' && req.method === 'POST') {
      return errorResponse('Gone: Use the hosted dummy PSP dashboard to resolve pending payouts.', 410);
    }

    // Player-authenticated routes (require player JWT)
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

    return errorResponse('Not found', 404);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return errorResponse(msg, 500);
  }
});
