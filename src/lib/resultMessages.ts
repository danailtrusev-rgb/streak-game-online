// ── Result messaging system ─────────────────────────────────────────────────
//
// Implements the STS Result Messaging spec: every result (survive/fail)
// shows exactly one selected message built from four parts — headline,
// consequence, tomorrow hook, and an action label. Messages are chosen by
// priority from the player's actual state; nothing here is fabricated —
// every dynamic value must come from real app data (see ResultMessageContext).
//
// Deliberately NOT wired into the DB-driven translation system (see
// src/lib/i18n.ts / I18nContext) for this first pass — these are English
// copy pools, not single-string UI labels, and threading variant selection
// through the async translation loader would be a larger, separate change.
// If/when this needs to support other languages, each variant's four
// fields should become translation keys (e.g. `result.survive_standard.v1.headline`)
// fed through the existing t() + interpolate() pipeline instead of the
// literal strings below.

export type SurviveCategory =
  | 'personal_best'
  | 'milestone_eve'
  | 'qualification_progress'
  | 'long_streak'
  | 'standard';

export type FailCategory =
  | 'near_milestone'
  | 'long_streak'
  | 'qualification_retained'
  | 'standard';

export interface ResultMessage {
  messageId: string;
  eventType: SurviveCategory | FailCategory;
  headline: string;
  /** The "consequence" line — states plainly what happened. */
  consequence: string;
  tomorrowHook: string;
  ctaLabel: string;
}

/**
 * Every value here must come from real, currently-available app data.
 * Fields that are `null` mean "we genuinely don't know" and must disable
 * the categories that depend on them — never backfill a placeholder
 * number (especially not 0) to stand in for missing historical data.
 */
export interface ResultMessageContext {
  survived: boolean;
  streak: number;
  /**
   * Player's best-ever streak BEFORE this play (from game_state.max_streak).
   * `null` when unavailable (e.g. the result-recovery path, where we never
   * captured a pre-play snapshot) — personal-best detection is skipped
   * entirely in that case, it is never inferred from a missing value.
   */
  previousBestStreak: number | null;
  nextMilestoneDay: number;
  daysToNextMilestone: number;
  timeUntilNextPlay: string; // formatted countdown, e.g. "05:12:41"
  /**
   * Present only when the qualification system is active for this player.
   * `pointsBefore` is `null` when we don't have a genuine pre-play
   * snapshot — in that case qualification-progress messaging is skipped
   * rather than assumed, since we can't prove this result changed anything.
   */
  qualification?: {
    pointsBefore: number | null;
    pointsAfter: number;
    pointsThreshold: number;
    alreadyQualified: boolean;
  } | null;
  /** A stable per-play seed so the same play always shows the same variant. */
  variantSeed: string;
}

const LONG_STREAK_THRESHOLD = 7; // configurable — see PROJECT_CHANGELOG.md

function isNearMilestone(ctx: ResultMessageContext): boolean {
  return ctx.daysToNextMilestone === 1;
}

function isPersonalBest(ctx: ResultMessageContext): boolean {
  if (ctx.previousBestStreak === null) return false; // unknown history — never inferred
  return ctx.survived && ctx.streak > 0 && ctx.streak > ctx.previousBestStreak;
}

/**
 * Only true when the current result can be shown to have genuinely moved
 * qualification progress forward: a real pre-play snapshot exists, a real
 * (positive) threshold exists, the player isn't already qualified, and
 * points actually increased because of this specific play. If any of that
 * can't be proven from real data, this returns false and selection falls
 * through to the next priority category instead of guessing.
 */
function isQualificationRelevant(ctx: ResultMessageContext): boolean {
  const q = ctx.qualification;
  if (!q) return false;
  if (q.alreadyQualified) return false;
  if (!(q.pointsThreshold > 0)) return false;
  if (q.pointsBefore === null) return false;
  return q.pointsAfter > q.pointsBefore && q.pointsAfter < q.pointsThreshold;
}

function isLongStreak(ctx: ResultMessageContext): boolean {
  return ctx.streak >= LONG_STREAK_THRESHOLD;
}

// ── Variable interpolation ──────────────────────────────────────────────────

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = vars[key];
    if (val === undefined || val === null) return `{${key}}`;
    if (typeof val === 'number' && !Number.isFinite(val)) return `{${key}}`;
    return String(val);
  });
}

/**
 * Simple deterministic pick so the same play always renders the same
 * variant, but different plays vary. Never uses Math.random() — an
 * empty/missing seed deterministically resolves to the first variant
 * rather than anything random.
 */
