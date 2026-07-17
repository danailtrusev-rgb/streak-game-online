/*
  # Event instances — region-scoped Saturday Showdown / Sunday Crown foundation
  - event_instances: one row per (event_type, region, event_date)
  - get_or_create_event_instance: idempotent, service_role only
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

CREATE POLICY event_instances_select_all ON event_instances
  FOR SELECT TO authenticated
  USING (true);

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