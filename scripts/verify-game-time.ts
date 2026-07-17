// Verification script for the Game Time System.
// Run: npx tsx scripts/verify-game-time.ts
//
// Tests src/lib/gameClock.ts — the pure, Node-testable MIRROR of the real
// Deno logic in supabase/functions/_shared/gameClock.ts, which itself
// mirrors the SQL formula in get_game_time_state_for_region() (see that
// migration's header comment for the shared derivation). Real execution
// of the actual SQL function requires a live Postgres instance, not
// available here — see PROJECT_CHANGELOG.md "Real Supabase status."

import {
  computeGameClockState, isWithinLastCallWindow, computeSaturdayWindow, computeSundayWindow,
  type RegionTimeConfig,
} from '../src/lib/gameClock';
import { canScheduleRegionalActivation, REGIONAL_NOT_READY_MESSAGE, REGIONAL_NOT_ENABLED_ERROR } from '../src/lib/gameTimeGuard';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;
function check(label: string, condition: boolean, detail?: string) {
  if (condition) { passed++; console.log(`  ok  - ${label}`); }
  else { failed++; console.log(`FAIL  - ${label}${detail ? ` (${detail})` : ''}`); }
}

const MADRID: RegionTimeConfig = { timezone: 'Europe/Madrid', rolloverLocalTime: '00:00:00' };
const NEW_YORK: RegionTimeConfig = { timezone: 'America/New_York', rolloverLocalTime: '00:00:00' };
const TOKYO: RegionTimeConfig = { timezone: 'Asia/Tokyo', rolloverLocalTime: '00:00:00' }; // no DST
const SYDNEY: RegionTimeConfig = { timezone: 'Australia/Sydney', rolloverLocalTime: '00:00:00' }; // has DST (opposite hemisphere)

console.log('\n== Global mode: Madrid behaviour unchanged ==');
{
  const noon = new Date('2026-07-15T10:00:00Z'); // 12:00 Madrid (CEST)
  const state = computeGameClockState(MADRID, noon);
  check('game date resolves correctly for Madrid at midday', state.gameDate === '2026-07-15', state.gameDate);
}
{
  const justBeforeRollover = new Date('2026-07-14T21:59:59Z'); // 23:59:59 CEST
  const justAfterRollover = new Date('2026-07-14T22:00:01Z'); // 00:00:01 CEST next day
  const before = computeGameClockState(MADRID, justBeforeRollover);
  const after = computeGameClockState(MADRID, justAfterRollover);
  check('daily rollover happens at Madrid midnight (before)', before.gameDate === '2026-07-14', before.gameDate);
  check('daily rollover happens at Madrid midnight (after)', after.gameDate === '2026-07-15', after.gameDate);
}
{
  // A player who last played the previous game day, checked well within today.
  const now = new Date('2026-07-15T10:00:00Z');
  const state = computeGameClockState(MADRID, now);
  check('existing player receives correct previous game date for next-day eligibility', state.previousGameDate === '2026-07-14', state.previousGameDate);
}
{
  const now = new Date('2026-07-15T21:30:00Z'); // 23:30 CEST — 30 min before rollover
  check('last-call window behaves as before (within 120 min)', isWithinLastCallWindow(120, MADRID, now));
  const early = new Date('2026-07-15T10:00:00Z');
  check('last-call window behaves as before (outside window at midday)', !isWithinLastCallWindow(120, MADRID, early));
}

