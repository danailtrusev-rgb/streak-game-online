// Bounded-retry decision logic for temporary Web Push failures.
// Shared by schedule-reactivation-notifications; mirrored (pure, no Deno
// APIs) in src/lib/notificationRetry.ts for verification-script execution.

export const MAX_ATTEMPTS = 3;
/** Delay before retry N (1-indexed) — i.e. index 0 is the wait after attempt 1 fails, before attempt 2. */
export const RETRY_DELAYS_MINUTES = [5, 15];

export interface RetryDecision {
  retry: boolean;
  nextAttemptAt: Date | null;
}

/**
 * `attemptCountAfterFailure` is the attempt_count value AFTER incrementing
 * for the failure that just happened (so 1 after the first attempt fails,
 * 2 after the second, etc.). Never schedules a retry past `expiresAt` —
 * this is what guarantees a last-call notification can never fire after
 * the real gameplay cutoff, since expiresAt is set to the exact cutoff
 * timestamp for last-call jobs (see gameClock.ts's computeGameClockState().nextDailyRolloverAt).
 */
export function computeNextAttempt(
  attemptCountAfterFailure: number,
  expiresAt: Date | null,
  now: Date = new Date(),
): RetryDecision {
  if (attemptCountAfterFailure >= MAX_ATTEMPTS) {
    return { retry: false, nextAttemptAt: null };
  }
  const delayMinutes = RETRY_DELAYS_MINUTES[attemptCountAfterFailure - 1] ?? RETRY_DELAYS_MINUTES[RETRY_DELAYS_MINUTES.length - 1];
  const candidate = new Date(now.getTime() + delayMinutes * 60000);
  if (expiresAt && candidate.getTime() >= expiresAt.getTime()) {
    return { retry: false, nextAttemptAt: null };
  }
  return { retry: true, nextAttemptAt: candidate };
}
