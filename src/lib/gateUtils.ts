// ── Milestones ────────────────────────────────────────────────────────────────

export const MILESTONES = [1, 3, 7, 14, 30] as const;
export type MilestoneDay = typeof MILESTONES[number];

/** Returns the next milestone streak target above the current streak. */
export function nextMilestone(streak: number): MilestoneDay | null {
  for (const m of MILESTONES) {
    if (streak < m) return m;
  }
  // Beyond 30 — prestige cycle complete, next cycle starts at 1
  return 1;
}

/** How many days remain until the next milestone (0 means just hit it). */
export function daysToNextMilestone(streak: number): number {
  const next = nextMilestone(streak);
  if (next === null) return 0;
  if (next === 1 && streak >= 30) return 30 - (streak % 30); // prestige wrap
  return next - streak;
}

export interface MilestoneInfo {
  target: number;
  daysLeft: number;
  justHit: boolean;
}

export function getMilestoneInfo(streak: number): MilestoneInfo {
  const target   = nextMilestone(streak) ?? 30;
  const daysLeft = target - streak;
  const justHit  = MILESTONES.includes(streak as MilestoneDay) && streak > 0;
  return { target, daysLeft, justHit };
}

// ── Countdown to next gate ────────────────────────────────────────────────────

/**
 * Returns a HH:MM:SS string counting down until local midnight
 * (when the next daily gate window opens).
 */
export function msUntilMidnight(): number {
  const now  = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

export function formatCountdown(ms: number): string {
  const totalSecs = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// ── Survive copy variants ─────────────────────────────────────────────────────

const SURVIVE_SUBTITLES = [
  'The streak lives. One day at a time.',
  'The gate spared you today.',
  'Another day survived. The jungle remembers.',
  'Fortune favoured you. Return to claim more.',
  'The flame holds. Keep it burning.',
] as const;

const DIE_SUBTITLES = [
  'The gate claims another. Begin again.',
  'The flame was not yours today.',
  'Even veterans fall. Rise tomorrow.',
  'The jungle resets. The path is open again.',
  'Streaks end. New ones begin.',
] as const;

function deterministicPick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length];
}

export function surviveSubtitle(streak: number): string {
  return deterministicPick(SURVIVE_SUBTITLES, streak);
}

export function dieSubtitle(finalStreak: number): string {
  return deterministicPick(DIE_SUBTITLES, finalStreak);
}

// ── Next gate teaser copy ─────────────────────────────────────────────────────

export function nextGateCopy(streak: number): string {
  const { target, daysLeft } = getMilestoneInfo(streak);
  if (daysLeft === 1) {
    return `Tomorrow's gate unlocks Day ${target} — your next milestone. Don't break the chain.`;
  }
  if (daysLeft <= 3) {
    return `${daysLeft} gate${daysLeft === 1 ? '' : 's'} stand between you and the Day ${target} milestone.`;
  }
  if (streak >= 7) {
    return `Tomorrow's gate unlocks the next multiplier zone. Return daily to keep the streak alive.`;
  }
  if (streak >= 3) {
    return `You're building momentum. Tomorrow's gate is waiting — face it to grow the pot.`;
  }
  return `Tomorrow's gate opens at midnight. Face it. Build the streak.`;
}

export function dieTomorrowCopy(): string {
  return `The gate resets at midnight. Return tomorrow and start a new streak.`;
}
