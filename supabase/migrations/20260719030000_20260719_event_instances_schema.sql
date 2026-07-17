/*
  # Event instances — region-scoped Saturday Showdown / Sunday Crown foundation

  ## Audit finding: a real weekend-event system already exists
  Before designing anything new, inspected the actual schema and RPCs —
  not the task's suggested model in isolation. Found a complete, working
  system already in place:
  - `weekend_event_entries` — real participation table, `UNIQUE(user_id,
    event_game_id, week_start_date)`.
  - `enter_weekend_event(p_event_game_id, p_idem_key)` — real
    player-facing entry RPC: checks `weekly_qualification_status`
    (`saturday_qualified`/`sunday_qualified`), prevents double entry via
    `saturday_entry_used`/`sunday_entry_used` flags, idempotent.
  - `admin_finalize_event(...)` — real finalization: pays a real wallet
    reward (`wallet_ledger` type `JACKPOT_WIN`) to the winner, marks all
    entries completed, creates a winner announcement.
  - `event_game_id = 'saturday_main_event'` is literally named
    `'Saturday Showdown'` in the `games` table, and
    `'sunday_winners_event'` is the Sunday counterpart — the task's
    "Saturday Showdown"/"Sunday Crown" naming already maps 1:1 onto these
    existing values. Used directly here, no translation layer invented.

  Given this, `event_instances` is added as a genuine, useful addition
  (region-scoped window/lifecycle tracking that doesn't exist yet — the
  existing system only implicitly groups entries by
  `event_game_id + week_start_date`, with no explicit per-region instance
  record for leaderboards/admin visibility) — but there is deliberately
  **no separate `event_participations` table**. `weekend_event_entries`
  is extended (next migration) to reference an `event_instances` row
  instead, per "adapt to existing project conventions" rather than
  building a parallel, overlapping participation mechanism.

  ## Schema
  `event_instances` — one row per (event_type, region, event_date).
  `event_type` uses the existing `event_game_id` values directly
  (`'saturday_main_event'`, `'sunday_winners_event'`) rather than new
  ones, for zero-translation consistency with the rest of the schema.

  ## get_or_create_event_instance(...)
  Idempotent: `INSERT ... ON CONFLICT (event_type, game_time_region_id,
  event_date) DO NOTHING` then a `SELECT`, so a repeated call for the
  same (type, region, date) always returns the same instance id, never
  creates a duplicate. Validates the region is enabled and that the
  region's configured window for that event type is not inverted
  (start >= end) before creating anything. Does not create instances for
  disabled regions. Does not finalize or reward anything — that remains
  `admin_finalize_event`'s job, extended in a later migration in this
  pass to be instance-aware.

  `service_role`-only grant — called internally by the (later,
  `authenticated`-granted) participation entry RPCs, which is a normal
  in-body function call and does not require the calling context to hold
  its own EXECUTE grant on this function.
*/

CREATE TABLE IF NOT EXISTS event_instances (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type            text NOT NULL CHECK (event_type IN ('saturday_main_event', 'sunday_winners_event')),
  game_time_region_id   uuid NOT NULL REFERENCES game_time_regions(id),
  event_date            date NOT NULL,
  starts_at             timestamptz NOT NULL,
  ends_at               timestamptz NOT NULL,
  status                text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'open', 'closed', 'finalized', 'cancelled')),
  rules_version         text NOT NULL DEFAULT 'v1',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_type, game_time_region_id, event_date),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_event_instances_region_date ON event_instances(game_time_region_id, event_date);
CREATE INDEX IF NOT EXISTS idx_event_instances_type_status ON event_instances(event_type, status);

ALTER TABLE event_instances ENABLE ROW LEVEL SECURITY;

-- Event windows/status are not sensitive — visible to any authenticated
-- player (needed to display "Saturday Showdown opens in region X at...").
CREATE POLICY event_instances_select_all ON event_instances
  FOR SELECT TO authenticated
  USING (true);

-- No client write policy — event_instances are only ever created via
-- get_or_create_event_instance() (SECURITY DEFINER) or updated via admin
-- finalization, never directly.

CREATE OR REPLACE FUNCTION public.get_or_create_event_instance(
  p_event_type text,
  p_region_id  uuid,
  p_event_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_region      record;
  v_start_local time;
  v_end_local   time;
  v_starts_at   timestamptz;
  v_ends_at     timestamptz;
  v_id          uuid;
BEGIN
  IF p_event_type NOT IN ('saturday_main_event', 'sunday_winners_event') THEN
    RAISE EXCEPTION 'Unknown event type: %', p_event_type;
  END IF;

  SELECT * INTO v_region FROM public.game_time_regions WHERE id = p_region_id AND enabled = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Region does not exist or is not enabled';
  END IF;

  IF p_event_type = 'saturday_main_event' THEN
    v_start_local := v_region.saturday_start_local_time;
    v_end_local   := v_region.saturday_end_local_time;
  ELSE
    v_start_local := v_region.sunday_start_local_time;
    v_end_local   := v_region.sunday_end_local_time;
  END IF;

  IF v_start_local IS NULL THEN
    RAISE EXCEPTION 'Region % has no configured window for %', v_region.key, p_event_type;
  END IF;
  IF v_end_local IS NULL OR v_end_local <= v_start_local THEN
    RAISE EXCEPTION 'Region % has an invalid or inverted window for %', v_region.key, p_event_type;
  END IF;

  v_starts_at := (p_event_date + v_start_local) AT TIME ZONE v_region.timezone;
  v_ends_at   := (p_event_date + v_end_local) AT TIME ZONE v_region.timezone;

  INSERT INTO public.event_instances (event_type, game_time_region_id, event_date, starts_at, ends_at, status)
  VALUES (p_event_type, p_region_id, p_event_date, v_starts_at, v_ends_at, 'scheduled')
  ON CONFLICT (event_type, game_time_region_id, event_date) DO NOTHING;

  SELECT id INTO v_id FROM public.event_instances
  WHERE event_type = p_event_type AND game_time_region_id = p_region_id AND event_date = p_event_date;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_event_instance(text, uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_event_instance(text, uuid, date) TO service_role;

/*
  ## Rollback
  `DROP FUNCTION IF EXISTS public.get_or_create_event_instance(text, uuid, date);`
  `DROP TABLE IF EXISTS event_instances;`
  Safe only if no later migration in this pass has added a foreign key
  reference to it yet (the next migration does — roll back in reverse
  order).
*/
