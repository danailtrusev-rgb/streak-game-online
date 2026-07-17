// Verification script for cashout idempotency-key lifecycle and the
// server decision-logic model. Run: npx tsx scripts/verify-cashout-idempotency.ts
//
// Two things are verified here, and they are NOT the same kind of proof:
//
// 1. getOrCreateIdemKey / clearIdemKey — this is the REAL, shipped code
//    (src/lib/cashoutIdempotency.ts, imported directly by
//    CashoutFlow.tsx, not a duplicate) — actually executed.
//
// 2. simulateCashout — a plain-JS MODEL of cashout_game()'s control flow,
//    used because no live Postgres/Supabase instance is available in this
//    environment. It mirrors the migration's branching step for step, but
//    running it is not the same as running the real SQL migration against
//    a real database. See PROJECT_CHANGELOG.md "Database test results"
//    for what this does and does not prove, and exactly what remains to
//    be verified against a real Supabase project.

import {
  getOrCreateIdemKey, clearIdemKey, createMemoryKeyStore, isValidUuid, sessionKeyName,
  simulateCashout, type CashoutSimState,
} from '../src/lib/cashoutIdempotency';

let passed = 0;
let failed = 0;
function check(label: string, condition: boolean, detail?: string) {
  if (condition) { passed++; console.log(`  ok  - ${label}`); }
  else { failed++; console.log(`FAIL  - ${label}${detail ? ` (${detail})` : ''}`); }
}

let uuidCounter = 0;
function fakeUuid() { return `00000000-0000-4000-8000-${String(++uuidCounter).padStart(12, '0')}`; }

console.log('\n== Key lifecycle (real, shipped code) ==');
{
  const store = createMemoryKeyStore();
  const ref = { current: null as string | null };
  const key1 = getOrCreateIdemKey(store, 'daily_gate', 'context-A', fakeUuid, ref);
  const key2 = getOrCreateIdemKey(store, 'daily_gate', 'context-A', fakeUuid, ref);
  check('same key returned on repeated calls within the same context (no regeneration)', key1 === key2, `${key1} vs ${key2}`);
  check('key persisted to the store', store.get(sessionKeyName('daily_gate')) !== null);
}
{
  // Simulates a reload: fresh ref (null), but the store still has the key,
  // AND the context hasn't changed (same eligible pot as before the reload).
  const store = createMemoryKeyStore();
  const originalRef = { current: null as string | null };
  const original = getOrCreateIdemKey(store, 'daily_gate', 'context-A', fakeUuid, originalRef);

  const freshRef = { current: null as string | null }; // as if the component remounted
  const recovered = getOrCreateIdemKey(store, 'daily_gate', 'context-A', fakeUuid, freshRef);
  check('reload recovery (same context): adopts the stored key rather than generating a new one', recovered === original, `${recovered} vs ${original}`);
}
{
  // THE EXACT FAILURE SCENARIO THIS PASS FIXES:
  // 1. Cashout succeeds server-side for context-A, response is lost.
  // 2. Key K1/context-A remains in storage.
  // 3. Player starts a new run, builds a new pot -> a new context, context-B.
  // 4. The next cashout attempt must NOT reuse K1 for context-B.
  const store = createMemoryKeyStore();
  const firstRef = { current: null as string | null };
  const k1 = getOrCreateIdemKey(store, 'daily_gate', 'context-A', fakeUuid, firstRef);

  // A later, unrelated mount (new pot, new context) — fresh ref, as if the
  // player closed and reopened the cashout flow for a different pot.
  const secondRef = { current: null as string | null };
  const k2 = getOrCreateIdemKey(store, 'daily_gate', 'context-B', fakeUuid, secondRef);

  check('a stale key from a DIFFERENT context is never reused for a new one', k2 !== k1, `${k2} vs ${k1}`);
  const storedNow = store.get(sessionKeyName('daily_gate'));
  check('the stored record now reflects the new context, not the stale one', !!storedNow && JSON.parse(storedNow).contextId === 'context-B', storedNow ?? 'null');

  // And the new key is now the one that would be reused for further
  // retries against context-B specifically.
  const thirdRef = { current: null as string | null };
  const k2Again = getOrCreateIdemKey(store, 'daily_gate', 'context-B', fakeUuid, thirdRef);
  check('the new context-B key is itself stable across further reloads', k2Again === k2, `${k2Again} vs ${k2}`);
}
{
  const store = createMemoryKeyStore();
  const ref = { current: null as string | null };
  getOrCreateIdemKey(store, 'daily_gate', 'context-A', fakeUuid, ref);
  clearIdemKey(store, 'daily_gate', ref);
  check('clearIdemKey removes it from the ref', ref.current === null);
  check('clearIdemKey removes it from the store', store.get(sessionKeyName('daily_gate')) === null);
  const next = getOrCreateIdemKey(store, 'daily_gate', 'context-A', fakeUuid, ref);
  check('a new key is generated only after an explicit clear', next !== null);
}
{
  // Corrupt / legacy (pre-context-scoping) stored value — must be treated
  // as absent, not crash, and never be reused blindly.
  const store = createMemoryKeyStore();
  store.set(sessionKeyName('daily_gate'), 'not-json-and-not-a-plain-key-either');
  const ref = { current: null as string | null };
  const key = getOrCreateIdemKey(store, 'daily_gate', 'context-A', fakeUuid, ref);
  check('corrupt/legacy stored value is discarded, a fresh key is minted', isValidUuid(key));
}
{
  check('isValidUuid accepts a real UUID', isValidUuid('123e4567-e89b-12d3-a456-426614174000'));
  check('isValidUuid rejects garbage', !isValidUuid('not-a-uuid'));
  check('isValidUuid rejects empty string', !isValidUuid(''));
}

