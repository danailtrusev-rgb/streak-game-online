import { useEffect } from 'react';
import { ArrowUpCircle, ArrowDownCircle, RefreshCw, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../hooks/useWallet';
import TopupButtons from '../components/wallet/TopupButtons';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import AssetIcon from '../components/ui/AssetIcon';
import { formatCents } from '../lib/constants';
import { ICONS } from '../lib/assets';
import type { WalletEntry } from '../lib/types';
import { useI18n } from '../context/I18nContext';

function LedgerRow({ entry }: { entry: WalletEntry }) {
  const { t } = useI18n();

  const TYPE_CONFIG = {
    TOPUP:           { label: t('wallet.type.topup'),      icon: ArrowUpCircle,   iconSrc: ICONS.arrow_up,   positive: true  },
    STAKE:           { label: t('wallet.type.stake'),       icon: ArrowDownCircle, iconSrc: ICONS.arrow_down, positive: false },
    CASHOUT:         { label: t('wallet.type.cashout'),     icon: Sparkles,        iconSrc: ICONS.sparkles,   positive: true  },
    ADMIN_ADJUST:    { label: t('wallet.type.adjustment'),  icon: Shield,          iconSrc: ICONS.shield,     positive: true  },
    JACKPOT_CONTRIB: { label: t('wallet.type.jackpot'),     icon: RefreshCw,       iconSrc: ICONS.refresh,    positive: false },
    JACKPOT_WIN:     { label: t('wallet.type.jackpot_win'), icon: Sparkles,        iconSrc: ICONS.sparkles,   positive: true  },
  } as Record<string, { label: string; icon: typeof ArrowUpCircle; iconSrc: string; positive: boolean }>;

  const isJackpotContrib = entry.type === 'JACKPOT_CONTRIB';
  const jackpotAmount    = isJackpotContrib
    ? ((entry.meta?.amount_cents as number | undefined) ?? 0)
    : 0;

  const cfg        = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.TOPUP;
  const isPositive = entry.amount_cents > 0;
  const date       = new Date(entry.created_at);
  const dateStr    = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const timeStr    = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  if (isJackpotContrib) {
    return (
      <div style={{
        display:      'flex',
        alignItems:   'center',
        gap:           12,
        padding:      '10px 0',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        opacity:       0.65,
      }}>
        <div style={{
          width:          36,
          height:         36,
          background:     'rgba(245,208,96,0.04)',
          border:         '1px solid rgba(245,208,96,0.1)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          flexShrink:     0,
        }}>
          <AssetIcon
            src={cfg.iconSrc}
            fallback={cfg.icon}
            size={14}
            style={{ color: 'rgba(245,208,96,0.6)', opacity: 0.85 }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize:    12,
            fontWeight:  500,
            color:       'rgba(255,255,255,0.5)',
            lineHeight:  1.3,
          }}>
            {jackpotAmount > 0 ? formatCents(jackpotAmount) : ''} {t('wallet.jackpot_allocated')}
          </div>
          <div style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize:    10,
            color:       'rgba(255,255,255,0.25)',
            marginTop:    2,
          }}>
            {dateStr} · {timeStr}
          </div>
        </div>
        <div style={{
          fontFamily:  "'Inter', system-ui, sans-serif",
          fontSize:     11,
          color:        'rgba(255,255,255,0.25)',
          flexShrink:   0,
          letterSpacing: '0.04em',
        }}>
          {t('wallet.allocation')}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      gap:             12,
      padding:        '12px 0',
      borderBottom:   '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{
        width:          36,
        height:         36,
        background:     isPositive ? 'rgba(120,176,96,0.08)' : 'rgba(255,122,0,0.06)',
        border:         `1px solid ${isPositive ? 'rgba(120,176,96,0.18)' : 'rgba(255,122,0,0.12)'}`,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        flexShrink:     0,
      }}>
        <AssetIcon
          src={cfg.iconSrc}
          fallback={cfg.icon}
          size={16}
          style={{ color: isPositive ? '#78B060' : '#FF7A00', opacity: 0.85 }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize:    14,
          fontWeight:  500,
          color:       'rgba(255,255,255,0.85)',
          lineHeight:  1.2,
        }}>
          {cfg.label}
        </div>
        <div style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize:    11,
          color:       'rgba(255,255,255,0.35)',
          marginTop:   2,
        }}>
          {dateStr} · {timeStr}
        </div>
      </div>
      <div style={{
        fontFamily:  "'Lora', Georgia, serif",
        fontSize:     15,
        fontWeight:   700,
        color:        isPositive ? '#78B060' : '#FF7A00',
        flexShrink:   0,
      }}>
        {isPositive ? '+' : ''}{formatCents(entry.amount_cents)}
      </div>
    </div>
  );
}

