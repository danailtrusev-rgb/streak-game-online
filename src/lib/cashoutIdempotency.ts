// Pure helpers for the cashout idempotency-key lifecycle. No React, no
// Supabase — kept dependency-free specifically so this logic can be
// executed and verified directly (see scripts/verify-cashout-idempotency.ts)
// rather than only reviewed by eye, unlike CashoutFlow.tsx itself which
// needs React/react-router-dom resolved to run.

export function sessionKeyName(gameId: string): string {
  return `sts_cashout_idem_${gameId}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * What's actually persisted per the task brief's suggested shape. An
 * idempotency key belongs to exactly one cashout decision made against
 * exactly one eligible game state (`contextId` — see
 * src/lib/types.ts's GameState.updated_at doc comment for what that is
 * and why it's a safe, real identifier). A key found in storage is only
 * ever reused when its stored `contextId` matches the CURRENT one —
 * otherwise it's a stale key from a previous, already-resolved cashout
 * opportunity (a different streak/pot) and must never be attached to a
 * new one.
 */
export interface StoredIdemRecord {
  idemKey: string;
  gameId: string;
  contextId: string;
  createdAt: number;
}

function parseStoredRecord(raw: string): StoredIdemRecord | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed && typeof parsed === 'object' &&
      typeof parsed.idemKey === 'string' &&
      typeof parsed.gameId === 'string' &&
      typeof parsed.contextId === 'string' &&
      typeof parsed.createdAt === 'number'
    ) {
      return parsed as StoredIdemRecord;
    }
    return null;
  } catch {
    return null; // corrupt/legacy (pre-context-scoping) value — treated as absent, not fatal
  }
}

/**
 * A minimal storage abstraction so the get/create/clear logic can run
 * against a real Storage object (sessionStorage) or a plain in-memory
 * stand-in (for tests, or when sessionStorage is unavailable — private
 * browsing, etc.).
 */
export interface KeyStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export function createMemoryKeyStore(): KeyStore {
  const map = new Map<string, string>();
  return {
    get: (k) => map.get(k) ?? null,
    set: (k, v) => { map.set(k, v); },
    remove: (k) => { map.delete(k); },
  };
}

/**
 * Same get-or-create logic CashoutFlow.tsx uses, factored out so it's
 * independently testable: reuse a stored key only if it belongs to the
 * SAME cashout context (contextId matches — see StoredIdemRecord above);
 * otherwise discard it and mint a fresh one, scoped to the current
 * context. Never regenerates a key that's still valid for the current
 * decision — that's the whole point.
 */
export function getOrCreateIdemKey(
  store: KeyStore,
  gameId: string,
  contextId: string,
  generateUuid: () => string,
  currentRef: { current: string | null },
): string {
  if (currentRef.current) return currentRef.current;

  const raw = store.get(sessionKeyName(gameId));
  if (raw) {
    const record = parseStoredRecord(raw);
    if (record && isValidUuid(record.idemKey) && record.gameId === gameId && record.contextId === contextId) {
      currentRef.current = record.idemKey;
      return record.idemKey;
    }
    // Stale (different context — a different, already-resolved cashout
    // opportunity) or corrupt/legacy — never reuse it for a new decision.
    store.remove(sessionKeyName(gameId));
  }

  const fresh = generateUuid();
  currentRef.current = fresh;
  const record: StoredIdemRecord = { idemKey: fresh, gameId, contextId, createdAt: Date.now() };
  store.set(sessionKeyName(gameId), JSON.stringify(record));
  return fresh;
}

export function clearIdemKey(store: KeyStore, gameId: string, currentRef: { current: string | null }): void {
  currentRef.current = null;
  store.remove(sessionKeyName(gameId));
}

// ── Server decision-logic model ─────────────────────────────────────────────
//
// This is a plain-JS model of cashout_game()'s control flow, used only to
// verify the DESIGNED behaviour against the required scenarios in an
// environment with no live Postgres available. It intentionally mirrors
// the SQL migration's branching (existing-key lookup, game/context
// comparison, then the current-context guard for new attempts) step for
// step, but it is a simulation for review purposes, not a substitute for
// running the real migration against a real database — see
// PROJECT_CHANGELOG.md "Database test results" for that limitation.

export interface LedgerRow { id: string; amountCents: number; userId: string; idemKey: string; gameId: string; contextId: string }

export interface CashoutSimState {
  ledger: LedgerRow[];
  potCents: number;
  /** The server's own record of "what context is current" — mirrors game_state.updated_at, compared against p_context_id for brand-new attempts. */
  currentContextId: string;
}

export type CashoutSimOutcome =
  | { kind: 'replay'; transactionId: string; amountCents: number }
  | { kind: 'success'; transactionId: string; amountCents: number }
  | { kind: 'context_conflict'; reason: string }
  | { kind: 'stale_context'; reason: string }
  | { kind: 'rejected'; reason: string };

let simIdCounter = 0;

export function simulateCashout(
  state: CashoutSimState,
  userId: string,
  idemKey: string,
  gameId: string,
  contextId: string,
): CashoutSimOutcome {
  if (!idemKey || !isValidUuid(idemKey)) {
    return { kind: 'rejected', reason: 'Invalid idempotency key' };
  }
  if (!gameId) {
    return { kind: 'rejected', reason: 'Invalid game id' };
  }
  if (!contextId) {
    return { kind: 'rejected', reason: 'Missing cashout context' };
  }

  const existing = state.ledger.find((r) => r.userId === userId && r.idemKey === idemKey);
  if (existing) {
    if (existing.gameId !== gameId || existing.contextId !== contextId) {
      // Same key, different game/context — never replay a transaction
      // that wasn't actually made for this request, never pay out again.
      return { kind: 'context_conflict', reason: 'Idempotency key context mismatch' };
    }
    return { kind: 'replay', transactionId: existing.id, amountCents: existing.amountCents };
  }

  // Brand-new attempt — the submitted context must match what the server
  // itself considers current, checked BEFORE touching the ledger/wallet.
  if (contextId !== state.currentContextId) {
    return { kind: 'stale_context', reason: 'Stale cashout context' };
  }

  if (state.potCents <= 0) {
    return { kind: 'rejected', reason: 'No pot to cash out' };
  }
  const amount = state.potCents;
  const id = `sim-ledger-${++simIdCounter}`;
  state.ledger.push({ id, amountCents: amount, userId, idemKey, gameId, contextId });
  state.potCents = 0;
  return { kind: 'success', transactionId: id, amountCents: amount };
}
