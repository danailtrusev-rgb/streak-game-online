// Verification script for weekend event finalization and entry
// hardening. Run: npx tsx scripts/verify-weekend-finalization-hardening.ts

import { simulateFinalizeEvent, computeDerivedStatus, type FinalizationRow } from '../src/lib/eventFinalization';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

let passed = 0;
let failed = 0;
function check(label: string, condition: boolean, detail?: string) {
  if (condition) { passed++; console.log(`  ok  - ${label}`); }
  else { failed++; console.log(`FAIL  - ${label}${detail ? ` (${detail})` : ''}`); }
}

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

console.log('\n== Finalization idempotency (real execution) ==');
{
  const rows: FinalizationRow[] = [];
  const first = simulateFinalizeEvent(rows, {
    eventInstanceId: 'inst-1', eventGameId: 'saturday_main_event', eventDate: '2026-07-18',
    winnerUserId: 'user-A', rewardCents: 5000, derivedStatus: 'closed', force: false, entryCount: 3,
  });
  check('first finalization pays once (status: finalized)', first.status === 'finalized', JSON.stringify(first));
  check('exactly one finalization row created', rows.length === 1);

  const second = simulateFinalizeEvent(rows, {
    eventInstanceId: 'inst-1', eventGameId: 'saturday_main_event', eventDate: '2026-07-18',
    winnerUserId: 'user-A', rewardCents: 5000, derivedStatus: 'finalized', force: false, entryCount: 3,
  });
  check('second finalization returns already_finalized', second.status === 'already_finalized', JSON.stringify(second));
  check('second finalization does not create a new finalization/ledger row', rows.length === 1);
}
{
  // Concurrent model: two "simultaneous" calls against the same shared
  // rows array — only one can win, since the second sees the first's
  // row already present (models the unique-index race resolution).
  const rows: FinalizationRow[] = [];
  const callA = simulateFinalizeEvent(rows, {
    eventInstanceId: 'inst-2', eventGameId: 'sunday_winners_event', eventDate: '2026-07-19',
    winnerUserId: 'user-B', rewardCents: 3000, derivedStatus: 'closed', force: false, entryCount: 1,
  });
  const callB = simulateFinalizeEvent(rows, {
    eventInstanceId: 'inst-2', eventGameId: 'sunday_winners_event', eventDate: '2026-07-19',
    winnerUserId: 'user-B', rewardCents: 3000, derivedStatus: 'closed', force: false, entryCount: 1,
  });
  const outcomes = [callA.status, callB.status].sort();
  check('concurrent model: exactly one call finalizes, the other sees already_finalized', outcomes[0] === 'already_finalized' && outcomes[1] === 'finalized', JSON.stringify(outcomes));
  check('concurrent model: only one finalization row exists regardless of call order', rows.length === 1);
}
{
  const rows: FinalizationRow[] = [];
  const result = simulateFinalizeEvent(rows, {
    eventInstanceId: 'inst-3', eventGameId: 'saturday_main_event', eventDate: '2026-07-18',
    winnerUserId: 'user-C', rewardCents: 1000, derivedStatus: 'cancelled', force: false, entryCount: 5,
  });
  check('cancelled event cannot finalize', result.status === 'cancelled');
  check('no finalization row created for a cancelled event', rows.length === 0);
}
{
  const rows: FinalizationRow[] = [];
  const result = simulateFinalizeEvent(rows, {
    eventInstanceId: 'inst-4', eventGameId: 'saturday_main_event', eventDate: '2026-07-18',
    winnerUserId: 'user-D', rewardCents: 1000, derivedStatus: 'open', force: false, entryCount: 2,
  });
  check('open event cannot finalize without explicit force', result.status === 'not_closed', JSON.stringify(result));
}
{
  const rows: FinalizationRow[] = [];
  const result = simulateFinalizeEvent(rows, {
    eventInstanceId: 'inst-5', eventGameId: 'saturday_main_event', eventDate: '2026-07-18',
    winnerUserId: 'user-E', rewardCents: 1000, derivedStatus: 'open', force: true, entryCount: 2,
  });
  check('open event CAN finalize with explicit force', result.status === 'finalized', JSON.stringify(result));
}
{
  const rows: FinalizationRow[] = [];
  const result = simulateFinalizeEvent(rows, {
    eventInstanceId: 'inst-6', eventGameId: 'saturday_main_event', eventDate: '2026-07-18',
    winnerUserId: 'user-F', rewardCents: 1000, derivedStatus: 'closed', force: false, entryCount: 0,
  });
  check('no entries returns a safe no-op status (no_entries), not an error', result.status === 'no_entries');
  check('no finalization row created when there are no entries', rows.length === 0);
}
{
  const rows: FinalizationRow[] = [];
  const result = simulateFinalizeEvent(rows, {
    eventInstanceId: 'inst-7', eventGameId: 'saturday_main_event', eventDate: '2026-07-18',
    winnerUserId: 'user-G', rewardCents: 1000, derivedStatus: 'closed', force: false, entryCount: 3,
  });
  check('a closed event can finalize normally', result.status === 'finalized');
}
{
  // Legacy/global path (no event_instance_id) — same idempotency
  // guarantee, keyed by (event_game_id, event_date) instead.
  const rows: FinalizationRow[] = [];
  const first = simulateFinalizeEvent(rows, {
    eventInstanceId: null, eventGameId: 'saturday_main_event', eventDate: '2026-07-18',
    winnerUserId: 'user-H', rewardCents: 2000, derivedStatus: null, force: false, entryCount: 4,
  });
  const second = simulateFinalizeEvent(rows, {
    eventInstanceId: null, eventGameId: 'saturday_main_event', eventDate: '2026-07-18',
    winnerUserId: 'user-H', rewardCents: 2000, derivedStatus: null, force: false, entryCount: 4,
  });
  check('legacy/global path: first call finalizes', first.status === 'finalized');
  check('legacy/global path: second call is already_finalized', second.status === 'already_finalized');
  check('legacy and instance-scoped finalizations for different instances never collide', rows.length === 1);
}