export default function WalletPage() {
  const { playerState } = useAuth();
  const { ledger, loadingLedger, fetchLedger, topup, toppingUp, error } = useWallet();
  const { t } = useI18n();

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const balance = playerState?.wallet_balance_cents ?? 0;

  return (
    <div className="pg-transition pg-transition--fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Balance block */}
      <div style={{
        background:  'linear-gradient(180deg, rgba(18,26,20,0.95) 0%, rgba(9,13,10,0.98) 100%)',
        border:      '1px solid rgba(245,208,96,0.12)',
        padding:     '32px 20px 28px',
        textAlign:   'center',
        boxShadow:   '0 0 40px rgba(245,208,96,0.04)',
      }}>
        <div style={{
          fontFamily:    "'Inter', system-ui, sans-serif",
          fontSize:       10,
          textTransform: 'uppercase',
          letterSpacing: '0.22em',
          color:          'rgba(255,255,255,0.35)',
          marginBottom:   12,
        }}>
          {t('wallet.available_balance')}
        </div>
        <div style={{
          fontFamily:  "'Metal Mania', 'Cinzel', Georgia, serif",
          fontSize:     48,
          fontWeight:   700,
          color:        '#F5D060',
          lineHeight:   1,
          textShadow:  '0 0 30px rgba(245,208,96,0.25), 0 2px 8px rgba(0,0,0,0.9)',
          marginBottom: 8,
        }}>
          {formatCents(balance)}
        </div>
        <div style={{
          fontFamily:    "'Inter', system-ui, sans-serif",
          fontSize:       11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color:          'rgba(255,255,255,0.3)',
        }}>
          {t('common.credits')}
        </div>
      </div>

      {/* Top-up section */}
      <div>
        <div style={{
          fontFamily:    "'Inter', system-ui, sans-serif",
          fontSize:       10,
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          color:          'rgba(255,255,255,0.45)',
          fontWeight:     600,
          marginBottom:   12,
        }}>
          {t('wallet.add_credits')}
        </div>
        <TopupButtons onTopup={topup} disabled={toppingUp} />
        {toppingUp && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
            <LoadingSpinner size="sm" />
          </div>
        )}
      </div>

      {error && (
        <div style={{
          border:    '1px solid rgba(180,30,30,0.3)',
          background:'rgba(80,0,0,0.2)',
          padding:   '12px 16px',
          textAlign: 'center',
          fontSize:   13,
          color:      '#CC4444',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          {error}
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

      {/* Transaction history */}
      <div>
        <div style={{
          fontFamily:    "'Inter', system-ui, sans-serif",
          fontSize:       10,
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          color:          'rgba(255,255,255,0.45)',
          fontWeight:     600,
          marginBottom:   16,
        }}>
          {t('wallet.transaction_history')}
        </div>

        {loadingLedger ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <LoadingSpinner />
          </div>
        ) : ledger.length === 0 ? (
          <div style={{
            padding:    '40px 0',
            textAlign:  'center',
          }}>
            <div style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize:    15,
              color:       'rgba(255,255,255,0.25)',
              marginBottom: 6,
            }}>
              {t('wallet.no_transactions')}
            </div>
            <div style={{
              fontFamily:    "'Inter', system-ui, sans-serif",
              fontSize:       11,
              color:          'rgba(255,255,255,0.15)',
              letterSpacing: '0.08em',
            }}>
              {t('wallet.topup_to_start')}
            </div>
          </div>
        ) : (
          <div>
            {ledger.map((entry) => (
              <LedgerRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


function LedgerRow({ entry }: { entry: WalletEntry }) {
  // JACKPOT_CONTRIB is informational — it records how much of a lost stake was
  // allocated to the jackpot pool. It is not an additional wallet deduction.
  const isJackpotContrib = entry.type === 'JACKPOT_CONTRIB';
  const jackpotAmount    = isJackpotContrib
    ? ((entry.meta?.amount_cents as number | undefined) ?? 0)
    : 0;

  const cfg        = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.TOPUP;
  const isPositive = entry.amount_cents > 0;
  const date       = new Date(entry.created_at);
  const dateStr    = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const timeStr    = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  if (isJackpotContrib) {
    return (
      <div style={{
        display:      'flex',
        alignItems:   'center',
        gap:           12,
        padding:      '10px 0',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        opacity:       0.65,
      }}>
        <div style={{
          width:          36,
          height:         36,
          background:     'rgba(245,208,96,0.04)',
          border:         '1px solid rgba(245,208,96,0.1)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          flexShrink:     0,
        }}>
          <AssetIcon
            src={cfg.iconSrc}
            fallback={cfg.icon}
            size={14}
            style={{ color: 'rgba(245,208,96,0.6)', opacity: 0.85 }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize:    12,
            fontWeight:  500,
            color:       'rgba(255,255,255,0.5)',
            lineHeight:  1.3,
          }}>
            {jackpotAmount > 0 ? formatCents(jackpotAmount) : ''} allocated to Jackpot from lost stake
          </div>
          <div style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize:    10,
            color:       'rgba(255,255,255,0.25)',
            marginTop:    2,
          }}>
            {dateStr} · {timeStr}
          </div>
        </div>
        <div style={{
          fontFamily:  "'Inter', system-ui, sans-serif",
          fontSize:     11,
          color:        'rgba(255,255,255,0.25)',
          flexShrink:   0,
          letterSpacing: '0.04em',
        }}>
          allocation
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      gap:             12,
      padding:        '12px 0',
      borderBottom:   '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{
        width:          36,
        height:         36,
        background:     isPositive ? 'rgba(120,176,96,0.08)' : 'rgba(255,122,0,0.06)',
        border:         `1px solid ${isPositive ? 'rgba(120,176,96,0.18)' : 'rgba(255,122,0,0.12)'}`,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        flexShrink:     0,
      }}>
        <AssetIcon
          src={cfg.iconSrc}
          fallback={cfg.icon}
          size={16}
          style={{ color: isPositive ? '#78B060' : '#FF7A00', opacity: 0.85 }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize:    14,
          fontWeight:  500,
          color:       'rgba(255,255,255,0.85)',
          lineHeight:  1.2,
        }}>
          {cfg.label}
        </div>
        <div style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize:    11,
          color:       'rgba(255,255,255,0.35)',
          marginTop:   2,
        }}>
          {dateStr} · {timeStr}
        </div>
      </div>
      <div style={{
        fontFamily:  "'Lora', Georgia, serif",
        fontSize:     15,
        fontWeight:   700,
        color:        isPositive ? '#78B060' : '#FF7A00',
        flexShrink:   0,
      }}>
        {isPositive ? '+' : ''}{formatCents(entry.amount_cents)}
      </div>
    </div>
  );
}

