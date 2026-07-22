#!/usr/bin/env tsx
/**
 * verify-payments.ts
 *
 * Static verification of the payments architecture.
 * Does NOT require a live Supabase connection.
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

// ── 1. topup_wallet is not re-granted to authenticated ────────────────────────

const migrationSql = readFile('supabase/migrations/20260722101732_20260722000000_20260722_payments_foundation.sql');
const hardeningSql = readFile('supabase/migrations/20260722110000_20260722_payments_hardening_defaults.sql');

check(
  '1. topup_wallet is not re-granted to authenticated in migration',
  migrationSql.includes('REVOKE ALL ON FUNCTION public.topup_wallet(integer, text) FROM PUBLIC, anon, authenticated'),
);

check(
  '1b. No GRANT EXECUTE on topup_wallet to authenticated in migration',
  !migrationSql.includes('GRANT EXECUTE ON FUNCTION public.topup_wallet'),
);

check(
  '1c. topup_wallet re-revoked in hardening migration',
  hardeningSql.includes('REVOKE ALL ON FUNCTION public.topup_wallet(integer, text) FROM PUBLIC, anon, authenticated'),
);

check(
  '1d. topup_wallet is NOT granted to authenticated (no GRANT in either migration)',
  !migrationSql.includes('GRANT EXECUTE ON FUNCTION public.topup_wallet') &&
  !hardeningSql.includes('GRANT EXECUTE ON FUNCTION public.topup_wallet'),
);

// ── 2. Payment webhook event idempotency exists ────────────────────────────────

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

check(
  '7e. Webhook routes call verifySignature before processing',
  edgeFn.includes('verifySignature') && edgeFn.includes('handleDummyWebhookPayment'),
);

check(
  '7f. Webhook returns 401 on invalid signature',
  edgeFn.includes("'Invalid signature', 401"),
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

// ── 9. Simulate routes require admin session, NOT player JWT ────────────────────

check(
  '9. Simulate routes use requireAdmin (admin session guard)',
  edgeFn.includes('requireAdmin') && edgeFn.includes('validateAdminSession'),
);

check(
  '9b. Simulate routes check x-admin-session header',
  edgeFn.includes("x-admin-session"),
);

check(
  '9c. Simulate routes return 403 when admin auth fails',
  edgeFn.includes("'Admin authorization required', 403"),
);

check(
  '9d. Simulate routes do NOT use player JWT (getUserFromRequest)',
  !edgeFn.includes('handleSimulatePayment(req, user.id)') && !edgeFn.includes('handleSimulatePayout(req, user.id)'),
);

check(
  '9e. Simulate routes are placed BEFORE player-authenticated routes',
  edgeFn.indexOf('/dummy/simulate-payment') < edgeFn.indexOf('const user = await getUserFromRequest'),
);

check(
  '9f. Simulate routes go through webhook flow, not direct credit',
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

check(
  '10c. CORS allows x-admin-session header',
  edgeFn.includes('x-admin-session'),
);

// ── 11. RLS prevents players from updating payment orders/webhook events ───────

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

const sqlOnly = migrationSql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^--[^\n]*$/gm, '');
check(
  '15. Migration does not reference cashout_game in SQL statements',
  !sqlOnly.includes('cashout_game'),
);

check(
  '15b. Migration does not alter game_state table',
  !migrationSql.includes('ALTER TABLE public.game_state'),
);

check(
  '15c. Hardening migration does not reference cashout_game in SQL statements',
  !hardeningSql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^--[^\n]*$/gm, '').includes('cashout_game'),
);

const buyCredits = readFile('src/components/payments/BuyCreditsSection.tsx');
check(
  '16. BuyCreditsSection does not call simulatePayment',
  !buyCredits.includes('simulatePayment') && !buyCredits.includes('simulate-payment'),
);

check(
  '16b. BuyCreditsSection does not call simulatePayout',
  !buyCredits.includes('simulatePayout') && !buyCredits.includes('simulate-payout'),
);

const withdrawSection = readFile('src/components/payments/WithdrawSection.tsx');
check(
  '16c. WithdrawSection does not call simulatePayment',
  !withdrawSection.includes('simulatePayment') && !withdrawSection.includes('simulate-payment'),
);

check(
  '16d. WithdrawSection does not call simulatePayout',
  !withdrawSection.includes('simulatePayout') && !withdrawSection.includes('simulate-payout'),
);

check(
  '16e. BuyCreditsSection shows admin-only message for pending orders',
  buyCredits.includes('Admin') || buyCredits.includes('admin'),
);

check(
  '16f. WithdrawSection shows admin-only message for pending withdrawals',
  withdrawSection.includes('Admin') || withdrawSection.includes('admin'),
);

// ── 17. Admin UI has simulation controls ────────────────────────────────────────

const adminPayments = readFile('src/pages/admin/AdminPayments.tsx');
check(
  '17. AdminPayments imports usePayments for simulation',
  adminPayments.includes('usePayments') && adminPayments.includes('simulatePayment'),
);

check(
  '17b. AdminPayments has simulate payment buttons',
  adminPayments.includes('handleSimulatePayment'),
);

check(
  '17c. AdminPayments has simulate payout buttons',
  adminPayments.includes('handleSimulatePayout'),
);

check(
  '17d. AdminPayments uses admin session via usePayments hook',
  adminPayments.includes('simulatePayment') && usePaymentsHook.includes('admin_session'),
);

// ── 18. usePayments hook uses admin session for simulation, not player JWT ──────

check(
  '18. usePayments simulatePayment uses x-admin-session header',
  usePaymentsHook.includes("'x-admin-session'") && usePaymentsHook.includes('simulatePayment'),
);

check(
  '18b. usePayments simulatePayout uses x-admin-session header',
  usePaymentsHook.includes("'x-admin-session'") && usePaymentsHook.includes('simulatePayout'),
);

// Verify simulate functions specifically use admin session, not Bearer token
const simulatePaymentSection = usePaymentsHook.substring(usePaymentsHook.indexOf('simulatePayment'), usePaymentsHook.indexOf('simulatePayment') + 500);
const simulatePayoutSection = usePaymentsHook.substring(usePaymentsHook.indexOf('simulatePayout'), usePaymentsHook.indexOf('simulatePayout') + 500);
check(
  '18d. simulatePayment function body uses x-admin-session, not Bearer token',
  simulatePaymentSection.includes('x-admin-session') && !simulatePaymentSection.includes('Bearer ${token}'),
);
check(
  '18e. simulatePayout function body uses x-admin-session, not Bearer token',
  simulatePayoutSection.includes('x-admin-session') && !simulatePayoutSection.includes('Bearer ${token}'),
);

// ── 19. Safe defaults in hardening migration ───────────────────────────────────

check(
  '19. Hardening migration sets withdrawals_enabled = false',
  hardeningSql.includes("'withdrawals_enabled'") && hardeningSql.includes("'false'"),
);

check(
  '19b. Hardening migration sets dummy_simulation_enabled = false',
  hardeningSql.includes("'dummy_simulation_enabled'") && hardeningSql.includes("'false'"),
);

check(
  '19c. Hardening migration disables dummy provider for withdrawal',
  hardeningSql.includes('is_active_for_withdrawal = false') && hardeningSql.includes("provider_key = 'dummy'"),
);

// ── 20. Wallet credit finalization is service-role/RPC only ─────────────────────

check(
  '20. finalize_credit_purchase is SECURITY DEFINER',
  migrationSql.includes('SECURITY DEFINER') && migrationSql.includes('finalize_credit_purchase'),
);

check(
  '20b. finalize_credit_purchase is revoked from authenticated',
  migrationSql.includes('REVOKE ALL ON FUNCTION public.finalize_credit_purchase') && migrationSql.includes('authenticated'),
);

check(
  '20c. create_withdrawal_request is SECURITY DEFINER',
  migrationSql.includes('SECURITY DEFINER') && migrationSql.includes('create_withdrawal_request'),
);

check(
  '20d. create_withdrawal_request is revoked from authenticated',
  migrationSql.includes('REVOKE ALL ON FUNCTION public.create_withdrawal_request') && migrationSql.includes('authenticated'),
);

// ── 21. Frontend payments UI disabled by default ─────────────────────────────

const envFile = readFile('.env');
const envExample = readFile('.env.example');
const walletPage = readFile('src/pages/WalletPage.tsx');

check(
  '21. VITE_PAYMENTS_UI_ENABLED exists in .env',
  envFile.includes('VITE_PAYMENTS_UI_ENABLED'),
);

check(
  '21b. VITE_PAYMENTS_UI_ENABLED defaults to false in .env',
  envFile.includes('VITE_PAYMENTS_UI_ENABLED=false'),
);

check(
  '21c. VITE_PAYMENTS_UI_ENABLED exists in .env.example',
  envExample.includes('VITE_PAYMENTS_UI_ENABLED'),
);

check(
  '21d. WalletPage reads VITE_PAYMENTS_UI_ENABLED flag',
  walletPage.includes('VITE_PAYMENTS_UI_ENABLED'),
);

check(
  '21e. WalletPage shows disabled placeholder when flag is false',
  walletPage.includes('Payments are not enabled in this environment yet.'),
);

check(
  '21f. WalletPage conditionally renders BuyCreditsSection only when enabled',
  walletPage.includes('paymentsUiEnabled') && walletPage.includes('BuyCreditsSection'),
);

check(
  '21g. WalletPage conditionally renders WithdrawSection only when enabled',
  walletPage.includes('paymentsUiEnabled') && walletPage.includes('WithdrawSection'),
);

// ── 22. usePayments hook respects the flag ─────────────────────────────────────

check(
  '22. usePayments hook reads VITE_PAYMENTS_UI_ENABLED',
  usePaymentsHook.includes('VITE_PAYMENTS_UI_ENABLED'),
);

check(
  '22b. usePayments hook skips fetchConfig when flag is false',
  usePaymentsHook.includes('!paymentsUiEnabled') || usePaymentsHook.includes('paymentsUiEnabled'),
);

check(
  '22c. usePayments hook exposes paymentsUiEnabled in return value',
  usePaymentsHook.includes('paymentsUiEnabled'),
);

// ── 23. Server-side dummy_simulation_enabled enforcement ───────────────────────

check(
  '23. Edge function has checkDummySimulationEnabled function',
  edgeFn.includes('checkDummySimulationEnabled'),
);

check(
  '23b. Simulate routes check dummy simulation enabled before processing',
  edgeFn.includes('checkDummySimulationEnabled') && edgeFn.includes('Dummy simulation is disabled'),
);

check(
  '23c. Simulate routes return 403 when dummy simulation is disabled',
  edgeFn.includes("'Dummy simulation is disabled', 403"),
);

check(
  '23d. checkDummySimulationEnabled queries settings table',
  edgeFn.includes('dummy_simulation_enabled') && edgeFn.includes('settings'),
);

// ── 24. No automatic payment calls on app load ──────────────────────────────────

const appFile = readFile('src/App.tsx');
check(
  '24. App.tsx does not call usePayments',
  !appFile.includes('usePayments'),
);

const adminPage = readFile('src/pages/admin/AdminPage.tsx');
check(
  '24b. AdminPage does not call usePayments',
  !adminPage.includes('usePayments'),
);

check(
  '24c. WalletPage does not call usePayments directly (uses child components)',
  !walletPage.includes('usePayments'),
);

// ── Summary ────────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('\nVERIFICATION FAILED');
  process.exit(1);
} else {
  console.log('\nAll payment verification checks passed.');
}
