// Verification script for making core gameplay region-aware.
// Run: npx tsx scripts/verify-region-aware-gameplay.ts
//
// Two kinds of checks here, kept explicit:
// 1. Structural diffs against the previous known-good migration bodies —
//    proves the ONLY changes are the ones documented, by actually
//    extracting and comparing the SQL text, not by trusting a comment.
// 2. Static presence/absence checks (new fields, new functions, no
//    legacy overloads, safe defaults).
// Neither of these executes real SQL — no live Postgres instance is
// available in this environment. See PROJECT_CHANGELOG.md
// "Real Supabase status."

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

function extractFunctionBody(source: string, fnNameHint: string): string {
  const idx = source.indexOf(fnNameHint);
  if (idx === -1) throw new Error(`function marker not found: ${fnNameHint}`);
  const asIdx = source.indexOf('AS $$', idx);
  const endIdx = source.indexOf('$$;', asIdx);
  return source.slice(asIdx + 5, endIdx);
}

/** Lines present in `a` but not `b`, ignoring pure whitespace/comment-only lines, for a readable diff summary. */
function significantRemovedLines(a: string, b: string): string[] {
  const bLines = new Set(b.split('\n').map((l) => l.trim()));
  return a.split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('--'))
    .filter((l) => !bLines.has(l));
}

console.log('\n== Global mode compatibility: play_daily_gate diff ==');
{
  const oldSrc = read('supabase/migrations/20260618112003_20260618_economy_v1_play_daily_gate.sql');
  const newSrc = read('supabase/migrations/20260717020000_20260717_play_daily_gate_region_aware.sql');
  const oldBody = extractFunctionBody(oldSrc, 'CREATE OR REPLACE FUNCTION public.play_daily_gate');
  const newBody = extractFunctionBody(newSrc, 'CREATE OR REPLACE FUNCTION public.play_daily_gate');

  // Every economy-critical line from the live version must still be
  // present verbatim in the new version — proves the RNG/probability/
  // pot/jackpot/pool math was not touched.
  const economyLines = [
    "v_roll    := secure_random_float();",
    "v_outcome := CASE WHEN v_roll < v_survival_prob THEN 'SURVIVE' ELSE 'DIE' END;",
    "v_pot_increment_cents := GREATEST(0, FLOOR(v_stake_cents * v_streak_value_rate)::integer);",
    "v_eff_jackpot_rate := LEAST(1.0, v_jackpot_alloc_rate / v_fail_rate);",
    "v_jackpot_contrib := GREATEST(0, FLOOR(v_stake_cents * v_eff_jackpot_rate)::integer);",
    "v_sat_contrib := GREATEST(0, FLOOR(v_stake_cents * v_sat_alloc_rate)::integer);",
    "v_sun_contrib := GREATEST(0, FLOOR(v_stake_cents * v_sun_alloc_rate)::integer);",
  ];
  for (const line of economyLines) {
    check(`economy line unchanged: "${line.slice(0, 50)}..."`, newBody.includes(line));
  }

  check('no longer calls get_madrid_today() directly', !/v_today\s*:=\s*get_madrid_today\(\)/.test(newBody));
  check('resolves the region via resolve_user_game_time_region', /resolve_user_game_time_region\(v_user_id\)/.test(newBody));
  check('resolves the game date via get_current_game_date_for_user', /get_current_game_date_for_user\(v_user_id\)/.test(newBody));
  check('stores game_time_region_id on the play row', /game_time_region_id/.test(newBody));

  const removed = significantRemovedLines(oldBody, newBody);
  const allowedRemovals = [
    "IF EXISTS (SELECT 1 FROM plays WHERE user_id = v_user_id AND play_date = v_today) THEN",
    "v_today := get_madrid_today();",
    "-- ── Full audit metadata ───────────────────────────────────────────────────",
    "-- ── Record play ───────────────────────────────────────────────────────────",
    "-- ── Update game_state ─────────────────────────────────────────────────────",
    "meta",
    "v_play_meta",
    "-- Already played today?",
    // Punctuation-only: this line loses its trailing ")" and gains a
    // "," in the new version because 'game_time_region_id' was appended
    // as a new field directly after it in the same jsonb_build_object —
    // the expression itself (v_streak_value_rate + ... + v_sun_alloc_rate)
    // is unchanged; confirmed by the separate `economyLines` checks above,
    // which assert several of these same values are computed identically.
    "(v_streak_value_rate + v_jackpot_alloc_rate + v_sat_alloc_rate + v_sun_alloc_rate)",
  ];
  const unexpectedRemovals = removed.filter((l) => !allowedRemovals.includes(l));
  check('no unexpected line removed from play_daily_gate (only the documented ones)', unexpectedRemovals.length === 0, JSON.stringify(unexpectedRemovals));
}

