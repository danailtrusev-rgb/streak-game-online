// useSkullGateAssignment
//
// Calls get_or_assign_skull_gate_scene() RPC to fetch or create today's
// scene assignment for the authenticated player.
//
// NOTE: The feature flag (USE_SCENE_BASED_SKULL_GATE) is checked at the
// CALL SITE (SkullGateSceneChallenge / HomePage), not here. This hook
// always executes when called so it can also be used by admin test tools.

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { SkullGateSceneConfig } from '../lib/types';

// ── Assignment shape returned by the RPC ─────────────────────────────────────

export interface SkullGateAssignment {
  assignment_id:  string | null;
  scene_id:       string | null;
  scene_slug:     string | null;
  status:         'assigned' | 'started' | 'completed' | 'skipped' | null;
  result:         'survive' | 'die' | null;
  play_date:      string;
  scene_config:   SkullGateSceneConfig | null;
  from_cache:     boolean;
  no_eligible:    boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSkullGateAssignment() {
  const [assignment, setAssignment] = useState<SkullGateAssignment | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const sceneConfig = assignment?.scene_config ?? null;

  // Fetch or create today's assignment. Call only after stake is confirmed.
  const assignToday = useCallback(async (): Promise<SkullGateAssignment | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_or_assign_skull_gate_scene');
      if (rpcError) { setError(rpcError.message); return null; }
      const result = data as SkullGateAssignment;
      setAssignment(result);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assignment failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark assignment as started (fire-and-forget; analytics only)
  const markStarted = useCallback(async (assignmentId: string | null) => {
    if (!assignmentId) return;
    try {
      await supabase.rpc('update_skull_gate_assignment_status', {
        p_status: 'started',
        p_result: null,
      });
    } catch { /* analytics — never block player */ }
  }, []);

  // Mark assignment as completed with survive/die result (fire-and-forget)
  const markCompleted = useCallback(async (
    assignmentId: string | null,
    outcome: 'SURVIVE' | 'DIE',
  ) => {
    if (!assignmentId) return;
    try {
      await supabase.rpc('update_skull_gate_assignment_status', {
        p_status: 'completed',
        p_result: outcome === 'SURVIVE' ? 'survive' : 'die',
      });
    } catch { /* analytics — never block player */ }
  }, []);

  const refresh = useCallback(() => assignToday(), [assignToday]);

  return {
    assignment,
    sceneConfig,
    loading,
    error,
    assignToday,
    markStarted,
    markCompleted,
    refresh,
  };
}
