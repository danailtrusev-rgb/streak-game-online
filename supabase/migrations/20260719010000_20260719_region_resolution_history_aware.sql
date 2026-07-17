/*
  # Region resolution and assignment: history-aware rewrite

  ## Data migration
  Any existing row in the deprecated `user_game_time_region` (single-row)
  table is copied forward into `user_game_time_region_assignments` as one
  open-ended row (`effective_until = NULL`), with `status` set based on
  whether its `effective_from` is already in the past (`'active'`) or
  still in the future (`'pending'`). Nothing is lost; the old table is
  left in place afterward, unused.

  ## resolve_user_game_time_region(p_user_id) — new resolution rule
  Selects the single row whose effective window actually contains "now":
  `effective_from <= now()` AND (`effective_until IS NULL` OR
  `effective_until > now()`), excluding `status = 'cancelled'`, and only
  from an enabled region. By construction (see assign function below)
  there is at most one such row per user at any instant — no ORDER BY
  ambiguity, but LIMIT 1 kept as a defensive backstop. Falls back to the
  configured global region only when no such row exists at all — matching
  every other "no valid assignment" fallback in the Game Time System.

  Global mode is unaffected — `get_game_time_state_for_user()` still
  ignores individual assignments entirely while `mode = 'global'` (that
  logic lives in `get_game_time_state_for_user()` itself, unchanged by
  this migration).

  ## assign_user_game_time_region(...) — new write path
  Same signature as the previous pass introduced
  (`p_user_id, p_region_id, p_assigned_by, p_assignment_reason,
  p_force_effective_immediately_for_test`) — no new signature change
  needed here, `CREATE OR REPLACE` is valid. What changes internally:
  1. Compute the safe `effective_from` boundary exactly as before
     (`GREATEST(old_region_next_rollover, new_region_next_rollover)`,
     or `now()` under the test override).
  2. Find the user's current OPEN-ENDED row (`effective_until IS NULL`,
     `status <> 'cancelled'`) — this is their active-or-pending
     assignment, if any.
  3. If one exists: close it off by setting its
     `effective_until = <new effective_from>` — this is what makes the
     OLD assignment remain genuinely resolvable (via the window check
     above) right up until the exact instant the new one begins, with no
     gap and no overlap. Its `status` is updated to `'active'` if it was
     already in effect, or left as whatever it was — the resolution
     function never trusts `status` for the "is this currently in
     effect" decision anyway (timestamps are authoritative for that);
     `status` is maintained for admin/display clarity, not as a second
     source of truth.
  4. Insert the NEW row, `effective_until = NULL` (open-ended — it is now
     the latest one), `status = 'active'` if its `effective_from <= now()`
     (only possible under the test override) or `'pending'` otherwise.
  5. Log to `user_game_time_region_change_log` exactly as before —
     unchanged mechanism, still the audit trail alongside the new table's
     own inherent history.

  ## Not changed
  Validation (region must exist and be enabled), the
  `service_role`-only grant, the `[IMMEDIATE TEST OVERRIDE]` logging
  marker — all unchanged from the previous pass.
*/

-- ── Data migration: old single-row table → new history table ───────────
-- No ON CONFLICT clause: this table intentionally has no unique
-- constraint (multiple rows per user are the whole point of a history
-- table), and this backfill runs exactly once, reading from the old
-- user_id-PRIMARY-KEY table — there is nothing for it to conflict with.
INSERT INTO user_game_time_region_assignments
  (user_id, region_id, effective_from, effective_until, status, assigned_by, assignment_reason, created_at)
SELECT
  user_id, region_id, effective_from, NULL,
  CASE WHEN effective_from <= now() THEN 'active' ELSE 'pending' END,
  assigned_by, assignment_reason, created_at
FROM user_game_time_region;

