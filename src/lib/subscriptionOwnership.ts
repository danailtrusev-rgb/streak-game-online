// Plain-JS model of register_push_subscription()'s
// `INSERT ... ON CONFLICT (endpoint) DO UPDATE` ownership-transfer
// semantics (see supabase/migrations/20260714040000_*.sql). This is a
// SIMULATION for review purposes — it mirrors the SQL's designed
// behaviour step for step, but running it is not the same as running the
// real migration against a real database. See
// PROJECT_CHANGELOG.md "Real database verification status."

export interface SubscriptionRow {
  id: string;
  userId: string;
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  enabled: boolean;
  revokedAt: string | null;
  failureCount: number;
}

export interface RegistrationInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type RegistrationOutcome =
  | { ok: true; id: string; reassigned: boolean }
  | { ok: false; reason: string };

let idCounter = 0;

/** Mirrors the RPC's own defensive validation, checked before touching any row. */
function validate(input: RegistrationInput): string | null {
  if (!input.endpoint || input.endpoint.length < 10 || input.endpoint.length > 2000 || !input.endpoint.startsWith('https://')) {
    return 'Invalid endpoint';
  }
  if (!input.p256dh || input.p256dh.length < 10 || input.p256dh.length > 500) return 'Invalid p256dh key';
  if (!input.auth || input.auth.length < 5 || input.auth.length > 200) return 'Invalid auth key';
  return null;
}

/**
 * `rows` is mutated in place (models a real table). `callerUserId` is the
 * ONLY source of ownership — the input never carries a user_id, mirroring
 * that the real RPC reads auth.uid() server-side and never trusts a
 * client-supplied value.
 */
export function simulateRegisterSubscription(
  rows: SubscriptionRow[],
  callerUserId: string,
  input: RegistrationInput,
): RegistrationOutcome {
  const validationError = validate(input);
  if (validationError) return { ok: false, reason: validationError };

  const existing = rows.find((r) => r.endpoint === input.endpoint);

  if (!existing) {
    const row: SubscriptionRow = {
      id: `sim-sub-${++idCounter}`,
      userId: callerUserId,
      endpoint: input.endpoint,
      p256dhKey: input.p256dh,
      authKey: input.auth,
      enabled: true,
      revokedAt: null,
      failureCount: 0,
    };
    rows.push(row);
    return { ok: true, id: row.id, reassigned: false };
  }

  const wasReassigned = existing.userId !== callerUserId;
  existing.userId = callerUserId;
  existing.p256dhKey = input.p256dh;
  existing.authKey = input.auth;
  existing.enabled = true;
  existing.revokedAt = null;
  existing.failureCount = 0;

  return { ok: true, id: existing.id, reassigned: wasReassigned };
}
