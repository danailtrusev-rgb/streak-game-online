// Pure models of this pass's weekend-event finalization logic —
// idempotency gate and derived status. SIMULATIONS for review purposes;
// running them is not the same as running the real migrations against a
// real database. See PROJECT_CHANGELOG.md "Real Supabase status."

export interface FinalizationRow {
  id: string;
  eventInstanceId: string | null;
  eventGameId: string;
  eventDate: string;
  winnerUserId: string;
  rewardCents: number;
  walletLedgerId: string | null;
}

export type FinalizationOutcome =
  | { status: 'finalized'; finalizationId: string }
  | { status: 'already_finalized'; existing: FinalizationRow }
  | { status: 'no_entries' }
  | { status: 'not_closed'; derivedStatus: string }
  | { status: 'cancelled' };

let idCounter = 0;

/**
 * Mirrors admin_finalize_event()'s control flow: derived-status gate
 * (cancelled/not-closed unless forced) → no_entries check → the atomic
 * INSERT-with-unique-constraint idempotency gate (modeled here as a
 * lookup-then-insert against the two partial-unique-index rules —
 * per-instance for instance-scoped calls, per (event, date) for legacy
 * calls). `rows` is mutated in place to model the real table.
 */
export function simulateFinalizeEvent(
  rows: FinalizationRow[],
  input: {
    eventInstanceId: string | null;
    eventGameId: string;
    eventDate: string;
    winnerUserId: string;
    rewardCents: number;
    derivedStatus: string | null; // null when eventInstanceId is null (no window concept)
    force: boolean;
    entryCount: number;
  },
): FinalizationOutcome {
  if (input.eventInstanceId !== null) {
    if (input.derivedStatus === 'cancelled') return { status: 'cancelled' };
    if ((input.derivedStatus === 'scheduled' || input.derivedStatus === 'open') && !input.force) {
      return { status: 'not_closed', derivedStatus: input.derivedStatus! };
    }
  }

  if (input.entryCount === 0) return { status: 'no_entries' };

  const existing = rows.find((r) =>
    input.eventInstanceId !== null
      ? r.eventInstanceId === input.eventInstanceId
      : r.eventInstanceId === null && r.eventGameId === input.eventGameId && r.eventDate === input.eventDate,
  );
  if (existing) return { status: 'already_finalized', existing };

  const row: FinalizationRow = {
    id: `fin-${++idCounter}`,
    eventInstanceId: input.eventInstanceId,
    eventGameId: input.eventGameId,
    eventDate: input.eventDate,
    winnerUserId: input.winnerUserId,
    rewardCents: input.rewardCents,
    walletLedgerId: `ledger-${idCounter}`,
  };
  rows.push(row);
  return { status: 'finalized', finalizationId: row.id };
}

/** Mirrors get_event_instance_derived_status()'s exact priority order. */
export function computeDerivedStatus(
  storedStatus: 'scheduled' | 'finalized' | 'cancelled',
  startsAt: Date,
  endsAt: Date,
  now: Date,
): 'cancelled' | 'finalized' | 'scheduled' | 'open' | 'closed' {
  if (storedStatus === 'cancelled') return 'cancelled';
  if (storedStatus === 'finalized') return 'finalized';
  if (now.getTime() < startsAt.getTime()) return 'scheduled';
  if (now.getTime() >= startsAt.getTime() && now.getTime() < endsAt.getTime()) return 'open';
  return 'closed';
}
