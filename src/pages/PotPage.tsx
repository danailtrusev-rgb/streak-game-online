import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Coins, TrendingUp, Flame } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useQualification } from '../hooks/useQualification';
import { formatCents } from '../lib/constants';
import { BUTTONS, ICONS, PROPS } from '../lib/assets';
import AssetIcon from '../components/ui/AssetIcon';
import ImageButton from '../components/ui/ImageButton';
import { useI18n } from '../context/I18nContext';
import CashoutFlow from '../components/game/CashoutFlow';

// This page and the survive-result screen share the exact same cashout
// implementation (CashoutFlow) — no separate confirm/processing/success
// logic lives here anymore. See PROJECT_CHANGELOG.md "Cashout Experience
// — Phase 2" for why.
export default function PotPage() {
  const navigate = useNavigate();
  const { playerState } = useAuth();
  const { fetchQualification } = useQualification();
  const { t } = useI18n();
  const [showCashoutFlow, setShowCashoutFlow] = useState(false);

  const streak      = playerState?.game_state?.current_streak ?? 0;
  const potCents    = playerState?.game_state?.pot_cents ?? 0;
  const playedToday = playerState?.played_today ?? false;
  const contextId   = playerState?.game_state?.updated_at ?? '';
  const hasPot      = potCents > 0 && !!contextId;

  return (
    <div className="pg-transition pg-transition--fade-in" style={{
      minHeight: '100dvh',
      position: 'relative',
    }}>
      <div style={{
        maxWidth: 480, margin: '0 auto',
        padding: 'max(env(safe-area-inset-top, 16px), 16px) 20px max(env(safe-area-inset-bottom, 20px), 20px)',
        display: 'flex', flexDirection: 'column', gap: 20,
        minHeight: '100dvh',
        position: 'relative', zIndex: 3,
      }}>

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em',
            color: 'rgba(255,255,255,0.45)', background: 'none', border: 'none',
            cursor: 'pointer', padding: '6px 0',
            fontFamily: "'Inter', system-ui, sans-serif",
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <ChevronLeft size={14} />
          {t('common.back')}
        </button>

        {/* Page title */}
        <div style={{ paddingTop: 8, paddingBottom: 4 }}>
          <div style={{
            fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.26em',
            color: 'rgba(255,255,255,0.35)', fontFamily: "'Inter', system-ui, sans-serif",
            marginBottom: 10,
          }}>
            {t('common.pot')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, flexShrink: 0,
              background: hasPot ? 'rgba(245,208,96,0.07)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${hasPot ? 'rgba(245,208,96,0.22)' : 'rgba(40,55,42,0.35)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AssetIcon
                src={PROPS.chest}
                fallback={Coins}
                size={22}
                style={{ filter: hasPot ? 'drop-shadow(0 0 6px rgba(245,208,96,0.4))' : 'brightness(0.4) grayscale(0.6)' }}
              />
            </div>
            <div>
              <h1 style={{
                fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
                fontSize: 24, letterSpacing: '0.06em',
                background: hasPot
                  ? 'linear-gradient(180deg, #F5D060 0%, #D4A020 50%, #B08018 100%)'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.2) 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                margin: 0, lineHeight: 1.1,
              }}>
                {t('pot.your_pot')}
              </h1>
              <p style={{
                fontSize: 12, color: 'rgba(255,255,255,0.45)',
                fontFamily: "'Lora', Georgia, serif", lineHeight: 1.5, margin: '4px 0 0',
              }}>
                {hasPot ? t('pot.grows_desc') : t('pot.empty_desc')}
              </p>
            </div>
          </div>
        </div>

        {/* Current pot amount */}
        <div style={{
          padding: '22px 20px',
          background: 'rgba(11,15,12,0.8)',
          border: `1px solid ${hasPot ? 'rgba(245,208,96,0.22)' : 'rgba(40,55,42,0.35)'}`,
          textAlign: 'center',
          boxShadow: hasPot ? '0 0 30px rgba(245,208,96,0.06) inset' : 'none',
        }}>
          <div style={{
            fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em',
            color: 'rgba(255,255,255,0.35)', fontFamily: "'Inter', system-ui, sans-serif",
            marginBottom: 8,
          }}>
            {t('pot.current_pot')}
          </div>
          <div style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: hasPot ? 52 : 36, fontWeight: 700,
            color: hasPot ? '#F5D060' : 'rgba(255,255,255,0.2)',
            textShadow: hasPot ? '0 0 20px rgba(245,208,96,0.35), 0 2px 6px rgba(0,0,0,0.9)' : 'none',
            lineHeight: 1,
            transition: 'all 0.3s ease',
          }}>
            {hasPot ? `€${formatCents(potCents)}` : '€0.00'}
          </div>
          {streak > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              marginTop: 12,
            }}>
              <AssetIcon src={ICONS.flame} fallback={Flame} size={13} style={{ opacity: 0.6 }} />
              <span style={{
                fontSize: 12, color: 'rgba(255,255,255,0.45)',
                fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.1em',
              }}>
                {t('pot.streak_active', { streak: String(streak) })}
              </span>
            </div>
          )}
        </div>

        {/* How it works */}
        <div style={{
          background: 'rgba(11,15,12,0.7)',
          border: '1px solid rgba(40,55,42,0.4)',
          padding: '18px 20px',
        }}>
          <div style={{
            fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em',
            color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', system-ui, sans-serif",
            marginBottom: 14,
          }}>
            {t('pot.how_it_works')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              {
                icon: <TrendingUp size={16} strokeWidth={1.5} style={{ color: '#78B060', flexShrink: 0, marginTop: 1 }} />,
                title: t('pot.grows_title'),
                body: t('pot.grows_body'),
              },
              {
                icon: <AssetIcon src={ICONS.coin} fallback={Coins} size={16} style={{ opacity: 0.7, flexShrink: 0, marginTop: 1 }} />,
                title: t('pot.cashout_anytime_title'),
                body: t('pot.cashout_anytime_body'),
              },
              {
                icon: <Flame size={16} strokeWidth={1.5} style={{ color: '#CC4444', flexShrink: 0, marginTop: 1 }} />,
                title: t('pot.resets_title'),
                body: t('pot.resets_body'),
              },
            ].map(({ icon, title, body }) => (
              <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                {icon}
                <div>
                  <div style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: 13, fontWeight: 600,
                    color: 'rgba(255,255,255,0.75)',
                    marginBottom: 3,
                  }}>
                    {title}
                  </div>
                  <p style={{
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: 13, color: 'rgba(255,255,255,0.45)',
                    lineHeight: 1.55, margin: 0,
                  }}>
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Cashout CTA */}
        {hasPot ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ImageButton
              base={BUTTONS.cashout_default}
              hover={BUTTONS.cashout_hover}
              pressed={BUTTONS.cashout_pressed}
              onClick={() => setShowCashoutFlow(true)}
              style={{ width: '100%', height: 64 }}
            >
              <span style={{
                fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
                fontSize: 22, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: '#F5D060',
                textShadow: '0 0 14px rgba(245,208,96,0.5), 0 2px 4px rgba(0,0,0,0.9)',
              }}>
                {t('pot.cashout_cta', { amount: formatCents(potCents) })}
              </span>
            </ImageButton>
            <p style={{
              textAlign: 'center', fontSize: 11,
              color: 'rgba(255,255,255,0.28)', fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: '0.1em', margin: 0,
            }}>
              {t('pot.cashout_streak_warn')}
            </p>
          </div>
        ) : (
          <ImageButton
            base={BUTTONS.return_default}
            hover={BUTTONS.return_hover}
            pressed={BUTTONS.return_pressed}
            onClick={() => navigate('/play')}
            style={{ width: '100%', height: 60 }}
          >
            <span style={{
              fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
              fontSize: 22, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: '#F5D060', textShadow: '0 0 12px rgba(245,208,96,0.5), 0 2px 4px rgba(0,0,0,0.9)',
            }}>
              {t('pot.face_the_gate')}
            </span>
          </ImageButton>
        )}
      </div>

      {showCashoutFlow && (
        <CashoutFlow
          potCents={potCents}
          streak={streak}
          playedToday={playedToday}
          contextId={contextId}
          onClose={() => setShowCashoutFlow(false)}
          onSuccess={() => { fetchQualification(); }}
        />
      )}
    </div>
  );
}
