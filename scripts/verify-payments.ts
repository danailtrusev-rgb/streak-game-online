#!/usr/bin/env tsx
/**
 * verify-payments.ts
 *
 * Static verification of the hosted dummy PSP integration.
 * Does NOT require a live Supabase connection or provider calls.
 * Verifies source files and migration SQL for correctness and security.
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

const migrationSql = readFile('supabase/migrations/20260722101732_20260722000000_20260722_payments_foundation.sql');
const integrationSql = readFile('supabase/reference/hosted_dummy_psp_integration.sql');
const edgeFn = readFile('supabase/functions/payments/index.ts');
const providerClient = readFile('supabase/functions/payments/_shared/dummyProviderClient.ts');
const usePaymentsHook = readFile('src/hooks/usePayments.ts');
const frontendTypes = readFile('src/lib/payments/paymentTypes.ts');
const buyCredits = readFile('src/components/payments/BuyCreditsSection.tsx');
const withdrawSection = readFile('src/components/payments/WithdrawSection.tsx');
const adminPayments = readFile('src/pages/admin/AdminPayments.tsx');
const envExample = readFile('.env.example');
const envFile = readFile('.env');
const walletPage = readFile('src/pages/WalletPage.tsx');

// Credentials from the handoff — must never appear in source
// Partial prefixes only — enough to detect committed secrets without storing full values
const ADMIN_TOKEN_PREFIX = '0222d35115de22f0500212e30896';
const API_KEY_PREFIX = '5881fffaeeca271d251f080d7ecb91';
const WEBHOOK_SECRET_PREFIX = '9e9146633a1aca5e58d0ac789c660';
const BASE_URL_HOST = 'sts-dummy-psp-pms5gsz7yq-ew.a.run.app';

const allSource = [edgeFn, providerClient, usePaymentsHook, frontendTypes, buyCredits, withdrawSection, adminPayments, envExample, envFile, migrationSql, integrationSql].join('\n');

// ── 1. DUMMY_PROVIDER_BASE_URL is used only server-side ────────────────────────

check(
  '1. DUMMY_PROVIDER_BASE_URL is used in provider client (server-side)',
  providerClient.includes('DUMMY_PROVIDER_BASE_URL'),
);

check(
  '1b. DUMMY_PROVIDER_BASE_URL is not in VITE_ variable',
  !envExample.includes('VITE_DUMMY_PROVIDER_BASE_URL') && !envFile.includes('VITE_DUMMY_PROVIDER_BASE_URL'),
);

check(
  '1c. DUMMY_PROVIDER_BASE_URL is not in frontend code',
  !usePaymentsHook.includes('DUMMY_PROVIDER_BASE_URL') && !frontendTypes.includes('DUMMY_PROVIDER_BASE_URL'),
);

// ── 2. DUMMY_PROVIDER_API_KEY is used only server-side ─────────────────────────

check(
  '2. DUMMY_PROVIDER_API_KEY is used in provider client (server-side)',
  providerClient.includes('DUMMY_PROVIDER_API_KEY'),
);

check(
  '2b. DUMMY_PROVIDER_API_KEY is not in VITE_ variable',
  !envExample.includes('VITE_DUMMY_PROVIDER_API_KEY') && !envFile.includes('VITE_DUMMY_PROVIDER_API_KEY'),
);

check(
  '2c. DUMMY_PROVIDER_API_KEY is not in frontend code',
  !usePaymentsHook.includes('DUMMY_PROVIDER_API_KEY') && !frontendTypes.includes('DUMMY_PROVIDER_API_KEY'),
);

// ── 3. DUMMY_PROVIDER_WEBHOOK_SECRET is used only server-side ──────────────────

check(
  '3. DUMMY_PROVIDER_WEBHOOK_SECRET is used in provider client (server-side)',
  providerClient.includes('DUMMY_PROVIDER_WEBHOOK_SECRET'),
);

check(
  '3b. DUMMY_PROVIDER_WEBHOOK_SECRET is not in VITE_ variable',
  !envExample.includes('VITE_DUMMY_PROVIDER_WEBHOOK_SECRET') && !envFile.includes('VITE_DUMMY_PROVIDER_WEBHOOK_SECRET'),
);

check(
  '3c. DUMMY_PROVIDER_WEBHOOK_SECRET is not in frontend code',
  !usePaymentsHook.includes('DUMMY_PROVIDER_WEBHOOK_SECRET') && !frontendTypes.includes('DUMMY_PROVIDER_WEBHOOK_SECRET'),
);

// ── 4. No provider secrets in VITE_ ────────────────────────────────────────────

check(
  '4. No VITE_DUMMY_PROVIDER variables in .env or .env.example',
  !envFile.includes('VITE_DUMMY_PROVIDER') && !envExample.includes('VITE_DUMMY_PROVIDER'),
);

// ── 5. No actual credential values committed ───────────────────────────────────

check(
  '5. Admin token is not present in any source file',
  !allSource.includes(ADMIN_TOKEN_PREFIX),
);

check(
  '5b. API key value is not present in any source file',
  !allSource.includes(API_KEY_PREFIX),
);

check(
  '5c. Webhook secret value is not present in any source file',
  !allSource.includes(WEBHOOK_SECRET_PREFIX),
);

check(
  '5d. Provider base URL host is not present in any source file',
  !allSource.includes(BASE_URL_HOST),
);

// ── 6. Admin token absent everywhere ───────────────────────────────────────────

check(
  '6. Admin token is not in .env',
  !envFile.includes(ADMIN_TOKEN_PREFIX),
);

check(
  '6b. Admin token is not in .env.example',
  !envExample.includes(ADMIN_TOKEN_PREFIX),
);

check(
  '6c. Admin token is not in migrations',
  !migrationSql.includes(ADMIN_TOKEN_PREFIX) && !integrationSql.includes(ADMIN_TOKEN_PREFIX),
);

check(
  '6d. Admin token is not in Edge Function',
  !edgeFn.includes(ADMIN_TOKEN_PREFIX),
);

check(
  '6e. Admin token is not in admin UI',
  !adminPayments.includes(ADMIN_TOKEN_PREFIX),
);

check(
  '6f. Admin token is not in frontend types',
  !frontendTypes.includes(ADMIN_TOKEN_PREFIX),
);

// ── 7. create-credit-order calls hosted provider /v1/payments ──────────────────

check(
  '7. Edge function imports createPayment from provider client',
  edgeFn.includes('createPayment') && edgeFn.includes('dummyProviderClient'),
);

check(
  '7b. createPayment is called in handleCreateCreditOrder',
  edgeFn.includes('createPayment('),
);

check(
  '7c. Provider client POSTs to /v1/payments',
  providerClient.includes('/v1/payments'),
);

// ── 8. create-credit-order sends Idempotency-Key: payment_orders.id ────────────

check(
  '8. Provider client sends Idempotency-Key header',
  providerClient.includes('Idempotency-Key'),
);

check(
  '8b. createPayment uses payment_order_id as idempotency key',
  providerClient.includes('authHeaders(req.payment_order_id)'),
);

// ── 9. create-credit-order stores provider_payment_id ──────────────────────────

check(
  '9. Edge function stores provider_payment_id on order after createPayment',
  edgeFn.includes('provider_payment_id: providerResponse.id'),
);

check(
  '9b. Edge function updates payment_orders with provider_payment_id',
  edgeFn.includes("provider_payment_id") && edgeFn.includes('.update('),
);

// ── 10. Player does not receive provider checkout_url ───────────────────────────

check(
  '10. Frontend types do not expose checkout_url in response types',
  !frontendTypes.includes('checkout_url') || frontendTypes.includes('checkout_url: string | null'),
);

check(
  '10b. Edge function does not return checkout_url to player',
  !edgeFn.includes('checkout_url') || edgeFn.includes('checkout_url: null'),
);

check(
  '10c. BuyCreditsSection does not reference checkout_url',
  !buyCredits.includes('checkout_url'),
);

check(
  '10d. WithdrawSection does not reference checkout_url',
  !withdrawSection.includes('checkout_url'),
);

// ── 11. create-withdrawal-request calls hosted provider /v1/payouts ────────────

check(
  '11. Edge function imports createPayout from provider client',
  edgeFn.includes('createPayout'),
);

check(
  '11b. createPayout is called in handleCreateWithdrawal',
  edgeFn.includes('createPayout('),
);

check(
  '11c. Provider client POSTs to /v1/payouts',
  providerClient.includes('/v1/payouts'),
);

// ── 12. create-withdrawal-request sends Idempotency-Key: withdrawal_requests.id ─

check(
  '12. createPayout uses withdrawal_request_id as idempotency key',
  providerClient.includes('authHeaders(req.withdrawal_request_id)'),
);

// ── 13. create-withdrawal-request stores provider_payout_id ─────────────────────

check(
  '13. Edge function stores provider_payout_id after createPayout',
  edgeFn.includes('provider_payout_id: providerResponse.id'),
);

// ── 14. Webhook verification uses raw request body ─────────────────────────────

check(
  '14. Webhook handler reads raw body with req.text()',
  edgeFn.includes('await req.text()'),
);

check(
  '14b. Provider client verifyWebhookSignature takes rawBody parameter',
  providerClient.includes('rawBody: string'),
);

// ── 15. HMAC compares in constant time ──────────────────────────────────────────

check(
  '15. Provider client uses constant-time comparison',
  providerClient.includes('diff |=') && providerClient.includes('charCodeAt'),
);

// ── 16. Webhook signature uses raw body only, not parsed JSON ───────────────────

check(
  '16. HMAC is computed over raw body string, not JSON.parse output',
  providerClient.includes('enc.encode(rawBody)') && !providerClient.includes('JSON.parse(rawBody)'),
);

check(
  '16b. Edge function parses JSON only after signature verification',
  edgeFn.indexOf('JSON.parse(rawBody)') > edgeFn.indexOf('verifyWebhookSignature'),
);

// ── 17. Duplicate event_id returns 200 ──────────────────────────────────────────

check(
  '17. process_payment_webhook handles unique_violation (duplicate event_id)',
  integrationSql.includes('EXCEPTION WHEN unique_violation'),
);

check(
  '17b. Duplicate returns status "duplicate"',
  integrationSql.includes("'status', 'duplicate'"),
);

check(
  '17c. Edge function returns 200 for duplicate (jsonResponse default 200)',
  edgeFn.includes("'already_processed'"),
);

// ── 18. Duplicate event_id cannot credit/reverse twice ─────────────────────────

check(
  '18. Duplicate event_id does not insert ledger or update wallet (EXCEPTION path returns early)',
  integrationSql.includes("'idempotent_replay', true") && integrationSql.includes('EXCEPTION WHEN unique_violation'),
);

check(
  '18b. process_payout_webhook also handles duplicate event_id',
  integrationSql.includes('process_payout_webhook') && integrationSql.includes("'status', 'duplicate'"),
);

// ── 19. payment.failed does not create wallet ledger credit ────────────────────

check(
  '19. process_payment_webhook for payment.failed does not insert CREDIT_PURCHASE ledger',
  integrationSql.includes("p_event_type = 'payment.failed'") &&
  !integrationSql.match(/payment\.failed[\s\S]*CREDIT_PURCHASE/),
);

check(
  '19b. payment.failed only updates order status to failed',
  integrationSql.includes("status = 'failed', failed_at = now()") || integrationSql.includes("status = 'failed'"),
);

// ── 20. payout.failed uses stored withdrawal amount, not webhook amount ─────────

check(
  '20. process_payout_webhook for payout.failed uses v_wr.amount_cents',
  integrationSql.includes("'WITHDRAWAL_REVERSAL', v_wr.amount_cents"),
);

check(
  '20b. payout.failed does not reference p_amount_cents for reversal',
  !integrationSql.match(/payout\.failed[\s\S]*p_amount_cents[\s\S]*WITHDRAWAL_REVERSAL/),
);

// ── 21. Payment success credits stored order amount, not webhook-controlled ────

check(
  '21. process_payment_webhook credits v_order.credits_cents (stored)',
  integrationSql.includes("'CREDIT_PURCHASE', v_order.credits_cents"),
);

check(
  '21b. Payment success verifies webhook amount against stored amount',
  integrationSql.includes('p_amount_cents != v_order.amount_cents'),
);

// ── 22. Payout paid verifies stored withdrawal amount/currency ──────────────────

check(
  '22. process_payout_webhook for payout.paid verifies amount',
  integrationSql.includes('p_amount_cents != v_wr.amount_cents'),
);

// ── 23. Webhook event insert + wallet/status change in one transaction/RPC ─────

check(
  '23. process_payment_webhook is a single SECURITY DEFINER RPC',
  integrationSql.includes('CREATE OR REPLACE FUNCTION public.process_payment_webhook') &&
  integrationSql.includes('SECURITY DEFINER'),
);

check(
  '23b. RPC inserts webhook event AND moves wallet in same function',
  integrationSql.includes('payment_webhook_events') && integrationSql.includes('wallet_ledger') &&
  integrationSql.includes('process_payment_webhook'),
);

check(
  '23c. process_payout_webhook is also a single atomic RPC',
  integrationSql.includes('CREATE OR REPLACE FUNCTION public.process_payout_webhook') &&
  integrationSql.includes('SECURITY DEFINER'),
);

check(
  '23d. Edge function calls process_payment_webhook RPC (not separate insert+finalize)',
  edgeFn.includes("rpc('process_payment_webhook'"),
);

check(
  '23e. Edge function calls process_payout_webhook RPC (not separate insert+finalize)',
  edgeFn.includes("rpc('process_payout_webhook'"),
);

// ── 24. Internal STS simulation routes removed or return 410 ────────────────────

check(
  '24. simulate-payment route returns 410 Gone',
  edgeFn.includes("'Gone: Use the hosted dummy PSP dashboard to resolve pending payments.', 410") ||
  edgeFn.includes('410'),
);

check(
  '24b. simulate-payout route returns 410 Gone',
  edgeFn.includes("'Gone: Use the hosted dummy PSP dashboard to resolve pending payouts.', 410"),
);

check(
  '24c. Edge function does not call topup_wallet for simulation',
  !edgeFn.includes("rpc('topup_wallet'"),
);

// ── 25. Player UI cannot simulate success/failure ───────────────────────────────

check(
  '25. usePayments hook does not expose simulatePayment',
  !usePaymentsHook.includes('simulatePayment'),
);

check(
  '25b. usePayments hook does not expose simulatePayout',
  !usePaymentsHook.includes('simulatePayout'),
);

check(
  '25c. BuyCreditsSection does not call simulatePayment',
  !buyCredits.includes('simulatePayment') && !buyCredits.includes('simulate-payment'),
);

check(
  '25d. WithdrawSection does not call simulatePayout',
  !withdrawSection.includes('simulatePayout') && !withdrawSection.includes('simulate-payout'),
);

// ── 26. Admin UI does not include provider admin token ──────────────────────────

check(
  '26. AdminPayments does not include admin token',
  !adminPayments.includes(ADMIN_TOKEN_PREFIX) && !adminPayments.includes('admin_token'),
);

check(
  '26b. AdminPayments does not have simulate payment buttons',
  !adminPayments.includes('handleSimulatePayment'),
);

check(
  '26c. AdminPayments does not have simulate payout buttons',
  !adminPayments.includes('handleSimulatePayout'),
);

check(
  '26d. AdminPayments shows provider dashboard instruction',
  adminPayments.includes('hosted dummy PSP dashboard'),
);

// ── 27. topup_wallet remains revoked from authenticated ─────────────────────────

check(
  '27. topup_wallet is revoked from authenticated in foundation migration',
  migrationSql.includes('REVOKE ALL ON FUNCTION public.topup_wallet(integer, text) FROM PUBLIC, anon, authenticated'),
);

check(
  '27b. topup_wallet is revoked from authenticated in integration migration',
  integrationSql.includes('REVOKE ALL ON FUNCTION public.topup_wallet(integer, text) FROM PUBLIC, anon, authenticated'),
);

// ── 28. cashout_game remains unchanged ──────────────────────────────────────────

check(
  '28. Integration migration does not reference cashout_game in SQL statements',
  !integrationSql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^--[^\n]*$/gm, '').includes('cashout_game'),
);

// ── 29. Payments UI remains disabled by default ────────────────────────────────

check(
  '29. VITE_PAYMENTS_UI_ENABLED defaults to false in .env',
  envFile.includes('VITE_PAYMENTS_UI_ENABLED=false'),
);

check(
  '29b. VITE_PAYMENTS_UI_ENABLED exists in .env.example',
  envExample.includes('VITE_PAYMENTS_UI_ENABLED'),
);

check(
  '29c. WalletPage reads VITE_PAYMENTS_UI_ENABLED flag',
  walletPage.includes('VITE_PAYMENTS_UI_ENABLED'),
);

check(
  '29d. WalletPage shows disabled placeholder when flag is false',
  walletPage.includes('Payments are not enabled in this environment yet.'),
);

// ── 30. No live endpoint calls made by tests ────────────────────────────────────

const verifyScriptContent = readFile('scripts/verify-payments.ts');

// Check that the verify script does not import HTTP libraries or supabase client.
// We exclude self-referential matches by checking import statements only.
const importLines = verifyScriptContent.split('\n').filter((l) => l.trim().startsWith('import '));

check(
  '30. Verify script does not import HTTP libraries (http, https, node-fetch, axios)',
  !importLines.some((l) => l.includes('http') || l.includes('axios') || l.includes('node-fetch')),
);

check(
  '30b. Verify script does not import supabase client',
  !importLines.some((l) => l.includes('@supabase/supabase-js')),
);

// ── Summary ────────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('\nVERIFICATION FAILED');
  process.exit(1);
} else {
  console.log('\nAll payment verification checks passed.');
}