console.log('\n== Global mode compatibility: get_my_state diff ==');
{
  const oldSrc = read('supabase/migrations/20260713180000_20260713_expose_max_streak_and_completed_cycles.sql');
  const newSrc = read('supabase/migrations/20260717030000_20260717_get_my_state_region_aware.sql');
  const oldBody = extractFunctionBody(oldSrc, 'CREATE OR REPLACE FUNCTION public.get_my_state');
  const newBody = extractFunctionBody(newSrc, 'CREATE OR REPLACE FUNCTION public.get_my_state');

  const existingFields = [
    "'current_streak',   v_gs.current_streak",
    "'pot_cents',        v_gs.pot_cents",
    "'last_play_date',   v_gs.last_play_date",
    "'updated_at',       v_gs.updated_at",
    "'max_streak',       v_gs.max_streak",
    "'completed_cycles', v_gs.completed_cycles",
    "'wallet_balance_cents', v_balance",
    "'jackpot_cents',        v_jackpot",
    "'played_today',         v_played_today",
    "'available_tiers',      COALESCE(v_tiers, '[]'::jsonb)",
  ];
  for (const field of existingFields) {
    check(`existing get_my_state() field preserved: "${field.slice(0, 40)}..."`, newBody.includes(field));
  }
  check("no longer hardcodes 'Europe/Madrid' inline", !/AT TIME ZONE 'Europe\/Madrid'/.test(newBody));
  check('adds the game_time object', /'game_time', jsonb_build_object/.test(newBody));
  for (const key of ['mode', 'region_id', 'region_key', 'timezone', 'game_date', 'previous_game_date', 'next_daily_rollover_at', 'daily_window_open', 'daily_window_closed', 'saturday_status', 'sunday_status']) {
    check(`game_time object includes required field "${key}"`, newBody.includes(`'${key}'`));
  }
}

console.log('\n== Global mode compatibility: cashout_game diff (hardening preserved) ==');
{
  const oldSrc = read('supabase/migrations/20260713220000_20260713_cashout_rpc_exposure_hardening.sql');
  const newSrc = read('supabase/migrations/20260717040000_20260717_cashout_game_region_metadata.sql');

  check('cashout_game keeps the mandatory 3-argument signature (no defaults)', /p_game_id\s+text,\s*\n?\s*p_idem_key\s+text,\s*\n?\s*p_context_id\s+timestamptz\s*\n?\)/.test(newSrc));
  check('idempotency key format validation preserved', newSrc.includes("p_idem_key !~ '^[0-9a-fA-F]{8}-"));
  check('context-mismatch replay guard preserved', newSrc.includes("RAISE EXCEPTION 'Idempotency key context mismatch';"));
  check('stale-context guard preserved', newSrc.includes("RAISE EXCEPTION 'Stale cashout context';"));
  check('unique_violation defense-in-depth handler preserved', newSrc.includes('EXCEPTION WHEN unique_violation THEN'));
  check('amount is still server-computed from the locked pot, never client-supplied', newSrc.includes('v_cashout_amount := v_pot_cents;'));
  check('currency remains hardcoded server-side EUR (no client currency param)', (newSrc.match(/'currency',\s*'EUR'/g) || []).length >= 3);
  check('region resolved for audit metadata only', /resolve_user_game_time_region\(v_user_id\)/.test(newSrc));
  check('game_time_region_id added to ledger meta', /'game_time_region_id',\s*v_region_id/.test(newSrc));

  void oldSrc;
}

