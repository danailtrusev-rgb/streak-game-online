/**
 * Server-side client for the hosted dummy PSP.
 *
 * Uses DUMMY_PROVIDER_BASE_URL + DUMMY_PROVIDER_API_KEY to create
 * payments and payouts.  Never exposed to the frontend — no VITE_ prefix.
 */

export interface CreatePaymentRequest {
  payment_order_id: string;
  amount_cents: number;
  currency: string;
  customer: { user_id: string; email?: string };
  metadata: Record<string, unknown>;
}

export interface CreatePayoutRequest {
  withdrawal_request_id: string;
  amount_cents: number;
  currency: string;
  destination: { type: string };
  metadata: Record<string, unknown>;
}

export interface ProviderPaymentResponse {
  object: string;
  id: string;
  payment_order_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  failure_reason: string | null;
  checkout_url: string;
  created_at: string;
  updated_at: string;
}

export interface ProviderPayoutResponse {
  object: string;
  id: string;
  withdrawal_request_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProviderErrorResponse {
  error: {
    type: string;
    code: string;
    message: string;
    param?: string;
  };
}

function getBaseUrl(): string {
  const url = Deno.env.get('DUMMY_PROVIDER_BASE_URL');
  if (!url) throw new Error('DUMMY_PROVIDER_BASE_URL is not configured');
  return url.replace(/\/$/, '');
}

function getApiKey(): string {
  const key = Deno.env.get('DUMMY_PROVIDER_API_KEY');
  if (!key) throw new Error('DUMMY_PROVIDER_API_KEY is not configured');
  return key;
}

function getWebhookSecret(): string {
  const secret = Deno.env.get('DUMMY_PROVIDER_WEBHOOK_SECRET');
  if (!secret) throw new Error('DUMMY_PROVIDER_WEBHOOK_SECRET is not configured');
  return secret;
}

function authHeaders(idempotencyKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${getApiKey()}`,
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  return headers;
}

export async function createPayment(req: CreatePaymentRequest): Promise<ProviderPaymentResponse> {
  const res = await fetch(`${getBaseUrl()}/v1/payments`, {
    method: 'POST',
    headers: authHeaders(req.payment_order_id),
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null) as ProviderErrorResponse | null;
    const msg = body?.error?.message ?? `Provider returned ${res.status}`;
    throw new Error(`createPayment failed: ${msg}`);
  }

  return await res.json() as ProviderPaymentResponse;
}

export async function createPayout(req: CreatePayoutRequest): Promise<ProviderPayoutResponse> {
  const res = await fetch(`${getBaseUrl()}/v1/payouts`, {
    method: 'POST',
    headers: authHeaders(req.withdrawal_request_id),
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null) as ProviderErrorResponse | null;
    const msg = body?.error?.message ?? `Provider returned ${res.status}`;
    throw new Error(`createPayout failed: ${msg}`);
  }

  return await res.json() as ProviderPayoutResponse;
}

/**
 * Verify an incoming webhook signature against the raw request body.
 * Uses constant-time comparison.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!signatureHeader) return false;

  const secret = getWebhookSecret();
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(rawBody));
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const provided = signatureHeader;

  if (expected.length !== provided.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}
