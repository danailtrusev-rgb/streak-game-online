import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Zap, Lock, CheckCircle } from 'lucide-react';
import { useGamesCatalog } from '../hooks/useGamesCatalog';
import { useQualification } from '../hooks/useQualification';
import { getGameDef } from '../lib/gameRegistry';
import { getGameConfig } from '../lib/gameConfigs';
import { ICONS, BACKGROUNDS } from '../lib/assets';
import AssetIcon from '../components/ui/AssetIcon';
import QualificationBar from '../components/ecosystem/QualificationBar';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { GameModule, TodayGameProgress } from '../lib/types';
import { useI18n } from '../context/I18nContext';

type FilterKey = 'all' | 'daily' | 'weekend' | 'special' | 'done';

function getFilterLabels(t: (k: string) => string): { key: FilterKey; label: string }[] {
  return [
    { key: 'all',     label: t('games.filter.all')     },
    { key: 'daily',   label: t('games.filter.daily')   },
    { key: 'weekend', label: t('games.filter.weekend') },
    { key: 'special', label: t('games.filter.special') },
    { key: 'done',    label: t('games.filter.done')    },
  ];
}

const GAME_BG: Record<string, string> = {
  daily_dice:    BACKGROUNDS.gate_home,
  daily_pick:    BACKGROUNDS.inner_jungle,
  daily_safebox: BACKGROUNDS.ritual_floor,
  daily_path:    BACKGROUNDS.inner_jungle,
  daily_puzzle:  BACKGROUNDS.inner_jungle,
};

// ── Status types and helpers ──────────────────────────────────────────────────
type GameStatusKey = 'play' | 'done' | 'won' | 'locked' | 'coming_soon';

function getGameStatus(game: GameModule, progress: TodayGameProgress | null): GameStatusKey {
  const isSoon = game.status === 'coming_soon' || game.launch_state === 'coming_soon';
  if (isSoon) return 'coming_soon';
  const played = progress?.played_today ?? false;
  const won    = progress?.won_today ?? false;
  if (played && won) return 'won';
  if (played)        return 'done';
  return 'play';
}

function statusLabel(status: GameStatusKey, t: (k: string) => string): string {
  switch (status) {
    case 'play':        return t('games.status.play');
    case 'done':        return t('games.status.done');
    case 'won':         return t('games.status.won');
    case 'locked':      return t('games.status.locked');
    case 'coming_soon': return t('games.status.coming_soon');
  }
}

function statusColor(status: GameStatusKey): string {
  switch (status) {
    case 'play':        return '#FF9A30';
    case 'won':         return '#78B060';
    case 'done':        return '#554F46';
    case 'locked':      return '#3E3930';
    case 'coming_soon': return '#3E3930';
  }
}

