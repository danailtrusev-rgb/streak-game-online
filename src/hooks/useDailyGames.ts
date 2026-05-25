/**
 * Legacy hooks kept for PuzzlePage compatibility.
 * New microgames use useMicrogame() instead.
 */
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { DiceResult, PickResult, PuzzleResult } from '../lib/types';

export function useDailyDice() {
  const { refresh } = useAuth();
  const [result, setResult] = useState<DiceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const play = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const idemKey = crypto.randomUUID();
      const { data, error: rpcErr } = await supabase.rpc('play_daily_dice', {
        p_idem_key: idemKey,
      });
      if (rpcErr) throw new Error(rpcErr.message);
      setResult(data as DiceResult);
      await refresh();
      return data as DiceResult;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Play failed';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  return { result, loading, error, play };
}

export function useDailyPick() {
  const { refresh } = useAuth();
  const [result, setResult] = useState<PickResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const play = useCallback(async (choice: number) => {
    setLoading(true);
    setError(null);
    try {
      const idemKey = crypto.randomUUID();
      const { data, error: rpcErr } = await supabase.rpc('play_daily_pick', {
        p_idem_key: idemKey,
        p_choice: choice,
      });
      if (rpcErr) throw new Error(rpcErr.message);
      setResult(data as PickResult);
      await refresh();
      return data as PickResult;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Play failed';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  return { result, loading, error, play };
}

export function useDailyPuzzle() {
  const { refresh } = useAuth();
  const [result, setResult] = useState<PuzzleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const play = useCallback(async (answer: string) => {
    setLoading(true);
    setError(null);
    try {
      const idemKey = crypto.randomUUID();
      const { data, error: rpcErr } = await supabase.rpc('play_daily_puzzle', {
        p_idem_key: idemKey,
        p_answer: answer,
      });
      if (rpcErr) throw new Error(rpcErr.message);
      setResult(data as PuzzleResult);
      await refresh();
      return data as PuzzleResult;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Play failed';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  return { result, loading, error, play };
}
