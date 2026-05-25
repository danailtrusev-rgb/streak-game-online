export const TOPUP_PRESETS = [500, 1000, 2000, 5000] as const;

// ── Feature Flags ─────────────────────────────────────────────────────────────

/**
 * USE_SCENE_BASED_SKULL_GATE
 *
 * When false (default): live SkullGateChallenge uses the hardcoded scene config
 *   and the player_skull_gate_assignments system is completely dormant.
 *
 * When true: get_or_assign_skull_gate_scene() RPC is called before the gate,
 *   the returned published_config_json drives the scene renderer, and the
 *   assignment row is tracked. Flip to true only after full integration test.
 */
export const USE_SCENE_BASED_SKULL_GATE = false;

export const MILESTONES = [3, 7, 14, 30] as const;

export const TIER_LABELS: Record<number, string> = {
  100: '1',
  200: '2',
  500: '5',
};

export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function formatCentsShort(cents: number): string {
  const euros = cents / 100;
  if (euros >= 1000) return `${(euros / 1000).toFixed(1)}k`;
  if (Number.isInteger(euros)) return euros.toString();
  return euros.toFixed(2);
}
