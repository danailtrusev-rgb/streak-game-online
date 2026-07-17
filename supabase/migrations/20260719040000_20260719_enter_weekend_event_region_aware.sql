/*
  # enter_weekend_event: consolidated, region-scoped

  ## Two real bugs found during this pass's audit (not assumed from any
  changelog — confirmed by reading the actual migrations and the actual
  frontend call site)

  1. **Two coexisting overloads.** `enter_weekend_event(text, uuid)`
     (20260408122105_*.sql, with an idempotency key) and
     `enter_weekend_event(text)` (20260423102832_*.sql, no idempotency
     key) are DIFFERENT Postgres function signatures — both exist
     simultaneously, exactly the kind of overload ambiguity this
     project's cashout hardening passes have repeatedly closed elsewhere.
     Checked `src/hooks/useWeekendEvents.ts` directly: the frontend calls
     `supabase.rpc('enter_weekend_event', { p_event_game_id: eventGameId
     })` — one argument. The 2-arg version is dead code, never called by
     anything, and is dropped here.
  2. **Response-shape mismatch.** The live 1-arg version returns
     `{ ok: true, event_game_id }`. The frontend hook expects `{
     entry_id, status }` (it destructures `data as { entry_id: string;
     status: string }`). This is a genuine pre-existing contract bug —
     unrelated to region-awareness, found only because this pass required
     reading the function end to end. Fixed by returning the shape the
     frontend actually expects.

  ## Region-scoping (this pass's actual goal)
  - Resolves the player's authoritative region
    (`resolve_user_game_time_region`) and week
    (`get_current_week_start_for_user`) — was: inline
    `date_trunc('week', get_madrid_today())`, now consistent with
    `update_weekly_qualification()`'s own week computation.
  - `event_date` is the Saturday/Sunday of that resolved week
    (`week_start + 5` / `+6`), computed independently of whether the
    region has a configured time window — this is pure calendar
    arithmetic, needed regardless, and mirrors the same ISO-week
    convention `get_game_time_state_for_region()` already uses.
  - **If the region has a configured Saturday/Sunday window**: entry
    additionally requires the window to currently be `'active'`
    (`get_game_time_state_for_region()`'s status), and the entry is
    linked to a real `event_instances` row via
    `get_or_create_event_instance()`.
  - **If the region has NO configured window** (the seeded default
    global region today — confirmed `saturday_start_local_time IS NULL`)
    — the window-active check is skipped entirely and no event instance
    is created, preserving the exact existing Global-mode behavior
    (qualification-gated entry only). This is deliberate: requiring an
    `active` window unconditionally would have broken every current
    Global-mode Saturday/Sunday entry, since the seeded region has no
    window configured at all. Confirmed this preserves current behavior,
    not assumed.
  - A pre-insert existence check (`SELECT ... FROM weekend_event_entries
    WHERE ...`) now returns a clean `'already_entered'` status instead of
    letting a genuine double-entry race hit the table's
    `UNIQUE(user_id, event_game_id, week_start_date)` constraint as an
    unhandled error (the 1-arg version had no such check at all — a real,
    if narrow, gap; the 2-arg version had this, the 1-arg version that
    was actually live did not).
  - `event_instance_id` and `game_time_region_id` are recorded on the
    entry row (columns added in this same migration) for audit/reporting
    — never used for eligibility itself.

  ## Not changed
  Qualification threshold logic (`saturday_qualified`/`sunday_qualified`,
  `qualification_rules`), the `saturday_entry_used`/`sunday_entry_used`
  flags and their meaning, `admin_finalize_event`'s existing reward
  mechanism (extended, not replaced, in a later migration in this pass).
*/

ALTER TABLE weekend_event_entries
  ADD COLUMN IF NOT EXISTS event_instance_id uuid REFERENCES event_instances(id),
  ADD COLUMN IF NOT EXISTS game_time_region_id uuid REFERENCES game_time_regions(id);

CREATE INDEX IF NOT EXISTS idx_wee_instance ON weekend_event_entries(event_instance_id);

-- Drop the dead, unused 2-arg overload — never leave an unreachable-by-
-- the-frontend-but-still-callable overload reachable, same principle
-- already applied to cashout_game.
DROP FUNCTION IF EXISTS public.enter_weekend_event(text, uuid);

