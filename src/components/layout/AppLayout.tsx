import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import GameHUD from '../game/GameHUD';
import { useAuth } from '../../context/AuthContext';
import { useQualification } from '../../hooks/useQualification';

function isTodayGateRevealed(): boolean {
  try {
    const key = `gate_revealed_${new Date().toISOString().slice(0, 10)}`;
    return sessionStorage.getItem(key) === '1';
  } catch { return false; }
}

export default function AppLayout() {
  const { playerState } = useAuth();
  const { qualification, fetchQualification } = useQualification();

  useEffect(() => {
    fetchQualification();
  }, [fetchQualification]);

  const playedToday = playerState?.played_today ?? false;
  const hideResultClues = playedToday && !isTodayGateRevealed();

  const streak      = hideResultClues ? 0 : (playerState?.game_state?.current_streak ?? 0);
  const potCents    = hideResultClues ? 0 : (playerState?.game_state?.pot_cents ?? 0);
  const walletCents = playerState?.wallet_balance_cents ?? 0;

  return (
    <div
      style={{
        display:       'flex',
        flexDirection: 'column',
        minHeight:     '100dvh',
        position:      'relative',
        background:    'linear-gradient(180deg, #070A08 0%, #0B0F0C 25%, #0E1410 60%, #080C09 100%)',
      }}
    >
      {/* Warm tint overlays */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(255,122,0,0.04) 0%, transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, width: '40%', height: '70%', zIndex: 1, background: 'radial-gradient(ellipse at 0% 30%, rgba(255,122,0,0.07) 0%, transparent 70%)', pointerEvents: 'none', animation: 'torchPulse 3s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', top: 0, right: 0, width: '40%', height: '70%', zIndex: 1, background: 'radial-gradient(ellipse at 100% 30%, rgba(255,122,0,0.07) 0%, transparent 70%)', pointerEvents: 'none', animation: 'torchPulse 3s ease-in-out infinite', animationDelay: '1.5s' }} />

      {/* ── Sticky Header ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, flexShrink: 0 }}>
        <GameHUD
          streak={streak}
          potCents={potCents}
          walletCents={walletCents}
          qualification={qualification}
          hidePot={hideResultClues}
        />
      </div>

      {/* ── Scrollable Content ── */}
      <main
        style={{
          flex:       1,
          position:   'relative',
          zIndex:     10,
          overflowY:  'auto',
          padding:    '16px 16px 16px',
        }}
      >
        <Outlet />
      </main>

      {/* ── Sticky Footer ── */}
      <div style={{ position: 'sticky', bottom: 0, zIndex: 50, flexShrink: 0 }}>
        <BottomNav />
      </div>
    </div>
  );
}
