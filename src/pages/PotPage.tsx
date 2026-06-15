import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Coins, TrendingUp, AlertTriangle, X, Flame } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../hooks/useGame';
import { useQualification } from '../hooks/useQualification';
import { formatCents } from '../lib/constants';
import { BUTTONS, ICONS, PROPS, BACKGROUNDS } from '../lib/assets';
import AssetIcon from '../components/ui/AssetIcon';
import ImageButton from '../components/ui/ImageButton';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useI18n } from '../context/I18nContext';

function ConfirmModal({
  potCents,
  streak,
  onConfirm,
  onCancel,
  loading,
}: {
  potCents: number;
  streak: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const { t } = useI18n();
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 380,
          background: 'linear-gradient(180deg, rgba(16,22,18,0.99) 0%, rgba(9,13,10,0.99) 100%)',
          border: '1px solid rgba(180,30,30,0.35)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.95)',
          padding: '28px 24px 24px',
          position: 'relative',
        }}
      >
        <button
          onClick={onCancel}
          style={{
            position: 'absolute', top: 12, right: 12,
            width: 30, height: 30,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
        </button>

        {/* Warning icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{
            width: 52, height: 52,
            background: 'rgba(180,30,30,0.12)',
            border: '1px solid rgba(180,30,30,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={24} style={{ color: '#CC4444' }} strokeWidth={1.5} />
          </div>
        </div>

        <h2 style={{
          fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
          fontSize: 20, letterSpacing: '0.06em',
          color: '#E8E0D4', textAlign: 'center',
          textShadow: '0 2px 8px rgba(0,0,0,0.9)',
          marginBottom: 12,
        }}>
          {t('pot.cashout_confirm_title')}
        </h2>

        {/* Amount */}
        <div style={{
          textAlign: 'center',
          padding: '14px',
          background: 'rgba(245,208,96,0.05)',
          border: '1px solid rgba(245,208,96,0.15)',
          marginBottom: 16,
        }}>
          <div style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: 32, fontWeight: 700,
            color: '#F5D060',
            textShadow: '0 0 16px rgba(245,208,96,0.4)',
          }}>
            €{formatCents(potCents)}
          </div>
          <div style={{
            fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em',
            color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', system-ui, sans-serif",
            marginTop: 4,
          }}>
            {t('pot.moves_to_wallet')}
          </div>
        </div>

        {/* Warning */}
        <div style={{
          padding: '12px 16px',
          background: 'rgba(180,30,30,0.07)',
          border: '1px solid rgba(180,30,30,0.2)',
          marginBottom: 22,
        }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <Flame size={14} style={{ color: '#CC4444', flexShrink: 0, marginTop: 2 }} strokeWidth={1.5} />
            <p style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: 13, lineHeight: 1.55,
              color: 'rgba(255,255,255,0.6)', margin: 0,
            }}>
              Your current streak of <strong style={{ color: '#E8C060' }}>{streak} {streak === 1 ? t('common.day') : t('common.days')}</strong> {t('pot.streak_reset_warning')}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ImageButton
            base={BUTTONS.cashout_default}
            hover={BUTTONS.cashout_hover}
            pressed={BUTTONS.cashout_pressed}
            onClick={onConfirm}
            disabled={loading}
            style={{ width: '100%', height: 60 }}
          >
            <span style={{
              fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
              fontSize: 20, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: '#F5D060',
              textShadow: '0 0 12px rgba(245,208,96,0.5), 0 2px 4px rgba(0,0,0,0.9)',
            }}>
              {loading ? t('pot.collecting') : t('pot.confirm_cashout')}
            </span>
          </ImageButton>

          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              cursor: loading ? 'default' : 'pointer',
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.4)',
              transition: 'border-color 0.15s ease, color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.25)';
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.65)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)';
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)';
            }}
          >
            {t('pot.keep_streak')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PotPage() {
  const navigate = useNavigate();
  const { playerState } = useAuth();
  const { cashout, cashingOut, error } = useGame();
  const { fetchQualification } = useQualification();
  const { t } = useI18n();
  const [showConfirm, setShowConfirm] = useState(false);
  const [cashoutDone, setCashoutDone] = useState(false);
  const [cashoutAmount, setCashoutAmount] = useState(0);

  const streak   = playerState?.game_state?.current_streak ?? 0;
  const potCents = playerState?.game_state?.pot_cents ?? 0;
  const hasPot   = potCents > 0;

  const handleCashout = async () => {
    const result = await cashout();
    if (result) {
      setCashoutAmount(result.cashout_amount_cents);
      setCashoutDone(true);
      setShowConfirm(false);
      await fetchQualification();
    }
  };

  if (cashoutDone) {
    return (
      <div style={{
        minHeight: '100dvh',
        backgroundImage: `linear-gradient(rgba(3,8,5,0.65), rgba(3,8,5,0.90)), url(${BACKGROUNDS.ritual_floor})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px', gap: 28, textAlign: 'center',
      }}>
        <AssetIcon
          src={PROPS.chest}
          fallback={Coins}
          size={80}
          style={{ filter: 'drop-shadow(0 0 24px rgba(245,208,96,0.6)) brightness(1.2)' }}
        />
        <div>
          <div style={{
            fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
            fontSize: 14, letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)', marginBottom: 8,
          }}>
            {t('pot.collected_label')}
          </div>
          <div style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: 44, fontWeight: 700,
            color: '#F5D060',
            textShadow: '0 0 24px rgba(245,208,96,0.5), 0 2px 8px rgba(0,0,0,0.9)',
            lineHeight: 1,
          }}>
            €{formatCents(cashoutAmount)}
          </div>
          <div style={{
            fontSize: 13, color: 'rgba(255,255,255,0.5)',
            fontFamily: "'Lora', Georgia, serif", marginTop: 10, lineHeight: 1.6,
          }}>
            {t('pot.collected_desc')}
          </div>
        </div>
        <ImageButton
          base={BUTTONS.return_default}
          hover={BUTTONS.return_hover}
          pressed={BUTTONS.return_pressed}
          onClick={() => navigate('/')}
          style={{ width: '100%', maxWidth: 320, height: 60 }}
        >
          <span style={{
            fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
            fontSize: 22, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: '#F5D060', textShadow: '0 0 12px rgba(245,208,96,0.5), 0 2px 4px rgba(0,0,0,0.9)',
          }}>
            {t('pot.back_to_home')}
          </span>
        </ImageButton>
      </div>
    );
  }

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
          } as React.CSSProperties}
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

        {/* Error */}
        {error && (
          <div style={{
            padding: '12px 16px',
            border: '1px solid rgba(180,30,30,0.3)', background: 'rgba(60,0,0,0.3)',
            fontSize: 13, color: '#CC4444',
            fontFamily: "'Lora', Georgia, serif", textAlign: 'center', lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}

        {/* Cashout CTA */}
        {hasPot ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ImageButton
              base={BUTTONS.cashout_default}
              hover={BUTTONS.cashout_hover}
              pressed={BUTTONS.cashout_pressed}
              onClick={() => setShowConfirm(true)}
              disabled={cashingOut}
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
            onClick={() => navigate('/')}
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

      {showConfirm && (
        <ConfirmModal
          potCents={potCents}
          streak={streak}
          onConfirm={handleCashout}
          onCancel={() => setShowConfirm(false)}
          loading={cashingOut}
        />
      )}
    </div>
  );
}