function sortGames(
  games: GameModule[],
  getProgress: (id: string) => TodayGameProgress | null,
): GameModule[] {
  return [...games].sort((a, b) => {
    const sA = getGameStatus(a, getProgress(a.game_id));
    const sB = getGameStatus(b, getProgress(b.game_id));
    const rank = (s: GameStatusKey) =>
      s === 'play' ? 0 : s === 'done' || s === 'won' ? 1 : s === 'locked' ? 2 : 3;
    return rank(sA) - rank(sB) || (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}

// ── Game popup ────────────────────────────────────────────────────────────────
interface GamePopupProps {
  game:     GameModule;
  progress: TodayGameProgress | null;
  onClose:  () => void;
  onPlay:   () => void;
}

function GamePopup({ game, progress, onClose, onPlay }: GamePopupProps) {
  const def     = getGameDef(game.game_id);
  const config  = getGameConfig(game.game_id);
  const Icon    = def.icon;
  const status  = getGameStatus(game, progress);
  const played  = status === 'done' || status === 'won';
  const won     = status === 'won';
  const isSoon  = status === 'coming_soon';
  const bgSrc   = GAME_BG[game.game_id] ?? config?.background ?? '';
  const { t }   = useI18n();

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
                  {t('games.win_chance', { value: config.winChance })}
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
              transition: 'background 0.15s ease',
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
                {t('games.how_to_play')}
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
                {t('games.points_on_play', { play: String(game.points_on_play), win: String(game.points_on_win) })}
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
                {t('games.status.coming_soon')}
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
                {won ? t('games.played_won') : t('games.played_today')}
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
              {t('games.play_now')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Compact game card for 2-col grid ──────────────────────────────────────────
interface GameCardProps {
  game:     GameModule;
  progress: TodayGameProgress | null;
  onClick:  () => void;
}

function GameCard({ game, progress, onClick }: GameCardProps) {
  const def    = getGameDef(game.game_id);
  const Icon   = def.icon;
  const status = getGameStatus(game, progress);
  const played = status === 'done' || status === 'won';
  const won    = status === 'won';
  const isSoon = status === 'coming_soon';
  const { t }  = useI18n();
  const label  = statusLabel(status, t);
  const color  = statusColor(status);

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        padding: '16px 14px 14px',
        background: played
          ? 'rgba(11,15,12,0.85)'
          : 'linear-gradient(180deg, rgba(18,26,20,0.95) 0%, rgba(11,15,12,0.95) 100%)',
        border: `1px solid ${
          won    ? 'rgba(120,176,96,0.25)' :
          played ? 'rgba(40,55,42,0.4)' :
                   'rgba(255,122,0,0.14)'
        }`,
        cursor: isSoon ? 'default' : 'pointer',
        opacity: isSoon ? 0.5 : 1,
        transition: 'border-color 0.2s ease, background 0.2s ease',
        textAlign: 'left', width: '100%', minHeight: 120,
        position: 'relative', gap: 0,
      }}
    >
      {played && (
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <CheckCircle size={15} style={{ color: won ? '#78B060' : '#3E3930' }} strokeWidth={2} />
        </div>
      )}

      <div style={{
        width: 44, height: 44,
        background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,122,0,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 10, flexShrink: 0,
      }}>
        <Icon size={24} strokeWidth={1.2} className={def.color} />
      </div>

      <div style={{
        fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
        fontSize: 20,
        color: played ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.9)',
        lineHeight: 1.15, marginBottom: 7, flex: 1,
      }}>
        {game.name}
      </div>

      <div style={{
        fontFamily: "'Lora', Georgia, serif", fontSize: 14,
        color: played ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.6)',
        lineHeight: 1.5, marginBottom: 10,
        display: '-webkit-box', WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {game.description}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{
          fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11,
          fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          color,
          textShadow: status === 'play' ? '0 0 8px rgba(255,154,48,0.45)' : 'none',
        }}>
          {label}
        </div>
        {!played && !isSoon && game.qualification_enabled && (
          <div style={{
            fontSize: 10, fontFamily: "'Inter', system-ui, sans-serif",
            color: 'rgba(255,255,255,0.28)', letterSpacing: '0.06em',
          }}>
            +{game.points_on_play}pt
          </div>
        )}
      </div>
    </button>
  );
}

// ── Main GamesPage ─────────────────────────────────────────────────────────────
export default function GamesPage() {
  const navigate = useNavigate();
  const { games, loading, error, fetchGames } = useGamesCatalog();
  const { qualification, fetchQualification, getGameProgress } = useQualification();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [popupGame, setPopupGame] = useState<GameModule | null>(null);
  const { t } = useI18n();
  const FILTERS = getFilterLabels(t);

  useEffect(() => {
    fetchGames();
    fetchQualification();
  }, [fetchGames, fetchQualification]);

  function handleGameClick(game: GameModule) {
    const isSoon = game.status === 'coming_soon' || game.launch_state === 'coming_soon';
    if (isSoon) return;
    setPopupGame(game);
  }

  function handlePlay(game: GameModule) {
    setPopupGame(null);
    navigate(getGameDef(game.game_id).route);
  }

  const filteredGames = games.filter((g) => {
    const progress = getGameProgress(g.game_id);
    const played   = progress?.played_today ?? false;
    const isWeekend = g.category === 'weekend';
    const isSpecial = g.category === 'special';
    const isDaily   = g.category === 'daily' || g.category === 'qualifier';

    if (activeFilter === 'daily')   return isDaily;
    if (activeFilter === 'weekend') return isWeekend;
    if (activeFilter === 'special') return isSpecial;
    if (activeFilter === 'done')    return played;
    return true;
  });

  const dailyGames   = sortGames(filteredGames.filter((g) => g.category === 'daily' || g.category === 'qualifier'), getGameProgress);
  const weekendGames = filteredGames.filter((g) => g.category === 'weekend');
  const specialGames = filteredGames.filter((g) => g.category === 'special');

  if (loading && games.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="pg-transition pg-transition--fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Daily progress summary */}
      {(() => {
        const allDaily = games.filter((g) => g.category === 'daily' || g.category === 'qualifier');
        const doneCount = allDaily.filter((g) => getGameProgress(g.game_id)?.played_today).length;
        const totalCount = allDaily.length;
        const allDone = doneCount === totalCount && totalCount > 0;
        return (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px',
            background: allDone ? 'rgba(120,176,96,0.06)' : 'rgba(255,122,0,0.04)',
            border: `1px solid ${allDone ? 'rgba(120,176,96,0.22)' : 'rgba(255,122,0,0.12)'}`,
          }}>
            <div>
              <div style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em',
                color: allDone ? '#78B060' : 'rgba(255,255,255,0.45)',
              }}>
                {allDone ? t('games.all_daily_done') : t('games.daily_games')}
              </div>
              {!allDone && (
                <div style={{
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2,
                }}>
                  {t('games.earn_points_desc')}
                </div>
              )}
            </div>
            <div style={{
              fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
              fontSize: 20, letterSpacing: '0.06em',
              color: allDone ? '#78B060' : '#FF9A30',
            }}>
              {doneCount}/{totalCount}
            </div>
          </div>
        );
      })()}

      {/* Qualification bar */}
      <div style={{ background: 'rgba(11,15,12,0.72)', border: '1px solid rgba(30,50,36,0.55)', padding: '16px' }}>
        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', marginBottom: 12, fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600 }}>
          {t('home.this_week')}
        </div>
        <QualificationBar qualification={qualification} />
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            style={{
              whiteSpace: 'nowrap',
              border: `1px solid ${activeFilter === key ? 'rgba(255,122,0,0.35)' : 'rgba(40,55,42,0.35)'}`,
              padding: '9px 16px', fontSize: 13, fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              fontFamily: "'Inter', system-ui, sans-serif",
              color: activeFilter === key ? '#FF9A30' : '#6B655C',
              background: activeFilter === key ? 'rgba(255,122,0,0.08)' : 'transparent',
              cursor: 'pointer', transition: 'all 0.15s ease', flexShrink: 0,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ border: '1px solid rgba(180,30,30,0.3)', background: 'rgba(80,0,0,0.2)', padding: '12px 16px', textAlign: 'center', fontSize: 13, color: '#CC4444' }}>
          {error}
        </div>
      )}

      {/* Daily Games — 2-col grid */}
      {(activeFilter === 'all' || activeFilter === 'daily' || activeFilter === 'done') && dailyGames.length > 0 && (
        <section>
          {activeFilter === 'all' && (
            <div style={{ fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.85)', fontWeight: 700, marginBottom: 12, fontFamily: "'Inter', system-ui, sans-serif" }}>
              {t('games.daily_challenges')}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {dailyGames.map((game) => (
              <GameCard
                key={game.game_id}
                game={game}
                progress={getGameProgress(game.game_id)}
                onClick={() => handleGameClick(game)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Weekend Events — 2-col grid */}
      {(activeFilter === 'all' || activeFilter === 'weekend') && weekendGames.length > 0 && (
        <section>
          {activeFilter === 'all' && (
            <div style={{ fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.85)', fontWeight: 700, marginBottom: 12, fontFamily: "'Inter', system-ui, sans-serif" }}>
              {t('games.weekend_events')}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {weekendGames.map((game) => (
              <GameCard
                key={game.game_id}
                game={game}
                progress={getGameProgress(game.game_id)}
                onClick={() => handleGameClick(game)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Coming Soon — 2-col grid */}
      {(activeFilter === 'all' || activeFilter === 'special') && specialGames.length > 0 && (
        <section>
          {activeFilter === 'all' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.65)', fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif" }}>
                {t('games.coming_soon')}
              </div>
              <Zap size={13} style={{ color: '#FF7A00', opacity: 0.6 }} />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {specialGames.map((game) => (
              <GameCard
                key={game.game_id}
                game={game}
                progress={getGameProgress(game.game_id)}
                onClick={() => handleGameClick(game)}
              />
            ))}
          </div>
        </section>
      )}

      {filteredGames.length === 0 && !loading && (
        <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>
          {t('games.no_match')}
        </div>
      )}

      {/* How qualification works */}
      <div style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', padding: '16px', marginTop: 4 }}>
        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.65)', marginBottom: 10, fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600 }}>
          {t('games.how_qual_works')}
        </div>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: 0, fontFamily: "'Lora', Georgia, serif" }}>
          {t('games.how_qual_desc')}
        </p>
      </div>

      {popupGame && (
        <GamePopup
          game={popupGame}
          progress={getGameProgress(popupGame.game_id)}
          onClose={() => setPopupGame(null)}
          onPlay={() => handlePlay(popupGame)}
        />
      )}
    </div>
  );
}
