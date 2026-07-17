/*
  # Game Time System — Regional activation guard

  ## Why
  The Game Time System foundation is built, but core gameplay RPCs
  (`play_daily_gate`, `cashout_game`, `get_my_state`, qualification,
  Saturday/Sunday events) are NOT yet genuinely per-user region-aware —
  documented explicitly in the previous pass's migrations. Activating
  Regional Game Time today would let a player resolve to a non-global
  region for notification purposes while every gameplay RPC still treats
  them as if they were on the global clock — a real correctness gap, not
  a cosmetic one. This must be hard-blocked at the database level, not
  just hidden in the admin UI (a direct RPC call, a future admin bypass,
  or a bug in the UI must not be able to activate it).

  ## What changes
  1. `game_time_settings.regional_game_time_live_enabled boolean NOT NULL
     DEFAULT false` — a developer/system readiness flag, deliberately
     distinct from `regional_mode_enabled` (which just reflects "is
     regional mode currently active") and from any normal product
     setting. Defaults to `false` and is NOT flipped by this migration.
  2. `apply_pending_game_time_mode()` is redefined (same signature, same
     return type — `CREATE OR REPLACE` is valid and safe) to check this
     flag before ever applying a pending switch TO `'regional'` mode. If
     the flag is false, it raises the exact required error instead of
     applying the switch — the pending request is left in place
     (unconsumed), not silently discarded, so an admin can see it's still
     pending and understand why it hasn't applied.
  3. Switching back to `'global'` mode is never blocked by this flag —
     only activation of Regional mode is guarded.

  ## Not changed
  No gameplay RPC, no cashout, no qualification, no Saturday/Sunday
  event logic, no notification scheduler logic. This migration only adds
  one column and hardens one function's guard condition.

  ## Rollback
  `ALTER TABLE game_time_settings DROP COLUMN IF EXISTS
  regional_game_time_live_enabled;` and re-apply
  `apply_pending_game_time_mode()`'s previous body from
  `20260715020000_20260715_game_time_clock_rpcs.sql`. No data is
  rewritten either way — the default state (Global active, Regional
  disabled) is unaffected by either direction.
*/

ALTER TABLE game_time_settings
  ADD COLUMN IF NOT EXISTS regional_game_time_live_enabled boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.apply_pending_game_time_mode(p_applied_by text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_settings record;
BEGIN
  SELECT * INTO v_settings FROM public.game_time_settings WHERE id = true;
  IF v_settings.pending_mode IS NULL OR v_settings.pending_mode_effective_at IS NULL THEN
    RETURN false; -- nothing pending
  END IF;
  IF now() < v_settings.pending_mode_effective_at THEN
    RETURN false; -- boundary not reached yet — refuse to apply early
  END IF;

  -- Hard block: Regional mode may never be activated for live gameplay
  -- until core gameplay RPCs are genuinely per-user region-aware. This
  -- check is enforced here, in the database, regardless of what the
  -- admin UI shows or hides — a direct RPC call cannot bypass it.
  IF v_settings.pending_mode = 'regional' AND NOT v_settings.regional_game_time_live_enabled THEN
    RAISE EXCEPTION 'Regional Game Time is not enabled for live gameplay yet.';
  END IF;

  UPDATE public.game_time_settings
  SET mode = v_settings.pending_mode,
      regional_mode_enabled = (v_settings.pending_mode = 'regional'),
      pending_mode = NULL,
      pending_mode_effective_at = NULL,
      pending_mode_requested_by = NULL,
      pending_mode_requested_at = NULL,
      updated_at = now(),
      updated_by = p_applied_by
  WHERE id = true;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_pending_game_time_mode(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_pending_game_time_mode(text) TO service_role;