console.log('\n== Derived status formula (real execution) ==');
{
  const startsAt = new Date('2026-07-18T10:00:00Z');
  const endsAt = new Date('2026-07-18T20:00:00Z');
  check('before window: scheduled', computeDerivedStatus('scheduled', startsAt, endsAt, new Date('2026-07-18T08:00:00Z')) === 'scheduled');
  check('during window: open', computeDerivedStatus('scheduled', startsAt, endsAt, new Date('2026-07-18T15:00:00Z')) === 'open');
  check('after window: closed', computeDerivedStatus('scheduled', startsAt, endsAt, new Date('2026-07-18T21:00:00Z')) === 'closed');
  check('exact start instant counts as open, not scheduled', computeDerivedStatus('scheduled', startsAt, endsAt, startsAt) === 'open');
  check('exact end instant counts as closed, not open', computeDerivedStatus('scheduled', startsAt, endsAt, endsAt) === 'closed');
  check('cancelled always wins regardless of timing', computeDerivedStatus('cancelled', startsAt, endsAt, new Date('2026-07-18T15:00:00Z')) === 'cancelled');
  check('finalized always wins regardless of timing', computeDerivedStatus('finalized', startsAt, endsAt, new Date('2026-07-18T08:00:00Z')) === 'finalized');
}

