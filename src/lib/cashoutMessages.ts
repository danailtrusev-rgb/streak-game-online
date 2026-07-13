// ── Cashout messaging system ────────────────────────────────────────────────
//
// Centralized copy for the four-stage cashout experience (confirm →
// processing → success → error). Code-based for MVP, same strategy as
// src/lib/resultMessages.ts — see that file's header comment for the
// rationale and the migration path to the DB-driven translation system
// if/when multi-language support is needed for these specific strings.
//
// Every dynamic value must come from real, server-confirmed data. Never
// interpolate a frontend-only guess for the cashout amount — the amount
// shown at Stage 1/2 is the player's own current pot (a real, already-known
// value from playerState), and the amount shown at Stage 4 (success) must
// come from the server's response, not the pre-confirmation display value.

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = vars[key];
    if (val === undefined || val === null) return `{${key}}`;
    if (typeof val === 'number' && !Number.isFinite(val)) return `{${key}}`;
    return String(val);
  });
}

export const cashoutContent = {
  confirm: {
    title: 'Cash out and end this streak?',
    body: 'You can secure {amount} now. Cashing out will end your current streak and your next run will begin from Day 1.',
    summaryStreakLabel: 'Current streak',
    summaryStreakValue: 'Day {streak}',
    summaryValueLabel: 'Value secured',
    summaryAfterLabel: 'After cashout',
    summaryAfterValueSameDay: 'This streak ends and a new run can start today.',
    summaryAfterValueNextDay: 'This streak ends and your next run starts from Day 1 tomorrow.',
    primaryCta: 'Cash Out {amount}',
    secondaryCta: 'Keep My Streak',
  },
  processing: {
    title: 'Securing your cashout…',
    body: 'Do not close this screen while we confirm the transaction.',
    slowBody: "This is taking a little longer than usual. We're still confirming with the server — please keep this open.",
  },
  success: {
    title: 'Cashout confirmed',
    consequence: '{amount} has been added to your wallet.',
    streakMessage: 'Your {streak}-day streak is now complete.',
    tomorrowHookSameDay: 'A new run can start today from Day 1.',
    tomorrowHookNextDay: 'Your next run begins tomorrow from Day 1.',
    transactionLabel: 'Transaction',
    primaryCta: 'Return Home',
    secondaryCta: 'View Wallet',
  },
  error: {
    // Used when the server has confirmed (via an explicit RPC error) that
    // no state changed — Postgres functions are atomic, so any explicit
    // error response means the whole transaction rolled back.
    rejectedTitle: 'Cashout could not be confirmed',
    rejectedBody: 'Your streak and wallet have not been changed. Please try again.',
    // Used only when the request's outcome is genuinely unknown (e.g. a
    // network failure where we can't tell if the server ever received or
    // finished the request) — never claim "nothing changed" here, since
    // that can't be proven from a network-level failure alone.
    uncertainTitle: 'We are still checking the transaction',
    uncertainBody: 'Do not submit another cashout. Refresh the status before trying again.',
    alreadyProcessedTitle: 'This streak was already cashed out',
    alreadyProcessedBody: 'There is no pot left to cash out — it looks like this was already secured.',
    noPotTitle: 'Nothing to cash out',
    noPotBody: 'Your current pot is €0.00, so there is nothing to secure right now.',
    retryStatusCta: 'Retry Status',
    returnHomeCta: 'Return Home',
  },
} as const;

export function fillCashoutTemplate(template: string, vars: Record<string, string | number>): string {
  return fill(template, vars);
}
