// Verification script for the notification eligibility engine.
// Run: npx tsx scripts/verify-notification-eligibility.ts
//
// Tests src/lib/notificationEligibility.ts — the pure, Node-testable
// MIRROR of the real Deno logic in
// supabase/functions/_shared/eligibility.ts. See that file's header for
// what this proves and doesn't prove (the actual server-side Edge
// Function has not been executed in this environment — no Deno runtime
// available here).

import {
  isEligibleForNextDay, isEligibleForLastCall, selectNextDayCopy, selectLastCallCopy,
  selectPreferredSubscription,
  type EligibilityConfig, type PlayerNotificationState, type SubscriptionCandidate,
} from '../src/lib/notificationEligibility';
import { computeNextAttempt, MAX_ATTEMPTS, RETRY_DELAYS_MINUTES } from '../src/lib/notificationRetry';
import { shouldShowReminderPrompt, isWithinCooldown, recordDismissal, type PromptStore } from '../src/lib/promptCooldown';
import { simulateRegisterSubscription, type SubscriptionRow } from '../src/lib/subscriptionOwnership';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function createMemoryPromptStore(): PromptStore {
  const map = new Map<string, string>();
  return { get: (k) => map.get(k) ?? null, set: (k, v) => { map.set(k, v); } };
}

let passed = 0;
let failed = 0;
function check(label: string, condition: boolean, detail?: string) {
  if (condition) { passed++; console.log(`  ok  - ${label}`); }
  else { failed++; console.log(`FAIL  - ${label}${detail ? ` (${detail})` : ''}`); }
}

const baseConfig: EligibilityConfig = {
  globalPushEnabled: true,
  nextDayEnabled: true,
  lastCallEnabled: true,
  lastCallMinutesBeforeCutoff: 120,
  minSpacingHours: 4,
};

function baseState(overrides: Partial<PlayerNotificationState> = {}): PlayerNotificationState {
  return {
    userStatus: 'active',
    currentStreak: 3,
    lastPlayDate: '2026-07-13',
    pushEnabled: true,
    nextDayEnabled: true,
    lastCallEnabled: true,
    hasActiveSubscription: true,
    alreadySentNextDayToday: false,
    alreadySentLastCallToday: false,
    minutesSinceLastNotification: null,
    ...overrides,
  };
}

console.log('\n== Next-day eligibility ==');
{
  const r = isEligibleForNextDay(baseState({ lastPlayDate: '2026-07-13' }), baseConfig, '2026-07-13', false);
  check('played previous game day, not today, opted in -> eligible', r.eligible, r.reason);
}
{
  const r = isEligibleForNextDay(baseState({ lastPlayDate: '2026-07-13' }), baseConfig, '2026-07-13', true);
  check('already played today -> not eligible', !r.eligible && r.reason === 'already_played_today', r.reason);
}
{
  const r = isEligibleForNextDay(baseState({ lastPlayDate: '2026-07-11' }), baseConfig, '2026-07-13', false);
  check('did not play previous game day -> not eligible', !r.eligible && r.reason === 'did_not_play_previous_game_day', r.reason);
}
{
  const r = isEligibleForNextDay(baseState({ hasActiveSubscription: false }), baseConfig, '2026-07-13', false);
  check('no subscription -> not eligible', !r.eligible && r.reason === 'no_active_subscription', r.reason);
}
{
  const r = isEligibleForNextDay(baseState({ nextDayEnabled: false }), baseConfig, '2026-07-13', false);
  check('preference disabled -> not eligible', !r.eligible && r.reason === 'player_next_day_disabled', r.reason);
}
{
  const r = isEligibleForNextDay(baseState({ alreadySentNextDayToday: true }), baseConfig, '2026-07-13', false);
  check('already sent today -> not eligible', !r.eligible && r.reason === 'already_sent_today', r.reason);
}
{
  const r = isEligibleForNextDay(baseState({ userStatus: 'banned' }), baseConfig, '2026-07-13', false);
  check('suspended/banned player -> not eligible', !r.eligible && r.reason === 'player_not_active', r.reason);
}
{
  // Works after both survive and fail — the engine has no streak
  // requirement at all, only "played" (regardless of outcome).
  const r = isEligibleForNextDay(baseState({ currentStreak: 0, lastPlayDate: '2026-07-13' }), baseConfig, '2026-07-13', false);
  check('no active streak (failed previous day) still eligible for reactivation', r.eligible, r.reason);
}