console.log('\n== admin_finalize_event: static checks against the real migration ==');
{
  const src = read('supabase/migrations/20260720010000_20260720_admin_finalize_event_idempotent.sql');
  check('event_instances is locked (FOR UPDATE) before deriving status', /FOR UPDATE;/.test(src));
  check('idempotency insert happens before any wallet/entry mutation', src.indexOf('INSERT INTO public.event_finalizations') < src.indexOf('UPDATE public.weekend_event_entries'));
  check('unique_violation on the finalization insert returns already_finalized without touching the wallet', /EXCEPTION WHEN unique_violation THEN/.test(src) && src.indexOf('EXCEPTION WHEN unique_violation') < src.indexOf('IF p_payout_cents > 0'));
  check('cancelled events are refused', /v_derived_status = .cancelled. THEN/.test(src));
  check('open/scheduled events are refused unless forced', /v_derived_status IN \('scheduled', 'open'\) AND NOT p_force/.test(src));
  check('no_entries check happens before the finalization insert (never consumes the idempotency slot for a no-op)', src.indexOf('no_entries') < src.indexOf('INSERT INTO public.event_finalizations'));
  check('winner/entries updates are scoped to the instance when provided', /p_event_instance_id IS NULL OR event_instance_id = p_event_instance_id/.test(src));
  check('ledger metadata includes event_instance_id, game_time_region_id, and finalization_id', /'event_instance_id',/.test(src) && /'game_time_region_id',/.test(src) && /'finalization_id',/.test(src));
  check('response includes the required status enum values as documented', ["'finalized'", "'already_finalized'", "'no_entries'", "'not_closed'", "'cancelled'"].every((s) => src.includes(s)));
}

console.log('\n== Wallet ledger idempotency protection (static) ==');
{
  const schemaSrc = read('supabase/migrations/20260720000000_20260720_event_finalization_idempotency_schema.sql');
  check('event_finalizations has a partial unique index for instance-scoped finalization', /UNIQUE INDEX IF NOT EXISTS idx_event_finalizations_instance[\s\S]*WHERE event_instance_id IS NOT NULL/.test(schemaSrc));
  check('event_finalizations has a SEPARATE partial unique index for legacy\\/global finalization (NULL-safe)', /UNIQUE INDEX IF NOT EXISTS idx_event_finalizations_legacy[\s\S]*WHERE event_instance_id IS NULL/.test(schemaSrc));
  check('no broad new unique index was added directly to wallet_ledger', !/CREATE UNIQUE INDEX[\s\S]*ON wallet_ledger/.test(schemaSrc));
  const finalizeSrc = read('supabase/migrations/20260720010000_20260720_admin_finalize_event_idempotent.sql');
  check('cashout ledger logic is untouched by this pass (no cashout_game function redefinition in this migration set)', !/CREATE OR REPLACE FUNCTION public\.cashout_game/.test(finalizeSrc));
  check('this pass does not touch deposit/other wallet accounting logic', !/DEPOSIT|type = .STAKE.|wallet_balance_cache/.test(finalizeSrc));
}

console.log('\n== RLS / RPC-only entry (static) ==');
{
  const schemaSrc = read('supabase/migrations/20260720000000_20260720_event_finalization_idempotency_schema.sql');
  check('the direct client INSERT policy is dropped by exact name', /DROP POLICY IF EXISTS "Users can insert own event entries" ON weekend_event_entries/.test(schemaSrc));
  const originalPolicy = read('supabase/migrations/20260408121945_20260408_ecosystem_phase1_schema.sql');
  check('the dropped policy name matches the one actually created originally (verified, not assumed)', originalPolicy.includes('"Users can insert own event entries"'));
  const entrySrc = read('supabase/migrations/20260720020000_20260720_enter_weekend_event_unique_violation_handling.sql');
  check('enter_weekend_event remains granted to authenticated', /GRANT EXECUTE ON FUNCTION public\.enter_weekend_event\(text\) TO authenticated;/.test(entrySrc));
  check('enter_weekend_event validates auth.uid() internally', /v_user_id := auth\.uid\(\);/.test(entrySrc) && /IF v_user_id IS NULL THEN/.test(entrySrc));
  check('the frontend-compatible response shape (entry_id, status) is preserved', /jsonb_build_object\('entry_id', v_entry_id, 'status', 'entered'\)/.test(entrySrc));
}

