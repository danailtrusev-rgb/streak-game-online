/*
  # Game Time System — Regional activation guard

  ## Why
  Core gameplay RPCs are NOT yet genuinely per-user region-aware.
  Activating Regional Game Time today would let a player resolve to a
  non-global region for notification purposes while every gameplay RPC
  still treats them as if they were on the global clock. This must be
  hard-blocked at the database level.

  ## What changes
  1. `game_time_settings.regional_game_time_live_enabled boolean NOT NULL
     DEFAULT false` — a developer/system readiness flag. Defaults to
     `false` and is NOT flipped by this migration.
  2. `apply_pending_game_time_mode()` checks this flag before ever
     applying a pending switch TO `'regional'` mode. If the flag is false,
     it raises the exact required error instead of applying the switch.
  3. Switching back to `'global'` mode is never blocked by this flag.
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