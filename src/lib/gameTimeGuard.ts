// Pure Regional Game Time activation guard. Mirrors the authoritative
// server-side check in apply_pending_game_time_mode()
// (20260716000000_20260716_game_time_regional_activation_guard.sql) —
// this is a client-side convenience so the admin UI never even offers an
// action that could not actually apply, but it is NOT the real
// authority. The database is — a direct RPC call is guarded there
// regardless of what this function (or the UI) says.

export interface GameTimeActivationState {
  regionalGameTimeLiveEnabled: boolean;
  hasAtLeastOneEnabledRegion: boolean;
}

export interface ActivationGuardResult {
  allowed: boolean;
  reason: 'not_live_ready' | 'no_enabled_region' | null;
}

export const REGIONAL_NOT_READY_MESSAGE =
  'Regional Game Time is structurally code-ready but not deployment-tested. It must remain disabled until controlled test-region validation has been completed.';

export const REGIONAL_NOT_ENABLED_ERROR = 'Regional Game Time is not enabled for live gameplay yet.';

export function canScheduleRegionalActivation(state: GameTimeActivationState): ActivationGuardResult {
  if (!state.regionalGameTimeLiveEnabled) {
    return { allowed: false, reason: 'not_live_ready' };
  }
  if (!state.hasAtLeastOneEnabledRegion) {
    return { allowed: false, reason: 'no_enabled_region' };
  }
  return { allowed: true, reason: null };
}