console.log('\n== Last-call eligibility ==');
{
  const r = isEligibleForLastCall(baseState(), baseConfig, 60, false);
  check('not played today, inside window -> eligible', r.eligible, r.reason);
}
{
  const r = isEligibleForLastCall(baseState(), baseConfig, 60, true);
  check('already played today -> not eligible', !r.eligible && r.reason === 'already_played_today', r.reason);
}
{
  const r = isEligibleForLastCall(baseState(), baseConfig, 200, false);
  check('outside window (too early) -> not eligible', !r.eligible && r.reason === 'outside_last_call_window', r.reason);
}
{
  const r = isEligibleForLastCall(baseState(), baseConfig, 0, false);
  check('cutoff passed -> not eligible', !r.eligible && r.reason === 'cutoff_passed', r.reason);
}
{
  const r = isEligibleForLastCall(baseState({ alreadySentLastCallToday: true }), baseConfig, 60, false);
  check('already sent -> not eligible', !r.eligible && r.reason === 'already_sent_today', r.reason);
}
{
  const r = isEligibleForLastCall(baseState({ minutesSinceLastNotification: 30 }), baseConfig, 60, false);
  check('last notification sent too recently (min spacing) -> not eligible', !r.eligible && r.reason === 'min_spacing_not_elapsed', r.reason);
}
{
  const r = isEligibleForLastCall(baseState({ minutesSinceLastNotification: 300 }), baseConfig, 60, false);
  check('min spacing elapsed -> eligible', r.eligible, r.reason);
}
{
  const copy = selectLastCallCopy(5, { titleStreak: 'STREAK_T', bodyStreak: 'STREAK_B', titleNoStreak: 'NOSTREAK_T', bodyNoStreak: 'NOSTREAK_B' });
  check('active-streak copy selected correctly (streak > 0)', copy.title === 'STREAK_T' && copy.body === 'STREAK_B', JSON.stringify(copy));
}
{
  const copy = selectLastCallCopy(0, { titleStreak: 'STREAK_T', bodyStreak: 'STREAK_B', titleNoStreak: 'NOSTREAK_T', bodyNoStreak: 'NOSTREAK_B' });
  check('no-streak copy selected correctly (streak === 0)', copy.title === 'NOSTREAK_T' && copy.body === 'NOSTREAK_B', JSON.stringify(copy));
}
{
  const copy = selectNextDayCopy(3, { title: 'T', bodyStreak: 'BS', bodyNoStreak: 'BNS' });
  check('next-day active-streak body selected correctly', copy.body === 'BS', JSON.stringify(copy));
}
{
  const copy = selectNextDayCopy(0, { title: 'T', bodyStreak: 'BS', bodyNoStreak: 'BNS' });
  check('next-day no-streak body selected correctly', copy.body === 'BNS', JSON.stringify(copy));
}

console.log('\n== Global/type toggles ==');
{
  const r = isEligibleForNextDay(baseState(), { ...baseConfig, globalPushEnabled: false }, '2026-07-13', false);
  check('global push disabled -> not eligible', !r.eligible && r.reason === 'global_push_disabled', r.reason);
}
{
  const r = isEligibleForLastCall(baseState(), { ...baseConfig, lastCallEnabled: false }, 60, false);
  check('last-call type disabled globally -> not eligible', !r.eligible && r.reason === 'last_call_type_disabled', r.reason);
}

// Madrid-specific game-day/DST timing tests used to live here, testing
// minutesUntilMadridMidnight/isWithinLastCallWindow/nextMadridMidnight.
// Those functions were removed from notificationEligibility.ts when the
// Game Time System replaced the hardcoded-Madrid implementation with the
// generalized, region-aware src/lib/gameClock.ts — see
// PROJECT_CHANGELOG.md "Game Time System". That coverage is superseded
// by (not just moved to) scripts/verify-game-time.ts, which tests the
// same rollover/DST concepts more thoroughly across four real IANA
// timezones (Europe/Madrid, America/New_York, Asia/Tokyo,
// Australia/Sydney), not just Madrid.

