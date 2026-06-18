import { useState, useCallback } from 'react';
import type {
  AdminKPIs,
  AdminUser,
  AuditLogEntry,
  GameModule,
  QualificationRule,
  PromotionalAsset,
  WinnerAnnouncement,
  EcosystemKPIs,
  WeekendEventEntry,
} from '../lib/types';

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

export function useAdmin() {
  const [authenticated, setAuthenticated] = useState(!!localStorage.getItem('admin_session'));
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(adminUrl('/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
        return false;
      }
      localStorage.setItem('admin_session', data.session_token);
      setAuthenticated(true);
      setMustChangePassword(data.must_change_password === true);
      return true;
    } catch {
      setError('Connection failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const changePassword = useCallback(async (newPassword: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(adminUrl('/change-password'), {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to change password');
        return false;
      }
      setMustChangePassword(false);
      return true;
    } catch {
      setError('Connection failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('admin_session');
    setAuthenticated(false);
    setMustChangePassword(false);
  }, []);

  const adminFetch = useCallback(async <T>(path: string, options?: RequestInit): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(adminUrl(path), {
        ...options,
        headers: { ...getAdminHeaders(), ...options?.headers },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `Error ${res.status}` }));
        if (res.status === 401) {
          setAuthenticated(false);
          localStorage.removeItem('admin_session');
        }
        setError(data.error || `Error ${res.status}`);
        return null;
      }
      return await res.json() as T;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchKPIs = useCallback(() => adminFetch<AdminKPIs>('/kpis'), [adminFetch]);

  const fetchEcosystemKPIs = useCallback(
    () => adminFetch<EcosystemKPIs>('/ecosystem-kpis'),
    [adminFetch],
  );

  const searchUsers = useCallback(
    (query: string, page = 1, pageSize = 10) =>
      adminFetch<{ users: AdminUser[]; total: number; page: number; page_size: number }>(
        `/users?query=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}`,
      ),
    [adminFetch],
  );

  const adjustBalance = useCallback(
    (userId: string, amountCents: number, reason: string) =>
      adminFetch('/user/adjust-balance', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, amount_cents: amountCents, reason }),
      }),
    [adminFetch],
  );

  const resetStreak = useCallback(
    (userId: string) =>
      adminFetch('/user/reset-streak', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      }),
    [adminFetch],
  );

  const banUser = useCallback(
    (userId: string, banned: boolean) =>
      adminFetch('/user/ban', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, banned }),
      }),
    [adminFetch],
  );

  const grantQualification = useCallback(
    (userId: string, event: string, grant: boolean) =>
      adminFetch('/user/grant-qualification', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, event_game_id: event, grant }),
      }),
    [adminFetch],
  );

  const updateSetting = useCallback(
    (key: string, valueJson: unknown) =>
      adminFetch('/settings/update', {
        method: 'POST',
        body: JSON.stringify({ key, value_json: valueJson }),
      }),
    [adminFetch],
  );

  const fetchSettings = useCallback(
    () => adminFetch<Array<{ key: string; value_json: unknown }>>('/settings'),
    [adminFetch],
  );

  const fetchAuditLog = useCallback(
    () => adminFetch<AuditLogEntry[]>('/audit-log'),
    [adminFetch],
  );

  const fetchGames = useCallback(() => adminFetch<GameModule[]>('/games'), [adminFetch]);

  const createGame = useCallback(
    (fields: {
      game_id: string; name: string; description?: string; category?: string;
      launch_state?: string; sort_order?: number;
      points_on_play?: number; points_on_win?: number; qualification_enabled?: boolean;
    }) =>
      adminFetch<{ success: boolean; game: GameModule }>('/games/create', {
        method: 'POST',
        body: JSON.stringify(fields),
      }),
    [adminFetch],
  );

  const updateGame = useCallback(
    (gameId: string, fields: Partial<GameModule>) =>
      adminFetch('/games/update', {
        method: 'POST',
        body: JSON.stringify({ game_id: gameId, ...fields }),
      }),
    [adminFetch],
  );

  const fetchQualRules = useCallback(
    () => adminFetch<QualificationRule[]>('/qualification-rules'),
    [adminFetch],
  );

  const updateQualRule = useCallback(
    (id: string, fields: Partial<QualificationRule>) =>
      adminFetch('/qualification-rules/update', {
        method: 'POST',
        body: JSON.stringify({ id, ...fields }),
      }),
    [adminFetch],
  );

  const createQualRule = useCallback(
    (fields: Omit<QualificationRule, 'id'>) =>
      adminFetch('/qualification-rules/create', {
        method: 'POST',
        body: JSON.stringify(fields),
      }),
    [adminFetch],
  );

  const fetchWeekendEvents = useCallback(
    () => adminFetch<{ entries: WeekendEventEntry[]; counts: Record<string, number> }>('/weekend-events'),
    [adminFetch],
  );

  const finalizeEvent = useCallback(
    (eventGameId: string, winnerUserId: string, payoutCents: number, displayName: string) =>
      adminFetch('/weekend-events/finalize', {
        method: 'POST',
        body: JSON.stringify({
          event_game_id: eventGameId,
          winner_user_id: winnerUserId,
          payout_cents: payoutCents,
          display_name: displayName,
        }),
      }),
    [adminFetch],
  );

  const fetchFlyers = useCallback(
    () => adminFetch<PromotionalAsset[]>('/flyers'),
    [adminFetch],
  );

  const updateFlyer = useCallback(
    (id: string, fields: Partial<PromotionalAsset>) =>
      adminFetch('/flyers/update', {
        method: 'POST',
        body: JSON.stringify({ id, ...fields }),
      }),
    [adminFetch],
  );

  const createFlyer = useCallback(
    (fields: Omit<PromotionalAsset, 'id'>) =>
      adminFetch('/flyers/create', {
        method: 'POST',
        body: JSON.stringify(fields),
      }),
    [adminFetch],
  );

  const fetchWinners = useCallback(
    () => adminFetch<WinnerAnnouncement[]>('/winners'),
    [adminFetch],
  );

  const createWinner = useCallback(
    (fields: Omit<WinnerAnnouncement, 'id' | 'created_at'>) =>
      adminFetch('/winners/create', {
        method: 'POST',
        body: JSON.stringify(fields),
      }),
    [adminFetch],
  );

  return {
    authenticated,
    mustChangePassword,
    loading,
    error,
    login,
    logout,
    changePassword,
    fetchKPIs,
    fetchEcosystemKPIs,
    searchUsers,
    adjustBalance,
    resetStreak,
    banUser,
    grantQualification,
    updateSetting,
    fetchSettings,
    fetchAuditLog,
    fetchGames,
    createGame,
    updateGame,
    fetchQualRules,
    updateQualRule,
    createQualRule,
    fetchWeekendEvents,
    finalizeEvent,
    fetchFlyers,
    updateFlyer,
    createFlyer,
    fetchWinners,
    createWinner,
  };
}
