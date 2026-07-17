/*
  # Region assignment history — replaces the single-row simplification

  ## Confirmed gap (audited directly, not from changelog text)
  `user_game_time_region` is `user_id PRIMARY KEY` — one row per user. The
  previous pass's `assign_user_game_time_region()` correctly computed a
  safe `effective_from` boundary, but the `ON CONFLICT (user_id) DO
  UPDATE` immediately overwrote the player's active region with the new
  (pending) one. `resolve_user_game_time_region()` then correctly refused
  to use that row until `effective_from <= now()` — but with the OLD
  region's identity already gone, it fell back to the GLOBAL region for
  the gap, not the player's actual previous region. Documented as a
  known simplification in the previous pass; not sufficient for real
  Regional Game Time, per this task.

  ## Fix: a real history table
  `user_game_time_region_assignments` — every assignment (past, active,
  and pending) is its own row, closed off by `effective_until` rather
  than overwritten. `resolve_user_game_time_region()` (next migration)
  dynamically selects whichever row's effective window (from
  `effective_from` up to, but not including, `effective_until`) contains
  "now" — no background job needed, exactly as requirement #5 prefers.

  The old `user_game_time_region` table is left in place, untouched,
  deprecated — not dropped. Nothing writes to it anymore after this
  migration; dropping it is unnecessary risk for zero benefit. Existing
  data in it (if any, given nothing has been applied yet) is migrated
  forward into the new table by the next migration, not lost.
*/

CREATE TABLE IF NOT EXISTS user_game_time_region_assignments (
  id                                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                                 uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  region_id                               uuid NOT NULL REFERENCES game_time_regions(id),
  effective_from                          timestamptz NOT NULL,
  effective_until                         timestamptz, -- NULL = open-ended (this is the latest row for the user)
  status                                  text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'superseded', 'cancelled')),
  assigned_by                             text NOT NULL,
  assignment_reason                       text,
  force_effective_immediately_for_test    boolean NOT NULL DEFAULT false,
  created_at                              timestamptz NOT NULL DEFAULT now(),
  updated_at                              timestamptz NOT NULL DEFAULT now()
);

-- Supports both the "current effective row" lookup (resolve) and admin
-- history browsing (all rows for a user, most recent first).
CREATE INDEX IF NOT EXISTS idx_ugtra_user_effective ON user_game_time_region_assignments(user_id, effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_ugtra_open_ended ON user_game_time_region_assignments(user_id) WHERE effective_until IS NULL;

ALTER TABLE user_game_time_region_assignments ENABLE ROW LEVEL SECURITY;

-- Players may read their own assignment history (current + pending, for
-- transparency) but never write to it — same principle as the table it
-- replaces: region assignment is admin/server-controlled only.
CREATE POLICY user_game_time_region_assignments_select_own ON user_game_time_region_assignments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policy for authenticated — all writes go
-- through assign_user_game_time_region() (SECURITY DEFINER,
-- service_role-only, next migration).

/*
  ## Rollback
  `DROP TABLE IF EXISTS user_game_time_region_assignments;`
  The deprecated `user_game_time_region` table is untouched either way —
  nothing is lost by rolling back.
*/
