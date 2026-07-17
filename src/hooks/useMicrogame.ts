import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useQualification } from './useQualification';
import type { MicrogameResult } from '../lib/types';

type GamePhase = 'idle' | 'selecting' | 'revealing' | 'done';

interface UseMicrogameReturn {
  phase: GamePhase;
  selectedZone: number | null;
  result: MicrogameResult | null;
  loading: boolean;
  error: string | null;
  select: (zoneId: number) => void;
  confirm: () => Promise<void>;
  reset: () => void;
}

/** Maps game_id to the Supabase RPC function name */
const RPC_MAP: Record<string, string> = {
  daily_pick:    'play_daily_pick',
  daily_safebox: 'play_daily_safebox',
  daily_path:    'play_daily_path',
  daily_dice:    'play_daily_dice',
};

/** Games where no zone selection is needed before confirmation */
const AUTO_CONFIRM_GAMES = new Set(['daily_dice']);

export function useMicrogame(gameId: string): UseMicrogameReturn {
  const { refresh } = useAuth();
  const { fetchQualification } = useQualification();

  const [phase, setPhase] = useState<GamePhase>('idle');
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [result, setResult] = useState<MicrogameResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const select = useCallback((zoneId: number) => {
    if (phase !== 'idle' && phase !== 'selecting') return;
    setSelectedZone(zoneId);
    setPhase('selecting');
    setError(null);
  }, [phase]);

  const confirm = useCallback(async () => {
    const rpcName = RPC_MAP[gameId];
    if (!rpcName) {
      setError('Game not supported');
      return;
    }

    const isAuto = AUTO_CONFIRM_GAMES.has(gameId);
    if (!isAuto && selectedZone === null) {
      setError('Please select an option first');
      return;
    }

    setLoading(true);
    setPhase('revealing');
    setError(null);

    try {
      const idemKey = crypto.randomUUID();
      let rpcResult;

      if (isAuto) {
        rpcResult = await supabase.rpc(rpcName, { p_idem_key: idemKey });
      } else {
        rpcResult = await supabase.rpc(rpcName, {
          p_idem_key: idemKey,
          p_choice:   selectedZone!,
        });
      }

      if (rpcResult.error) {
        console.error(`[${gameId} rpc]`, rpcResult.error.message);
        throw new Error(rpcResult.error.message);
      }

      setResult(rpcResult.data as MicrogameResult);
      setPhase('done');
      await refresh();
      fetchQualification();
    } catch (err) {
      console.error(`[${gameId}]`, err);
      const raw = err instanceof Error ? err.message : '';
      const msg = raw.includes('Already played')
        ? 'You have already played today. Come back tomorrow!'
        : 'Game service unavailable. Please try again.';
      setError(msg);
      setPhase(selectedZone !== null ? 'selecting' : 'idle');
    } finally {
      setLoading(false);
    }
  }, [gameId, selectedZone, refresh, fetchQualification]);

  const reset = useCallback(() => {
    setPhase('idle');
    setSelectedZone(null);
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return { phase, selectedZone, result, loading, error, select, confirm, reset };
}
