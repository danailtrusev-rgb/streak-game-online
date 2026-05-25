import { Trophy, Crown, Star, Flame } from 'lucide-react';
import type { PromotionalAsset, WinnerAnnouncement } from '../../lib/types';
import { ICONS } from '../../lib/assets';
import AssetIcon from '../ui/AssetIcon';

interface FlyerCardProps {
  asset: PromotionalAsset;
  onCta?: () => void;
}

const THEME_CONFIG: Record<string, { border: string; bg: string; text: string; icon: typeof Trophy; iconSrc: string }> = {
  gold: {
    border: 'border-gold-400/40',
    bg: 'from-gold-500/15 to-transparent',
    text: 'text-gold-300',
    icon: Trophy,
    iconSrc: ICONS.trophy,
  },
  dark: {
    border: 'border-torch-orange/20',
    bg: 'from-ritual-surface/80 to-transparent',
    text: 'text-torch-ember',
    icon: Crown,
    iconSrc: ICONS.crown,
  },
  jungle: {
    border: 'border-moss-mid/40',
    bg: 'from-moss-dark/40 to-transparent',
    text: 'text-moss-light',
    icon: Flame,
    iconSrc: ICONS.flame,
  },
};

export function FlyerCard({ asset, onCta }: FlyerCardProps) {
  const theme = (asset.body_json?.theme as string) ?? 'jungle';
  const cta = asset.body_json?.cta as string | undefined;
  const cfg = THEME_CONFIG[theme] ?? THEME_CONFIG.jungle;

  return (
    <div className={`border ${cfg.border} bg-gradient-to-b ${cfg.bg} px-5 py-4`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center bg-ritual-surface/60`}>
          <AssetIcon src={cfg.iconSrc} fallback={cfg.icon} size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-heading font-bold ${cfg.text}`}>{asset.title}</div>
          {asset.subtitle && (
            <p className="mt-0.5 text-[10px] text-bone-muted">{asset.subtitle}</p>
          )}
        </div>
      </div>
      {cta && onCta && (
        <button
          onClick={onCta}
          className={`mt-3 w-full border ${cfg.border} bg-transparent px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] ${cfg.text} transition-all duration-300 hover:bg-ritual-surface/40`}
        >
          {cta}
        </button>
      )}
    </div>
  );
}

interface WinnerCardProps {
  winner: WinnerAnnouncement;
}

export function WinnerCard({ winner }: WinnerCardProps) {
  const isWeekend = winner.event_game_id.includes('saturday') || winner.event_game_id.includes('sunday');
  const eventLabel = winner.event_game_id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="border border-gold-400/30 bg-gradient-to-b from-gold-500/10 to-transparent px-5 py-4">
      <div className="flex items-center gap-2 mb-2">
        <AssetIcon src={ICONS.star} fallback={Star} size={14} style={{ filter: 'drop-shadow(0 0 3px rgba(245,208,96,0.5))' }} />
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-gold-400">{eventLabel}</span>
      </div>
      <div className="font-heading text-lg font-bold text-gold-300">{winner.display_name}</div>
      {winner.result_summary && (
        <p className="mt-1 text-[10px] text-bone-muted">{winner.result_summary}</p>
      )}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs font-heading font-bold text-torch-ember">
          {isWeekend ? `+${(winner.payout_cents / 100).toFixed(2)} EUR` : ''}
        </span>
        <span className="text-[9px] text-bone-dark">
          {new Date(winner.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </span>
      </div>
    </div>
  );
}