function pick<T>(arr: readonly T[], seed: string): T {
  if (!seed) return arr[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return arr[hash % arr.length];
}

// ── Survive variant pools ────────────────────────────────────────────────────

const SURVIVE_STANDARD = [
  {
    headline: 'You survived.',
    consequence: 'Survival Streak increased. You are now on Day {streak}.',
    tomorrowHook: 'Return tomorrow to move one step closer to Day {nextMilestoneDay}.',
    ctaLabel: 'Protect My Streak',
  },
  {
    headline: 'Still alive.',
    consequence: 'Your Survival Streak has reached {streak} days.',
    tomorrowHook: "Tomorrow's trial will decide whether the run continues.",
    ctaLabel: 'Return Tomorrow',
  },
  {
    headline: 'The streak lives.',
    consequence: "You survived today's reveal.",
    tomorrowHook: 'Next target: Day {nextMilestoneDay}.',
    ctaLabel: 'Continue Tomorrow',
  },
] as const;

const SURVIVE_MILESTONE_EVE = [
  {
    headline: 'One more day.',
    consequence: 'You survived Day {streak}. Only one challenge stands between you and Day {nextMilestoneDay}.',
    tomorrowHook: 'Return tomorrow or lose the run before the milestone.',
    ctaLabel: 'Come Back Tomorrow',
  },
  {
    headline: 'The milestone is within reach.',
    consequence: 'You have come too far to disappear now.',
    tomorrowHook: 'Your next gate opens in {timeUntilNextPlay}.',
    ctaLabel: 'Protect My Run',
  },
] as const;

const SURVIVE_PERSONAL_BEST = [
  {
    headline: 'New personal best.',
    consequence: 'Personal best reached — you have survived longer than ever before: {streak} days.',
    tomorrowHook: 'Every survival from here sets a new record.',
    ctaLabel: 'Defend My Record',
  },
  {
    headline: 'You entered new territory.',
    consequence: 'This is your longest Survival Streak so far.',
    tomorrowHook: 'Return tomorrow and push the record further.',
    ctaLabel: 'Continue the Record',
  },
] as const;

const SURVIVE_LONG_STREAK = [
  {
    headline: 'This run is becoming dangerous.',
    consequence: 'You have survived {streak} days. Uncashed value is on the line.',
    tomorrowHook: 'Survive tomorrow to keep building. Fail or miss the day and the run ends.',
    ctaLabel: 'Protect My Streak',
  },
  {
    headline: 'Too much to walk away from.',
    consequence: 'Your streak has reached Day {streak}. Each new day now carries more weight.',
    tomorrowHook: 'The next reveal opens in {timeUntilNextPlay}.',
    ctaLabel: 'Continue the Run',
  },
] as const;

const SURVIVE_QUALIFICATION_PROGRESS = [
  {
    headline: 'You survived\u2014and moved closer to Saturday.',
    consequence: 'Qualification progress remains: {qualificationPoints} of {qualificationThreshold} points.',
    tomorrowHook: 'Another active day could secure your place.',
    ctaLabel: 'Keep Me in the Race',
  },
  {
    headline: 'Your weekend run is still alive.',
    consequence: "Today's survival moved you closer to the Saturday Showdown.",
    tomorrowHook: 'Return tomorrow to protect both your streak and qualification progress.',
    ctaLabel: 'Return Tomorrow',
  },
] as const;

// ── Fail variant pools ───────────────────────────────────────────────────────

const FAIL_STANDARD = [
  {
    headline: 'This run ends here.',
    consequence: 'Survival Streak ended at Day {streak}.',
    tomorrowHook: 'A new run opens tomorrow. Build it stronger.',
    ctaLabel: 'Start Again Tomorrow',
  },
  {
    headline: 'The gate closed.',
    consequence: 'Your Survival Streak has ended.',
    tomorrowHook: 'A new gate opens tomorrow. Your next run starts from Day 1.',
    ctaLabel: 'Return Tomorrow',
  },
  {
    headline: 'You fell today\u2014not forever.',
    consequence: 'This streak is over.',
    tomorrowHook: 'Your next opportunity begins in {timeUntilNextPlay}.',
    ctaLabel: 'Begin Again',
  },
] as const;

const FAIL_LONG_STREAK = [
  {
    headline: 'A strong run has ended.',
    consequence: 'You survived {streak} consecutive days\u2014your best run so far.',
    tomorrowHook: 'Your next objective is clear: return and beat {streak} days.',
    ctaLabel: 'Beat My Record',
  },
  {
    headline: 'The streak is gone. The record remains.',
    consequence: 'You reached Day {streak}, your best run so far.',
    tomorrowHook: 'Tomorrow, the climb begins again.',
    ctaLabel: 'Beat My Record',
  },
  {
    headline: 'The jungle finally caught you.',
    consequence: 'Your {streak}-day run is over. That achievement remains on your profile.',
    tomorrowHook: 'Return tomorrow and prove it was not a one-time run.',
    ctaLabel: 'Start the Comeback',
  },
] as const;

const FAIL_NEAR_MILESTONE = [
  {
    headline: 'One day short.',
    consequence: 'Your run ended just before Day {nextMilestoneDay}.',
    tomorrowHook: 'The milestone is still there. Begin again tomorrow and take another path toward it.',
    ctaLabel: 'Start My Comeback',
  },
  {
    headline: 'So close.',
    consequence: 'You reached Day {streak}, one step before Day {nextMilestoneDay}.',
    tomorrowHook: 'Do not let this be the last attempt. A new run opens tomorrow.',
    ctaLabel: 'Come Back Tomorrow',
  },
] as const;

const FAIL_QUALIFICATION_RETAINED = [
  {
    headline: 'The run ended, but today was not wasted.',
    consequence: "Survival Streak reset, but today's active play still counts toward Saturday qualification.",
    tomorrowHook: 'You now have {qualificationPoints} of {qualificationThreshold} qualification points.',
    ctaLabel: 'Stay in the Race',
  },
  {
    headline: 'You lost the streak\u2014not your place in the week.',
    consequence: "Today's participation moved your qualification progress forward.",
    tomorrowHook: 'Return tomorrow to begin a new run and continue toward Saturday.',
    ctaLabel: 'Continue Tomorrow',
  },
] as const;

// ── Selection ─────────────────────────────────────────────────────────────

function safeNumber(n: number, fallback: number = 0): number {
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function buildVars(ctx: ResultMessageContext): Record<string, string | number> {
  return {
    streak: safeNumber(ctx.streak),
    nextMilestoneDay: safeNumber(ctx.nextMilestoneDay),
    timeUntilNextPlay: ctx.timeUntilNextPlay || '',
    qualificationPoints: ctx.qualification ? safeNumber(ctx.qualification.pointsAfter) : Number.NaN,
    qualificationThreshold: ctx.qualification ? safeNumber(ctx.qualification.pointsThreshold) : Number.NaN,
  };
}

function toMessage(
  eventType: SurviveCategory | FailCategory,
  variant: { headline: string; consequence: string; tomorrowHook: string; ctaLabel: string },
  index: number,
  ctx: ResultMessageContext,
): ResultMessage {
  const vars = buildVars(ctx);
  return {
    messageId: `${eventType}_${index + 1}`,
    eventType,
    headline: fill(variant.headline, vars),
    consequence: fill(variant.consequence, vars),
    tomorrowHook: fill(variant.tomorrowHook, vars),
    ctaLabel: variant.ctaLabel,
  };
}

/**
 * Selects exactly one message for the result screen, following the
 * priority order from the spec. Only one primary message is ever shown —
 * do not call this more than once per result.
 */
export function selectResultMessage(ctx: ResultMessageContext): ResultMessage {
  if (ctx.survived) {
    let pool: readonly { headline: string; consequence: string; tomorrowHook: string; ctaLabel: string }[];
    let category: SurviveCategory;

    if (isPersonalBest(ctx)) {
      pool = SURVIVE_PERSONAL_BEST; category = 'personal_best';
    } else if (isNearMilestone(ctx)) {
      pool = SURVIVE_MILESTONE_EVE; category = 'milestone_eve';
    } else if (isQualificationRelevant(ctx)) {
      pool = SURVIVE_QUALIFICATION_PROGRESS; category = 'qualification_progress';
    } else if (isLongStreak(ctx)) {
      pool = SURVIVE_LONG_STREAK; category = 'long_streak';
    } else {
      pool = SURVIVE_STANDARD; category = 'standard';
    }

    const variant = pick(pool, ctx.variantSeed);
    return toMessage(category, variant, pool.indexOf(variant), ctx);
  }

  let pool: readonly { headline: string; consequence: string; tomorrowHook: string; ctaLabel: string }[];
  let category: FailCategory;

  if (isNearMilestone(ctx)) {
    pool = FAIL_NEAR_MILESTONE; category = 'near_milestone';
  } else if (isLongStreak(ctx)) {
    pool = FAIL_LONG_STREAK; category = 'long_streak';
  } else if (isQualificationRelevant(ctx)) {
    pool = FAIL_QUALIFICATION_RETAINED; category = 'qualification_retained';
  } else {
    pool = FAIL_STANDARD; category = 'standard';
  }

  const variant = pick(pool, ctx.variantSeed);
  return toMessage(category, variant, pool.indexOf(variant), ctx);
}
