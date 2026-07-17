// Verification script for the assignment-history and regional-weekend-
// events pass. Run: npx tsx scripts/verify-assignment-history-and-events.ts
//
// Real execution of the pure history-resolution model
// (src/lib/regionAssignmentHistory.ts), plus static structural checks
// against the actual migration/admin-UI text. No live Postgres instance
// is available in this environment.

import { resolveHistoryAwareRegion, applyReassignment, type AssignmentRow } from '../src/lib/regionAssignmentHistory';
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

function normalize(s: string): string {
  return s.replace(/^\s*>\s?/gm, '').replace(/\s+/g, ' ');
}

console.log('\n== Assignment model: active/pending coexistence (real execution) ==');
{
  const now = new Date('2026-07-19T12:00:00Z');
  const boundary = new Date('2026-07-20T00:00:00Z');
  const rows: AssignmentRow[] = [
    { id: 'r1', regionId: 'region-A', effectiveFrom: new Date('2026-07-01T00:00:00Z'), effectiveUntil: boundary, status: 'active', regionEnabled: true },
    { id: 'r2', regionId: 'region-B', effectiveFrom: boundary, effectiveUntil: null, status: 'pending', regionEnabled: true },
  ];
  check('active assignment (Region A) remains resolved while a future assignment (Region B) is pending', resolveHistoryAwareRegion(rows, 'global', now) === 'region-A');
}
{
  const boundary = new Date('2026-07-20T00:00:00Z');
  const now = new Date('2026-07-20T00:00:01Z'); // just after the boundary
  const rows: AssignmentRow[] = [
    { id: 'r1', regionId: 'region-A', effectiveFrom: new Date('2026-07-01T00:00:00Z'), effectiveUntil: boundary, status: 'active', regionEnabled: true },
    { id: 'r2', regionId: 'region-B', effectiveFrom: boundary, effectiveUntil: null, status: 'pending', regionEnabled: true },
  ];
  check('the pending assignment (Region B) becomes effective only after the boundary', resolveHistoryAwareRegion(rows, 'global', now) === 'region-B');
}
{
  const now = new Date('2026-07-19T12:00:00Z');
  const rows: AssignmentRow[] = [
    { id: 'r1', regionId: 'region-A', effectiveFrom: new Date('2026-07-01T00:00:00Z'), effectiveUntil: new Date('2026-07-10T00:00:00Z'), status: 'superseded', regionEnabled: true },
    { id: 'r2', regionId: 'region-B', effectiveFrom: new Date('2026-07-10T00:00:00Z'), effectiveUntil: null, status: 'active', regionEnabled: true },
  ];
  check('resolution ignores a superseded row even if somehow re-queried, using only the currently-open window', resolveHistoryAwareRegion(rows, 'global', now) === 'region-B');
}
{
  const now = new Date('2026-07-19T12:00:00Z');
  const rows: AssignmentRow[] = [
    { id: 'r1', regionId: 'region-A', effectiveFrom: new Date('2026-07-01T00:00:00Z'), effectiveUntil: null, status: 'cancelled', regionEnabled: true },
  ];
  check('resolution ignores a cancelled row, falling back to global', resolveHistoryAwareRegion(rows, 'global', now) === 'global');
}
{
  const now = new Date('2026-07-19T12:00:00Z');
  const rows: AssignmentRow[] = [
    { id: 'r1', regionId: 'region-A', effectiveFrom: new Date('2026-07-01T00:00:00Z'), effectiveUntil: null, status: 'active', regionEnabled: false },
  ];
  check('resolution ignores a disabled region, falling back to global', resolveHistoryAwareRegion(rows, 'global', now) === 'global');
}
{
  const now = new Date('2026-07-19T12:00:00Z');
  check('no assignment rows at all falls back to global', resolveHistoryAwareRegion([], 'global', now) === 'global');
}

