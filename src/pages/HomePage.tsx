import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Skull, ChevronRight, Flame, Zap, X, Lock, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../hooks/useGame';
import { useQualification } from '../hooks/useQualification';
import { useFlyers } from '../hooks/useFlyers';
import { useGamesCatalog } from '../hooks/useGamesCatalog';
import { formatCents, USE_SCENE_BASED_SKULL_GATE } from '../lib/constants';
import { getGameDef } from '../lib/gameRegistry';
import { getGameConfig } from '../lib/gameConfigs';
import { useSkullGateAssignment } from '../hooks/useSkullGateAssignment';
import SkullGateSceneChallenge from '../components/game/SkullGateSceneChallenge';
import { ICONS, PROPS, BACKGROUNDS } from '../lib/assets';
import {
  getMilestoneInfo,
  msUntilMidnight,
  formatCountdown,
  MILESTONES,
} from '../lib/gateUtils';
import AssetIcon from '../components/ui/AssetIcon';
import StakeModal from '../components/game/StakeModal';
import ResultModal from '../components/game/ResultModal';
import SkullGateChallenge from '../components/game/SkullGateChallenge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import QualificationBar from '../components/ecosystem/QualificationBar';
import { FlyerCard, WinnerCard } from '../components/flyers/FlyerCard';
import type { GameModule, TodayGameProgress } from '../lib/types';