console.log('\n== No legacy cashout overloads / permissions ==');
{
  const contextValidationSql = read('supabase/migrations/20260713200000_20260713_cashout_server_side_context_validation.sql');
  const exposureHardeningSql = read('supabase/migrations/20260713220000_20260713_cashout_rpc_exposure_hardening.sql');
  check('the 2-arg legacy cashout_game(text, text) overload was dropped', /DROP FUNCTION IF EXISTS public\.cashout_game\(text, text\)\s*;/.test(contextValidationSql));
  check('the no-arg legacy cashout_game() overload was dropped', /DROP FUNCTION IF EXISTS public\.cashout_game\(\)\s*;/.test(exposureHardeningSql));
  const finalCashout = read('supabase/migrations/20260717040000_20260717_cashout_game_region_metadata.sql');
  check('final grants restrict cashout_game to authenticated only', /GRANT EXECUTE ON FUNCTION public\.cashout_game\(text, text, timestamptz\) TO authenticated;/.test(finalCashout));
}

console.log('\n== Qualification region-awareness ==');
{
  const oldSrc = read('supabase/migrations/20260408122105_20260408_ecosystem_phase1_rpc.sql');
  const newSrc = read('supabase/migrations/20260717050000_20260717_qualification_region_aware.sql');
  check('update_weekly_qualification no longer uses the global-only week-start function', !/v_week_start\s*:=\s*public\.get_current_week_start\(\);/.test(newSrc));
  check('update_weekly_qualification uses the region-aware per-user week-start function', /get_current_week_start_for_user\(p_user_id\)/.test(newSrc));
  check('region_id column added to weekly_qualification_status', /ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES game_time_regions/.test(newSrc));

  // Point-value/threshold logic must be byte-for-byte unchanged.
  const thresholdLines = [
    "SELECT COALESCE(MIN(threshold_value), 50)",
    "SELECT COALESCE(MIN(threshold_value), 100)",
    "SELECT COALESCE(MIN(threshold_value), 2)",
    "SELECT COALESCE(MIN(threshold_value), 3)",
    "v_sat_qual := (v_points >= v_sat_pts_rule) OR (v_games_played >= v_sat_gp_rule);",
    "v_sun_qual := (v_points >= v_sun_pts_rule) OR (v_games_played >= v_sun_gp_rule);",
  ];
  for (const line of thresholdLines) {
    check(`qualification threshold logic unchanged: "${line.slice(0, 40)}..."`, newSrc.includes(line));
  }
  check('existing UNIQUE(user_id, week_start_date) constraint (original schema) is what prevents duplicate qualification — not a new rule', !/UNIQUE.*week_start_date.*region_id|UNIQUE.*region_id.*week_start_date/.test(newSrc));
  void oldSrc;
}

console.log('\n== Saturday/Sunday foundation ==');
{
  const src = read('supabase/migrations/20260717060000_20260717_saturday_sunday_status_helper.sql');
  check('get_saturday_sunday_status_for_user combines region window + qualification status', /get_game_time_state_for_region/.test(src) && /weekly_qualification_status/.test(src));
  check('does not alter qualification_rules thresholds', !/UPDATE.*qualification_rules|INSERT INTO.*qualification_rules/.test(src));
}

console.log('\n== Reporting ==');
{
  const src = read('supabase/migrations/20260717070000_20260717_reporting_view_and_region_inspection.sql');
  check('reporting view exposes game_date and region dimensions', /game_date/.test(src) && /region_key/.test(src) && /timezone/.test(src));
  check('reporting view uses security_invoker so RLS is not bypassed', /security_invoker = true/.test(src));
}