console.log('\n== Reassignment transition (real execution) ==');
{
  const now = new Date('2026-07-19T12:00:00Z');
  const boundary = new Date('2026-07-20T00:00:00Z');
  const currentRow: AssignmentRow = { id: 'r1', regionId: 'region-A', effectiveFrom: new Date('2026-07-01T00:00:00Z'), effectiveUntil: null, status: 'active', regionEnabled: true };
  const { closedOldRow, newRow } = applyReassignment(currentRow, 'region-B', boundary, now);
  check('the old row is closed off exactly at the new boundary (no gap, no overlap)', closedOldRow?.effectiveUntil?.getTime() === boundary.getTime());
  check('the old row is marked active (it was already in effect)', closedOldRow?.status === 'active');
  check('the new row is pending (its effective_from is in the future)', newRow.status === 'pending');
  check('the new row is open-ended', newRow.effectiveUntil === null);

  // Continuity check: at every instant, resolution returns exactly one
  // region — never both, never neither.
  const rows = [closedOldRow!, newRow];
  const beforeBoundary = resolveHistoryAwareRegion(rows, 'global', new Date(boundary.getTime() - 1000));
  const afterBoundary = resolveHistoryAwareRegion(rows, 'global', new Date(boundary.getTime() + 1000));
  check('resolves to the OLD region 1 second before the boundary', beforeBoundary === 'region-A');
  check('resolves to the NEW region 1 second after the boundary', afterBoundary === 'region-B');
}
{
  // First-ever assignment (no previous open row).
  const now = new Date('2026-07-19T12:00:00Z');
  const boundary = new Date('2026-07-20T00:00:00Z');
  const { closedOldRow, newRow } = applyReassignment(null, 'region-A', boundary, now);
  check('first-ever assignment has no old row to close', closedOldRow === null);
  check('first-ever assignment is still pending until its own boundary', newRow.status === 'pending');
}
{
  // Test override: immediate effect.
  const now = new Date('2026-07-19T12:00:00Z');
  const { newRow } = applyReassignment(null, 'region-A', now, now);
  check('an immediate (test-override) assignment is active right away', newRow.status === 'active');
}

console.log('\n== Assignment/resolution functions: static checks ==');
{
  const src = read('supabase/migrations/20260719010000_20260719_region_resolution_history_aware.sql');
  check('resolve_user_game_time_region reads from the new history table', /user_game_time_region_assignments/.test(src));
  check("resolution excludes cancelled rows", /status <> 'cancelled'/.test(src));
  check('resolution requires effective_from <= now()', /a\.effective_from <= now\(\)/.test(src));
  check('resolution requires effective_until is open or in the future', /a\.effective_until IS NULL OR a\.effective_until > now\(\)/.test(src));
  check('assignment closes the previous open row at the new boundary instead of overwriting it', /effective_until = v_effective_from/.test(src));
  check('immediate test override remains service_role-only and logged', /\[IMMEDIATE TEST OVERRIDE\]/.test(src) && /GRANT EXECUTE ON FUNCTION public\.assign_user_game_time_region\(uuid, uuid, text, text, boolean\) TO service_role;/.test(src));
}

console.log('\n== Duplicate-play / qualification / notification safety through reassignment ==');
{
  // These properties are structural consequences already verified in
  // prior passes' migrations, re-confirmed here because this pass
  // changes HOW the active region is resolved (history-aware) without
  // touching any of the following mechanisms.
  const playsGuard = read('supabase/migrations/20260718000000_20260718_duplicate_play_hard_guard.sql');
  check('plays_user_game_date_unique (no region in its key) still governs duplicate-play protection — unaffected by the assignment-history rewrite', /UNIQUE \(user_id, game_id, play_date\)/.test(playsGuard));
  const qualSrc = read('supabase/migrations/20260717050000_20260717_qualification_region_aware.sql');
  check('weekly_qualification_status UNIQUE(user_id, week_start_date) is unaffected by the assignment-history rewrite', /UNIQUE \(user_id, week_start_date\)/.test(read('supabase/migrations/20260409071643_20260409_fix_missing_ecosystem_tables_and_functions.sql')) && !/DROP CONSTRAINT/.test(qualSrc));
  const notifSrc = read('supabase/migrations/20260715040000_20260715_notification_dedupe_region.sql');
  check('notification dedupe key (region_id included) is unaffected by the assignment-history rewrite', /user_id, notification_type, game_date, region_id/.test(notifSrc));
}

