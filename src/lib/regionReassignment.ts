// Pure model of the region-reassignment safe-boundary logic in
// assign_user_game_time_region() (20260718010000_*.sql). This is a
// SIMULATION for review purposes — it mirrors the SQL's designed
// behavior, but running it is not the same as running the real
// migration against a real database. See PROJECT_CHANGELOG.md
// "Real Supabase status."

export interface ReassignmentInput {
  previousRegionId: string | null;
  oldRegionNextRollover: Date | null; // null only if previousRegionId is null (first-ever assignment)
  newRegionNextRollover: Date;
  forceEffectiveImmediatelyForTest: boolean;
  now: Date;
}

export interface ReassignmentResult {
  effectiveFrom: Date;
  isTestOverride: boolean;
  reasonPrefix: string | null;
}

/**
 * Mirrors: effective_from = GREATEST(old_region_next_rollover,
 * new_region_next_rollover), or new_region_next_rollover alone if there
 * was no previous region (first-ever assignment) — unless the test
 * override is set, in which case effective_from = now(), always logged
 * with the '[IMMEDIATE TEST OVERRIDE]' prefix.
 */
export function computeReassignmentBoundary(input: ReassignmentInput): ReassignmentResult {
  if (input.forceEffectiveImmediatelyForTest) {
    return { effectiveFrom: input.now, isTestOverride: true, reasonPrefix: '[IMMEDIATE TEST OVERRIDE]' };
  }

  const candidates = [input.newRegionNextRollover];
  if (input.oldRegionNextRollover) candidates.push(input.oldRegionNextRollover);

  const effectiveFrom = new Date(Math.max(...candidates.map((d) => d.getTime())));
  return { effectiveFrom, isTestOverride: false, reasonPrefix: null };
}

/**
 * Mirrors resolve_user_game_time_region()'s new effective_from <= now()
 * condition — a future-dated assignment is ignored (falls back to the
 * caller-supplied global default) until its boundary passes.
 */
export function resolveEffectiveRegion(
  assignment: { regionId: string; effectiveFrom: Date; regionEnabled: boolean } | null,
  globalRegionId: string,
  now: Date,
): string {
  if (assignment && assignment.regionEnabled && assignment.effectiveFrom.getTime() <= now.getTime()) {
    return assignment.regionId;
  }
  return globalRegionId;
}