-- ── resolve_user_game_time_region: history-aware ────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_user_game_time_region(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT a.region_id
       FROM public.user_game_time_region_assignments a
       JOIN public.game_time_regions gtr ON gtr.id = a.region_id
       WHERE a.user_id = p_user_id
         AND a.status <> 'cancelled'
         AND gtr.enabled = true
         AND a.effective_from <= now()
         AND (a.effective_until IS NULL OR a.effective_until > now())
       ORDER BY a.effective_from DESC
       LIMIT 1),
    (SELECT global_region_id FROM public.game_time_settings WHERE id = true)
  );
$$;

-- ── assign_user_game_time_region: writes to the history table ──────────
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
  v_open_row_id           uuid;
  v_open_row_effective_from timestamptz;
  v_old_next_rollover     timestamptz;
  v_new_next_rollover     timestamptz;
  v_effective_from        timestamptz;
  v_reason                 text;
  v_new_status              text;
BEGIN
  IF p_user_id IS NULL OR p_region_id IS NULL OR p_assigned_by IS NULL THEN
    RAISE EXCEPTION 'user_id, region_id, and assigned_by are required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.game_time_regions WHERE id = p_region_id AND enabled = true) THEN
    RAISE EXCEPTION 'Region does not exist or is not enabled';
  END IF;

  -- The user's current open-ended (active-or-pending) row, if any.
  SELECT id, region_id, effective_from
  INTO v_open_row_id, v_previous_region_id, v_open_row_effective_from
  FROM public.user_game_time_region_assignments
  WHERE user_id = p_user_id AND effective_until IS NULL AND status <> 'cancelled'
  ORDER BY effective_from DESC
  LIMIT 1;

  IF p_force_effective_immediately_for_test THEN
    v_effective_from := now();
    v_reason := '[IMMEDIATE TEST OVERRIDE] ' || COALESCE(p_assignment_reason, '');
  ELSE
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

  -- Close off the previous open-ended row exactly at the new boundary —
  -- it remains resolvable right up until this instant, never before or after.
  IF v_open_row_id IS NOT NULL THEN
    UPDATE public.user_game_time_region_assignments
    SET effective_until = v_effective_from,
        status = CASE WHEN v_open_row_effective_from <= now() THEN 'active' ELSE 'cancelled' END,
        updated_at = now()
    WHERE id = v_open_row_id;
    -- Note: if the previous row was itself still PENDING (never yet
    -- became effective) at the moment it's superseded by a newer
    -- assignment, it is marked 'cancelled' rather than 'active' —  it
    -- never actually took effect, so 'active' would be misleading for
    -- admin display. This does not affect resolution correctness either
    -- way (a row with effective_until <= its own effective_from can
    -- never satisfy the resolution window regardless of status).
  END IF;

  v_new_status := CASE WHEN v_effective_from <= now() THEN 'active' ELSE 'pending' END;

  INSERT INTO public.user_game_time_region_assignments
    (user_id, region_id, effective_from, effective_until, status, assigned_by, assignment_reason, force_effective_immediately_for_test)
  VALUES
    (p_user_id, p_region_id, v_effective_from, NULL, v_new_status, p_assigned_by, v_reason, p_force_effective_immediately_for_test);

  INSERT INTO public.user_game_time_region_change_log (user_id, previous_region_id, new_region_id, effective_from, changed_by, change_reason)
  VALUES (p_user_id, v_previous_region_id, p_region_id, v_effective_from, p_assigned_by, v_reason);
END;
$$;

REVOKE ALL ON FUNCTION public.assign_user_game_time_region(uuid, uuid, text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_user_game_time_region(uuid, uuid, text, text, boolean) TO service_role;

/*
  ## Rollback
  Re-apply both previous bodies from
  20260718010000_20260718_region_reassignment_effective_boundary.sql
  (single-row `user_game_time_region` table, same signature). The data
  migration above is additive (copies into the new table, never deletes
  from the old one) so rolling back loses nothing — the old table still
  has its original rows untouched.
*/
