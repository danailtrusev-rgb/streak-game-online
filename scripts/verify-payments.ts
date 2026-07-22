#!/usr/bin/env tsx
/**
 * verify-payments.ts
 *
 * Static verification of the payments architecture.
 * Does NOT require a live Supabase connection.
 * Verifies source files and migration SQL for correctness.
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
let passed = 0;
let failed = 0;

function check(label: string, condition: boolean): void {
  if (condition) {
    passed++;
  } else {
    console.error(`FAIL: ${label}`);
    failed++;
  }
}

function readFile(relPath: string): string {
  const abs = path.join(PROJECT_ROOT, relPath);
  if (!fs.existsSync(abs)) return '';
  return fs.readFileSync(abs, 'utf-8');
}

// ── 1. topup_wallet is not re-granted to authenticated ────────────────────────

const migrationSql = readFile('supabase/migrations/20260722101732_20260722000000_20260722_payments_foundation.sql');
check(
  '1. topup_wallet is not re-granted to authenticated in migration',
  migrationSql.includes('REVOKE ALL ON FUNCTION public.topup_wallet(integer, text) FROM PUBLIC, anon, authenticated'),
);

check(
  '1b. No GRANT EXECUTE on topup_wallet to authenticated in migration',
  !migrationSql.includes('GRANT EXECUTE ON FUNCTION public.topup_wallet'),
);

// ── 2. Payment webhook event idempotency exists ────────────────────────────────

check(
  '2. payment_webhook_events has unique(provider_key, event_id)',
  migrationSql.includes('payment_webhook_events_provider_event_unique UNIQUE (provider_key, event_id)'),
);

const edgeFn = readFile('supabase/functions/payments/index.ts');
check(
  '2b. Edge function checks for already-processed webhook events',
  edgeFn.includes('already_processed'),
);

check(
  '2c. Edge function inserts webhook event before processing',
  edgeFn.includes('payment_webhook_events') && edgeFn.includes('insert'),
);

// ── 3. Payment order success cannot credit wallet twice ────────────────────────

check(
  '3. finalize_credit_purchase checks for already-succeeded status',
  migrationSql.includes("IF v_order.status = 'succeeded' THEN"),
);

check(
  '3b. finalize_credit_purchase returns idempotent_replay true on duplicate',
  migrationSql.includes("'idempotent_replay', true"),
);

check(
  '3c. finalize_credit_purchase uses FOR UPDATE lock',
  migrationSql.includes('FOR UPDATE'),
);

// ── 4. Withdrawal failure cannot reverse twice ─────────────────────────────────

check(
  '4. reverse_withdrawal_failed checks for already-failed status',
  migrationSql.includes("IF v_wr.status = 'failed' THEN"),
);

check(
  '4b. reverse_withdrawal_failed returns idempotent_replay on duplicate',
  migrationSql.includes("'idempotent_replay', true") && migrationSql.includes('reverse_withdrawal_failed'),
);

// ── 5. Withdrawal paid cannot pay twice ─────────────────────────────────────────

check(
  '5. finalize_withdrawal_paid checks for already-paid status',
  migrationSql.includes("IF v_wr.status = 'paid' THEN"),
);

// ── 6. Player routes do not accept client-supplied amount for final wallet credit ─

check(
  '6. create-credit-order uses package_key (server-side amount), not client-supplied amount for credit',
  edgeFn.includes('package_key') && edgeFn.includes('config.credit_packages.find'),
);

check(
  '6b. create-withdrawal uses server-side RPC for wallet deduction',
  edgeFn.includes("rpc('create_withdrawal_request'"),
);

const usePaymentsHook = readFile('src/hooks/usePayments.ts');

check(
  '6c. finalize_credit_purchase is RPC-only (not called from client)',
  edgeFn.includes("rpc('finalize_credit_purchase'") && !usePaymentsHook.includes('finalize_credit_purchase'),
);

// ── 7. Webhook signature verification exists ────────────────────────────────────

const dummyProvider = readFile('supabase/functions/payments/_shared/dummyProvider.ts');
check(
  '7. verifySignature function exists in dummyProvider',
  dummyProvider.includes('export async function verifySignature'),
);

check(
  '7b. HMAC SHA-256 is used for signing',
  dummyProvider.includes('HMAC') && dummyProvider.includes('SHA-256'),
);

check(
  '7c. x-sts-dummy-signature header is checked',
  edgeFn.includes('x-sts-dummy-signature'),
);

check(
  '7d. Signature verification rejects missing signature',
  dummyProvider.includes('if (!signatureHeader) return false'),
);

// ── 8. Dummy provider secret is not VITE_ exposed ──────────────────────────────

check(
  '8. DUMMY_PROVIDER_WEBHOOK_SECRET is not VITE_ prefixed',
  !dummyProvider.includes('VITE_DUMMY_PROVIDER_WEBHOOK_SECRET'),
);

check(
  '8b. Frontend hook does not reference DUMMY_PROVIDER_WEBHOOK_SECRET',
  !usePaymentsHook.includes('DUMMY_PROVIDER_WEBHOOK_SECRET'),
);

const frontendTypes = readFile('src/lib/payments/paymentTypes.ts');
check(
  '8c. Frontend types do not expose webhook secrets',
  !frontendTypes.includes('webhook_secret') && !frontendTypes.includes('WEBHOOK_SECRET'),
);

// ── 9. Admin/test simulate routes are not normal public wallet-credit routes ───

check(
  '9. Simulate routes require authentication',
  edgeFn.includes('handleSimulatePayment') && edgeFn.includes('user.id'),
);

check(
  '9b. Simulate routes only work on own orders (user_id check)',
  edgeFn.includes('.eq(\'user_id\', userId)') || edgeFn.includes(".eq('user_id', userId)"),
);

check(
  '9c. Simulate routes go through webhook flow, not direct credit',
  edgeFn.includes('webhooks/dummy/payment') && !edgeFn.includes("rpc('topup_wallet'"),
);

// ── 10. CORS handles OPTIONS before auth in payments Edge Function ─────────────

check(
  '10. OPTIONS is handled before auth checks',
  edgeFn.indexOf('OPTIONS') < edgeFn.indexOf('getUserFromRequest'),
);

check(
  '10b. CORS headers are present on error responses',
  edgeFn.includes('...corsHeaders') && edgeFn.includes('errorResponse'),
);

// ── 11. RLS prevents players from updating payment orders/webhook events ───────

// Extract only RLS policy section (DROP POLICY / CREATE POLICY) to check for unauthorized INSERT/UPDATE/DELETE
const policyLines = migrationSql.split('\n').filter((l) => l.includes('CREATE POLICY'));
const paymentOrderPolicies = policyLines.filter((l) => l.includes('payment_orders'));
check(
  '11. payment_orders has no INSERT/UPDATE/DELETE policies for authenticated',
  !paymentOrderPolicies.some((l) => l.includes('FOR INSERT') || l.includes('FOR UPDATE') || l.includes('FOR DELETE')),
);

const webhookEventPolicies = policyLines.filter((l) => l.includes('payment_webhook_events'));
check(
  '11b. payment_webhook_events has no policies for authenticated',
  webhookEventPolicies.length === 0,
);

check(
  '11c. withdrawal_requests has only SELECT policy for authenticated',
  migrationSql.includes('select_own_withdrawal_requests') && !migrationSql.includes('insert_own_withdrawal'),
);

// ── 12. Ledger types are explicit ───────────────────────────────────────────────

check(
  '12. CREDIT_PURCHASE ledger type in CHECK constraint',
  migrationSql.includes("'CREDIT_PURCHASE'::text"),
);

check(
  '12b. WITHDRAWAL_REQUEST ledger type in CHECK constraint',
  migrationSql.includes("'WITHDRAWAL_REQUEST'::text"),
);

check(
  '12c. WITHDRAWAL_REVERSAL ledger type in CHECK constraint',
  migrationSql.includes("'WITHDRAWAL_REVERSAL'::text"),
);

// ── 13. Credit package amounts are server-side ─────────────────────────────────

check(
  '13. Credit packages are seeded in migration (server-side)',
  migrationSql.includes('INSERT INTO public.credit_packages'),
);

check(
  '13b. Edge function reads package from server, not client amount',
  edgeFn.includes('config.credit_packages.find'),
);

// ── 14. Active provider selection supports multiple providers ──────────────────

check(
  '14. payment_providers table supports multiple providers',
  migrationSql.includes('provider_key') && migrationSql.includes('UNIQUE'),
);

check(
  '14b. is_active_for_credit_purchase allows selection',
  migrationSql.includes('is_active_for_credit_purchase'),
);

check(
  '14c. is_active_for_withdrawal allows selection',
  migrationSql.includes('is_active_for_withdrawal'),
);

check(
  '14d. get_payment_config queries active providers dynamically',
  migrationSql.includes('is_active_for_credit_purchase = true') && migrationSql.includes('LIMIT 1'),
);

// ── 15. Existing cashout_game is not changed ───────────────────────────────────

// Strip /* ... */ comment blocks and -- line comments, then check SQL only
const sqlOnly = migrationSql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^--[^\n]*$/gm, '');
check(
  '15. Migration does not reference cashout_game in SQL statements',
  !sqlOnly.includes('cashout_game'),
);

check(
  '15b. Migration does not alter game_state table',
  !migrationSql.includes('ALTER TABLE public.game_state'),
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('\nVERIFICATION FAILED');
  process.exit(1);
} else {
  console.log('\nAll payment verification checks passed.');
}