console.log('\n== Bounded retry ==');
{
  const d = computeNextAttempt(1, null);
  check('first temporary failure schedules a retry (~5 min)', d.retry && d.nextAttemptAt !== null, JSON.stringify(d));
  const minutesAhead = d.nextAttemptAt ? (d.nextAttemptAt.getTime() - Date.now()) / 60000 : 0;
  check('retry 1 delay is approximately 5 minutes', Math.abs(minutesAhead - RETRY_DELAYS_MINUTES[0]) < 0.1, String(minutesAhead));
}
{
  const d = computeNextAttempt(2, null);
  check('second temporary failure schedules a retry (~15 min)', d.retry, JSON.stringify(d));
  const minutesAhead = d.nextAttemptAt ? (d.nextAttemptAt.getTime() - Date.now()) / 60000 : 0;
  check('retry 2 delay is approximately 15 minutes', Math.abs(minutesAhead - RETRY_DELAYS_MINUTES[1]) < 0.1, String(minutesAhead));
}
{
  const d = computeNextAttempt(MAX_ATTEMPTS, null);
  check('maximum attempt count stops retries', !d.retry && d.nextAttemptAt === null, JSON.stringify(d));
}
{
  const now = new Date();
  const expiresInTwoMinutes = new Date(now.getTime() + 2 * 60000);
  const d = computeNextAttempt(1, expiresInTwoMinutes, now); // retry-1 delay (5min) would exceed a 2-min-away expiry
  check('last-call expiry stops a retry that would cross the real cutoff', !d.retry && d.nextAttemptAt === null, JSON.stringify(d));
}
{
  const now = new Date();
  const expiresInOneHour = new Date(now.getTime() + 60 * 60000);
  const d = computeNextAttempt(1, expiresInOneHour, now);
  check('retry allowed when comfortably before expiry', d.retry, JSON.stringify(d));
}
// "Retry before next_attempt_at is skipped" / "after next_attempt_at is allowed" /
// "success stops retries" / "permanent failure stops retries" are all
// properties of the SQL claim query + scheduler status transitions
// (next_attempt_at <= now(), and next_attempt_at set to NULL on success/
// permanent failure/exhaustion) — not expressible as a pure function call
// the way the retry-delay math is. Documented, not pure-logic-testable
// here; see PROJECT_CHANGELOG.md "Real database verification status."
// "Two scheduler workers cannot both claim the same job" is FOR UPDATE
// SKIP LOCKED — a real Postgres row-locking guarantee, not something a
// Node script can simulate meaningfully; verified by static SQL review
// (see the migration's own header comment), not executed here.

