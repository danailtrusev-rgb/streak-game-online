// Pure model of the history-table-based region resolution
// (20260719010000_20260719_region_resolution_history_aware.sql). This is
// a SIMULATION for review purposes — mirrors the SQL's designed
// behavior; running it is not the same as running the real migration
// against a real database.

export interface AssignmentRow {
  id: string;
  regionId: string;
  effectiveFrom: Date;
  effectiveUntil: Date | null; // null = open-ended (the latest row)
  status: 'pending' | 'active' | 'superseded' | 'cancelled';
  regionEnabled: boolean;
}

/**
 * Mirrors resolve_user_game_time_region()'s new query: the row whose
 * effective window (from effectiveFrom up to, but not including,
 * effectiveUntil) actually contains `now`, excluding cancelled rows and
 * disabled regions, ordered by effectiveFrom DESC (defensive — there
 * should be at most one match by construction). Falls back to the
 * global region if none match.
 */
export function resolveHistoryAwareRegion(rows: AssignmentRow[], globalRegionId: string, now: Date): string {
  const candidates = rows.filter((r) =>
    r.status !== 'cancelled' &&
    r.regionEnabled &&
    r.effectiveFrom.getTime() <= now.getTime() &&
    (r.effectiveUntil === null || r.effectiveUntil.getTime() > now.getTime()),
  );
  if (candidates.length === 0) return globalRegionId;
  candidates.sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());
  return candidates[0].regionId;
}

/**
 * Mirrors assign_user_game_time_region()'s row-closing behavior: given
 * the user's current open-ended row (if any) and a newly computed
 * effective_from boundary, returns the updated old row (closed off) and
 * the new row to insert — pure state transformation, no I/O.
 */
export function applyReassignment(
  currentOpenRow: AssignmentRow | null,
  newRegionId: string,
  newEffectiveFrom: Date,
  now: Date,
): { closedOldRow: AssignmentRow | null; newRow: AssignmentRow } {
  const closedOldRow = currentOpenRow
    ? {
        ...currentOpenRow,
        effectiveUntil: newEffectiveFrom,
        status: (currentOpenRow.effectiveFrom.getTime() <= now.getTime() ? 'active' : 'cancelled') as AssignmentRow['status'],
      }
    : null;

  const newRow: AssignmentRow = {
    id: `new-${Math.random().toString(36).slice(2)}`,
    regionId: newRegionId,
    effectiveFrom: newEffectiveFrom,
    effectiveUntil: null,
    status: newEffectiveFrom.getTime() <= now.getTime() ? 'active' : 'pending',
    regionEnabled: true,
  };

  return { closedOldRow, newRow };
}