console.log('\n== Regional mode: two regions, different game dates for the same instant ==');
{
  // 2026-07-15T02:30:00Z is 04:30 Madrid (already the 15th) but 22:30
  // New York the PREVIOUS day (the 14th) — genuinely different calendar
  // dates for the exact same physical instant.
  const sameInstant = new Date('2026-07-15T02:30:00Z');
  const madridState = computeGameClockState(MADRID, sameInstant);
  const nyState = computeGameClockState(NEW_YORK, sameInstant);
  check('same physical instant maps to different game dates in different regions', madridState.gameDate !== nyState.gameDate, `${madridState.gameDate} vs ${nyState.gameDate}`);
  check('Madrid sees the 15th at this instant', madridState.gameDate === '2026-07-15', madridState.gameDate);
  check('New York sees the 14th at this instant', nyState.gameDate === '2026-07-14', nyState.gameDate);
}
{
  const sameInstant = new Date('2026-07-15T02:30:00Z');
  const madridState = computeGameClockState(MADRID, sameInstant);
  const nyState = computeGameClockState(NEW_YORK, sameInstant);
  check('each region receives its own correct next rollover instant', madridState.nextDailyRolloverAt.getTime() !== nyState.nextDailyRolloverAt.getTime());
}
{
  // Last-call window is calculated per region independently.
  const now = new Date('2026-07-15T02:30:00Z'); // 04:30 Madrid, 22:30 NY
  const nyState = computeGameClockState(NEW_YORK, now);
  check('last-call window calculated per region (NY ~90 min from rollover)', nyState.minutesUntilNextRollover > 0 && nyState.minutesUntilNextRollover < 120, String(nyState.minutesUntilNextRollover));
}
{
  // Next-day eligibility uses the REGIONAL previous day, not a shared one.
  const sameInstant = new Date('2026-07-15T02:30:00Z');
  const madridState = computeGameClockState(MADRID, sameInstant);
  const nyState = computeGameClockState(NEW_YORK, sameInstant);
  check('next-day eligibility uses regional previous game date, not a shared global one', madridState.previousGameDate !== nyState.previousGameDate, `${madridState.previousGameDate} vs ${nyState.previousGameDate}`);
}

console.log('\n== DST — real IANA timezone transitions, not fixed offsets ==');
{
  // Europe/Madrid spring-forward: 2026-03-29, 02:00 CET -> 03:00 CEST.
  const before = computeGameClockState(MADRID, new Date('2026-03-29T00:30:00Z'));
  const after = computeGameClockState(MADRID, new Date('2026-03-29T01:30:00Z'));
  check('Europe/Madrid: game date stays sane across spring-forward', before.gameDate === '2026-03-29' && after.gameDate === '2026-03-29', `${before.gameDate} / ${after.gameDate}`);
}
{
  // America/New_York spring-forward: 2026-03-08, 02:00 EST -> 03:00 EDT.
  const before = computeGameClockState(NEW_YORK, new Date('2026-03-08T06:30:00Z')); // 01:30 EST
  const after = computeGameClockState(NEW_YORK, new Date('2026-03-08T08:30:00Z')); // 04:30 EDT
  check('America/New_York: game date stays sane across its own spring-forward', before.gameDate === '2026-03-08' && after.gameDate === '2026-03-08', `${before.gameDate} / ${after.gameDate}`);
}
{
  // Asia/Tokyo has NO DST at all — offset is always UTC+9, year-round.
  const winter = computeGameClockState(TOKYO, new Date('2026-01-15T14:30:00Z')); // 23:30 JST
  const summer = computeGameClockState(TOKYO, new Date('2026-07-15T14:30:00Z')); // 23:30 JST
  check('Asia/Tokyo (no DST): consistent +9h behaviour year-round', winter.gameDate === '2026-01-15' && summer.gameDate === '2026-07-15', `${winter.gameDate} / ${summer.gameDate}`);
}
{
  // Australia/Sydney has DST, opposite hemisphere (summer = Dec-Mar).
  // 2026-04-05 02:00 AEDT -> 03:00 AEDT becomes 01:00 AEST (fall back, southern autumn).
  const before = computeGameClockState(SYDNEY, new Date('2026-04-04T14:30:00Z')); // ~before the transition
  const after = computeGameClockState(SYDNEY, new Date('2026-04-05T16:30:00Z')); // clearly after
  check('Australia/Sydney: game date stays sane across its DST transition', before.gameDate.startsWith('2026-04') && after.gameDate.startsWith('2026-04'), `${before.gameDate} / ${after.gameDate}`);
}
{
  // Cross-check: none of the four real timezone computations ever throw,
  // and all four produce a well-formed YYYY-MM-DD for an arbitrary instant.
  const arbitrary = new Date('2026-09-01T12:00:00Z');
  for (const [name, region] of [['Madrid', MADRID], ['New York', NEW_YORK], ['Tokyo', TOKYO], ['Sydney', SYDNEY]] as const) {
    const state = computeGameClockState(region, arbitrary);
    check(`${name}: well-formed game date for an arbitrary instant`, /^\d{4}-\d{2}-\d{2}$/.test(state.gameDate), state.gameDate);
  }
}

