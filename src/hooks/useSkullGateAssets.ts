// useSkullGateAssets — admin hook for skull_gate_assets DB operations
// All calls go through the admin edge function with x-admin-session auth.
// Used only in admin Asset Library — never in player-facing code.

import { useState, useCallback } from 'react';

export const ASSET_TYPES = [
  'source_plate', 'background', 'back_plate', 'gate_frame',
  'gate_door_left', 'gate_door_right', 'inner_light', 'foreground',
  'object', 'overlay', 'effect', 'particle', 'flame', 'button', 'icon',
] as const;

export type AssetType = typeof ASSET_TYPES[number];

// Role suggested when an asset of this type is added to a layer
export const ASSET_TYPE_ROLE: Partial<Record<AssetType, string>> = {
  gate_door_left:  'gate_door_left',
  gate_door_right: 'gate_door_right',
  gate_frame:      'gate_frame',
  inner_light:     'gate_inner_light',
  flame:           'torch_flame',
  foreground:      'foreground_decoration',
  particle:        'particle_effect',
  effect:          'atmosphere_effect',
  background:      'background',
};

// Recommended base paths for the path helper
export const ASSET_PATH_SUGGESTIONS: Partial<Record<AssetType, string>> = {
  background:      '/assets/games/skull-gate/shared/bg/',
  back_plate:      '/assets/games/skull-gate/shared/bg/',
  gate_frame:      '/assets/games/skull-gate/shared/props/',
  gate_door_left:  '/assets/games/skull-gate/torch-trial/doors/',
  gate_door_right: '/assets/games/skull-gate/torch-trial/doors/',
  inner_light:     '/assets/games/skull-gate/shared/fx/',
  foreground:      '/assets/games/skull-gate/torch-trial/foreground/',
  object:          '/assets/games/skull-gate/torch-trial/objects/',
  flame:           '/assets/games/skull-gate/torch-trial/flames/',
  overlay:         '/assets/games/skull-gate/shared/fx/',
  effect:          '/assets/games/skull-gate/shared/fx/',
  particle:        '/assets/games/skull-gate/shared/fx/',
  button:          '/assets/buttons/',
  icon:            '/assets/icons/',
  source_plate:    '/assets/games/skull-gate/shared/',
};

export interface SkullGateAsset {
  id:         string;
  slug:       string;
  name:       string;
  asset_path: string;
  asset_type: AssetType;
  tags:       string[];
  notes:      string | null;
  created_at: string;
  updated_at: string;
}

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

export function useSkullGateAssets() {
  const [assets,  setAssets]  = useState<SkullGateAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

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
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Request failed'); return null; }
      return json as T;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const listAssets = useCallback(async () => {
    const data = await request<{ assets: SkullGateAsset[] }>('/skull-gate-assets');
    if (data) setAssets(data.assets);
  }, [request]);

  const createAsset = useCallback(async (body: {
    asset_path: string;
    asset_type: AssetType;
    name: string;
    tags?: string[];
    notes?: string;
  }): Promise<SkullGateAsset | null> => {
    const data = await request<{ success: boolean; asset: SkullGateAsset }>(
      '/skull-gate-assets/create',
      { method: 'POST', body: JSON.stringify(body) },
    );
    if (data?.asset) {
      setAssets((prev) => [...prev, data.asset].sort((a, b) => a.name.localeCompare(b.name)));
      return data.asset;
    }
    return null;
  }, [request]);

  const updateAsset = useCallback(async (id: string, body: Partial<Omit<SkullGateAsset, 'id' | 'created_at' | 'updated_at'>>): Promise<SkullGateAsset | null> => {
    const data = await request<{ success: boolean; asset: SkullGateAsset }>(
      '/skull-gate-assets/update',
      { method: 'POST', body: JSON.stringify({ id, ...body }) },
    );
    if (data?.asset) {
      setAssets((prev) => prev.map((a) => a.id === id ? data.asset : a));
      return data.asset;
    }
    return null;
  }, [request]);

  const deleteAsset = useCallback(async (id: string): Promise<boolean> => {
    const data = await request<{ success: boolean }>('/skull-gate-assets/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
    if (data?.success) {
      setAssets((prev) => prev.filter((a) => a.id !== id));
      return true;
    }
    return false;
  }, [request]);

  return { assets, loading, error, listAssets, createAsset, updateAsset, deleteAsset };
}
