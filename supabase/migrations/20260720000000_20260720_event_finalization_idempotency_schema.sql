/*
  # Weekend event finalization idempotency — schema foundation

  ## Audit (this pass, direct inspection — not from changelog text)

  | Area | Current behaviour | Risk | Required change |
  |---|---|---|---|
  | `admin_finalize_event()` | No frontend/admin caller exists yet (confirmed by search) — a manually-invoked SQL RPC. Pays a real `JACKPOT_WIN` wallet reward with NO protection against being called twice for the same winner/event | High — duplicate payout on accidental re-run | Real idempotency gate |
  | `weekend_event_entries` RLS | `"Users can insert own event entries"` policy allows `WITH CHECK (auth.uid() = user_id)` direct client INSERT, bypassing `enter_weekend_event()`'s qualification/region/window/duplicate checks entirely | High — a crafted direct insert could fabricate a qualifying entry | Drop the policy; RPC becomes the only write path |
  | `event_instances.status` | Only ever set at creation (`'scheduled'`) or finalization (`'finalized'`) — nothing transitions it through `'open'`/`'closed'`, since Cron is inactive | Low (display/reporting staleness only — `enter_weekend_event()` already computes fresh status via `get_game_time_state_for_region()`, confirmed by re-reading it directly, not assumed) | Add a reusable derived-status function; use it wherever a real-time decision is needed |
  | `wallet_ledger` | No idempotency key of its own for `JACKPOT_WIN` rows | Medium | Gate via `event_finalizations`, not a broad new unique index on `wallet_ledger` itself (which could affect unrelated entries) |
  | `winner_announcements` | No link to a finalization; a duplicate finalize call would create a duplicate announcement | Medium | Only ever inserted inside the same idempotency-gated path |
  | `enter_weekend_event()` | Pre-insert existence check present; no `unique_violation` backstop on the INSERT itself | Low (narrow race) | Add the same defense-in-depth pattern already used in `play_daily_gate`/`cashout_game` |
  | admin authentication pattern | This project's admin panel uses a separate session mechanism (`admin_sessions`, confirmed in the Reactivation System pass), not player JWTs | N/A | `admin_finalize_event()` remains `service_role`-only, consistent with every other admin-only financial RPC in this project |

  ## event_finalizations — the real idempotency gate
  One row per successful finalization, ever. Two unique indexes, not one
  combined constraint, because NULL is not equal to NULL in a unique
  constraint (multiple `event_instance_id IS NULL` rows would otherwise
  all be allowed to coexist, defeating the legacy-path protection):
  - `idx_event_finalizations_instance` — `UNIQUE (event_instance_id)
    WHERE event_instance_id IS NOT NULL` — one finalization ever, per
    region-scoped event instance.
  - `idx_event_finalizations_legacy` — `UNIQUE (event_game_id,
    event_date) WHERE event_instance_id IS NULL` — one finalization
    ever, per legacy/global (event, date) pair, for calls made without
    an instance.

  This table (not a broad new index on `wallet_ledger`) is the
  idempotency mechanism — `admin_finalize_event()` (next migration)
  attempts to INSERT here FIRST; success means "I won the right to pay,"
  a `unique_violation` means "already finalized, return cleanly, touch
  nothing else." The wallet ledger insert, `event_instances` status
  update, and winner announcement all happen only inside the same
  winning path, inside the same function call (a single Postgres
  function invocation is already one transaction — no explicit
  `BEGIN`/`COMMIT` needed for this atomicity guarantee).

  ## Derived status helper
  `get_event_instance_derived_status(p_instance_id)` — implements exactly
  the formula the task specifies (cancelled → finalized → scheduled →
  open → closed, in that priority order), reading `starts_at`/`ends_at`
  directly rather than trusting the stored `status` column for anything
  time-based. The stored column remains meaningful for the two states
  that are real admin actions, not time transitions: `'cancelled'` and
  `'finalized'`.
*/

CREATE TABLE IF NOT EXISTS event_finalizations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_instance_id   uuid REFERENCES event_instances(id), -- NULL for legacy/global finalization
  event_game_id       text NOT NULL REFERENCES games(game_id),
  game_time_region_id uuid REFERENCES game_time_regions(id),
  event_date          date NOT NULL,
  winner_user_id      uuid NOT NULL REFERENCES users(id),
  reward_cents        integer NOT NULL DEFAULT 0,
  wallet_ledger_id    uuid REFERENCES wallet_ledger(id),
  finalized_by        text NOT NULL,
  finalized_at        timestamptz NOT NULL DEFAULT now(),
  metadata            jsonb DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_finalizations_instance
  ON event_finalizations(event_instance_id) WHERE event_instance_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_finalizations_legacy
  ON event_finalizations(event_game_id, event_date) WHERE event_instance_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_event_finalizations_winner ON event_finalizations(winner_user_id);

ALTER TABLE event_finalizations ENABLE ROW LEVEL SECURITY;

-- Players may see their own win (needed to display "you won") but never
-- write — all writes happen via admin_finalize_event() (service_role only).
CREATE POLICY event_finalizations_select_own ON event_finalizations
  FOR SELECT TO authenticated
  USING (winner_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_event_instance_derived_status(p_instance_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_instance record;
BEGIN
  SELECT status, starts_at, ends_at INTO v_instance FROM public.event_instances WHERE id = p_instance_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_instance.status = 'cancelled' THEN RETURN 'cancelled'; END IF;
  IF v_instance.status = 'finalized' THEN RETURN 'finalized'; END IF;
  IF now() < v_instance.starts_at THEN RETURN 'scheduled'; END IF;
  IF now() >= v_instance.starts_at AND now() < v_instance.ends_at THEN RETURN 'open'; END IF;
  RETURN 'closed';
END;
$$;

REVOKE ALL ON FUNCTION public.get_event_instance_derived_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_event_instance_derived_status(uuid) TO authenticated, service_role;

-- ── Close the direct-INSERT RLS bypass (requirement #7) ─────────────────
-- enter_weekend_event() is SECURITY DEFINER and continues to write
-- successfully regardless — SECURITY DEFINER functions run with the
-- function owner's privileges, not the calling role's, so dropping this
-- policy does not affect the RPC's own ability to insert; it only closes
-- the direct client bypass. The existing SELECT-own policy (players
-- viewing their own entries) is untouched.
DROP POLICY IF EXISTS "Users can insert own event entries" ON weekend_event_entries;

/*
  ## Rollback
  `DROP TABLE IF EXISTS event_finalizations;`
  `DROP FUNCTION IF EXISTS public.get_event_instance_derived_status(uuid);`
  Re-create the dropped policy:
  `CREATE POLICY "Users can insert own event entries" ON weekend_event_entries
   FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);`
  No existing row is rewritten either way.
*/
