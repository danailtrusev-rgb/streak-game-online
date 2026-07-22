import type { WebhookEventPayload } from './paymentTypes.ts';

const DUMMY_PROVIDER_KEY = 'dummy';

function getWebhookSecret(): string {
  const secret = Deno.env.get('DUMMY_PROVIDER_WEBHOOK_SECRET');
  if (!secret) {
    return 'dummy-dev-secret-not-configured';
  }
  return secret;
}

async function hmacSha256(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  const bytes = new Uint8Array(sig);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function signPayload(payload: string): Promise<string> {
  return hmacSha256(getWebhookSecret(), payload);
}

export async function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  timestampHeader: string | null,
): Promise<boolean> {
  if (!signatureHeader) return false;

  const secret = getWebhookSecret();
  const timestamp = timestampHeader ?? '';
  const signedPayload = timestamp ? `${timestamp}.${rawBody}` : rawBody;
  const expected = await hmacSha256(secret, signedPayload);

  if (expected !== signatureHeader) return false;

  if (timestampHeader) {
    const ts = parseInt(timestampHeader, 10);
    if (isNaN(ts)) return false;
    const now = Math.floor(Date.now() / 1000);
    const maxAge = 300;
    if (Math.abs(now - ts) > maxAge) return false;
  }

  return true;
}

export function generateDummyPaymentId(): string {
  return `dummy_pay_${crypto.randomUUID()}`;
}

export function generateDummyPayoutId(): string {
  return `dummy_payout_${crypto.randomUUID()}`;
}

export function buildDummyCheckoutUrl(orderId: string): string {
  return `/wallet?dummy_checkout=${orderId}`;
}

export function buildPaymentSucceededWebhook(orderId: string, paymentId: string, amountCents: number, currency: string): WebhookEventPayload {
  return {
    event_id: `dummy_evt_${crypto.randomUUID()}`,
    event_type: 'payment.succeeded',
    provider_payment_id: paymentId,
    payment_order_id: orderId,
    amount_cents: amountCents,
    currency,
    status: 'succeeded',
  };
}

export function buildPaymentFailedWebhook(orderId: string, paymentId: string): WebhookEventPayload {
  return {
    event_id: `dummy_evt_${crypto.randomUUID()}`,
    event_type: 'payment.failed',
    provider_payment_id: paymentId,
    payment_order_id: orderId,
    status: 'failed',
    failure_reason: 'dummy_failure',
  };
}

export function buildPayoutPaidWebhook(withdrawalId: string, payoutId: string, amountCents: number, currency: string): WebhookEventPayload {
  return {
    event_id: `dummy_evt_payout_${crypto.randomUUID()}`,
    event_type: 'payout.paid',
    provider_payout_id: payoutId,
    withdrawal_request_id: withdrawalId,
    amount_cents: amountCents,
    currency,
    status: 'paid',
  };
}

export function buildPayoutFailedWebhook(withdrawalId: string, payoutId: string): WebhookEventPayload {
  return {
    event_id: `dummy_evt_payout_${crypto.randomUUID()}`,
    event_type: 'payout.failed',
    provider_payout_id: payoutId,
    withdrawal_request_id: withdrawalId,
    status: 'failed',
    failure_reason: 'dummy_failure',
  };
}

export { DUMMY_PROVIDER_KEY };
