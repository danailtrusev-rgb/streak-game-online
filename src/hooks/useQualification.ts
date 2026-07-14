import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { QualificationStatus, TodayGameProgress } from '../lib/types';

export function useQualification() {
  const [qualification, setQualification] = useState<QualificationStatus | null>(null);
  const [todayProgress, setTodayProgress] = useState<TodayGameProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQualification = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: qual, error: e1 }, { data: prog, error: e2 }] = await Promise.all([
        supabase.rpc('get_my_qualification'),
        supabase.rpc('get_today_game_progress'),
      ]);
      if (e1) throw new Error(e1.message);
      if (e2) throw new Error(e2.message);
      if (qual) setQualification(qual as QualificationStatus);
      setTodayProgress((prog as TodayGameProgress[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load qualification');
    } finally {
      setLoading(false);
    }
  }, []);

  const isGamePlayedToday = useCallback((gameId: string) => {
    return todayProgress.some((p) => p.game_id === gameId && p.played_today);
  }, [todayProgress]);

  const getGameProgress = useCallback((gameId: string) => {
    return todayProgress.find((p) => p.game_id === gameId) ?? null;
  }, [todayProgress]);

  const satProgress = qualification
    ? Math.min(1, qualification.total_points / (qualification.sat_pts_threshold || 1))
    : 0;

  const sunProgress = qualification
    ? Math.min(1, qualification.total_points / (qualification.sun_pts_threshold || 1))
    : 0;

  return {
    qualification,
    todayProgress,
    loading,
    error,
    fetchQualification,
    isGamePlayedToday,
    getGameProgress,
    satProgress,
    sunProgress,
  };
}
