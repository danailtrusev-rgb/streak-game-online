// useSkullGateScenes — admin hook for skull_gate_scenes DB operations
// All calls go through the admin edge function with x-admin-session auth.
// Used only in admin Scene Editor — never in player-facing code.

import { useState, useCallback } from 'react';
import type { SkullGateSceneConfig } from '../lib/types';

// ── DB row shape (snake_case from Postgres) ───────────────────────────────────

export interface SkullGateSceneRow {
  id:                    string;
  slug:                  string;
  title:                 string;
  description:           string | null;
  template_type:         string;
  status:                'draft' | 'published' | 'archived';
  enabled:               boolean;
  weight:                number;
  cooldown_days:         number;
  min_streak:            number | null;
  max_streak:            number | null;
  draft_config_json:     SkullGateSceneConfig;
  published_config_json: SkullGateSceneConfig | null;
  created_at:            string;
  updated_at:            string;
  published_at:          string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAdminHeaders(): Record<string, string> {
  const token = localStorage.getItem('admin_session') || '';
  return {
    'x-admin-session': token,
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

function adminUrl(path: string): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin${path}`;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSkullGateScenes() {
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const request = useCallback(async <T>(
    path: string,
    options?: RequestInit,
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(adminUrl(path), {
        ...options,
        headers: { ...getAdminHeaders(), ...options?.headers },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Error ${res.status}`);
        return null;
      }
      return data as T;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // List all scenes (returns DB rows with both draft and published config)
  const listScenes = useCallback(
    () => request<SkullGateSceneRow[]>('/skull-gate-scenes'),
    [request],
  );

  // Save draft — updates draft_config_json and scalar metadata fields
  const saveDraft = useCallback(
    (
      id: string,
      draftConfig: SkullGateSceneConfig,
      meta?: {
        title?: string;
        description?: string;
        template_type?: string;
        weight?: number;
        cooldown_days?: number;
        min_streak?: number | null;
        max_streak?: number | null;
      },
    ) =>
      request<{ success: boolean; scene: Partial<SkullGateSceneRow> }>(
        '/skull-gate-scenes/save-draft',
        {
          method: 'POST',
          body: JSON.stringify({ id, draft_config_json: draftConfig, ...meta }),
        },
      ),
    [request],
  );

  // Publish — copies draft_config_json → published_config_json after validation
  // Returns { success, validation_errors? } — 422 when validation fails
  const publishScene = useCallback(
    (id: string) =>
      request<{ success: boolean; validation_errors?: string[]; scene?: Partial<SkullGateSceneRow> }>(
        '/skull-gate-scenes/publish',
        { method: 'POST', body: JSON.stringify({ id }) },
      ),
    [request],
  );

  // Revert draft to the last published version
  const revertDraft = useCallback(
    (id: string) =>
      request<{ success: boolean; scene: Partial<SkullGateSceneRow> }>(
        '/skull-gate-scenes/revert',
        { method: 'POST', body: JSON.stringify({ id }) },
      ),
    [request],
  );

  // Duplicate — creates a new draft copy
  const duplicateScene = useCallback(
    (id: string) =>
      request<{ success: boolean; scene: SkullGateSceneRow }>(
        '/skull-gate-scenes/duplicate',
        { method: 'POST', body: JSON.stringify({ id }) },
      ),
    [request],
  );

  // Archive — sets status=archived, enabled=false
  const archiveScene = useCallback(
    (id: string) =>
      request<{ success: boolean; scene: Partial<SkullGateSceneRow> }>(
        '/skull-gate-scenes/archive',
        { method: 'POST', body: JSON.stringify({ id }) },
      ),
    [request],
  );

  // Create a brand-new scene
  const createScene = useCallback(
    (slug: string, title: string, draftConfig: SkullGateSceneConfig) =>
      request<SkullGateSceneRow>(
        '/skull-gate-scenes/create',
        {
          method: 'POST',
          body: JSON.stringify({ slug, title, template_type: draftConfig.templateType, draft_config_json: draftConfig }),
        },
      ),
    [request],
  );

  // Set enabled — controls live assignment eligibility (table column, not JSON)
  const setEnabled = useCallback(
    (id: string, enabled: boolean) =>
      request<{ success: boolean; scene: Partial<SkullGateSceneRow> }>(
        '/skull-gate-scenes/set-enabled',
        { method: 'POST', body: JSON.stringify({ id, enabled }) },
      ),
    [request],
  );

  // Delete — permanently removes an archived scene
  const deleteScene = useCallback(
    (id: string) =>
      request<{ success: boolean }>(
        '/skull-gate-scenes/delete',
        { method: 'POST', body: JSON.stringify({ id }) },
      ),
    [request],
  );

  return {
    loading,
    error,
    listScenes,
    saveDraft,
    publishScene,
    revertDraft,
    duplicateScene,
    archiveScene,
    createScene,
    setEnabled,
    deleteScene,
  };
}
