import { CheckCircle, Lock, ChevronRight, Flame } from 'lucide-react';
import type { GameModule, TodayGameProgress } from '../../lib/types';
import { getGameDef } from '../../lib/gameRegistry';
import { ICONS, UI_ASSETS } from '../../lib/assets';
import AssetIcon from '../ui/AssetIcon';
import { useI18n } from '../../context/I18nContext';

interface GameTileProps {
  game: GameModule;
  progress: TodayGameProgress | null;
  onClick: () => void;
  variant?: 'list' | 'card';
}

export default function GameTile({ game, progress, onClick, variant = 'list' }: GameTileProps) {
  const def = getGameDef(game.game_id);
  const Icon = def.icon;
  const { t } = useI18n();

  function getStatusConfig(g: GameModule, p: TodayGameProgress | null) {
    const played = p?.played_today ?? false;
    const won = p?.won_today ?? false;
    const isActive = g.status === 'active';
    const isComingSoon = g.status === 'coming_soon' || g.launch_state === 'coming_soon';
    if (isComingSoon) return { label: t('games.status.soon'),   color: '#4A453E', glow: false, canPlay: false };
    if (!isActive)    return { label: t('games.status.locked'), color: '#4A453E', glow: false, canPlay: false };
    if (played && won)return { label: t('games.status.won'),    color: '#78B060', glow: false, canPlay: false };
    if (played)       return { label: t('games.status.done'),   color: '#6B655C', glow: false, canPlay: false };
    return           { label: t('games.status.play'),           color: '#FF9A30', glow: true,  canPlay: true  };
  }

  const status = getStatusConfig(game, progress);
  const isWeekend = game.category === 'weekend';
  const isActive = status.canPlay || isWeekend;
  const isPlayed = !status.canPlay && (progress?.played_today ?? false);
  const isSoon = game.status === 'coming_soon' || game.launch_state === 'coming_soon';

  if (variant === 'card') {
    return (
      <button
        onClick={isActive ? onClick : undefined}
        disabled={!isActive && !isWeekend}
        className={`flex flex-col gap-2 text-left transition-all duration-300 w-full ${
          isActive ? 'cursor-pointer' : 'cursor-default'
        }`}
        style={{
          position: 'relative',
          padding: '16px',
          background: 'none',
          border: 'none',
          backgroundImage: `url(${UI_ASSETS.tile_frame})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          opacity: isSoon ? 0.5 : isPlayed ? 0.7 : 1,
        }}
      >
        <div className={`flex h-10 w-10 items-center justify-center border border-transparent ${def.bgClass}`}>
          <Icon className={`h-5 w-5 ${def.color}`} strokeWidth={1.2} />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span
              className="font-heading font-bold"
              style={{ fontSize: 12, color: isPlayed ? '#9E9688' : '#E8E0D4', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
            >
              {game.name}
            </span>
          </div>
          <p className="text-[9px] text-bone-muted line-clamp-2">{game.description}</p>
        </div>
        <div className="flex items-center justify-between mt-auto pt-1">
          {game.qualification_enabled && game.category !== 'weekend' && (
            <span className="flex items-center gap-0.5 text-[8px] text-bone-dark">
              <AssetIcon src={ICONS.flame} fallback={Flame} size={10} />
              +{game.points_on_play}pts
            </span>
          )}
          <span
            className="text-[8px] font-semibold uppercase tracking-wider ml-auto"
            style={{
              color: status.color,
              textShadow: status.glow ? '0 0 8px rgba(255,154,48,0.5)' : 'none',
            }}
          >
            {status.label}
          </span>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={isActive ? onClick : undefined}
      disabled={!isActive && !isWeekend}
      className={`flex w-full items-center gap-4 text-left transition-all duration-300 ${
        isActive ? 'cursor-pointer' : 'cursor-default'
      }`}
      style={{
        position: 'relative',
        padding: '16px 18px',
        background: 'none',
        border: 'none',
        backgroundImage: `url(${UI_ASSETS.tile_frame})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        opacity: isSoon ? 0.45 : isPlayed ? 0.65 : 1,
        minHeight: 64,
      }}
    >
      {/* Icon box */}
      <div
        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center ${def.bgClass}`}
        style={{ opacity: isPlayed ? 0.6 : 1 }}
      >
        <Icon className={`h-5 w-5 ${def.color}`} strokeWidth={1.2} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="font-heading font-bold truncate"
            style={{
              fontSize: 14,
              color: isPlayed ? '#9E9688' : '#E8E0D4',
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            }}
          >
            {game.name}
          </span>
          {progress?.played_today && progress.won_today && (
            <AssetIcon src={ICONS.check_circle} fallback={CheckCircle} size={13} />
          )}
          {isSoon && (
            <AssetIcon src={ICONS.lock} fallback={Lock} size={12} style={{ opacity: 0.5 }} />
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <p className="text-[10px] text-bone-muted truncate">{game.description}</p>
          {game.qualification_enabled && game.category !== 'weekend' && (
            <span className="flex-shrink-0 flex items-center gap-0.5 text-[8px] text-bone-dark">
              <AssetIcon src={ICONS.flame} fallback={Flame} size={10} />
              +{game.points_on_play}
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className="font-semibold uppercase tracking-wider"
          style={{
            fontSize: 10,
            color: status.color,
            textShadow: status.glow ? '0 0 8px rgba(255,154,48,0.55)' : 'none',
          }}
        >
          {status.label}
        </span>
        {isActive && (
          <AssetIcon
            src={ICONS.back}
            fallback={ChevronRight}
            size={14}
            style={{ opacity: 0.7, filter: 'brightness(1.3)' }}
          />
        )}
      </div>
    </button>
  );
}
