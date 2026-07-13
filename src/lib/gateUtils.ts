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