console.log('\n== Event instances: schema and creation (static) ==');
{
  const src = read('supabase/migrations/20260719030000_20260719_event_instances_schema.sql');
  check('event_instances has the required unique constraint (event_type, region, event_date)', /UNIQUE \(event_type, game_time_region_id, event_date\)/.test(src));
  check('event_instances rejects an inverted window at the table level too', /CHECK \(ends_at > starts_at\)/.test(src));
  check('get_or_create_event_instance rejects a disabled region', /AND enabled = true/.test(src));
  check('get_or_create_event_instance rejects a missing/inverted window', /RAISE EXCEPTION 'Region % has no configured window/.test(src) && /RAISE EXCEPTION 'Region % has an invalid or inverted window/.test(src));
  check('get_or_create_event_instance is idempotent (ON CONFLICT DO NOTHING then SELECT)', /ON CONFLICT \(event_type, game_time_region_id, event_date\) DO NOTHING/.test(src));
  check('event_instances is granted to service_role only for writes (no client write policy)', !/FOR INSERT TO authenticated/.test(src));
  check('event types reuse the existing games table identifiers (no invented naming)', /'saturday_main_event'/.test(src) && /'sunday_winners_event'/.test(src));
}

console.log('\n== Saturday/Sunday participation (static) ==');
{
  const src = read('supabase/migrations/20260719040000_20260719_enter_weekend_event_region_aware.sql');
  check('the dead 2-arg legacy overload is dropped', /DROP FUNCTION IF EXISTS public\.enter_weekend_event\(text, uuid\)/.test(src));
  check('entry requires the region window to be active when one is configured', /v_window_status <> 'active'/.test(src));
  check('entry preserves existing Global-mode behavior when no window is configured (no instance, no window check)', /v_window_configured THEN/.test(src) && /ELSE[\s\S]*v_instance_id := NULL/.test(src));
  check('entry checks for an existing row before insert, returning a clean already_entered status instead of an unhandled constraint violation', /already_entered/.test(src));
  check('entry records event_instance_id and game_time_region_id on the row', /event_instance_id, game_time_region_id/.test(src));
  check('the fixed response shape matches what the frontend actually expects (entry_id, status)', /jsonb_build_object\('entry_id', v_entry_id, 'status', 'entered'\)/.test(src));
  check('region is always freshly resolved at entry time — no parameter lets a caller pick a different region\'s event', !/p_region_id/.test(src));
}

console.log('\n== Region reassignment cannot enter another region\'s same event ==');
{
  // Structural: enter_weekend_event() always resolves the CALLER's
  // current region via resolve_user_game_time_region(v_user_id) and
  // never accepts a region/instance parameter from the client — so a
  // reassignment can only ever change WHICH instance a future entry
  // targets, never let an entry be redirected to a specific instance by
  // request. Verified by the absence of any region/instance input
  // parameter on the function, checked above; the following confirms
  // the same instant-resolution property connects entry to
  // resolve_user_game_time_region specifically.
  const src = read('supabase/migrations/20260719040000_20260719_enter_weekend_event_region_aware.sql');
  check('entry resolves the region via resolve_user_game_time_region(v_user_id), not any caller input', /resolve_user_game_time_region\(v_user_id\)/.test(src));
}

