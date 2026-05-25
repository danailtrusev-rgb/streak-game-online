import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { PlayResult, CashoutResult, BadgeKey, UserBadge } from '../lib/types';

// Reconstructs a PlayResult from the plays table — no RPC, no duplicate play.
async function fetchTodayPlayRow(): Promise<PlayResult | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('plays')
    .select('id, outcome, pot_after_cents, streak_after, milestone_hit')
    .eq('game_id', 'daily_gate')
    .eq('play_date', today)
    .maybeSingle();

  if (error || !data) return null;

  return {
    outcome:              data.outcome as 'SURVIVE' | 'DIE',
    streak:               data.streak_after ?? 0,
    pot_cents:            data.pot_after_cents ?? 0,
    wallet_balance_cents: 0,
    jackpot_cents:        0,
    milestone_hit:        data.milestone_hit ?? null,
    played_today:         true,
    play_id:              data.id,
  };
}

// Fetch badges awarded for a specific play
async function fetchBadgesForPlay(playId: string): Promise<BadgeKey[]> {
  const { data, error } = await supabase
    .from('user_badges')
    .select('badge_key')
    .eq('source_play_id', playId);

  if (error || !data) return [];
  return (data as Array<{ badge_key: string }>).map((r) => r.badge_key as BadgeKey);
}

export function useGame() {
  const { refresh } = useAuth();
  const [playing, setPlaying] = useState(false);
  const [cashingOut, setCashingOut] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [pendingResult, setPendingResult] = useState<PlayResult | null>(null);
  const [lastResult, setLastResult] = useState<PlayResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const play = useCallback(async (stakeTier: number) => {
    setPlaying(true);
    setError(null);
    setLastResult(null);
    setPendingResult(null);

    try {
      const idemKey = crypto.randomUUID();
      const { data, error: rpcError } = await supabase.rpc('play_daily_gate', {
        p_tier: stakeTier,
        p_idempotency_key: idemKey,
      });

      if (rpcError) {
        console.error('[play_daily_gate] full error:', rpcError);
        const raw = rpcError.message ?? '';
        const msg = raw.includes('Already played')
          ? 'You have already played today. Come back tomorrow!'
          : raw.includes('Insufficient')
          ? 'Insufficient credits for this stake.'
          : raw.includes('Tier not unlocked')
          ? 'This stake tier is not yet unlocked.'
          : raw.includes('Invalid tier')
          ? 'Invalid stake tier selected.'
          : raw.length > 0
          ? `Error: ${raw}`
          : 'Game service unavailable. Please try again.';
        setError(msg);
        return null;
      }

      const result = data as PlayResult;

      // Fetch badges earned on this play (trigger fires asynchronously, so we wait briefly)
      if (result.outcome === 'SURVIVE' && result.play_id) {
        // Small delay to let the DB trigger complete
        await new Promise((r) => setTimeout(r, 300));
        const earned = await fetchBadgesForPlay(result.play_id);
        if (earned.length > 0) result.badges_earned = earned;
      }

      setPendingResult(result);
      await refresh();
      return result;
    } catch (err) {
      console.error('[play_daily_gate]', err);
      setError('Game service unavailable. Please try again.');
      return null;
    } finally {
      setPlaying(false);
    }
  }, [refresh]);

  // Called after the challenge animation completes.
  // Moves the sealed result into lastResult to trigger ResultModal. No RPC.
  const revealResult = useCallback(() => {
    if (pendingResult) {
      setLastResult(pendingResult);
      setPendingResult(null);
    }
  }, [pendingResult]);

  // Recovery: player refreshed during the challenge before choosing.
  // Fetches today's committed play row from the DB and resumes the challenge flow.
  // Does NOT replay the RPC or charge the stake again.
  const recoverTodayPlay = useCallback(async () => {
    setRecovering(true);
    setError(null);
    try {
      const result = await fetchTodayPlayRow();
      if (result) {
        // Also fetch any badges for this recovered play
        if (result.outcome === 'SURVIVE' && result.play_id) {
          const earned = await fetchBadgesForPlay(result.play_id);
          if (earned.length > 0) result.badges_earned = earned;
        }
        setPendingResult(result);
        return result;
      }
      setError('Could not retrieve today\'s result. Please try again.');
      return null;
    } catch (err) {
      console.error('[recoverTodayPlay]', err);
      setError('Recovery failed. Please try again.');
      return null;
    } finally {
      setRecovering(false);
    }
  }, []);

  const cashout = useCallback(async (gameId: string = 'daily_gate') => {
    setCashingOut(true);
    setError(null);

    try {
      const idemKey = crypto.randomUUID();
      const { data, error: rpcError } = await supabase.rpc('cashout_game', {
        p_game_id: gameId,
        p_idem_key: idemKey,
      });

      if (rpcError) {
        setError(rpcError.message);
        return null;
      }

      const result = data as CashoutResult;
      await refresh();
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Cashout failed';
      setError(msg);
      return null;
    } finally {
      setCashingOut(false);
    }
  }, [refresh]);

  const clearResult = useCallback(() => {
    setLastResult(null);
  }, []);

  // Restore a previously-revealed result directly into lastResult (no challenge animation).
  // Used when the player returns to Home after revealing but before closing the modal.
  const restoreResult = useCallback(async () => {
    setRecovering(true);
    setError(null);
    try {
      const result = await fetchTodayPlayRow();
      if (result) {
        if (result.outcome === 'SURVIVE' && result.play_id) {
          const earned = await fetchBadgesForPlay(result.play_id);
          if (earned.length > 0) result.badges_earned = earned;
        }
        setLastResult(result);
        return result;
      }
      return null;
    } catch {
      return null;
    } finally {
      setRecovering(false);
    }
  }, []);

  return {
    play,
    cashout,
    revealResult,
    recoverTodayPlay,
    restoreResult,
    playing,
    cashingOut,
    recovering,
    pendingResult,
    lastResult,
    error,
    clearResult,
  };
}