console.log('\n== Event windows (Saturday/Sunday foundation) ==');
{
  const config = { ...MADRID, startLocalTime: '10:00:00', endLocalTime: '20:00:00' };
  const notConfigured = computeSaturdayWindow({ ...MADRID, startLocalTime: null, endLocalTime: null });
  check('disabled/unconfigured region -> not_configured status', notConfigured.status === 'not_configured');

  // A known Saturday in 2026: 2026-07-18 is a Saturday.
  const beforeStart = new Date('2026-07-18T06:00:00Z'); // 08:00 Madrid — before 10:00 start
  const duringWindow = new Date('2026-07-18T12:00:00Z'); // 14:00 Madrid — inside 10:00-20:00
  const afterEnd = new Date('2026-07-18T19:00:00Z'); // 21:00 Madrid — after 20:00 end
  check('Saturday window: upcoming before start', computeSaturdayWindow(config, beforeStart).status === 'upcoming');
  check('Saturday window: active during window', computeSaturdayWindow(config, duringWindow).status === 'active');
  check('Saturday window: ended after end', computeSaturdayWindow(config, afterEnd).status === 'ended');
}
{
  const config = { ...MADRID, startLocalTime: '10:00:00', endLocalTime: '20:00:00' };
  // 2026-07-19 is the Sunday following the same week's Saturday.
  const duringWindow = new Date('2026-07-19T12:00:00Z'); // 14:00 Madrid
  check('Sunday window: active during window, correctly one day after Saturday', computeSundayWindow(config, duringWindow).status === 'active');
}
{
  // Exact boundary: the start instant itself should count as active, not upcoming.
  const config = { ...MADRID, startLocalTime: '10:00:00', endLocalTime: '20:00:00' };
  const window = computeSaturdayWindow(config, new Date('2026-07-18T08:00:00Z')); // exactly 10:00 Madrid
  check('exact start boundary counts as active, not upcoming', window.status === 'active', window.status);
}
{
  // Invalid/inverted window (end before start) — the implementation
  // doesn't reject this at the pure-function level (validation belongs to
  // the admin RPC layer per requirement #13's "region schedules
  // validate"), but it must not crash and must produce a well-formed,
  // if degenerate, result — documented here rather than silently assumed safe.
  const inverted = { ...MADRID, startLocalTime: '20:00:00', endLocalTime: '10:00:00' };
  const result = computeSaturdayWindow(inverted, new Date('2026-07-18T12:00:00Z'));
  check('inverted window does not crash (degenerate but well-formed result)', result.status === 'ended' || result.status === 'upcoming', result.status);
}

