import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, Wallet, X, ChevronRight } from 'lucide-react';
import { formatCents } from '../../lib/constants';
import { useI18n } from '../../context/I18nContext';
import type { StakeTier } from '../../lib/types';
import { BUTTONS, ICONS } from '../../lib/assets';
import ImageButton from '../ui/ImageButton';
import AssetIcon from '../ui/AssetIcon';

interface StakeModalProps {
  tiers:         StakeTier[];
  walletBalance: number;
  streak:        number;
  onConfirm:     (tier: number) => void;
  onClose:       () => void;
}

const FF = "'Metal Mania', 'Cinzel', Georgia, serif";
const BF = "'Lora', Georgia, serif";
const UF = "'Inter', system-ui, sans-serif";

export default function StakeModal({ tiers, walletBalance, streak, onConfirm, onClose }: StakeModalProps) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<number | null>(() => {
    // Pre-select the highest affordable unlocked tier
    const affordable = tiers.filter(
      (t) => t.unlocked && walletBalance >= t.stake_cents,
    );
    return affordable.length > 0 ? affordable[affordable.length - 1].tier : null;
  });

  const handleSelect = (tier: StakeTier) => {
    if (!tier.unlocked || walletBalance < tier.stake_cents) return;
    setSelected(tier.tier);
  };

  const handleConfirm = () => {
    if (selected === null) return;
    onConfirm(selected);
  };

  const selectedTier   = tiers.find((t) => t.tier === selected);
  const hasNoAffordable = tiers
    .filter((t) => t.unlocked)
    .every((t) => walletBalance < t.stake_cents);

  return createPortal(
    <div
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         200,
        background:     'rgba(0,0,0,0.88)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:         16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width:      '100%',
          maxWidth:    400,
          background: 'linear-gradient(180deg, rgba(16,22,18,0.99) 0%, rgba(9,13,10,0.99) 100%)',
          border:     '1px solid rgba(255,122,0,0.18)',
          position:   'relative',
          boxShadow:  '0 20px 60px rgba(0,0,0,0.9)',
          padding:    '24px 20px 22px',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position:       'absolute',
            top:             12,
            right:           12,
            width:           32,
            height:          32,
            background:     'rgba(255,255,255,0.05)',
            border:         '1px solid rgba(255,255,255,0.10)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            cursor:         'pointer',
          }}
        >
          <AssetIcon src={ICONS.close} fallback={X} size={15} style={{ opacity: 0.7 }} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <h2 style={{
            fontFamily: FF, fontSize: 22, letterSpacing: '0.08em',
            color: '#F5D060',
            textShadow: '0 0 16px rgba(245,208,96,0.35), 0 2px 4px rgba(0,0,0,0.8)',
            margin: '0 0 6px',
          }}>
          {t('stake.title')}
          </h2>
          <p style={{
            fontFamily: BF, fontSize: 13, color: 'rgba(255,255,255,0.45)',
            lineHeight: 1.5, margin: 0,
          }}>
            {t('stake.subtitle')}
          </p>
        </div>

        {/* Balance */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '10px 14px',
          background:     'rgba(255,255,255,0.03)',
          border:         '1px solid rgba(255,255,255,0.07)',
          marginBottom:    16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Wallet size={14} strokeWidth={1.4} style={{ color: 'rgba(255,255,255,0.35)' }} />
            <span style={{ fontFamily: UF, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
              {t('stake.wallet_balance')}
            </span>
          </div>
          <span style={{
            fontFamily: BF, fontSize: 18, fontWeight: 700,
            color: hasNoAffordable ? '#CC4444' : '#D8D0C5',
          }}>
            €{formatCents(walletBalance)}
          </span>
        </div>

        {/* Low balance warning */}
        {hasNoAffordable && (
          <div style={{
            padding: '10px 14px', marginBottom: 14,
            background: 'rgba(180,30,30,0.07)',
            border: '1px solid rgba(180,30,30,0.25)',
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <span style={{ color: '#CC4444', fontSize: 14, flexShrink: 0, lineHeight: 1.4 }}>!</span>
            <p style={{ fontFamily: BF, fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, margin: 0 }}>
              {t('stake.low_balance')}
            </p>
          </div>
        )}

        {/* Tiers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {tiers.map((tier) => {
            const locked     = !tier.unlocked;
            const cantAfford = !locked && walletBalance < tier.stake_cents;
            const isSelected = selected === tier.tier;
            const disabled   = locked || cantAfford;

            let lockReason = '';
            if (locked)     lockReason = t('stake.reach_streak', { streak: String(tier.unlock_streak) });
            if (cantAfford) lockReason = t('stake.need_more', { amount: `€${formatCents(tier.stake_cents - walletBalance)}` });

            return (
              <button
                key={tier.tier}
                onClick={() => handleSelect(tier)}
                disabled={disabled}
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'space-between',
                  padding:        '13px 16px',
                  background:     isSelected
                    ? 'rgba(90,64,18,0.5)'
                    : disabled
                    ? 'rgba(12,16,13,0.4)'
                    : 'rgba(22,30,18,0.65)',
                  border: `1px solid ${
                    isSelected  ? 'rgba(212,160,32,0.7)'
                    : cantAfford ? 'rgba(180,30,30,0.3)'
                    : locked    ? 'rgba(50,65,52,0.25)'
                    :              'rgba(100,80,30,0.3)'
                  }`,
                  boxShadow:  isSelected ? '0 0 14px rgba(212,160,32,0.12)' : undefined,
                  cursor:     disabled ? 'not-allowed' : 'pointer',
                  opacity:    locked ? 0.45 : 1,
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Left: radio + amount */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {locked ? (
                    <Lock size={14} strokeWidth={1.5} style={{ color: '#3E3930', flexShrink: 0 }} />
                  ) : (
                    <div style={{
                      width:        16,
                      height:       16,
                      borderRadius: '50%',
                      border:       `2px solid ${isSelected ? '#D4A020' : 'rgba(100,80,30,0.45)'}`,
                      background:   isSelected ? '#D4A020' : 'transparent',
                      flexShrink:   0,
                      transition:   'all 0.15s ease',
                    }} />
                  )}
                  <div>
                    <span style={{
                      fontFamily: BF,
                      fontSize:   16,
                      fontWeight: 700,
                      color:      locked ? '#3E3930' : cantAfford ? '#8A7060' : isSelected ? '#F5D060' : '#D8D0C5',
                      transition: 'color 0.15s ease',
                      display:    'block',
                      lineHeight: 1.1,
                    }}>
                      €{formatCents(tier.stake_cents)}
                    </span>
                    {lockReason && (
                      <span style={{
                        fontFamily: UF, fontSize: 10,
                        color:      cantAfford ? '#CC4444' : 'rgba(255,255,255,0.3)',
                        marginTop:  2,
                        display:    'block',
                        letterSpacing: '0.04em',
                      }}>
                        {lockReason}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: status or streak requirement */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {locked ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontFamily: UF, fontSize: 10, color: '#3E3930', letterSpacing: '0.08em' }}>
                        {t('stake.day_req', { streak: String(tier.unlock_streak) })}
                      </span>
                    </div>
                  ) : cantAfford ? (
                    <span style={{ fontFamily: UF, fontSize: 11, color: '#CC4444' }}>
                      {t('stake.insufficient')}
                    </span>
                  ) : isSelected ? (
                    <ChevronRight size={16} style={{ color: '#D4A020' }} />
                  ) : (
                    <span style={{ fontFamily: UF, fontSize: 11, color: '#5A7850' }}>
                      {t('stake.available')}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Unlock hint */}
        {tiers.some((t) => !t.unlocked) && streak > 0 && (
          <div style={{
            padding: '8px 12px', marginBottom: 16,
            background: 'rgba(255,122,0,0.04)',
            border: '1px solid rgba(255,122,0,0.08)',
          }}>
            <p style={{
              fontFamily: UF, fontSize: 11,
              color: 'rgba(255,255,255,0.35)',
              margin: 0, lineHeight: 1.5, letterSpacing: '0.04em',
            }}>
              {t('stake.your_streak', { streak: String(streak), unit: t(streak === 1 ? 'common.day' : 'common.days') })}{' '}
              {(() => {
                const next = tiers.find((tier) => !tier.unlocked && tier.unlock_streak > streak);
                const diff = next ? next.unlock_streak - streak : 0;
                return next
                  ? t('stake.days_to_unlock', { days: String(diff), unit: t(diff === 1 ? 'common.day' : 'common.days'), amount: `€${formatCents(next.stake_cents)}` })
                  : t('stake.all_unlocked');
              })()}
            </p>
          </div>
        )}

        <div style={{ height: 1, background: 'rgba(255,122,0,0.08)', marginBottom: 16 }} />

        {/* CTA */}
        <ImageButton
          onClick={handleConfirm}
          disabled={selected === null}
          variant="carved-orange"
          base={BUTTONS.enter_default}
          hover={BUTTONS.enter_hover}
          pressed={BUTTONS.enter_pressed}
          style={{ width: '100%' }}
        >
          <span style={{
            fontFamily: FF, fontSize: 22, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: '#F5D060',
            textShadow: '0 0 12px rgba(245,208,96,0.45), 0 2px 4px rgba(0,0,0,0.9)',
          }}>
            {selected !== null
              ? t('stake.confirm', { amount: formatCents(selectedTier?.stake_cents ?? 0) })
              : t('stake.choose')}
          </span>
        </ImageButton>
      </div>
    </div>,
    document.body
  );
}