console.log('\n== admin_finalize_event: region scoping is opt-in, not a behavior change by default ==');
{
  const src = read('supabase/migrations/20260719050000_20260719_admin_finalize_event_region_scoped.sql');
  check('p_event_instance_id defaults to NULL (existing callers unaffected)', /p_event_instance_id uuid DEFAULT NULL/.test(src));
  check('the winner UPDATE preserves the original filter when instance is not provided', /p_event_instance_id IS NULL OR event_instance_id = p_event_instance_id/.test(src));
  check('payout amount remains entirely admin-supplied, never computed from region/instance data', /VALUES \(p_winner_user_id, 'JACKPOT_WIN', p_payout_cents, v_meta\)/.test(src));
  check('this pass documents the pre-existing lack of finalization idempotency rather than silently leaving it unstated', /has never had built-in idempotency of its own/.test(src));
}

console.log('\n== Reporting: region-scoped, no cross-region mixing (static) ==');
{
  const src = read('supabase/migrations/20260719060000_20260719_event_reporting_views.sql');
  check('leaderboard views are ordered/grouped per region (ORDER BY region first)', /ORDER BY wee\.game_time_region_id/.test(src));
  check('leaderboard views only include rows with a real event_instance_id (never mixes non-instance legacy Global-mode entries in)', /event_instance_id IS NOT NULL/.test(src));
  check('views use security_invoker so RLS is respected, not bypassed', (src.match(/security_invoker = true/g) || []).length >= 4);
}

console.log('\n== Migration chain consistency (requirement #17) ==');
{
  const src = read('supabase/migrations/20260719070000_20260719_duplicate_play_constraint_chain_audit.sql');
  check('the corrective migration documents the audit finding (no actual conflict found) rather than fabricating a fix', /no actual conflicting or confusing duplicate/.test(src));
  check('the corrective migration still fails loudly if duplicates somehow block protection', /RAISE EXCEPTION/.test(src));
}

console.log('\n== Migration consistency (re-confirmed, not rebuilt) ==');
{
  const guardSql = read('supabase/migrations/20260716000000_20260716_game_time_regional_activation_guard.sql');
  check('regional_game_time_live_enabled remains false', /DEFAULT false/.test(guardSql));
  const cronSql = read('supabase/migrations/20260714020000_20260714_reactivation_cron_template.sql');
  check('Cron remains inactive', cronSql.split('\n').filter((l) => l.trim().startsWith('SELECT cron.schedule')).length === 0);
  const pushSeed = read('supabase/migrations/20260714010000_20260714_push_settings.sql');
  const pushFix = read('supabase/migrations/20260714050000_20260714_push_safe_defaults.sql');
  check('scheduled push remains disabled by default', /'push_global_enabled',\s*'false'::jsonb/.test(pushSeed) && /key = 'push_next_day_enabled'/.test(pushFix));
  const contextValidationSql = read('supabase/migrations/20260713200000_20260713_cashout_server_side_context_validation.sql');
  const exposureHardeningSql = read('supabase/migrations/20260713220000_20260713_cashout_rpc_exposure_hardening.sql');
  check('no legacy cashout overloads return (2-arg and no-arg both remain dropped)', /DROP FUNCTION IF EXISTS public\.cashout_game\(text, text\)\s*;/.test(contextValidationSql) && /DROP FUNCTION IF EXISTS public\.cashout_game\(\)\s*;/.test(exposureHardeningSql));
}

console.log('\n== Admin UI: readiness wording distinguishes all five dimensions ==');
{
  const adminSrc = normalize(read('src/pages/admin/AdminGameTimeSection.tsx'));
  for (const label of ['Game Time foundation', 'Daily play readiness', 'Notification readiness', 'Weekend event readiness', 'Deployment readiness']) {
    check(`admin UI distinguishes "${label}"`, adminSrc.includes(label));
  }
  check('admin UI does not overstate readiness — deployment not complete is explicitly called out', /not complete/.test(adminSrc) && /not yet been manually tested/.test(adminSrc));
  const rawLines = read('src/pages/admin/AdminGameTimeSection.tsx').split('\n');
  const hasEditableToggleWiring = rawLines.some((line) => /regional_game_time_live_enabled/.test(line) && /onChange=|onClick=/.test(line));
  check('regional_game_time_live_enabled is still not an editable admin toggle', !hasEditableToggleWiring);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
