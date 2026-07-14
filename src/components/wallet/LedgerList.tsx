import { ArrowUpCircle, ArrowDownCircle, RefreshCw, Shield, Sparkles } from 'lucide-react';
import { formatCents } from '../../lib/constants';
import type { WalletEntry } from '../../lib/types';
import { ICONS } from '../../lib/assets';
import AssetIcon from '../ui/AssetIcon';
import { useI18n } from '../../context/I18nContext';

interface LedgerListProps {
  entries: WalletEntry[];
}

export default function LedgerList({ entries }: LedgerListProps) {
  const { t } = useI18n();

  const typeConfig: Record<string, { label: string; icon: typeof ArrowUpCircle; iconSrc: string; color: string }> = {
    TOPUP:          { label: t('wallet.tx.topup'),      icon: ArrowUpCircle, iconSrc: ICONS.arrow_up,   color: 'text-moss-light'  },
    STAKE:          { label: t('wallet.tx.stake'),      icon: ArrowDownCircle, iconSrc: ICONS.arrow_down, color: 'text-torch-dim' },
    CASHOUT:        { label: t('wallet.tx.cashout'),    icon: Sparkles,      iconSrc: ICONS.sparkles,   color: 'text-torch-ember' },
    ADMIN_ADJUST:   { label: t('wallet.tx.adjustment'), icon: Shield,        iconSrc: ICONS.shield,     color: 'text-bone-muted'  },
    JACKPOT_CONTRIB:{ label: t('wallet.tx.jackpot'),    icon: RefreshCw,     iconSrc: ICONS.refresh,    color: 'text-bone-dark'   },
    JACKPOT_WIN:    { label: t('wallet.tx.jackpot_win'),icon: Sparkles,      iconSrc: ICONS.sparkles,   color: 'text-torch-ember' },
  };

  if (entries.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-bone-dark">
        {t('wallet.no_transactions')}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => {
        const config = typeConfig[entry.type] || typeConfig.TOPUP;
        const isPositive = entry.amount_cents > 0;
        const date = new Date(entry.created_at);

        return (
          <div
            key={entry.id}
            className="flex items-center gap-3 border border-moss-dark/20 bg-ritual-surface/30 px-4 py-3"
          >
            <AssetIcon src={config.iconSrc} fallback={config.icon} size={16} className={`flex-shrink-0 ${config.color}`} />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-bone-muted">{config.label}</div>
              <div className="text-[9px] text-bone-dark">
                {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}{' '}
                {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div
              className={`font-heading text-sm font-bold ${
                isPositive ? 'text-moss-light' : 'text-torch-dim'
              }`}
            >
              {isPositive ? '+' : ''}{formatCents(entry.amount_cents)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
