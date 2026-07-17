/*
  # Region assignment history — replaces the single-row simplification
  Creates user_game_time_region_assignments: every assignment (past, active,
  pending) is its own row, closed by effective_until. The old
  user_game_time_region table is left in place, deprecated.
*/

CREATE TABLE IF NOT EXISTS user_game_time_region_assignments (
  id                                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                                 uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  region_id                               uuid NOT NULL REFERENCES game_time_regions(id),
  effective_from                          timestamptz NOT NULL,
  effective_until                         timestamptz,
  status                                  text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'superseded', 'cancelled')),
  assigned_by                             text NOT NULL,
  assignment_reason                       text,
  force_effective_immediately_for_test    boolean NOT NULL DEFAULT false,
  created_at                              timestamptz NOT NULL DEFAULT now(),
  updated_at                              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ugtra_user_effective ON user_game_time_region_assignments(user_id, effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_ugtra_open_ended ON user_game_time_region_assignments(user_id) WHERE effective_until IS NULL;

ALTER TABLE user_game_time_region_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_game_time_region_assignments_select_own ON user_game_time_region_assignments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());