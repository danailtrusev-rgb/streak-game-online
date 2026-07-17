// ── Milestones ────────────────────────────────────────────────────────────────

export const MILESTONES = [1, 3, 7, 14, 30] as const;
export type MilestoneDay = typeof MILESTONES[number];

/**
 * Returns the next milestone as an ABSOLUTE day number above the current
 * streak, correctly wrapping past day 30 into the repeating prestige cycle
 * (relative milestones 1/3/7/14/30 within each 30-day block). Always
 * returns a number strictly greater than `streak` — never negative days,
 * never a non-absolute "relative" number like a bare `1` for a streak of 45.
 */
function nextMilestoneAbsolute(streak: number): number {
  for (const m of MILESTONES) {
    if (streak < m) return m;
  }
  // streak >= 30 — find the next relative milestone within the current
  // (or next) 30-day cycle, then convert back to an absolute day number.
  const cyclesCompleted = Math.floor((streak - 1) / 30);
  const cycleDay = streak - cyclesCompleted * 30; // 1..30, position within the current cycle
  for (const m of MILESTONES) {
    if (cycleDay < m) return cyclesCompleted * 30 + m;
  }
  // cycleDay === 30 (this cycle's final milestone was just hit) — next is
  // relative milestone 1 of the following cycle.
  return (cyclesCompleted + 1) * 30 + 1;
}

/** Returns the next milestone streak target above the current streak (legacy signature — see nextMilestoneAbsolute for the wrap-safe version). */
export function nextMilestone(streak: number): MilestoneDay | null {
  for (const m of MILESTONES) {
    if (streak < m) return m;
  }
  // Beyond 30 — prestige cycle complete, next cycle starts at 1
  return 1;
}

/** How many days remain until the next milestone (always >= 0; 0 means just hit it). */
export function daysToNextMilestone(streak: number): number {
  return Math.max(0, nextMilestoneAbsolute(streak) - streak);
}

export interface MilestoneInfo {
  target: number;
  daysLeft: number;
  justHit: boolean;
}

export function getMilestoneInfo(streak: number): MilestoneInfo {
  const target   = nextMilestoneAbsolute(streak);
  const daysLeft = Math.max(0, target - streak);
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
