/*
  # Region reassignment: enforce the safe-boundary rule in code, not just docs

  ## Confirmed gap (audited, not assumed)
  Read the actual live bodies of both functions directly:
  - `resolve_user_game_time_region()` never checked `effective_from` at
    all — it used whatever row existed in `user_game_time_region`
    regardless of whether that row's `effective_from` was in the past or
    future.
  - `assign_user_game_time_region(p_user_id, p_region_id, p_effective_from,
    p_assigned_by, p_assignment_reason)` took `p_effective_from` as a
    **caller-supplied, unvalidated** parameter — nothing in the function
    computed or enforced a safe boundary; the "safe future boundary" rule
    from the original Game Time System pass was documented, not enforced.
    This is a real gap, exactly what this task asked to find.

  ## Fix
  1. `resolve_user_game_time_region()` — adds
     `AND ugtr.effective_from <= now()` to the lookup. A future-dated
     assignment is now correctly ignored until its boundary passes,
     falling back to the configured global region in the meantime — the
     same safe-default pattern already used everywhere else in the Game
     Time System (unassigned/invalid → global). This is the documented
     "smallest safe equivalent": `user_game_time_region` is a
     single-row-per-user table (not a history table), so a brand new
     assignment overwrites the previous one immediately — the OLD
     region's identity is not preserved as a distinct row until the
     boundary passes. Falling back to the global region for the gap
     between reassignment and the boundary is deliberately chosen as the
     safe default rather than attempting to reconstruct "the old specific
     region" from an already-overwritten row. Documented as a
     simplification, not silently assumed equivalent to true history
     preservation — see PROJECT_CHANGELOG.md for the full reasoning.
  2. `assign_user_game_time_region(...)` — **signature changed**:
     `p_effective_from` is removed as a caller-supplied parameter (a
     genuinely different argument-type list, so the old 5-arg overload is
     explicitly dropped, matching the pattern already used for
     `cashout_game` and `apply_pending_game_time_mode` in prior passes —
     never leave an old, less-safe overload silently callable). The new
     signature computes the effective boundary itself:

     `effective_from = GREATEST(old_region_next_rollover, new_region_next_rollover)`

     using each region's own `next_daily_rollover_at`
     (`get_game_time_state_for_region()`), unless the caller is the
     player's very first assignment (no previous region row at all), in
     which case only the new region's next rollover is used (there is no
     "old region play window" to protect against). A new
     `p_force_effective_immediately_for_test` parameter — default
     `false`, `service_role`-only via the function's own grant — allows
     `effective_from = now()` for test accounts; every use of it is
     explicitly recorded in the change log (`change_reason` is prefixed
     with `[IMMEDIATE TEST OVERRIDE]`) so it's never silently
     indistinguishable from a normal, safely-scheduled assignment.

  ## Not changed
  No change to `assign_user_game_time_region`'s core validation (region
  must exist and be enabled), the change-log insert, or
  `get_game_time_state_for_user`'s own Global-mode-ignores-individual-
  assignment behavior (already correct, confirmed again by re-reading it
  during this pass — unchanged).
*/

CREATE OR REPLACE FUNCTION public.resolve_user_game_time_region(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT ugtr.region_id FROM public.user_game_time_region ugtr
       JOIN public.game_time_regions gtr ON gtr.id = ugtr.region_id
       WHERE ugtr.user_id = p_user_id
         AND gtr.enabled = true
         AND ugtr.effective_from <= now()),
    (SELECT global_region_id FROM public.game_time_settings WHERE id = true)
  );
$$;

-- Drop the old 5-arg signature (caller-controlled effective_from) —
-- adding/removing a parameter changes the argument-type list, so
-- CREATE OR REPLACE alone would leave this old, less-safe overload
-- callable alongside the new one. Never leave an insecure overload
-- reachable — same principle already applied to cashout_game.
DROP FUNCTION IF EXISTS public.assign_user_game_time_region(uuid, uuid, timestamptz, text, text);

CREATE OR REPLACE FUNCTION public.assign_user_game_time_region(
  p_user_id                          uuid,
  p_region_id                        uuid,
  p_assigned_by                      text,
  p_assignment_reason                text DEFAULT NULL,
  p_force_effective_immediately_for_test boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_previous_region_id   uuid;
  v_old_next_rollover    timestamptz;
  v_new_next_rollover    timestamptz;
  v_effective_from       timestamptz;
  v_reason                text;
BEGIN
  IF p_user_id IS NULL OR p_region_id IS NULL OR p_assigned_by IS NULL THEN
    RAISE EXCEPTION 'user_id, region_id, and assigned_by are required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.game_time_regions WHERE id = p_region_id AND enabled = true) THEN
    RAISE EXCEPTION 'Region does not exist or is not enabled';
  END IF;

  SELECT region_id INTO v_previous_region_id FROM public.user_game_time_region WHERE user_id = p_user_id;

  IF p_force_effective_immediately_for_test THEN
    -- Test-only path. Grants (below) restrict this function to
    -- service_role, so this can never be reached by a player or a normal
    -- admin-panel action — but the override is still explicitly logged,
    -- never silently indistinguishable from a normal assignment.
    v_effective_from := now();
    v_reason := '[IMMEDIATE TEST OVERRIDE] ' || COALESCE(p_assignment_reason, '');
  ELSE
    -- Safe boundary: later of the player's CURRENT region's next
    -- rollover and the TARGET region's next rollover. This is what
    -- prevents "play in region A, get reassigned, immediately get a
    -- fresh playable game date in region B" — the change cannot take
    -- effect before either region's current game date has actually
    -- ended.
    IF v_previous_region_id IS NOT NULL THEN
      v_old_next_rollover := ((public.get_game_time_state_for_region(v_previous_region_id))->>'next_daily_rollover_at')::timestamptz;
    END IF;
    v_new_next_rollover := ((public.get_game_time_state_for_region(p_region_id))->>'next_daily_rollover_at')::timestamptz;

    v_effective_from := GREATEST(
      COALESCE(v_old_next_rollover, v_new_next_rollover),
      v_new_next_rollover
    );
    v_reason := p_assignment_reason;
  END IF;

  INSERT INTO public.user_game_time_region (user_id, region_id, effective_from, assigned_by, assignment_reason)
  VALUES (p_user_id, p_region_id, v_effective_from, p_assigned_by, v_reason)
  ON CONFLICT (user_id) DO UPDATE SET
    region_id         = EXCLUDED.region_id,
    effective_from    = EXCLUDED.effective_from,
    assigned_by        = EXCLUDED.assigned_by,
    assignment_reason  = EXCLUDED.assignment_reason;

  INSERT INTO public.user_game_time_region_change_log (user_id, previous_region_id, new_region_id, effective_from, changed_by, change_reason)
  VALUES (p_user_id, v_previous_region_id, p_region_id, v_effective_from, p_assigned_by, v_reason);
END;
$$;

REVOKE ALL ON FUNCTION public.assign_user_game_time_region(uuid, uuid, text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_user_game_time_region(uuid, uuid, text, text, boolean) TO service_role;

/*
  ## Rollback
  Re-apply both previous bodies from
  20260715020000_20260715_game_time_clock_rpcs.sql — including
  recreating the 5-arg `assign_user_game_time_region` signature (with
  `p_effective_from`) and dropping the new one:
  `DROP FUNCTION IF EXISTS public.assign_user_game_time_region(uuid, uuid, text, text, boolean);`
  No `user_game_time_region` or change-log row is rewritten either way.
*/