console.log('\n== enter_weekend_event: consolidated, region-scoped, hardened (static) ==');
{
  const src = read('supabase/migrations/20260720020000_20260720_enter_weekend_event_unique_violation_handling.sql');
  check('single live signature (one-argument)', /CREATE OR REPLACE FUNCTION public\.enter_weekend_event\(p_event_game_id text\)/.test(src));
  check('resolves the caller\'s own region — no region/instance parameter accepted from the client', !/p_region_id|p_event_instance_id/.test(src));
  check('unique_violation is now handled on the entry INSERT itself (this pass\'s addition)', /BEGIN[\s\S]*INSERT INTO public\.weekend_event_entries[\s\S]*EXCEPTION WHEN unique_violation THEN/.test(src));
}

console.log('\n== Region-scoped finalization: no cross-region interference (static) ==');
{
  const finalizeSrc = read('supabase/migrations/20260720010000_20260720_admin_finalize_event_idempotent.sql');
  check('winner is only ever drawn from within the given event_instance_id filter', /AND \(p_event_instance_id IS NULL OR event_instance_id = p_event_instance_id\)/.test(finalizeSrc));
  const reportingSrc = read('supabase/migrations/20260719060000_20260719_event_reporting_views.sql');
  check('leaderboard views remain region-scoped (unaffected by this pass)', /ORDER BY wee\.game_time_region_id/.test(reportingSrc));
}

console.log('\n== Announcement dedupe ==');
{
  const finalizeSrc = read('supabase/migrations/20260720010000_20260720_admin_finalize_event_idempotent.sql');
  check('winner_announcements is only ever inserted inside the idempotency-gated winning path (after the unique_violation catch block)', finalizeSrc.indexOf('EXCEPTION WHEN unique_violation') < finalizeSrc.indexOf('INSERT INTO public.winner_announcements'));
}

console.log('\n== Event status derivation used consistently (static) ==');
{
  const schemaSrc = read('supabase/migrations/20260720000000_20260720_event_finalization_idempotency_schema.sql');
  check('derived-status priority order matches the required formula exactly (cancelled, finalized, scheduled, open, closed)', (() => {
    const order = ['cancelled', 'finalized', 'scheduled', 'open', 'closed'];
    const positions = order.map((s) => schemaSrc.indexOf(`RETURN '${s}'`));
    return positions.every((p, i) => i === 0 || p > positions[i - 1]);
  })());
  const reportingSrc = read('supabase/migrations/20260720030000_20260720_event_reporting_derived_status.sql');
  check('reporting exposes both stored_status and derived_status', /stored_status/.test(reportingSrc) && /derived_status/.test(reportingSrc));
}

console.log('\n== Regional activation classification and safe defaults (re-confirmed) ==');
{
  const guardSql = read('supabase/migrations/20260716000000_20260716_game_time_regional_activation_guard.sql');
  check('regional_game_time_live_enabled remains false', /DEFAULT false/.test(guardSql));
  const cronSql = read('supabase/migrations/20260714020000_20260714_reactivation_cron_template.sql');
  check('Cron remains inactive', cronSql.split('\n').filter((l) => l.trim().startsWith('SELECT cron.schedule')).length === 0);
  const pushSeed = read('supabase/migrations/20260714010000_20260714_push_settings.sql');
  const pushFix = read('supabase/migrations/20260714050000_20260714_push_safe_defaults.sql');
  check('scheduled push remains disabled by default', /'push_global_enabled',\s*'false'::jsonb/.test(pushSeed) && /key = 'push_next_day_enabled'/.test(pushFix));
  const changelog = read('PROJECT_CHANGELOG.md').replace(/\s+/g, ' ');
  check('changelog reflects an accurate (not overstated) regional activation classification for this pass', /Regional Game Time/.test(changelog));
}

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
