import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { WeekendEventEntry } from '../lib/types';

export function useWeekendEvents() {
  const [satEntry, setSatEntry] = useState<WeekendEventEntry | null>(null);
  const [sunEntry, setSunEntry] = useState<WeekendEventEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const weekStart = getWeekStart();
      const { data, error: queryErr } = await supabase
        .from('weekend_event_entries')
        .select('*')
        .gte('week_start_date', weekStart)
        .order('entered_at');
      if (queryErr) throw new Error(queryErr.message);
      const entries = (data || []) as WeekendEventEntry[];
      setSatEntry(entries.find((e) => e.event_game_id === 'saturday_main_event') ?? null);
      setSunEntry(entries.find((e) => e.event_game_id === 'sunday_winners_event') ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load event entries');
    } finally {
      setLoading(false);
    }
  }, []);

  const enterEvent = useCallback(async (eventGameId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc('enter_weekend_event', {
        p_event_game_id: eventGameId,
      });
      if (rpcErr) throw new Error(rpcErr.message);
      await fetchMyEntries();
      return data as { entry_id: string; status: string };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to enter event';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchMyEntries]);

  return { satEntry, sunEntry, loading, error, fetchMyEntries, enterEvent };
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}