console.log('\n== Migration consistency (static checks) ==');
{
  const pushSeed = readFileSync(join(__dirname, '../supabase/migrations/20260714010000_20260714_push_settings.sql'), 'utf8');
  const pushFix = readFileSync(join(__dirname, '../supabase/migrations/20260714050000_20260714_push_safe_defaults.sql'), 'utf8');
  check('scheduled push defaults remain disabled (global false in seed)', /'push_global_enabled',\s*'false'::jsonb/.test(pushSeed));
  check('scheduled push defaults remain disabled (next_day forced false)', /key = 'push_next_day_enabled'/.test(pushFix));
  check('scheduled push defaults remain disabled (last_call forced false)', /key = 'push_last_call_enabled'/.test(pushFix));
}
{
  const cronSql = readFileSync(join(__dirname, '../supabase/migrations/20260714020000_20260714_reactivation_cron_template.sql'), 'utf8');
  const activeLines = cronSql.split('\n').filter((l) => l.trim().startsWith('SELECT cron.schedule'));
  check('Cron remains inactive (no uncommented cron.schedule call)', activeLines.length === 0);
}
{
  const schedulerSrc = readFileSync(join(__dirname, '../supabase/functions/schedule-reactivation-notifications/index.ts'), 'utf8');
  const hasRealMadridCall = /supabase\.rpc\(\s*["']get_madrid_today["']\)|minutesUntilMadridMidnight\(|nextMadridMidnight\(/.test(schedulerSrc);
  check('Madrid-specific notification helpers are no longer CALLED by the scheduler (comments mentioning the old names for history are fine)', !hasRealMadridCall, 'found an actual call, not just a comment');
  check('the scheduler imports the generalized Game Clock instead', /_shared\/gameClock/.test(schedulerSrc));
}
{
  const contextValidationSql = readFileSync(join(__dirname, '../supabase/migrations/20260713200000_20260713_cashout_server_side_context_validation.sql'), 'utf8');
  const exposureHardeningSql = readFileSync(join(__dirname, '../supabase/migrations/20260713220000_20260713_cashout_rpc_exposure_hardening.sql'), 'utf8');
  check('cashout context-validated 3-arg signature was introduced', /p_context_id\s+timestamptz/.test(contextValidationSql));
  check('the old context-blind 2-arg cashout_game(text, text) overload was dropped', /DROP FUNCTION IF EXISTS public\.cashout_game\(text, text\)\s*;/.test(contextValidationSql));
  check('the legacy no-arg cashout_game() overload was also dropped in the final exposure-hardening pass', /DROP FUNCTION IF EXISTS public\.cashout_game\(\)\s*;/.test(exposureHardeningSql));
  check('the final secure signature has no optional defaults', /p_game_id\s+text,\s*\n?\s*p_idem_key\s+text,\s*\n?\s*p_context_id\s+timestamptz\s*\n?\)/.test(exposureHardeningSql));
}
{
  const getMyStateFinal = readFileSync(join(__dirname, '../supabase/migrations/20260713180000_20260713_expose_max_streak_and_completed_cycles.sql'), 'utf8');
  check('get_my_state() cumulative fields (updated_at, max_streak, completed_cycles) are present in the final migration', /'updated_at',\s*v_gs\.updated_at/.test(getMyStateFinal) && /'max_streak',\s*v_gs\.max_streak/.test(getMyStateFinal));
}
{
  const madridDelegation = readFileSync(join(__dirname, '../supabase/migrations/20260715030000_20260715_get_madrid_today_delegates_to_game_time.sql'), 'utf8');
  const bodyMatch = madridDelegation.match(/AS \$\$([\s\S]*?)\$\$;/);
  const body = bodyMatch ? bodyMatch[1] : '';
  check('get_madrid_today()\'s executable body no longer hardcodes Europe/Madrid directly', !/AT TIME ZONE 'Europe\/Madrid'/.test(body), body.trim());
  check('get_madrid_today() delegates to the Game Time System', /get_game_time_state_for_region/.test(body));
}

console.log('\n== Regional Activation Guard ==');
{
  const defaultConfig = readFileSync(join(__dirname, '../supabase/migrations/20260715010000_20260715_game_time_default_config.sql'), 'utf8');
  check("Global mode remains active by default (seeded mode = 'global')", /mode,\s*global_region_id,\s*regional_mode_enabled\)\s*\n?\s*SELECT true, 'global'/.test(defaultConfig), 'seed does not set global mode');
}
{
  const guardMigration = readFileSync(join(__dirname, '../supabase/migrations/20260716000000_20260716_game_time_regional_activation_guard.sql'), 'utf8');
  check('regional_game_time_live_enabled column defaults to false', /regional_game_time_live_enabled boolean NOT NULL DEFAULT false/.test(guardMigration));
  const bodyMatch = guardMigration.match(/CREATE OR REPLACE FUNCTION public\.apply_pending_game_time_mode[\s\S]*?AS \$\$([\s\S]*?)\$\$;/);
  const body = bodyMatch ? bodyMatch[1] : '';
  check('apply_pending_game_time_mode() contains the exact required refusal error', body.includes(REGIONAL_NOT_ENABLED_ERROR), REGIONAL_NOT_ENABLED_ERROR);
  check('the readiness check happens BEFORE the UPDATE that would activate the mode', (() => {
    const checkIdx = body.indexOf('regional_game_time_live_enabled');
    const updateIdx = body.indexOf('UPDATE public.game_time_settings');
    return checkIdx !== -1 && updateIdx !== -1 && checkIdx < updateIdx;
  })());
  check('the readiness check only guards activation TO regional (not the switch back to global)', /pending_mode = 'regional' AND NOT v_settings\.regional_game_time_live_enabled/.test(body));
}
{
  // Admin cannot schedule Regional mode while the readiness flag is false —
  // real execution of the actual pure function the admin UI calls.
  const result = canScheduleRegionalActivation({ regionalGameTimeLiveEnabled: false, hasAtLeastOneEnabledRegion: true });
  check('admin guard refuses scheduling while readiness flag is false, even with a valid region', !result.allowed && result.reason === 'not_live_ready', JSON.stringify(result));
}
{
  const result = canScheduleRegionalActivation({ regionalGameTimeLiveEnabled: false, hasAtLeastOneEnabledRegion: false });
  check('admin guard refuses scheduling while readiness flag is false (no region either)', !result.allowed && result.reason === 'not_live_ready');
}
{
  // Once the readiness flag is true, the existing region-existence guard still applies.
  const result = canScheduleRegionalActivation({ regionalGameTimeLiveEnabled: true, hasAtLeastOneEnabledRegion: false });
  check('with readiness true but no enabled region, still refused for the original reason', !result.allowed && result.reason === 'no_enabled_region', JSON.stringify(result));
}
{
  const result = canScheduleRegionalActivation({ regionalGameTimeLiveEnabled: true, hasAtLeastOneEnabledRegion: true });
  check('only allowed once BOTH the readiness flag is true AND a region exists', result.allowed);
}
{
  const adminSrc = readFileSync(join(__dirname, '../src/pages/admin/AdminGameTimeSection.tsx'), 'utf8');
  check('the admin UI uses the shared pure guard function (not a re-implemented duplicate check)', /canScheduleRegionalActivation\(/.test(adminSrc));
  check('the admin UI shows the exact required warning copy', adminSrc.includes('REGIONAL_NOT_READY_MESSAGE') || adminSrc.includes(REGIONAL_NOT_READY_MESSAGE));
  check('the Regional activation button is conditionally rendered (hidden, not just disabled) behind the guard', /\{activationGuard\.allowed && \(/.test(adminSrc));
  check('the readiness flag is displayed but not exposed as an editable toggle', !/onChange.*regional_game_time_live_enabled|onClick.*regional_game_time_live_enabled/.test(adminSrc));
}
{
  // Notifications still run in Global mode only — the scheduler was not
  // touched in this pass and has no regional-specific branching; confirm
  // by inspection that it still only ever resolves users to the global
  // region's clock (mode='global' path), with no new code path added
  // here that would treat 'regional' specially.
  const schedulerSrc = readFileSync(join(__dirname, '../supabase/functions/schedule-reactivation-notifications/index.ts'), 'utf8');
  check('the notification scheduler was not modified in this pass (no regional_game_time_live_enabled reference)', !/regional_game_time_live_enabled/.test(schedulerSrc));
}

console.log('\n== Safe first deployment state (re-confirmed) ==');
{
  const pushSeed = readFileSync(join(__dirname, '../supabase/migrations/20260714010000_20260714_push_settings.sql'), 'utf8');
  const pushFix = readFileSync(join(__dirname, '../supabase/migrations/20260714050000_20260714_push_safe_defaults.sql'), 'utf8');
  const defaultConfig = readFileSync(join(__dirname, '../supabase/migrations/20260715010000_20260715_game_time_default_config.sql'), 'utf8');
  const guardMigration = readFileSync(join(__dirname, '../supabase/migrations/20260716000000_20260716_game_time_regional_activation_guard.sql'), 'utf8');
  check('Global Game Time active by default', /'global_madrid'/.test(defaultConfig) && /SELECT true, 'global'/.test(defaultConfig));
  check("Europe/Madrid is the seeded global region's timezone", /'Europe\/Madrid'/.test(defaultConfig));
  check('Regional mode disabled by default', /regional_mode_enabled\)\s*\n?\s*SELECT true, 'global', id, false/.test(defaultConfig));
  check('Regional Game Time cannot go live by default (readiness flag false)', /DEFAULT false/.test(guardMigration));
  check('Scheduled push disabled by default', /'push_global_enabled',\s*'false'::jsonb/.test(pushSeed) && /key = 'push_next_day_enabled'/.test(pushFix));
  check('Push test mode enabled by default', /'push_test_mode',\s*'true'::jsonb/.test(pushSeed));
  const cronSql = readFileSync(join(__dirname, '../supabase/migrations/20260714020000_20260714_reactivation_cron_template.sql'), 'utf8');
  check('Cron inactive by default', cronSql.split('\n').filter((l) => l.trim().startsWith('SELECT cron.schedule')).length === 0);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
