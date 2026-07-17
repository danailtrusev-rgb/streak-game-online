// Pure, Node-testable MIRROR of supabase/functions/_shared/retry.ts.
// See that file for the real, canonical logic — this is not imported by
// the Deno function; keep both in sync by hand if retry rules change.

export const MAX_ATTEMPTS = 3;
export const RETRY_DELAYS_MINUTES = [5, 15];

export interface RetryDecision {
  retry: boolean;
  nextAttemptAt: Date | null;
}

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
