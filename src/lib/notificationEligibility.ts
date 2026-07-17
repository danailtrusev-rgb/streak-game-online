// Pure, Node-testable MIRROR of the real eligibility engine.
//
// The canonical, actually-running server-side logic lives in
// supabase/functions/_shared/eligibility.ts and
// supabase/functions/_shared/gameClock.ts (Deno, deployed as part of
// schedule-reactivation-notifications). This file is a byte-for-byte
// logical mirror, kept here purely so scripts/verify-notification-
// eligibility.ts can execute it with tsx in this Node-based sandbox,
// which has no Deno runtime available. If you change the eligibility
// rules, change BOTH files — this one does not import from or generate
// the Deno one; there is no automated sync.

export interface EligibilityConfig {
  globalPushEnabled: boolean;
  nextDayEnabled: boolean;
  lastCallEnabled: boolean;
  lastCallMinutesBeforeCutoff: number;
  minSpacingHours: number;
}

export interface PlayerNotificationState {
  userStatus: string;
  currentStreak: number;
  lastPlayDate: string | null;
  pushEnabled: boolean;
  nextDayEnabled: boolean;
  lastCallEnabled: boolean;
  hasActiveSubscription: boolean;
  alreadySentNextDayToday: boolean;
  alreadySentLastCallToday: boolean;
  minutesSinceLastNotification: number | null;
}

export interface EligibilityResult {
  eligible: boolean;
  reason: string;
}

function ok(): EligibilityResult { return { eligible: true, reason: 'eligible' }; }
function no(reason: string): EligibilityResult { return { eligible: false, reason }; }

export function isEligibleForNextDay(
  state: PlayerNotificationState,
  config: EligibilityConfig,
  previousGameDate: string,
  playedToday: boolean,
): EligibilityResult {
  if (state.userStatus !== 'active') return no('player_not_active');
  if (!config.globalPushEnabled) return no('global_push_disabled');
  if (!config.nextDayEnabled) return no('next_day_type_disabled');
  if (!state.pushEnabled) return no('player_push_disabled');
  if (!state.nextDayEnabled) return no('player_next_day_disabled');
  if (!state.hasActiveSubscription) return no('no_active_subscription');
  if (state.lastPlayDate !== previousGameDate) return no('did_not_play_previous_game_day');
  if (playedToday) return no('already_played_today');
  if (state.alreadySentNextDayToday) return no('already_sent_today');
  if (state.minutesSinceLastNotification !== null && state.minutesSinceLastNotification < config.minSpacingHours * 60) {
    return no('min_spacing_not_elapsed');
  }
  return ok();
}

export function isEligibleForLastCall(
  state: PlayerNotificationState,
  config: EligibilityConfig,
  minutesUntilCutoff: number,
  playedToday: boolean,
): EligibilityResult {
  if (state.userStatus !== 'active') return no('player_not_active');
  if (!config.globalPushEnabled) return no('global_push_disabled');
  if (!config.lastCallEnabled) return no('last_call_type_disabled');
  if (!state.pushEnabled) return no('player_push_disabled');
  if (!state.lastCallEnabled) return no('player_last_call_disabled');
  if (!state.hasActiveSubscription) return no('no_active_subscription');
  if (playedToday) return no('already_played_today');
  if (minutesUntilCutoff <= 0) return no('cutoff_passed');
  if (minutesUntilCutoff > config.lastCallMinutesBeforeCutoff) return no('outside_last_call_window');
  if (state.alreadySentLastCallToday) return no('already_sent_today');
  if (state.minutesSinceLastNotification !== null && state.minutesSinceLastNotification < config.minSpacingHours * 60) {
    return no('min_spacing_not_elapsed');
  }
  return ok();
}

export function selectNextDayCopy(
  currentStreak: number,
  titles: { title: string; bodyStreak: string; bodyNoStreak: string },
): { title: string; body: string } {
  return { title: titles.title, body: currentStreak > 0 ? titles.bodyStreak : titles.bodyNoStreak };
}

export function selectLastCallCopy(
  currentStreak: number,
  titles: { titleStreak: string; bodyStreak: string; titleNoStreak: string; bodyNoStreak: string },
): { title: string; body: string } {
  return currentStreak > 0
    ? { title: titles.titleStreak, body: titles.bodyStreak }
    : { title: titles.titleNoStreak, body: titles.bodyNoStreak };
}

// ── Preferred-device selection (mirror — see _shared/eligibility.ts) ────
export interface SubscriptionCandidate {
  id: string;
  enabled: boolean;
  lastSuccessAt: string | null;
  updatedAt: string;
  createdAt: string;
}

export function selectPreferredSubscription(subs: SubscriptionCandidate[]): SubscriptionCandidate | null {
  const enabled = subs.filter((s) => s.enabled);
  if (enabled.length === 0) return null;
  if (enabled.length === 1) return enabled[0];

  const withSuccess = enabled.filter((s) => s.lastSuccessAt !== null);
  if (withSuccess.length > 0) {
    return [...withSuccess].sort(
      (a, b) => new Date(b.lastSuccessAt as string).getTime() - new Date(a.lastSuccessAt as string).getTime(),
    )[0];
  }

  return [...enabled].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )[0];
}

// ── Mirror of gameDay.ts ────────────────────────────────────────────────
// SUPERSEDED — the Madrid-hardcoded minutesUntilMadridMidnight/
// isWithinLastCallWindow/nextMadridMidnight functions that used to live
// here have been replaced by the generalized, region-aware
// src/lib/gameClock.ts (computeGameClockState/isWithinLastCallWindow),
// which takes any IANA timezone + rollover time rather than hardcoding
// Europe/Madrid + midnight. See PROJECT_CHANGELOG.md "Game Time System"
// for the full refactor. Import from gameClock.ts instead.