export default function WalletPage() {
  const { playerState } = useAuth();
  const { ledger, loadingLedger, fetchLedger, topup, toppingUp, error } = useWallet();

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const balance = playerState?.wallet_balance_cents ?? 0;

  return (
    <div className="pg-transition pg-transition--fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Balance block */}
      <div style={{
        background:  'linear-gradient(180deg, rgba(18,26,20,0.95) 0%, rgba(9,13,10,0.98) 100%)',
        border:      '1px solid rgba(245,208,96,0.12)',
        padding:     '32px 20px 28px',
        textAlign:   'center',
        boxShadow:   '0 0 40px rgba(245,208,96,0.04)',
      }}>
        <div style={{
          fontFamily:    "'Inter', system-ui, sans-serif",
          fontSize:       10,
          textTransform: 'uppercase',
          letterSpacing: '0.22em',
          color:          'rgba(255,255,255,0.35)',
          marginBottom:   12,
        }}>
          Available Balance
        </div>
        <div style={{
          fontFamily:  "'Metal Mania', 'Cinzel', Georgia, serif",
          fontSize:     48,
          fontWeight:   700,
          color:        '#F5D060',
          lineHeight:   1,
          textShadow:  '0 0 30px rgba(245,208,96,0.25), 0 2px 8px rgba(0,0,0,0.9)',
          marginBottom: 8,
        }}>
          {formatCents(balance)}
        </div>
        <div style={{
          fontFamily:    "'Inter', system-ui, sans-serif",
          fontSize:       11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color:          'rgba(255,255,255,0.3)',
        }}>
          EUR Credits
        </div>
      </div>

      {/* Top-up section */}
      <div>
        <div style={{
          fontFamily:    "'Inter', system-ui, sans-serif",
          fontSize:       10,
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          color:          'rgba(255,255,255,0.45)',
          fontWeight:     600,
          marginBottom:   12,
        }}>
          Add Credits
        </div>
        <TopupButtons onTopup={topup} disabled={toppingUp} />
        {toppingUp && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
            <LoadingSpinner size="sm" />
          </div>
        )}
      </div>

      {error && (
        <div style={{
          border:    '1px solid rgba(180,30,30,0.3)',
          background:'rgba(80,0,0,0.2)',
          padding:   '12px 16px',
          textAlign: 'center',
          fontSize:   13,
          color:      '#CC4444',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          {error}
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

      {/* Transaction history */}
      <div>
        <div style={{
          fontFamily:    "'Inter', system-ui, sans-serif",
          fontSize:       10,
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          color:          'rgba(255,255,255,0.45)',
          fontWeight:     600,
          marginBottom:   16,
        }}>
          Transaction History
        </div>

        {loadingLedger ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <LoadingSpinner />
          </div>
        ) : ledger.length === 0 ? (
          <div style={{
            padding:    '40px 0',
            textAlign:  'center',
          }}>
            <div style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize:    15,
              color:       'rgba(255,255,255,0.25)',
              marginBottom: 6,
            }}>
              No transactions yet
            </div>
            <div style={{
              fontFamily:    "'Inter', system-ui, sans-serif",
              fontSize:       11,
              color:          'rgba(255,255,255,0.15)',
              letterSpacing: '0.08em',
            }}>
              Top up to get started
            </div>
          </div>
        ) : (
          <div>
            {ledger.map((entry) => (
              <LedgerRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