console.log('\n== Preferred-device selection ==');
{
  const single: SubscriptionCandidate[] = [{ id: 'a', enabled: true, lastSuccessAt: null, updatedAt: '2026-01-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' }];
  check('user with one device gets that device', selectPreferredSubscription(single)?.id === 'a');
}
{
  const three: SubscriptionCandidate[] = [
    { id: 'old-success', enabled: true, lastSuccessAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-05T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' },
    { id: 'recent-success', enabled: true, lastSuccessAt: '2026-01-10T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' },
    { id: 'no-success', enabled: true, lastSuccessAt: null, updatedAt: '2026-01-12T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' },
  ];
  const chosen = selectPreferredSubscription(three);
  check('user with three devices -> one scheduled notification, using the device with the most recent successful delivery', chosen?.id === 'recent-success', chosen?.id);
}
{
  const noSuccessAtAll: SubscriptionCandidate[] = [
    { id: 'older', enabled: true, lastSuccessAt: null, updatedAt: '2026-01-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' },
    { id: 'newer', enabled: true, lastSuccessAt: null, updatedAt: '2026-01-05T00:00:00Z', createdAt: '2026-01-02T00:00:00Z' },
  ];
  check('with no successful delivery on any device, falls back to most recently updated', selectPreferredSubscription(noSuccessAtAll)?.id === 'newer');
}
{
  const preferredDisabled: SubscriptionCandidate[] = [
    { id: 'disabled-best', enabled: false, lastSuccessAt: '2026-01-10T00:00:00Z', updatedAt: '2026-01-10T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' },
    { id: 'active-fallback', enabled: true, lastSuccessAt: null, updatedAt: '2026-01-03T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' },
  ];
  check('preferred device disabled -> falls back to another active device', selectPreferredSubscription(preferredDisabled)?.id === 'active-fallback');
}
{
  check('no enabled device at all -> null (nothing to send to)', selectPreferredSubscription([{ id: 'x', enabled: false, lastSuccessAt: null, updatedAt: '2026-01-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' }]) === null);
}
// "Permanent failure causes the next active device to become preferred
// later" is a direct consequence of selectPreferredSubscription being
// re-run fresh at send time against currently-enabled devices only (the
// scheduler re-resolves the device at claim time, not just at job-creation
// time — see schedule-reactivation-notifications/index.ts's Phase B) —
// exercised by the "preferred device disabled" case immediately above,
// which models exactly that re-resolution.
// "Test send targets the current device" is enforced structurally:
// test-web-push sends directly to the requesting device's own
// subscription(s), never through selectPreferredSubscription at all.

console.log('\n== Subscription ownership (simulation — see file header) ==');
{
  const rows: SubscriptionRow[] = [];
  const res = simulateRegisterSubscription(rows, 'user-1', { endpoint: 'https://push.example.com/abc', p256dh: '0'.repeat(20), auth: '0'.repeat(10) });
  check('new endpoint registers normally', res.ok && !('reassigned' in res && res.reassigned));
  check('exactly one row created', rows.length === 1);
}
{
  const rows: SubscriptionRow[] = [];
  const input = { endpoint: 'https://push.example.com/same', p256dh: '0'.repeat(20), auth: '0'.repeat(10) };
  simulateRegisterSubscription(rows, 'user-1', input);
  const res2 = simulateRegisterSubscription(rows, 'user-1', input);
  check('same user re-registering the same endpoint is not treated as a reassignment', res2.ok && 'reassigned' in res2 && res2.reassigned === false);
  check('still exactly one row (no duplicate)', rows.length === 1);
}
{
  const rows: SubscriptionRow[] = [];
  const input = { endpoint: 'https://push.example.com/shared-device', p256dh: '0'.repeat(20), auth: '0'.repeat(10) };
  const first = simulateRegisterSubscription(rows, 'user-A', input);
  const second = simulateRegisterSubscription(rows, 'user-B', input);
  check('a different authenticated user registering the same browser endpoint succeeds', second.ok);
  check('ownership is reassigned to the new user', second.ok && 'reassigned' in second && second.reassigned === true);
  check('the row now belongs to user-B, not user-A', rows[0].userId === 'user-B');
  check('still exactly one row (no duplicate created for the same endpoint)', rows.length === 1);
  void first;
}
{
  const rows: SubscriptionRow[] = [];
  const res = simulateRegisterSubscription(rows, 'user-1', { endpoint: 'not-a-url', p256dh: '0'.repeat(20), auth: '0'.repeat(10) });
  check('malformed endpoint is rejected', !res.ok, JSON.stringify(res));
  check('no row created for a malformed endpoint', rows.length === 0);
}
{
  const rows: SubscriptionRow[] = [{
    id: 'sub-1', userId: 'user-1', endpoint: 'https://push.example.com/revoked', p256dhKey: 'old', authKey: 'old',
    enabled: false, revokedAt: '2026-01-01T00:00:00Z', failureCount: 3,
  }];
  const res = simulateRegisterSubscription(rows, 'user-1', { endpoint: 'https://push.example.com/revoked', p256dh: '1'.repeat(20), auth: '1'.repeat(10) });
  check('a revoked endpoint can be safely re-enabled by its current account', res.ok);
  check('re-enabling clears enabled/revoked/failure state', rows[0].enabled === true && rows[0].revokedAt === null && rows[0].failureCount === 0);
}
// "Client cannot submit another user_id" is enforced by construction —
// RegistrationInput has no user_id field at all; simulateRegisterSubscription
// only ever takes ownership from its own callerUserId parameter (which
// models auth.uid(), read server-side, never from client input) — there is
// no code path, real or simulated, for a caller to specify whose row they
// want to create/claim.

console.log('\n== Post-result prompt cooldown ==');
{
  const store = createMemoryPromptStore();
  const shows = shouldShowReminderPrompt({
    supported: true, permission: 'default', subscribed: false, isCashoutOpen: false, resultSettled: true,
    store, promptVersion: 1, cooldownMs: 7 * 24 * 60 * 60 * 1000,
  });
  check('first eligible result shows the prompt', shows);
}
{
  const store = createMemoryPromptStore();
  recordDismissal(store, 1, Date.now());
  const shows = shouldShowReminderPrompt({
    supported: true, permission: 'default', subscribed: false, isCashoutOpen: false, resultSettled: true,
    store, promptVersion: 1, cooldownMs: 7 * 24 * 60 * 60 * 1000,
  });
  check('dismissal hides the prompt immediately after', !shows);
}
{
  const store = createMemoryPromptStore();
  const dismissedAt = Date.now() - 3 * 24 * 60 * 60 * 1000; // 3 days ago
  recordDismissal(store, 1, dismissedAt);
  const stillInCooldown = isWithinCooldown(store, 1, 7 * 24 * 60 * 60 * 1000);
  check('a later result during the 7-day cooldown does not show it', stillInCooldown);
}
{
  const store = createMemoryPromptStore();
  const dismissedAt = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days ago — cooldown expired
  recordDismissal(store, 1, dismissedAt);
  const shows = shouldShowReminderPrompt({
    supported: true, permission: 'default', subscribed: false, isCashoutOpen: false, resultSettled: true,
    store, promptVersion: 1, cooldownMs: 7 * 24 * 60 * 60 * 1000,
  });
  check('expired cooldown allows the pre-permission prompt again', shows);
}
{
  const store = createMemoryPromptStore();
  recordDismissal(store, 1, Date.now());
  const shows = shouldShowReminderPrompt({
    supported: true, permission: 'denied', subscribed: false, isCashoutOpen: false, resultSettled: true,
    store, promptVersion: 1, cooldownMs: 7 * 24 * 60 * 60 * 1000,
  });
  check('permission denied permanently suppresses the result prompt (independent of cooldown state)', !shows);
}
// "Settings enable control remains available" during the cooldown is
// structural, not testable via this function: StreakRemindersCard.tsx
// (Settings) never calls shouldShowReminderPrompt or checks this cooldown
// at all — it's a completely separate, always-available flow. Confirmed
// by inspection (grep for promptCooldown imports outside
// ResultReminderPrompt.tsx returns nothing), not a unit test.

console.log('\n== Safe defaults ==');
{
  const config: EligibilityConfig = { globalPushEnabled: false, nextDayEnabled: true, lastCallEnabled: true, lastCallMinutesBeforeCutoff: 120, minSpacingHours: 4 };
  const state: PlayerNotificationState = {
    userStatus: 'active', currentStreak: 1, lastPlayDate: '2026-07-14', pushEnabled: true, nextDayEnabled: true, lastCallEnabled: true,
    hasActiveSubscription: true, alreadySentNextDayToday: false, alreadySentLastCallToday: false, minutesSinceLastNotification: null,
  };
  const r = isEligibleForNextDay(state, config, '2026-07-14', false);
  check('global disabled means no candidate selection, even if everything else is eligible', !r.eligible && r.reason === 'global_push_disabled', r.reason);
}
{
  const config: EligibilityConfig = { globalPushEnabled: true, nextDayEnabled: false, lastCallEnabled: true, lastCallMinutesBeforeCutoff: 120, minSpacingHours: 4 };
  const state: PlayerNotificationState = {
    userStatus: 'active', currentStreak: 1, lastPlayDate: '2026-07-14', pushEnabled: true, nextDayEnabled: true, lastCallEnabled: true,
    hasActiveSubscription: true, alreadySentNextDayToday: false, alreadySentLastCallToday: false, minutesSinceLastNotification: null,
  };
  const r = isEligibleForNextDay(state, config, '2026-07-14', false);
  check('type disabled means no candidate selection for that type', !r.eligible && r.reason === 'next_day_type_disabled', r.reason);
}
{
  // Static inspection of the actual seeded/forced values — not a live
  // database read, but a real check against the exact migration text
  // that will run, catching a copy-paste regression in the default.
  const seedSql = readFileSync(join(__dirname, '../supabase/migrations/20260714010000_20260714_push_settings.sql'), 'utf8');
  const fixSql = readFileSync(join(__dirname, '../supabase/migrations/20260714050000_20260714_push_safe_defaults.sql'), 'utf8');
  check("push_global_enabled seeded false in the original migration", /'push_global_enabled',\s*'false'::jsonb/.test(seedSql));
  check("push_test_mode seeded true in the original migration", /'push_test_mode',\s*'true'::jsonb/.test(seedSql));
  check("a later migration forces push_next_day_enabled to false", /key = 'push_next_day_enabled'/.test(fixSql) && /'false'::jsonb/.test(fixSql));
  check("a later migration forces push_last_call_enabled to false", /key = 'push_last_call_enabled'/.test(fixSql));
  check("the Cron template contains no bare active cron.schedule call (commented out)", (() => {
    const cronSql = readFileSync(join(__dirname, '../supabase/migrations/20260714020000_20260714_reactivation_cron_template.sql'), 'utf8');
    const activeLines = cronSql.split('\n').filter((l) => l.trim().startsWith('SELECT cron.schedule'));
    return activeLines.length === 0; // only commented (-- prefixed) occurrences should exist
  })());
}

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
