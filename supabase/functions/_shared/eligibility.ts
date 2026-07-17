// Centralized notification eligibility engine.
//
// This is the ONE place eligibility is decided — schedule-reactivation-
// notifications calls these functions rather than each notification type
// having its own scattered checks. send-web-push never makes eligibility
// decisions; it only delivers what it's told to.
//
// A mirrored, independently-executable copy of this logic lives at
// src/lib/notificationEligibility.ts for verification purposes (this
// Deno module can't be run directly by the Node-based test scripts in
// this project) — see that file's header for how the two are kept in
// sync, and PROJECT_CHANGELOG.md "Tests run" for what that mirror does
// and doesn't prove.

export interface EligibilityConfig {
  globalPushEnabled: boolean;
  nextDayEnabled: boolean;
  lastCallEnabled: boolean;
  lastCallMinutesBeforeCutoff: number;
  minSpacingHours: number;
}

export interface PlayerNotificationState {
  userStatus: string; // 'active' | 'banned'
  currentStreak: number;
  lastPlayDate: string | null; // 'YYYY-MM-DD' or null
  pushEnabled: boolean;
  nextDayEnabled: boolean;
  lastCallEnabled: boolean;
  hasActiveSubscription: boolean;
  alreadySentNextDayToday: boolean;
  alreadySentLastCallToday: boolean;
  /** Minutes since the player's most recent STS notification of any type, or null if none yet. */
  minutesSinceLastNotification: number | null;
}

export interface EligibilityResult {
  eligible: boolean;
  reason: string;
}

function ok(): EligibilityResult {
  return { eligible: true, reason: "eligible" };
}
function no(reason: string): EligibilityResult {
  return { eligible: false, reason };
}

/**
 * Next-day reactivation: bring the player back once a new challenge is
 * available. Works after both survive and fail — does not require an
 * active streak, since the objective is reactivation, not only streak
 * protection. `gameDate`/`previousGameDate` are 'YYYY-MM-DD' strings
 * derived from the authoritative `get_madrid_today()` value — never
 * computed independently here.
 */
export function isEligibleForNextDay(
  state: PlayerNotificationState,
  config: EligibilityConfig,
  previousGameDate: string,
  playedToday: boolean,
): EligibilityResult {
  if (state.userStatus !== "active") return no("player_not_active");
  if (!config.globalPushEnabled) return no("global_push_disabled");
  if (!config.nextDayEnabled) return no("next_day_type_disabled");
  if (!state.pushEnabled) return no("player_push_disabled");
  if (!state.nextDayEnabled) return no("player_next_day_disabled");
  if (!state.hasActiveSubscription) return no("no_active_subscription");
  if (state.lastPlayDate !== previousGameDate) return no("did_not_play_previous_game_day");
  if (playedToday) return no("already_played_today");
  if (state.alreadySentNextDayToday) return no("already_sent_today");
  if (state.minutesSinceLastNotification !== null && state.minutesSinceLastNotification < config.minSpacingHours * 60) {
    return no("min_spacing_not_elapsed");
  }
  return ok();
}

/**
 * Last-call: remind the player the daily opportunity is closing soon.
 * `minutesUntilCutoff` comes from the shared Game Clock
 * (src/lib/gameClock.ts / supabase/functions/_shared/gameClock.ts),
 * which uses each region's own configured IANA timezone and rollover
 * time — never the Edge Function server's local time, never a hardcoded
 * Madrid assumption.
 */
export function isEligibleForLastCall(
  state: PlayerNotificationState,
  config: EligibilityConfig,
  minutesUntilCutoff: number,
  playedToday: boolean,
): EligibilityResult {
  if (state.userStatus !== "active") return no("player_not_active");
  if (!config.globalPushEnabled) return no("global_push_disabled");
  if (!config.lastCallEnabled) return no("last_call_type_disabled");
  if (!state.pushEnabled) return no("player_push_disabled");
  if (!state.lastCallEnabled) return no("player_last_call_disabled");
  if (!state.hasActiveSubscription) return no("no_active_subscription");
  if (playedToday) return no("already_played_today");
  if (minutesUntilCutoff <= 0) return no("cutoff_passed");
  if (minutesUntilCutoff > config.lastCallMinutesBeforeCutoff) return no("outside_last_call_window");
  if (state.alreadySentLastCallToday) return no("already_sent_today");
  if (state.minutesSinceLastNotification !== null && state.minutesSinceLastNotification < config.minSpacingHours * 60) {
    return no("min_spacing_not_elapsed");
  }
  return ok();
}

/** Selects the correct copy variant. Streak-risk language is only ever used when currentStreak > 0 — never implied otherwise. */
export function selectNextDayCopy(
  currentStreak: number,
  titles: { title: string; bodyStreak: string; bodyNoStreak: string },
): { title: string; body: string } {
  return {
    title: titles.title,
    body: currentStreak > 0 ? titles.bodyStreak : titles.bodyNoStreak,
  };
}

export function selectLastCallCopy(
  currentStreak: number,
  titles: { titleStreak: string; bodyStreak: string; titleNoStreak: string; bodyNoStreak: string },
): { title: string; body: string } {
  return currentStreak > 0
    ? { title: titles.titleStreak, body: titles.bodyStreak }
    : { title: titles.titleNoStreak, body: titles.bodyNoStreak };
}

// ── Preferred-device selection ──────────────────────────────────────────
//
// Product rule: one next-day and one last-call notification PER PLAYER
// per game day — not per device. Phase 1's answer is "preferred device":
// scheduled sends target exactly one selected subscription per player;
// test sends remain device-specific (they call sendWebPush directly
// against the requesting device, never through this selector). See
// PROJECT_CHANGELOG.md "Preferred device selection" for the full
// rationale, including why fan-out-to-all-devices was rejected for
// scheduled sends specifically (it would violate the per-player rule,
// not just the per-device convenience of it).

export interface SubscriptionCandidate {
  id: string;
  enabled: boolean;
  lastSuccessAt: string | null;
  updatedAt: string;
  createdAt: string;
}

/**
 * Selection order: (1) must be enabled: (2) prefer the one with the most
 * recent successful delivery — a device that has proven it can actually
 * receive pushes; (3) otherwise the most recently updated active
 * subscription (which also naturally captures "most recently created"
 * as a corollary, since updated_at defaults to created_at and only
 * diverges once something changes — no separate tiebreak needed).
 * Returns null when there is no enabled subscription at all.
 */
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