// ── Countdown hook ────────────────────────────────────────────────────────────
function useCountdown() {
  const [ms, setMs] = useState(msUntilMidnight);
  useEffect(() => {
    const id = setInterval(() => setMs(msUntilMidnight()), 1000);
    return () => clearInterval(id);
  }, []);
  return ms;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function todayKey(suffix: string) {
  return `gate_${suffix}_${new Date().toISOString().slice(0, 10)}`;
}
// "revealed" = torch chosen and result shown to player (even if modal not yet closed)
function getGateRevealed(): boolean {
  try { return sessionStorage.getItem(todayKey('revealed')) === '1'; } catch { return false; }
}
function setGateRevealed() {
  try { sessionStorage.setItem(todayKey('revealed'), '1'); } catch { /* ignore */ }
}
// "seen" = modal was explicitly closed by the player
function getGateSeen(): boolean {
  try { return sessionStorage.getItem(todayKey('seen')) === '1'; } catch { return false; }
}
function setGateSeen() {
  try { sessionStorage.setItem(todayKey('seen'), '1'); } catch { /* ignore */ }
}

// ── Game status logic ─────────────────────────────────────────────────────────
type GameStatusKey = 'play' | 'done' | 'won' | 'locked' | 'coming_soon' | 'qualified' | 'not_qualified';

function getGameStatus(
  game: GameModule,
  progress: TodayGameProgress | null,
  isWeekend?: boolean,
  qualifiedForEvent?: boolean,
): GameStatusKey {
  const isSoon = game.status === 'coming_soon' || game.launch_state === 'coming_soon';
  if (isSoon) return 'coming_soon';

  if (isWeekend) {
    return qualifiedForEvent ? 'qualified' : 'not_qualified';
  }

  const played = progress?.played_today ?? false;
  const won    = progress?.won_today ?? false;
  if (played && won) return 'won';
  if (played)        return 'done';
  return 'play';
}

function statusLabel(status: GameStatusKey): string {
  switch (status) {
    case 'play':         return 'Play';
    case 'done':         return 'Done';
    case 'won':          return 'Won';
    case 'locked':       return 'Locked';
    case 'coming_soon':  return 'Soon';
    case 'qualified':    return 'Qualified';
    case 'not_qualified':return 'Not Qualified';
  }
}

function statusColor(status: GameStatusKey): string {
  switch (status) {
    case 'play':         return '#FF9A30';
    case 'won':          return '#78B060';
    case 'qualified':    return '#78B060';
    case 'done':         return '#554F46';
    case 'locked':       return '#3E3930';
    case 'coming_soon':  return '#3E3930';
    case 'not_qualified':return '#554F46';
  }
}

// Sort games: playable first, done after, coming soon last
function sortGames(
  games: GameModule[],
  getProgress: (id: string) => TodayGameProgress | null,
): GameModule[] {
  return [...games].sort((a, b) => {
    const statusA = getGameStatus(a, getProgress(a.game_id));
    const statusB = getGameStatus(b, getProgress(b.game_id));

    const rank = (s: GameStatusKey) => {
      if (s === 'play') return 0;
      if (s === 'qualified' || s === 'not_qualified') return 1;
      if (s === 'done' || s === 'won') return 2;
      if (s === 'locked') return 3;
      return 4; // coming_soon
    };

    return rank(statusA) - rank(statusB) || (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}

// ── Game popup (same modal as GamesPage) ─────────────────────────────────────
const GAME_BG: Record<string, string> = {
  daily_dice:    BACKGROUNDS.gate_home,
  daily_pick:    BACKGROUNDS.inner_jungle,
  daily_safebox: BACKGROUNDS.ritual_floor,
  daily_path:    BACKGROUNDS.inner_jungle,
  daily_puzzle:  BACKGROUNDS.inner_jungle,
};

interface GamePopupProps {
  game:     GameModule;
  progress: TodayGameProgress | null;
  onClose:  () => void;
  onPlay:   () => void;
}

function GamePopup({ game, progress, onClose, onPlay }: GamePopupProps) {
  const def    = getGameDef(game.game_id);
  const config = getGameConfig(game.game_id);
  const Icon   = def.icon;
  const status = getGameStatus(game, progress);
  const played = status === 'done' || status === 'won';
  const won    = status === 'won';
  const isSoon = status === 'coming_soon';
  const bgSrc  = GAME_BG[game.game_id] ?? config?.background ?? '';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 400,
          background: 'linear-gradient(180deg, rgba(16,22,18,0.99) 0%, rgba(9,13,10,0.99) 100%)',
          border: '1px solid rgba(255,122,0,0.18)',
          overflow: 'hidden', position: 'relative',
          boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Preview image */}
        <div style={{ position: 'relative', height: 160, overflow: 'hidden' }}>
          {bgSrc ? (
            <img
              src={bgSrc} alt=""
              style={{
                width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: 'center top',
                filter: played ? 'brightness(0.4) saturate(0.4)' : 'brightness(0.65)',
              }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'rgba(20,30,22,0.8)' }} />
          )}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(9,13,10,0.75) 100%)',
          }} />
          <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 52, height: 52,
              background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,122,0,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(6px)',
            }}>
              <Icon size={28} strokeWidth={1.2} className={def.color} />
            </div>
            <div>
              <div style={{
                fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
                fontSize: 20, color: '#E8E0D4',
                textShadow: '0 2px 8px rgba(0,0,0,0.9)', lineHeight: 1.1,
              }}>
                {game.name}
              </div>
              {config?.winChance && (
                <div style={{ fontSize: 11, color: '#8A8070', marginTop: 3, fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.08em' }}>
                  Win chance: {config.winChance}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 10, right: 10,
              width: 34, height: 34,
              background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', backdropFilter: 'blur(4px)',
            }}
          >
            <AssetIcon src={ICONS.close} fallback={X} size={16} style={{ opacity: 0.8 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 20px 24px' }}>
          <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 14, color: '#B8A888', lineHeight: 1.6, marginBottom: 12 }}>
            {game.description}
          </p>

          {config?.instruction_text && (
            <div style={{
              background: 'rgba(255,122,0,0.05)', border: '1px solid rgba(255,122,0,0.12)',
              padding: '10px 14px', marginBottom: 20,
            }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', fontFamily: "'Inter', system-ui, sans-serif", marginBottom: 6 }}>
                How to play
              </div>
              <p style={{ fontSize: 13, color: '#C8BE9E', fontFamily: "'Lora', Georgia, serif", lineHeight: 1.5, margin: 0 }}>
                {config.instruction_text}
              </p>
            </div>
          )}

          {game.qualification_enabled && game.category !== 'weekend' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <AssetIcon src={ICONS.flame} fallback={Zap} size={14} style={{ filter: 'drop-shadow(0 0 4px rgba(255,122,0,0.6))' }} />
              <span style={{ fontSize: 12, color: '#8A8070', fontFamily: "'Inter', system-ui, sans-serif" }}>
                +{game.points_on_play} pts on play · +{game.points_on_win} pts on win
              </span>
            </div>
          )}

          {isSoon ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)',
            }}>
              <Lock size={14} style={{ color: '#554F46' }} />
              <span style={{ fontSize: 12, color: '#554F46', fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Coming Soon
              </span>
            </div>
          ) : played ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px',
              border: `1px solid ${won ? 'rgba(120,176,96,0.3)' : 'rgba(255,255,255,0.06)'}`,
              background: won ? 'rgba(120,176,96,0.06)' : 'rgba(255,255,255,0.03)',
            }}>
              <CheckCircle size={14} style={{ color: won ? '#78B060' : '#554F46' }} />
              <span style={{ fontSize: 12, color: won ? '#78B060' : '#6B655C', fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {won ? 'Played · Won Today' : 'Played Today'}
              </span>
            </div>
          ) : (
            <button
              onClick={onPlay}
              style={{
                width: '100%', padding: '16px',
                background: 'linear-gradient(180deg, rgba(40,65,30,0.95) 0%, rgba(22,38,16,0.98) 100%)',
                border: '1px solid rgba(80,140,50,0.4)',
                cursor: 'pointer',
                fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
                fontSize: 15, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: '#A8D090', textShadow: '0 0 12px rgba(120,200,80,0.3)',
                transition: 'all 0.15s ease', boxShadow: '0 0 20px rgba(80,140,50,0.1)',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(180deg, rgba(50,80,36,0.97) 0%, rgba(28,48,20,0.99) 100%)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(180deg, rgba(40,65,30,0.95) 0%, rgba(22,38,16,0.98) 100%)'; }}
            >
              Play Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Small game row card (Today's Challenges) ──────────────────────────────────
function GameRow({ game, progress, onClick }: {
  game: GameModule;
  progress: TodayGameProgress | null;
  onClick: () => void;
}) {
  const def    = getGameDef(game.game_id);
  const Icon   = def.icon;
  const status = getGameStatus(game, progress);
  const isPlayable = status === 'play';
  const label  = statusLabel(status);
  const color  = statusColor(status);

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px',
        background: isPlayable ? 'rgba(18,26,20,0.85)' : 'rgba(11,15,12,0.7)',
        border: `1px solid ${status === 'won' ? 'rgba(120,176,96,0.22)' : isPlayable ? 'rgba(255,122,0,0.14)' : 'rgba(40,55,42,0.3)'}`,
        cursor: 'pointer', width: '100%', textAlign: 'left',
        transition: 'border-color 0.2s ease',
        opacity: status === 'coming_soon' ? 0.5 : isPlayable ? 1 : 0.72,
      }}
    >
      <div style={{
        width: 44, height: 44,
        background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,122,0,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={22} strokeWidth={1.2} className={def.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
          fontSize: 18,
          color: isPlayable ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)',
          lineHeight: 1.2,
        }}>
          {game.name}
        </div>
        <div style={{
          fontSize: 13, color: isPlayable ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)',
          fontFamily: "'Lora', Georgia, serif", marginTop: 3, lineHeight: 1.4,
        }}>
          {game.description}
        </div>
      </div>
      <div style={{
        fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, fontWeight: 700,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color, flexShrink: 0,
        textShadow: isPlayable ? '0 0 8px rgba(255,154,48,0.4)' : 'none',
      }}>
        {label}
      </div>
    </button>
  );
}

// ── Section heading ──────────────────────────────────────────────────────────
function SectionHeading({ label, action, onAction }: { label: string; action?: string; onAction?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <span style={{
        fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.16em',
        color: 'rgba(255,255,255,0.85)', fontWeight: 700,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        {label}
      </span>
      {action && onAction && (
        <button
          onClick={onAction}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 13, color: 'rgba(255,255,255,0.45)',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          {action} <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { playerState, loading } = useAuth();
  const { play, revealResult, recoverTodayPlay, restoreResult, playing, recovering, pendingResult, lastResult, error, clearResult } = useGame();
  const { qualification, fetchQualification, getGameProgress } = useQualification();
  const { banners, winners, fetchAssets } = useFlyers();
  const { dailyGames, fetchGames } = useGamesCatalog();
  const { assignment: gateAssignment, sceneConfig: gateSceneConfig, assignToday, markStarted, markCompleted } = useSkullGateAssignment();
  const [phase, setPhase] = useState<'idle' | 'stake' | 'challenge' | 'result'>('idle');
  const [gateRevealed, setGateRevealedState] = useState<boolean>(getGateRevealed);
  const [popupGame, setPopupGame] = useState<GameModule | null>(null);
  const mountedRef = useRef(false);
  const restoringRef = useRef(false);
  const countdown = useCountdown();

  useEffect(() => {
    fetchQualification();
    fetchAssets();
    fetchGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the player already revealed the result (torch chosen) but navigated away
  // before closing the modal, restore the ResultModal on return.
  useEffect(() => {
    if (restoringRef.current) return;
    if (!playerState) return;
    if (!playerState.played_today) return;
    if (getGateSeen()) return;          // modal was already closed — nothing to restore
    if (!getGateRevealed()) return;     // result never shown — recovery CTA handles this
    if (phase === 'result') return;     // already showing
    if (lastResult) return;             // already in hook state

    restoringRef.current = true;
    restoreResult().then((result) => {
      restoringRef.current = false;
      if (result) setPhase('result');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerState?.played_today]);

  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    fetchQualification();
  }, [location.key, fetchQualification]);

  if (loading || !playerState) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <LoadingSpinner size="lg" />
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', fontFamily: "'Lora', Georgia, serif", letterSpacing: '0.08em' }}>Entering the jungle…</p>
        </div>
      </div>
    );
  }

  const { game_state, wallet_balance_cents = 0, played_today = false, available_tiers } = playerState;
  const streak   = game_state?.current_streak ?? 0;
  const potCents = game_state?.pot_cents ?? 0;
  const showPostRevealUI = !played_today || gateRevealed;
  const milestone = getMilestoneInfo(streak);

  const handleEnterGame = () => { if (!played_today && !gateRevealed) setPhase('stake'); };

  const handleConfirmStake = async (tier: number) => {
    setPhase('idle');
    const result = await play(tier);
    await fetchQualification();
    if (result) {
      // Only try scene assignment AFTER the play is committed and only when flag is on
      if (USE_SCENE_BASED_SKULL_GATE) {
        // Fire-and-forget — failure falls back to hardcoded challenge
        assignToday().catch(() => {});
      }
      setPhase('challenge');
    }
  };

  const handleChallengeComplete = () => {
    setGateRevealed();        // mark result as revealed immediately — before player can navigate away
    setGateRevealedState(true);
    revealResult();
    setPhase('result');
  };

  const handleResultClose = () => {
    clearResult();
    setGateSeen();            // mark modal as explicitly closed
    setPhase('idle');
  };

  const handleRecover = async () => {
    const result = await recoverTodayPlay();
    if (result) {
      if (USE_SCENE_BASED_SKULL_GATE) {
        // Fetch today's existing assignment (get_or_assign idempotent — returns cached row)
        assignToday().catch(() => {});
      }
      setPhase('challenge');
    }
  };

  // Sort: playable first, done/won after, coming soon last
  const challengeGames = sortGames(
    dailyGames.filter((g) => g.game_id !== 'daily_gate').slice(0, 4),
    getGameProgress,
  );

  // Milestone progress bar values
  const prevMilestone = MILESTONES.filter((m) => m <= streak).pop() ?? 0;
  const milestoneProgress = milestone.target > prevMilestone
    ? (streak - prevMilestone) / (milestone.target - prevMilestone)
    : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ══ SKULL GATE HERO ══════════════════════════════════════════ */}
      <section className="animate-fade-up" style={{ marginBottom: 24 }}>

        {/* Animated gradient border wrapper */}
        <div
          className={(!played_today && !gateRevealed) ? 'skull-gate-glow-border' : undefined}
          style={{ position: 'relative', padding: (!played_today && !gateRevealed) ? 1 : 0 }}
        >
          {/* Gate card */}
          <div
            onClick={(played_today || gateRevealed) ? undefined : handleEnterGame}
            style={{
              backgroundImage: `linear-gradient(rgba(3,8,5,0.52), rgba(3,8,5,0.80)), url(${BACKGROUNDS.gate_home})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              border: (played_today || gateRevealed) ? '1px solid rgba(40,55,42,0.5)' : 'none',
              padding: '24px 20px 20px',
              textAlign: 'center',
              cursor: (played_today || gateRevealed) ? 'default' : 'pointer',
              transition: 'border-color 0.2s ease',
              position: 'relative', overflow: 'hidden',
            }}
          >
            {(!played_today && !gateRevealed) && (
              <div style={{
                position: 'absolute', top: '-30%', left: '50%',
                transform: 'translateX(-50%)', width: '80%', height: '60%',
                background: 'radial-gradient(ellipse, rgba(255,122,0,0.08) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />
            )}

            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* Skull */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <AssetIcon
                  src={(played_today || gateRevealed) ? PROPS.skull_idle : PROPS.skull_main}
                  fallback={Skull}
                  size={72}
                  style={{
                    filter: (played_today || gateRevealed)
                      ? 'brightness(0.4) grayscale(0.6)'
                      : 'drop-shadow(0 0 20px rgba(255,140,20,0.5)) brightness(1.15)',
                    transition: 'all 0.3s ease',
                  }}
                />
              </div>

              {playing ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <LoadingSpinner size="sm" />
                  <span style={{ fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif", fontSize: 18, color: '#F5D060' }}>Facing the Gate…</span>
                </div>

              ) : played_today ? (
                <div>
                  <div style={{
                    fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
                    fontSize: 18,
                    color: gateRevealed ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.85)',
                    marginBottom: 8,
                  }}>
                    {gateRevealed ? 'Gate Faced Today' : 'The Gate Awaits'}
                  </div>

                  {/* Recovery CTA */}
                  {phase === 'idle' && !gateRevealed && (
                    <div style={{ marginTop: 12, marginBottom: 12 }}>
                      <button
                        onClick={handleRecover}
                        disabled={recovering}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 8,
                          padding: '10px 20px',
                          border: '1px solid rgba(245,208,96,0.35)',
                          background: 'rgba(245,208,96,0.07)',
                          cursor: recovering ? 'default' : 'pointer',
                          fontFamily: "'Inter', system-ui, sans-serif",
                          fontSize: 13, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.14em',
                          color: '#D4A020', opacity: recovering ? 0.6 : 1,
                          transition: 'background 0.2s ease',
                        }}
                        onMouseEnter={(e) => { if (!recovering) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(245,208,96,0.14)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(245,208,96,0.07)'; }}
                      >
                        <AssetIcon src={PROPS.skull_gate_icon} fallback={Skull} size={14} style={{ filter: 'drop-shadow(0 0 4px rgba(245,208,96,0.5))' }} />
                        {recovering ? 'Loading…' : 'Choose Your Fate'}
                      </button>
                    </div>
                  )}

                  {/* Post-reveal: streak + milestone bar + countdown */}
                  {showPostRevealUI && (
                    <div style={{ marginTop: 10 }}>
                      {streak > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10 }}>
                          <AssetIcon src={ICONS.flame} fallback={Flame} size={14} style={{ filter: 'brightness(0.75)' }} />
                          <span style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                            {streak}-Day Streak
                          </span>
                        </div>
                      )}

                      {streak > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', system-ui, sans-serif" }}>
                              Day {streak}
                            </span>
                            <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', system-ui, sans-serif" }}>
                              Milestone · Day {milestone.target}
                            </span>
                          </div>
                          <div style={{ height: 3, background: 'rgba(255,255,255,0.08)' }}>
                            <div
                              className="animate-bar-fill"
                              style={{
                                height: '100%',
                                width: `${Math.round(milestoneProgress * 100)}%`,
                                background: 'linear-gradient(90deg, rgba(212,160,32,0.5) 0%, rgba(245,208,96,0.8) 100%)',
                              }}
                            />
                          </div>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', marginTop: 4, fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.1em' }}>
                            {milestone.target - streak} {milestone.target - streak === 1 ? 'day' : 'days'} to next milestone
                          </div>
                        </div>
                      )}

                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '8px 12px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        background: 'rgba(0,0,0,0.2)',
                        marginBottom: 10,
                      }}>
                        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', system-ui, sans-serif" }}>
                          Next gate
                        </span>
                        <span style={{
                          fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
                          fontSize: 15, letterSpacing: '0.1em',
                          color: 'rgba(255,154,48,0.7)',
                        }}>
                          {formatCountdown(countdown)}
                        </span>
                      </div>

                      {potCents > 0 && (
                        <button
                          onClick={() => navigate('/pot')}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 11, fontFamily: "'Inter', system-ui, sans-serif",
                            letterSpacing: '0.12em', textTransform: 'uppercase',
                            color: 'rgba(255,255,255,0.35)',
                            transition: 'color 0.15s ease',
                            textDecoration: 'underline',
                            textDecorationColor: 'rgba(255,255,255,0.1)',
                            padding: '4px 0',
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)'; }}
                        >
                          View Pot · €{formatCents(potCents)}
                        </button>
                      )}
                    </div>
                  )}
                </div>

              ) : (
                <div>
                  <h1 style={{
                    fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
                    fontSize: 32,
                    background: 'linear-gradient(180deg, #F5D060 0%, #D4A020 50%, #B08018 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    letterSpacing: '0.06em', marginBottom: 6,
                  }}>
                    Skull Gate
                  </h1>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontFamily: "'Lora', Georgia, serif", marginBottom: 18, lineHeight: 1.6 }}>
                    Face the gate. Survive to build your streak and grow the pot.
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginBottom: 18 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif", fontSize: 28, color: '#F5D060', lineHeight: 1, textShadow: '0 0 14px rgba(245,208,96,0.4)' }}>
                        {streak}
                      </div>
                      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.55)', marginTop: 5, fontFamily: "'Inter', system-ui, sans-serif" }}>
                        Streak
                      </div>
                    </div>
                    <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 24, fontWeight: 700, color: '#F5D060', lineHeight: 1 }}>
                        €{formatCents(wallet_balance_cents)}
                      </div>
                      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.55)', marginTop: 5, fontFamily: "'Inter', system-ui, sans-serif" }}>
                        Credits
                      </div>
                    </div>
                  </div>

                  {streak > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', marginBottom: 4 }}>
                        <div
                          className="animate-bar-fill"
                          style={{
                            height: '100%',
                            width: `${Math.round(milestoneProgress * 100)}%`,
                            background: 'linear-gradient(90deg, rgba(212,160,32,0.4) 0%, rgba(245,208,96,0.7) 100%)',
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.1em' }}>
                        {milestone.target - streak} {milestone.target - streak === 1 ? 'day' : 'days'} to Day {milestone.target} milestone
                      </div>
                    </div>
                  )}

                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 10,
                    border: '1px solid rgba(255,122,0,0.45)', background: 'rgba(255,122,0,0.10)',
                    padding: '10px 24px', cursor: 'pointer',
                  }}>
                    <AssetIcon src={PROPS.skull_gate_icon} fallback={Skull} size={16} style={{ filter: 'drop-shadow(0 0 4px rgba(255,122,0,0.8))' }} />
                    <span style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#FF9A30', fontFamily: "'Inter', system-ui, sans-serif" }}>
                      Enter the Gate
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══ QUALIFICATION & WEEKEND EVENTS ═══════════════════════════ */}
      <section className="animate-fade-up animate-delay-2" style={{ marginBottom: 24 }}>
        <SectionHeading label="This Week" action="All Games" onAction={() => navigate('/games')} />
        <div style={{ background: 'rgba(11,15,12,0.75)', border: '1px solid rgba(30,50,36,0.5)', padding: '16px' }}>
          <QualificationBar qualification={qualification} showPlayButtons={true} />
        </div>
      </section>

      {/* ══ TODAY'S CHALLENGES ═══════════════════════════════════════ */}
      {challengeGames.length > 0 && (
        <section className="animate-fade-up animate-delay-3" style={{ marginBottom: 24 }}>
          <SectionHeading label="Today's Challenges" action="All" onAction={() => navigate('/games')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {challengeGames.map((game) => (
              <GameRow
                key={game.game_id}
                game={game}
                progress={getGameProgress(game.game_id)}
                onClick={() => setPopupGame(game)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ══ PROMOTIONS ═══════════════════════════════════════════════ */}
      {banners.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {banners.map((banner) => (
              <FlyerCard
                key={banner.id}
                asset={banner}
                onCta={() => {
                  if (banner.template_key.includes('saturday')) navigate('/weekend/saturday');
                  else if (banner.template_key.includes('sunday')) navigate('/weekend/sunday');
                  else navigate('/games');
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* ══ RECENT WINNERS ═══════════════════════════════════════════ */}
      {winners.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.85)', fontWeight: 700, marginBottom: 12, fontFamily: "'Inter', system-ui, sans-serif" }}>
            Recent Champions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {winners.slice(0, 2).map((winner) => (
              <WinnerCard key={winner.id} winner={winner} />
            ))}
          </div>
        </section>
      )}

      {/* ══ JACKPOT STRIP ════════════════════════════════════════════ */}
      <section style={{ marginBottom: 8 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'linear-gradient(180deg, rgba(245,208,96,0.05) 0%, rgba(0,0,0,0.25) 100%)',
          border: '1px solid rgba(245,208,96,0.14)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AssetIcon src={ICONS.zap} fallback={Zap} size={16} style={{ filter: 'drop-shadow(0 0 5px rgba(245,208,96,0.5))' }} />
            <span style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.65)', fontFamily: "'Inter', system-ui, sans-serif" }}>Jackpot Pool</span>
          </div>
          <span style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 20, fontWeight: 700, color: '#F5D060', textShadow: '0 0 10px rgba(245,208,96,0.3)' }}>
            {playerState.jackpot_cents != null ? `€${formatCents(playerState.jackpot_cents)}` : '—'}
          </span>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div style={{ border: '1px solid rgba(180,30,30,0.3)', background: 'rgba(60,0,0,0.25)', padding: '12px 16px', textAlign: 'center', fontSize: 13, color: '#CC4444', lineHeight: 1.5, marginTop: 8 }}>
          {error}
        </div>
      )}

      {/* ── Today's Challenges game popup ── */}
      {popupGame && (
        <GamePopup
          game={popupGame}
          progress={getGameProgress(popupGame.game_id)}
          onClose={() => setPopupGame(null)}
          onPlay={() => {
            setPopupGame(null);
            navigate(getGameDef(popupGame.game_id).route);
          }}
        />
      )}

      {/* ── Gate modals ── */}
      {phase === 'stake' && (
        <StakeModal
          tiers={available_tiers ?? []}
          walletBalance={wallet_balance_cents ?? 0}
          streak={playerState?.game_state?.current_streak ?? 0}
          onConfirm={handleConfirmStake}
          onClose={() => setPhase('idle')}
        />
      )}

      {phase === 'challenge' && pendingResult && (
        // Flag ON + valid assignment with scene config → new renderer
        // Flag OFF or no eligible scene or any error → hardcoded fallback
        USE_SCENE_BASED_SKULL_GATE && gateAssignment && gateSceneConfig && !gateAssignment.no_eligible
          ? (
            <SkullGateSceneChallenge
              pendingResult={pendingResult}
              onComplete={handleChallengeComplete}
              sceneConfig={gateSceneConfig}
              assignment={gateAssignment}
              onMarkStarted={markStarted}
              onMarkCompleted={markCompleted}
            />
          ) : (
            <SkullGateChallenge
              pendingResult={pendingResult}
              onComplete={handleChallengeComplete}
            />
          )
      )}

      {phase === 'result' && lastResult && (
        <ResultModal
          result={lastResult}
          onClose={handleResultClose}
          potCents={potCents}
          onCashout={() => { handleResultClose(); navigate('/pot'); }}
        />
      )}
    </div>
  );
}