CREATE OR REPLACE FUNCTION public.enter_weekend_event(p_event_game_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id           uuid;
  v_region_id         uuid;
  v_region            record;
  v_week_start        date;
  v_event_date        date;
  v_qual              record;
  v_game_time         jsonb;
  v_window_status     text;
  v_window_configured boolean;
  v_instance_id       uuid;
  v_existing_entry_id uuid;
  v_entry_id          uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_event_game_id NOT IN ('saturday_main_event', 'sunday_winners_event') THEN
    RAISE EXCEPTION 'Unknown event: %', p_event_game_id;
  END IF;

  v_region_id  := public.resolve_user_game_time_region(v_user_id);
  SELECT * INTO v_region FROM public.game_time_regions WHERE id = v_region_id;
  v_week_start := public.get_current_week_start_for_user(v_user_id);
  v_event_date := v_week_start + (CASE WHEN p_event_game_id = 'saturday_main_event' THEN 5 ELSE 6 END);
  v_game_time  := public.get_game_time_state_for_region(v_region_id);

  -- Qualification — a missing row is treated as "not qualified" (the
  -- more lenient of the two prior behaviors), not a separate error.
  SELECT * INTO v_qual FROM public.weekly_qualification_status
  WHERE user_id = v_user_id AND week_start_date = v_week_start;

  IF p_event_game_id = 'saturday_main_event' THEN
    IF v_qual IS NULL OR NOT v_qual.saturday_qualified THEN
      RAISE EXCEPTION 'Not qualified for Saturday Showdown';
    END IF;
    IF v_qual.saturday_entry_used THEN
      RAISE EXCEPTION 'Already entered Saturday Showdown this week';
    END IF;
    v_window_status     := v_game_time->>'saturday_status';
    v_window_configured := v_region.saturday_start_local_time IS NOT NULL;
  ELSE
    IF v_qual IS NULL OR NOT v_qual.sunday_qualified THEN
      RAISE EXCEPTION 'Not qualified for Sunday Crown';
    END IF;
    IF v_qual.sunday_entry_used THEN
      RAISE EXCEPTION 'Already entered Sunday Crown this week';
    END IF;
    v_window_status     := v_game_time->>'sunday_status';
    v_window_configured := v_region.sunday_start_local_time IS NOT NULL;
  END IF;

  -- Clean idempotent response instead of relying on the table's unique
  -- constraint to fail unhandled on a genuine double-entry race.
  SELECT id INTO v_existing_entry_id FROM public.weekend_event_entries
  WHERE user_id = v_user_id AND event_game_id = p_event_game_id AND week_start_date = v_week_start;
  IF v_existing_entry_id IS NOT NULL THEN
    RETURN jsonb_build_object('entry_id', v_existing_entry_id, 'status', 'already_entered');
  END IF;

  IF v_window_configured THEN
    IF v_window_status <> 'active' THEN
      RAISE EXCEPTION 'This event is not currently open in your region (status: %)', v_window_status;
    END IF;
    v_instance_id := public.get_or_create_event_instance(p_event_game_id, v_region_id, v_event_date);
  ELSE
    -- No configured window (the current Global default region) — preserve
    -- existing qualification-gated-only behavior exactly; no instance.
    v_instance_id := NULL;
  END IF;

  INSERT INTO public.weekend_event_entries
    (user_id, event_game_id, week_start_date, qualification_source_json, result_status, event_instance_id, game_time_region_id)
  VALUES
    (v_user_id, p_event_game_id, v_week_start,
     jsonb_build_object('week_start', v_week_start, 'total_points', v_qual.total_points),
     'entered', v_instance_id, v_region_id)
  RETURNING id INTO v_entry_id;

  IF p_event_game_id = 'saturday_main_event' THEN
    UPDATE public.weekly_qualification_status
    SET saturday_entry_used = true, updated_at = now()
    WHERE user_id = v_user_id AND week_start_date = v_week_start;
  ELSE
    UPDATE public.weekly_qualification_status
    SET sunday_entry_used = true, updated_at = now()
    WHERE user_id = v_user_id AND week_start_date = v_week_start;
  END IF;

  RETURN jsonb_build_object('entry_id', v_entry_id, 'status', 'entered');
END;
$$;

REVOKE ALL ON FUNCTION public.enter_weekend_event(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enter_weekend_event(text) TO authenticated;

/*
  ## Rollback
  Re-apply the previous 1-arg body from
  20260423102832_20260423_microgame_rpcs.sql (drops region-scoping,
  restores the `{ ok, event_game_id }` response shape and the frontend
  mismatch — not recommended). The dropped 2-arg overload is not
  restored (it was genuinely dead code). New columns on
  `weekend_event_entries` can remain (nullable, additive) regardless.
*/
