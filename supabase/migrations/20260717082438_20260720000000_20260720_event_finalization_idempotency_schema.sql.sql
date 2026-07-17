/*
  # Weekend event finalization idempotency — schema foundation
  - event_finalizations: one row per successful finalization (idempotency gate)
  - Two partial unique indexes for instance-scoped and legacy paths
  - get_event_instance_derived_status: real-time status from timestamps
  - Drops direct-INSERT RLS policy on weekend_event_entries (closes bypass)
*/

CREATE TABLE IF NOT EXISTS event_finalizations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_instance_id   uuid REFERENCES event_instances(id),
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

DROP POLICY IF EXISTS "Users can insert own event entries" ON weekend_event_entries;