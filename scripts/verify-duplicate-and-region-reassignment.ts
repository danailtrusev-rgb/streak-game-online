// Verification script for the duplicate-play and region-reassignment
// hardening pass. Run: npx tsx scripts/verify-duplicate-and-region-reassignment.ts
//
// Two kinds of checks: real execution of the pure boundary-computation
// model (src/lib/regionReassignment.ts), and static structural checks
// against the actual migration/admin-UI text. No live Postgres instance
// is available in this environment — see PROJECT_CHANGELOG.md
// "Real Supabase status."

import { computeReassignmentBoundary, resolveEffectiveRegion } from '../src/lib/regionReassignment';
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

console.log('\n== Duplicate-play constraint ==');
{
  const src = read('supabase/migrations/20260718000000_20260718_duplicate_play_hard_guard.sql');
  check('duplicate audit view v_duplicate_daily_plays exists', /CREATE OR REPLACE VIEW public\.v_duplicate_daily_plays/.test(src));
  check('audit view has the exact required columns', ['user_id', 'game_id', 'play_date', 'duplicate_count', 'play_ids', 'created_at_min', 'created_at_max'].every((col) => src.includes(col)));
  check('audit view is NOT exposed to normal authenticated clients', /REVOKE ALL ON public\.v_duplicate_daily_plays FROM PUBLIC, anon, authenticated/.test(src));
  check('migration backfills game_time_region_id before checking for duplicates', src.indexOf('UPDATE plays') < src.indexOf('v_duplicate_count integer'));
  check('migration does NOT silently skip with only a NOTICE', !/RAISE NOTICE 'SKIPPED/.test(src));
  check('migration FAILS (RAISE EXCEPTION) when duplicates are found, not a soft warning', /RAISE EXCEPTION\s*\n?\s*'Cannot add plays_user_game_date_unique/.test(src));
  check('the failure message points at the audit view for inspection', /v_duplicate_daily_plays/.test(src) && src.includes("RAISE EXCEPTION"));
  check('the real mandatory constraint is still the goal on the success path', /ALTER TABLE public\.plays ADD CONSTRAINT plays_user_game_date_unique UNIQUE \(user_id, game_id, play_date\)/.test(src));
}

console.log('\n== play_daily_gate duplicate handling ==');
{
  const src = read('supabase/migrations/20260718020000_20260718_play_daily_gate_unique_violation_handling.sql');
  check('application-level check still runs first (fast path, no wallet work done yet)', /IF EXISTS \(SELECT 1 FROM plays WHERE user_id = v_user_id AND game_id = 'daily_gate' AND play_date = v_today\) THEN/.test(src));
  check('application-level check has NO region_id filter — considers historical null-region rows and new region-tagged rows alike', !/game_time_region_id = v_region_id/.test(src));
  check('the plays INSERT is wrapped with unique_violation handling', /EXCEPTION WHEN unique_violation THEN/.test(src));
  check('unique_violation produces the same clean error as the early check', (src.match(/RAISE EXCEPTION 'Already played today';/g) || []).length === 2);
}

console.log('\n== Region reassignment: safe-boundary computation (real execution) ==');
{
  const now = new Date('2026-07-18T12:00:00Z');
  const oldRollover = new Date('2026-07-19T00:00:00Z'); // old region's day ends later
  const newRollover = new Date('2026-07-18T22:00:00Z'); // new region's day ends sooner
  const result = computeReassignmentBoundary({
    previousRegionId: 'region-a', oldRegionNextRollover: oldRollover, newRegionNextRollover: newRollover,
    forceEffectiveImmediatelyForTest: false, now,
  });
  check('effective boundary is the LATER of old and new region rollovers (old is later here)', result.effectiveFrom.getTime() === oldRollover.getTime(), result.effectiveFrom.toISOString());
}
{
  const now = new Date('2026-07-18T12:00:00Z');
  const oldRollover = new Date('2026-07-18T18:00:00Z'); // old region's day ends sooner
  const newRollover = new Date('2026-07-19T03:00:00Z'); // new region's day ends later
  const result = computeReassignmentBoundary({
    previousRegionId: 'region-a', oldRegionNextRollover: oldRollover, newRegionNextRollover: newRollover,
    forceEffectiveImmediatelyForTest: false, now,
  });
  check('effective boundary is the LATER of old and new region rollovers (new is later here)', result.effectiveFrom.getTime() === newRollover.getTime(), result.effectiveFrom.toISOString());
}
{
  const now = new Date('2026-07-18T12:00:00Z');
  const newRollover = new Date('2026-07-19T00:00:00Z');
  const result = computeReassignmentBoundary({
    previousRegionId: null, oldRegionNextRollover: null, newRegionNextRollover: newRollover,
    forceEffectiveImmediatelyForTest: false, now,
  });
  check("first-ever assignment (no previous region) uses only the new region's rollover", result.effectiveFrom.getTime() === newRollover.getTime());
}
{
  const now = new Date('2026-07-18T12:00:00Z');
  const result = computeReassignmentBoundary({
    previousRegionId: 'region-a', oldRegionNextRollover: new Date('2026-07-19T00:00:00Z'),
    newRegionNextRollover: new Date('2026-07-19T00:00:00Z'), forceEffectiveImmediatelyForTest: true, now,
  });
  check('test override sets effective_from to now(), bypassing the boundary', result.effectiveFrom.getTime() === now.getTime());
  check('test override is explicitly marked, never indistinguishable from a normal assignment', result.isTestOverride && result.reasonPrefix === '[IMMEDIATE TEST OVERRIDE]');
}

console.log('\n== Region resolution respects effective_from (real execution) ==');
{
  const now = new Date('2026-07-18T12:00:00Z');
  const futureAssignment = { regionId: 'region-b', effectiveFrom: new Date('2026-07-19T00:00:00Z'), regionEnabled: true };
  const resolved = resolveEffectiveRegion(futureAssignment, 'global-region', now);
  check('region resolution ignores a future-dated assignment (falls back to global)', resolved === 'global-region', resolved);
}
{
  const now = new Date('2026-07-18T12:00:00Z');
  const pastAssignment = { regionId: 'region-b', effectiveFrom: new Date('2026-07-17T00:00:00Z'), regionEnabled: true };
  const resolved = resolveEffectiveRegion(pastAssignment, 'global-region', now);
  check('region resolution applies an already-effective assignment', resolved === 'region-b', resolved);
}
{
  const now = new Date('2026-07-18T12:00:00Z');
  const exactBoundary = { regionId: 'region-b', effectiveFrom: now, regionEnabled: true };
  const resolved = resolveEffectiveRegion(exactBoundary, 'global-region', now);
  check('the exact boundary instant counts as effective (<=), not upcoming', resolved === 'region-b');
}
{
  const now = new Date('2026-07-18T12:00:00Z');
  const disabledRegionAssignment = { regionId: 'region-b', effectiveFrom: new Date('2026-07-17T00:00:00Z'), regionEnabled: false };
  const resolved = resolveEffectiveRegion(disabledRegionAssignment, 'global-region', now);
  check('a disabled region is never resolved to, even if effective', resolved === 'global-region');
}
{
  const now = new Date('2026-07-18T12:00:00Z');
  const resolved = resolveEffectiveRegion(null, 'global-region', now);
  check('no assignment at all resolves to the global default', resolved === 'global-region');
}

console.log('\n== Region assignment: signature, grants, logging (static) ==');
{
  const src = read('supabase/migrations/20260718010000_20260718_region_reassignment_effective_boundary.sql');
  check('old 5-arg signature (caller-controlled effective_from) is dropped', /DROP FUNCTION IF EXISTS public\.assign_user_game_time_region\(uuid, uuid, timestamptz, text, text\)/.test(src));
  const newFnMatch = src.match(/CREATE OR REPLACE FUNCTION public\.assign_user_game_time_region\([\s\S]*?\$\$;/);
  const newFnText = newFnMatch ? newFnMatch[0] : '';
  check('new signature has no p_effective_from parameter (server computes it)', !/p_effective_from/.test(newFnText), 'still found in the function body itself');
  check('new signature includes p_force_effective_immediately_for_test, defaulting to false', /p_force_effective_immediately_for_test boolean DEFAULT false/.test(src));
  check('immediate override path is explicitly logged with a distinct marker', /\[IMMEDIATE TEST OVERRIDE\]/.test(src));
  check('function is granted to service_role only (not authenticated, not anon, not public)', /GRANT EXECUTE ON FUNCTION public\.assign_user_game_time_region\(uuid, uuid, text, text, boolean\) TO service_role;/.test(src) && /REVOKE ALL ON FUNCTION public\.assign_user_game_time_region\(uuid, uuid, text, text, boolean\) FROM PUBLIC, anon, authenticated;/.test(src));
  check('resolve_user_game_time_region now checks effective_from <= now()', /ugtr\.effective_from <= now\(\)/.test(src));
}

console.log('\n== Region reassignment cannot create a second play / duplicate qualification / duplicate notification ==');
{
  // These properties are consequences of mechanisms already verified
  // elsewhere; asserted together here as the specific scenario this
  // pass is about, not re-implemented.
  const playsGuard = read('supabase/migrations/20260718000000_20260718_duplicate_play_hard_guard.sql');
  check('plays_user_game_date_unique has no region_id in its key — a region change cannot unlock a second play for the same game_date', /UNIQUE \(user_id, game_id, play_date\)/.test(playsGuard) && !/UNIQUE \(user_id, game_id, play_date, game_time_region_id\)/.test(playsGuard));

  const qualSrc = read('supabase/migrations/20260717050000_20260717_qualification_region_aware.sql');
  check('weekly_qualification_status still relies on its original UNIQUE(user_id, week_start_date) — no new, weaker uniqueness introduced', !/DROP CONSTRAINT.*week_start_date|ALTER.*UNIQUE.*region_id.*week_start_date/.test(qualSrc));

  const notifSrc = read('supabase/migrations/20260715040000_20260715_notification_dedupe_region.sql');
  check('notification dedupe key includes region_id (closes the reassignment-duplicate path for notifications)', /user_id, notification_type, game_date, region_id/.test(notifSrc));
}

console.log('\n== Saturday/Sunday readiness wording ==');
{
  const normalize = (s: string) => s.replace(/^\s*>\s?/gm, '').replace(/\s+/g, ' ');
  const changelog = normalize(read('PROJECT_CHANGELOG.md'));
  check('changelog contains the (historical) record that weekend event mechanics needed implementation', /Region-scoped event participation, leaderboards, rewards, and finalization still need implementation/.test(changelog));
  const handoff = normalize(read('AI_HANDOFF_NOTES.md'));
  check('AI_HANDOFF_NOTES distinguishes timing foundation from event mechanics', /region-aware timing foundation is not the same as region-aware event mechanics/.test(handoff));
  // The admin UI wording was superseded in the following pass once
  // participation/leaderboards were actually built — the literal phrase
  // this check used to require is no longer accurate and correctly no
  // longer appears; verify-assignment-history-and-events.ts checks the
  // CURRENT wording instead. Not re-asserted here to avoid this script
  // enforcing stale requirements against real, subsequent progress.
}

console.log('\n== Regional activation guard (re-confirmed, not rebuilt) ==');
{
  const guardSql = read('supabase/migrations/20260716000000_20260716_game_time_regional_activation_guard.sql');
  check('regional_game_time_live_enabled still defaults to false', /DEFAULT false/.test(guardSql));
  const adminSrc = read('src/pages/admin/AdminGameTimeSection.tsx');
  check('admin UI still conditionally renders (not just disables) the activation action', /\{activationGuard\.allowed && \(/.test(adminSrc));
  const cronSql = read('supabase/migrations/20260714020000_20260714_reactivation_cron_template.sql');
  check('Cron remains inactive', cronSql.split('\n').filter((l) => l.trim().startsWith('SELECT cron.schedule')).length === 0);
  const pushSeed = read('supabase/migrations/20260714010000_20260714_push_settings.sql');
  const pushFix = read('supabase/migrations/20260714050000_20260714_push_safe_defaults.sql');
  check('scheduled push remains disabled by default', /'push_global_enabled',\s*'false'::jsonb/.test(pushSeed) && /key = 'push_next_day_enabled'/.test(pushFix));
}

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