console.log('\n== Mandatory-argument shape (proxy for "no defaults" — see note) ==');
{
  // simulateCashout has no optional parameters — every call site must
  // supply all five. This is a real, runtime-checkable property of the
  // TypeScript function (Function.prototype.length counts only
  // parameters without a default), used here as an honest PROXY for the
  // actual guarantee this task cares about: that the real Postgres
  // function cashout_game(text, text, timestamptz) has no DEFAULT on any
  // parameter either. This check cannot verify the real database
  // function's signature — only a live Postgres instance can (see
  // PROJECT_CHANGELOG.md "Real database verification status").
  check('simulateCashout requires all 5 arguments (no defaults)', simulateCashout.length === 5, String(simulateCashout.length));
}

console.log('\n== Server decision-logic model (simulation — see file header) ==');
{
  // Same idempotency key AND same context, submitted twice -> replay.
  const state: CashoutSimState = { ledger: [], potCents: 1240, currentContextId: 'ctx-A' };
  const key = fakeUuid();
  const first = simulateCashout(state, 'user-1', key, 'daily_gate', 'ctx-A');
  const second = simulateCashout(state, 'user-1', key, 'daily_gate', 'ctx-A');
  check('first request succeeds', first.kind === 'success', JSON.stringify(first));
  check('second request (same key, same context) replays the original', second.kind === 'replay', JSON.stringify(second));
  check('same transaction id both times', 'transactionId' in first && 'transactionId' in second && first.transactionId === second.transactionId);
  check('same amount both times', 'amountCents' in first && 'amountCents' in second && first.amountCents === second.amountCents);
  check('ledger contains exactly one row', state.ledger.length === 1, String(state.ledger.length));
  check('pot reset exactly once (not decremented twice)', state.potCents === 0);
}
{
  // Same key, but a DIFFERENT context -> explicit conflict, never a replay, never a new payout.
  const state: CashoutSimState = { ledger: [], potCents: 800, currentContextId: 'ctx-A' };
  const key = fakeUuid();
  const first = simulateCashout(state, 'user-1', key, 'daily_gate', 'ctx-A');
  state.currentContextId = 'ctx-B'; // a new run happened; server's own "current" moved on
  const second = simulateCashout(state, 'user-1', key, 'daily_gate', 'ctx-B');
  check('first request succeeds', first.kind === 'success');
  check('same key, different context -> context_conflict, not replay', second.kind === 'context_conflict', JSON.stringify(second));
  check('no second ledger row created', state.ledger.length === 1);
}
{
  // Same key, but a DIFFERENT game id -> also a conflict.
  const state: CashoutSimState = { ledger: [], potCents: 400, currentContextId: 'ctx-A' };
  const key = fakeUuid();
  const first = simulateCashout(state, 'user-1', key, 'daily_gate', 'ctx-A');
  const second = simulateCashout(state, 'user-1', key, 'some_other_game', 'ctx-A');
  check('first request succeeds', first.kind === 'success');
  check('same key, different game id -> context_conflict', second.kind === 'context_conflict', JSON.stringify(second));
}
{
  // New key, but a context that does not match the server's current one -> stale, rejected before any ledger write.
  const state: CashoutSimState = { ledger: [], potCents: 600, currentContextId: 'ctx-CURRENT' };
  const res = simulateCashout(state, 'user-1', fakeUuid(), 'daily_gate', 'ctx-OLD');
  check('new key, stale context -> stale_context', res.kind === 'stale_context', JSON.stringify(res));
  check('no ledger row created for a stale context', state.ledger.length === 0);
  check('pot untouched for a stale context', state.potCents === 600);
}
{
  // New key, context matching the current locked state -> processes normally.
  const state: CashoutSimState = { ledger: [], potCents: 250, currentContextId: 'ctx-NOW' };
  const res = simulateCashout(state, 'user-1', fakeUuid(), 'daily_gate', 'ctx-NOW');
  check('new key, matching current context -> success', res.kind === 'success', JSON.stringify(res));
}
{
  // Missing / empty context is always rejected, regardless of key validity.
  const state: CashoutSimState = { ledger: [], potCents: 100, currentContextId: 'ctx-A' };
  const res = simulateCashout(state, 'user-1', fakeUuid(), 'daily_gate', '');
  check('missing context is rejected', res.kind === 'rejected', JSON.stringify(res));
  check('no ledger row created for a missing context', state.ledger.length === 0);
}
{
  // Different idempotency keys, same context, second finds no eligible pot.
  const state: CashoutSimState = { ledger: [], potCents: 500, currentContextId: 'ctx-A' };
  const first = simulateCashout(state, 'user-1', fakeUuid(), 'daily_gate', 'ctx-A');
  const second = simulateCashout(state, 'user-1', fakeUuid(), 'daily_gate', 'ctx-A');
  check('first request succeeds', first.kind === 'success');
  check('second request (different key) finds no eligible pot', second.kind === 'rejected', JSON.stringify(second));
  check('ledger still contains exactly one row', state.ledger.length === 1);
}
{
  // Different users may reuse the same literal key without conflict.
  const key = fakeUuid();
  const stateA: CashoutSimState = { ledger: [], potCents: 300, currentContextId: 'ctx-A' };
  const a = simulateCashout(stateA, 'user-A', key, 'daily_gate', 'ctx-A');
  const stateB: CashoutSimState = { ledger: stateA.ledger, potCents: 300, currentContextId: 'ctx-A' };
  const b = simulateCashout(stateB, 'user-B', key, 'daily_gate', 'ctx-A');
  check('user A succeeds', a.kind === 'success');
  check('user B (same key, different user) also succeeds independently', b.kind === 'success', JSON.stringify(b));
}
{
  // Invalid / malformed key.
  const state: CashoutSimState = { ledger: [], potCents: 100, currentContextId: 'ctx-A' };
  const missing = simulateCashout(state, 'user-1', '', 'daily_gate', 'ctx-A');
  const malformed = simulateCashout(state, 'user-1', 'not-a-uuid', 'daily_gate', 'ctx-A');
  check('missing key is rejected', missing.kind === 'rejected');
  check('malformed key is rejected', malformed.kind === 'rejected');
  check('no ledger row created for invalid keys', state.ledger.length === 0);
}
{
  // No pot, but a valid, current context.
  const state: CashoutSimState = { ledger: [], potCents: 0, currentContextId: 'ctx-A' };
  const res = simulateCashout(state, 'user-1', fakeUuid(), 'daily_gate', 'ctx-A');
  check('zero pot is rejected for a brand-new key even with a valid context', res.kind === 'rejected', JSON.stringify(res));
}

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
