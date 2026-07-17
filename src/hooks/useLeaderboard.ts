import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { LeaderboardEntry } from '../lib/types';

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_global_leaderboard', {
        p_limit: 50,
      });

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      setEntries((data || []) as LeaderboardEntry[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, []);

  return { entries, loading, error, fetch };
}