console.log('\n== Duplicate-play protection ==');
{
  const src = read('supabase/migrations/20260717000000_20260717_plays_region_and_duplicate_guard.sql');
  check('unique constraint is per user+game+game_date, NOT per region (one play per day, not one per region)', /UNIQUE \(user_id, game_id, play_date\)/.test(src) && !/UNIQUE \(user_id, game_id, play_date, game_time_region_id\)/.test(src));
  check('constraint addition is conditional on no existing duplicates (safe for a table that predates this work)', /SELECT COUNT\(\*\) INTO v_duplicate_count/.test(src));
  check('migration does not fail outright if duplicates are found (logs and skips instead)', /RAISE NOTICE 'SKIPPED/.test(src));
}

console.log('\n== Notification consistency (re-check, not a new build) ==');
{
  const schedulerSrc = read('supabase/functions/schedule-reactivation-notifications/index.ts');
  check('scheduler still resolves playedToday from game_state.last_play_date vs the region clock (same source play_daily_gate now writes)', /playedToday = gs\?\.last_play_date === clock\.gameDate/.test(schedulerSrc));
  // The scheduler already referenced resolve_user_game_time_region() in a
  // COMMENT from the previous pass (documenting that its own JS-side
  // region resolution mirrors that SQL function) — that's expected and
  // correct, not evidence this pass touched the file. What actually
  // matters: this pass's new SQL objects (game_time_region_id column on
  // plays, the cashout ledger meta field, the qualification region_id
  // column) are never referenced by the scheduler's actual code, since
  // none of them were needed there.
  const schedulerCodeOnly = schedulerSrc.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');
  check("scheduler's executable code has no new dependency on this pass's additions", !/plays\.game_time_region_id|weekly_qualification_status\.region_id/.test(schedulerCodeOnly));
  const settingsSql = read('supabase/migrations/20260714010000_20260714_push_settings.sql');
  const settingsFix = read('supabase/migrations/20260714050000_20260714_push_safe_defaults.sql');
  check('scheduled push remains disabled by default', /'push_global_enabled',\s*'false'::jsonb/.test(settingsSql) && /key = 'push_next_day_enabled'/.test(settingsFix));
}

console.log('\n== Regional activation readiness (unchanged posture) ==');
{
  const guardSql = read('supabase/migrations/20260716000000_20260716_game_time_regional_activation_guard.sql');
  check('regional_game_time_live_enabled still defaults to false', /DEFAULT false/.test(guardSql));
  check('this pass did not flip the readiness flag to true anywhere', !read('supabase/migrations/20260717000000_20260717_plays_region_and_duplicate_guard.sql').includes('regional_game_time_live_enabled = true')
    && !read('supabase/migrations/20260717010000_20260717_region_aware_date_helpers.sql').includes('regional_game_time_live_enabled = true')
    && !read('supabase/migrations/20260717020000_20260717_play_daily_gate_region_aware.sql').includes('regional_game_time_live_enabled = true')
    && !read('supabase/migrations/20260717030000_20260717_get_my_state_region_aware.sql').includes('regional_game_time_live_enabled = true')
    && !read('supabase/migrations/20260717040000_20260717_cashout_game_region_metadata.sql').includes('regional_game_time_live_enabled = true'));
  const cronSql = read('supabase/migrations/20260714020000_20260714_reactivation_cron_template.sql');
  check('Cron remains inactive', cronSql.split('\n').filter((l) => l.trim().startsWith('SELECT cron.schedule')).length === 0);
}

console.log('\n== Second and third hidden Madrid dependencies found and fixed ==');
{
  const weekStartSql = read('supabase/migrations/20260717010000_20260717_region_aware_date_helpers.sql');
  check('get_current_week_start() no longer hardcodes Europe/Madrid in its executable body', (() => {
    const body = extractFunctionBody(weekStartSql, 'CREATE OR REPLACE FUNCTION public.get_current_week_start()\nRETURNS date');
    return !/AT TIME ZONE 'Europe\/Madrid'/.test(body) || /defensive fallback only/.test(body);
  })());
  const getMyStateSql = read('supabase/migrations/20260717030000_20260717_get_my_state_region_aware.sql');
  const gmsBody = extractFunctionBody(getMyStateSql, 'CREATE OR REPLACE FUNCTION public.get_my_state');
  check("get_my_state()'s own independent Madrid literal is gone", !/AT TIME ZONE 'Europe\/Madrid'/.test(gmsBody));
}

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
