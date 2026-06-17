import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCents } from '../../lib/constants';
import { useI18n } from '../../context/I18nContext';
import type { PlayResult, BadgeKey } from '../../lib/types';
import { PROPS, BUTTONS, ICONS } from '../../lib/assets';
import EmberParticles from '../fx/EmberParticles';
import ImageButton from '../ui/ImageButton';
import AssetIcon from '../ui/AssetIcon';
import { getBadgeDef, type BadgeDef } from '../../lib/badges';
import {
  getMilestoneInfo,
  surviveSubtitle,
  dieSubtitle,
  nextGateCopy,
  dieTomorrowCopy,
  msUntilMidnight,
  formatCountdown,
  MILESTONES,
} from '../../lib/gateUtils';

interface ResultModalProps {
  result:      PlayResult;
  onClose:     () => void;
  potCents?:   number;  // current pot from playerState (post-result)
  onCashout?:  () => void;
  cashingOut?: boolean;
}

const FF = "'Metal Mania', 'Cinzel', Georgia, serif";   // fantasy
const BF = "'Lora', Georgia, serif";                    // body
const UF = "'Inter', system-ui, sans-serif";            // ui

// ── Countdown hook ────────────────────────────────────────────────────────────
function useCountdown() {
  const [ms, setMs] = useState(msUntilMidnight);
  useEffect(() => {
    const id = setInterval(() => setMs(msUntilMidnight()), 1000);
    return () => clearInterval(id);
  }, []);
  return ms;
}

export default function ResultModal({
  result,
  onClose,
  potCents,
  onCashout,
  cashingOut = false,
}: ResultModalProps) {
  const navigate    = useNavigate();
  const { t }       = useI18n();
  const [phase, setPhase]           = useState<'enter' | 'visible' | 'exit'>('enter');
  const [displayPot, setDisplayPot] = useState(0);
  const survived    = result.outcome === 'SURVIVE';
  const animRef     = useRef<number>(0);
  const countdown   = useCountdown();

  const milestone   = getMilestoneInfo(result.streak);
  const subtitle    = survived ? surviveSubtitle(result.streak) : dieSubtitle(result.streak);
  const gateCopy    = survived ? nextGateCopy(result.streak) : null;
  // The pot to display — use passed-in current pot when surviving, animate down on die
  const potTarget   = survived ? (potCents ?? result.pot_cents) : result.pot_cents;

  useEffect(() => {
    requestAnimationFrame(() => setPhase('visible'));
  }, []);

  // Animated pot counter
  useEffect(() => {
    if (phase !== 'visible') return;
    const duration  = survived ? 1000 : 700;
    const startVal  = survived ? 0 : potTarget;
    const endVal    = survived ? potTarget : 0;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      setDisplayPot(Math.round(startVal + (endVal - startVal) * eased));
      if (progress < 1) animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, potTarget, survived]);

  const handleClose = useCallback(() => {
    setPhase('exit');
    setTimeout(onClose, 400);
  }, [onClose]);

  const handleViewStreak = useCallback(() => {
    handleClose();
    setTimeout(() => navigate('/leaderboard'), 420);
  }, [handleClose, navigate]);

  const overlayOpacity   = phase === 'visible' ? 'opacity-100' : 'opacity-0';
  const contentTransform = phase === 'visible' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6';

  // ── Milestone progress bar ────────────────────────────────────────────────
  const prevMilestone = MILESTONES.filter((m) => m <= result.streak).pop() ?? 0;
  const nextMil       = milestone.target;
  const barProgress   = nextMil > prevMilestone
    ? Math.min((result.streak - prevMilestone) / (nextMil - prevMilestone), 1)
    : 1;

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] transition-opacity duration-500 ${overlayOpacity}`}
      onClick={handleClose}
    >
      {/* Bg layers */}
      <div className={`ritual-bg ${survived ? 'ritual-bg--survive' : 'ritual-bg--die'}`} />
      {/* Dark base scrim — ensures readability regardless of bg image */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: survived ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.70)', pointerEvents: 'none' }} />
      <div className="ritual-vignette" />
      {survived && <div className="ritual-torch-bloom" style={{ opacity: 0.5 }} />}
      <EmberParticles />

      {/* Close */}
      <button
        onClick={handleClose}
        style={{
          position: 'fixed',
          top:      'max(env(safe-area-inset-top, 0px), 16px)',
          right:    16,
          zIndex:   30,
          width:    38, height: 38,
          background:    'rgba(0,0,0,0.55)',
          border:        '1px solid rgba(255,255,255,0.12)',
          display:       'flex', alignItems: 'center', justifyContent: 'center',
          cursor:        'pointer',
          backdropFilter: 'blur(4px)',
        }}
      >
        <AssetIcon src={ICONS.close} fallback={X} size={18} style={{ opacity: 0.7 }} />
      </button>

      {/* Scrollable content */}
      <div
        className="relative z-20 flex min-h-screen min-h-[100dvh] flex-col items-center justify-center px-6"
        style={{ paddingTop: 56, paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 28px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex flex-col items-center text-center transition-all duration-700 ${contentTransform}`}
          style={{ width: '100%', maxWidth: 360 }}
        >
          {survived ? <SurviveContent /> : <DieContent />}
        </div>
      </div>
    </div>,
    document.body
  );

  // ── SURVIVE ──────────────────────────────────────────────────────────────────
  function SurviveContent() {
    return (
      <>
        {/* Skull */}
        <img
          src={PROPS.skull_won}
          alt=""
          style={{
            width: 84, height: 84, objectFit: 'contain',
            filter: 'drop-shadow(0 0 22px rgba(255,180,40,0.55))',
            marginBottom: 12,
          }}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.src = PROPS.skull_main;
            img.onerror = () => { img.style.display = 'none'; };
          }}
        />

        {/* Day badge */}
        <div style={{
          fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em',
          color: '#FF9A30', fontFamily: UF,
          textShadow: '0 0 8px rgba(255,154,48,0.45)',
          marginBottom: 4,
        }}>
          Day {result.streak} {t('result.survived.day_badge')}
        </div>

        {/* Headline */}
        <h2 style={{
          fontFamily: FF, fontSize: 34, fontWeight: 700, letterSpacing: '0.07em',
          color: '#F5D060',
          textShadow: '0 0 28px rgba(255,180,40,0.4), 0 2px 8px rgba(0,0,0,0.8)',
          margin: '0 0 6px',
        }}>
          {t('result.survived.headline')}
        </h2>
        <p style={{
          fontFamily: BF, fontSize: 13, lineHeight: 1.6,
          color: 'rgba(255,255,255,0.55)',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          marginBottom: 16, maxWidth: 280,
        }}>
          {subtitle}
        </p>

        {/* Milestone hit badge */}
        {result.milestone_hit && (
          <div style={{
            padding: '10px 18px', marginBottom: 14, width: '100%',
            border: '1px solid rgba(100,180,80,0.45)',
            background: 'rgba(30,60,24,0.75)',
            boxShadow: '0 0 18px rgba(80,160,60,0.12) inset',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <div style={{
              fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.24em',
              color: 'rgba(120,200,90,0.75)', fontFamily: UF,
            }}>
              {t('result.milestone_reached')}
            </div>
            <div style={{
              fontFamily: FF, fontSize: 18, letterSpacing: '0.1em',
              color: '#A8E070',
              textShadow: '0 0 12px rgba(100,200,70,0.45), 0 1px 4px rgba(0,0,0,0.9)',
            }}>
              Day {result.milestone_hit} {t('result.milestone_conquered')}
            </div>
          </div>
        )}

        {/* Badges earned */}
        {result.badges_earned && result.badges_earned.length > 0 && (
          <BadgesEarned keys={result.badges_earned} />
        )}

        {/* Stats: Streak | Pot */}
        <div style={{
          display: 'flex', alignItems: 'stretch',
          width: '100%', marginBottom: 14,
          border: '1px solid rgba(245,208,96,0.18)',
          background: 'rgba(0,0,0,0.35)',
        }}>
          <StatCell
            value={String(result.streak)}
            label="Streak"
            highlight
            valueFont={BF}
            valueFontSize={24}
          />
          <div style={{ width: 1, background: 'rgba(245,208,96,0.12)' }} />
          <StatCell
            value={`€${formatCents(displayPot)}`}
            label="Pot"
            highlight
            valueFont={BF}
            valueFontSize={24}
          />
        </div>

        {/* Milestone progress bar */}
        <MilestoneBar streak={result.streak} progress={barProgress} nextMil={nextMil} survived />

        {/* Next-gate teaser */}
        {gateCopy && (
          <div style={{
            padding: '12px 14px', marginBottom: 14, width: '100%',
            border: '1px solid rgba(255,154,48,0.15)',
            background: 'rgba(255,122,0,0.04)',
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <span style={{ fontSize: 14, color: '#FF9A30', flexShrink: 0, lineHeight: 1.4 }}>›</span>
            <p style={{
              fontFamily: BF, fontSize: 12, lineHeight: 1.65,
              color: 'rgba(255,255,255,0.55)',
              margin: 0,
              textShadow: '0 1px 4px rgba(0,0,0,0.7)',
            }}>
              {gateCopy}
            </p>
          </div>
        )}

        {/* Countdown */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          marginBottom: 20, width: '100%',
          padding: '10px 14px',
          border: '1px solid rgba(255,122,0,0.12)',
          background: 'rgba(255,122,0,0.04)',
        }}>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.35)', fontFamily: UF }}>
            {t('result.next_gate')}
          </span>
          <span style={{
            fontFamily: FF, fontSize: 18, letterSpacing: '0.12em',
            color: '#FF9A30',
            textShadow: '0 0 10px rgba(255,154,48,0.4)',
          }}>
            {formatCountdown(countdown)}
          </span>
        </div>

        {/* Primary CTA */}
        <ImageButton
          onClick={handleClose}
          base={BUTTONS.return_default}
          hover={BUTTONS.return_hover}
          pressed={BUTTONS.return_pressed}
          style={{ width: '100%', marginBottom: 10 }}
        >
          <span style={{
            fontFamily: FF, fontSize: 22, letterSpacing: '0.07em',
            textTransform: 'uppercase', color: '#F5D060',
            textShadow: '0 0 12px rgba(245,208,96,0.5), 0 2px 4px rgba(0,0,0,0.9)',
          }}>
            {t('result.survived.cta')}
          </span>
        </ImageButton>

        {/* Secondary: View Streak Path */}
        <button
          onClick={handleViewStreak}
          style={{
            width: '100%', padding: '11px 16px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent',
            fontFamily: UF, fontSize: 12, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.14em',
            color: 'rgba(255,255,255,0.45)',
            cursor: 'pointer',
            transition: 'color 0.15s ease, border-color 0.15s ease',
            marginBottom: onCashout && (potCents ?? 0) > 0 ? 10 : 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)';
          }}
        >
          {t('result.view_streak_path')}
        </button>

        {onCashout && (potCents ?? 0) > 0 && (
          <button
            onClick={cashingOut ? undefined : onCashout}
            disabled={cashingOut}
            style={{
              width: '100%', padding: '9px 16px',
              border: 'none', background: 'transparent',
              fontFamily: UF, fontSize: 11, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.12em',
              color: cashingOut ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.3)',
              cursor: cashingOut ? 'default' : 'pointer',
              transition: 'color 0.15s ease',
              textDecoration: 'underline',
              textDecorationColor: 'rgba(255,255,255,0.12)',
            }}
            onMouseEnter={(e) => {
              if (!cashingOut) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.55)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)';
            }}
          >
            {cashingOut ? t('result.survived.cashing_out') : t('result.survived.cashout', { amount: formatCents(potCents ?? 0) })}
          </button>
        )}
      </>
    );
  }

  // ── DIE ───────────────────────────────────────────────────────────────────────
  function DieContent() {
    return (
      <>
        {/* Skull */}
        <img
          src={PROPS.skull_lost}
          alt=""
          style={{
            width: 84, height: 84, objectFit: 'contain',
            filter: 'drop-shadow(0 0 18px rgba(122,15,15,0.55)) saturate(0.45)',
            marginBottom: 12,
          }}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.src = PROPS.skull_main;
            img.onerror = () => { img.style.display = 'none'; };
          }}
        />

        {/* Streak label */}
        <div style={{
          fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em',
          color: '#993333', fontFamily: UF, marginBottom: 4,
        }}>
          {result.streak > 0 ? t('result.died.streak_ended', { streak: String(result.streak) }) : t('result.died.no_streak')}
        </div>

        {/* Headline */}
        <h2 style={{
          fontFamily: FF, fontSize: 34, fontWeight: 700, letterSpacing: '0.07em',
          color: '#CC3333',
          textShadow: '0 0 28px rgba(122,15,15,0.5), 0 2px 8px rgba(0,0,0,0.8)',
          margin: '0 0 6px',
        }}>
          {t('result.died.headline')}
        </h2>
        <p style={{
          fontFamily: BF, fontSize: 13, lineHeight: 1.6,
          color: 'rgba(255,255,255,0.45)',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          marginBottom: 20, maxWidth: 280,
        }}>
          {subtitle}
        </p>

        {/* Stats */}
        <div style={{
          display: 'flex', alignItems: 'stretch',
          width: '100%', marginBottom: 16,
          border: '1px solid rgba(180,30,30,0.2)',
          background: 'rgba(0,0,0,0.35)',
        }}>
          <StatCell
            value={String(result.streak)}
            label="Final Streak"
            died
          />
          <div style={{ width: 1, background: 'rgba(180,30,30,0.15)' }} />
          <StatCell
            value={`€${formatCents(displayPot)}`}
            label="Pot Lost"
            died
            valueFont={BF}
            valueFontSize={24}
          />
        </div>

        {/* Tomorrow nudge */}
        <div style={{
          padding: '12px 14px', marginBottom: 14, width: '100%',
          border: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(0,0,0,0.22)',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <p style={{
            fontFamily: BF, fontSize: 13, lineHeight: 1.6,
            color: 'rgba(255,255,255,0.45)', margin: 0,
            textShadow: '0 1px 4px rgba(0,0,0,0.7)',
          }}>
            {dieTomorrowCopy()}
          </p>
          <p style={{
            fontFamily: BF, fontSize: 12, lineHeight: 1.5,
            color: 'rgba(255,255,255,0.3)', margin: 0,
          }}>
            {t('result.died.games_nudge')}
          </p>
        </div>

        {/* Countdown */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          marginBottom: 20, width: '100%',
          padding: '10px 14px',
          border: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(0,0,0,0.2)',
        }}>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.28)', fontFamily: UF }}>
            {t('result.next_gate')}
          </span>
          <span style={{
            fontFamily: FF, fontSize: 18, letterSpacing: '0.12em',
            color: 'rgba(255,255,255,0.5)',
          }}>
            {formatCountdown(countdown)}
          </span>
        </div>

        {/* CTA */}
        <ImageButton
          onClick={handleClose}
          base={BUTTONS.return_default}
          hover={BUTTONS.return_hover}
          pressed={BUTTONS.return_pressed}
          style={{ width: '100%' }}
        >
          <span style={{
            fontFamily: FF, fontSize: 22, letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.8)',
            textShadow: '0 2px 4px rgba(0,0,0,0.9)',
          }}>
            {t('result.died.cta')}
          </span>
        </ImageButton>
      </>
    );
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface StatCellProps {
  value:         string;
  label:         string;
  highlight?:    boolean;
  died?:         boolean;
  valueFont?:    string;
  valueFontSize?: number;
}

function StatCell({ value, label, highlight, died, valueFont, valueFontSize }: StatCellProps) {
  const FF = "'Metal Mania', 'Cinzel', Georgia, serif";
  const UF = "'Inter', system-ui, sans-serif";
  const color = highlight ? '#F5D060' : died ? '#CC3333' : '#D8D0C5';
  const shadow = highlight
    ? '0 0 16px rgba(245,208,96,0.45), 0 2px 4px rgba(0,0,0,0.8)'
    : died
    ? '0 0 12px rgba(180,30,30,0.4), 0 2px 4px rgba(0,0,0,0.8)'
    : '0 2px 4px rgba(0,0,0,0.8)';

  return (
    <div style={{ flex: 1, padding: '14px 10px', textAlign: 'center' }}>
      <div style={{
        fontFamily:  valueFont ?? FF,
        fontSize:    valueFontSize ?? 32,
        fontWeight:  700,
        lineHeight:  1,
        color,
        textShadow:  shadow,
      }}>
        {value}
      </div>
      <div style={{
        fontSize:      10,
        textTransform: 'uppercase',
        letterSpacing: '0.2em',
        color:         'rgba(255,255,255,0.38)',
        marginTop:     6,
        fontFamily:    UF,
      }}>
        {label}
      </div>
    </div>
  );
}

// ── Badges Earned ─────────────────────────────────────────────────────────────

interface BadgesEarnedProps {
  keys: BadgeKey[];
}

function BadgesEarned({ keys }: BadgesEarnedProps) {
  const UF = "'Inter', system-ui, sans-serif";
  const FF = "'Metal Mania', 'Cinzel', Georgia, serif";
  const defs = keys.map(getBadgeDef).filter(Boolean) as BadgeDef[];
  if (defs.length === 0) return null;

  return (
    <div style={{
      width: '100%', marginBottom: 14,
      padding: '14px 16px',
      border: '1px solid rgba(245,208,96,0.35)',
      background: 'rgba(245,208,96,0.05)',
    }}>
      {/* Header */}
      <div style={{
        fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.22em',
        color: '#F5D060', fontFamily: UF,
        textShadow: '0 0 8px rgba(245,208,96,0.5)',
        marginBottom: 12,
      }}>
        Badge{defs.length > 1 ? 's' : ''} Earned
      </div>

      {/* Badge rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {defs.map((def) => (
          <div key={def.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Badge image */}
            <div style={{
              width: 52, height: 52, flexShrink: 0,
              border: '1px solid rgba(245,208,96,0.3)',
              background: 'rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <img
                src={def.asset}
                alt={def.name}
                style={{
                  width: 44, height: 44, objectFit: 'contain',
                  filter: 'drop-shadow(0 0 6px rgba(245,208,96,0.55))',
                }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            {/* Text */}
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{
                fontFamily: FF, fontSize: 15, letterSpacing: '0.06em',
                color: '#F5D060',
                textShadow: '0 0 10px rgba(245,208,96,0.4)',
                lineHeight: 1.2,
              }}>
                {def.name}
              </div>
              <div style={{
                fontFamily: UF, fontSize: 11, lineHeight: 1.5,
                color: 'rgba(255,255,255,0.45)',
                marginTop: 3,
              }}>
                {def.lore}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface MilestoneBarProps {
  streak:   number;
  progress: number;
  nextMil:  number;
  survived: boolean;
}

function MilestoneBar({ streak, progress, nextMil, survived }: MilestoneBarProps) {
  const UF = "'Inter', system-ui, sans-serif";
  const FF = "'Metal Mania', 'Cinzel', Georgia, serif";
  const justHit = MILESTONES.includes(streak as (typeof MILESTONES)[number]) && streak > 0;
  const daysLeft = nextMil - streak;

  return (
    <div style={{
      width: '100%', marginBottom: 14, padding: '10px 14px',
      background: justHit ? 'rgba(24,48,20,0.55)' : 'rgba(0,0,0,0.25)',
      border: `1px solid ${justHit ? 'rgba(80,160,60,0.3)' : 'rgba(245,208,96,0.10)'}`,
    }}>
      {/* Label row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{
          fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em',
          color: justHit ? 'rgba(120,200,90,0.75)' : 'rgba(255,255,255,0.35)',
          fontFamily: UF,
        }}>
          {justHit ? 'Streak Milestone' : `Next Milestone · Day ${nextMil}`}
        </span>
        {!justHit && (
          <span style={{ fontSize: 11, fontFamily: FF, color: survived ? '#D4A020' : 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>
            {daysLeft} {daysLeft === 1 ? 'day' : 'days'} away
          </span>
        )}
      </div>

      {/* Bar track */}
      <div style={{
        height: 4, width: '100%',
        background: 'rgba(255,255,255,0.08)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div
          className="animate-bar-fill"
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${Math.round(progress * 100)}%`,
            background: justHit
              ? 'linear-gradient(90deg, rgba(60,140,40,0.7) 0%, rgba(100,200,70,0.9) 100%)'
              : survived
              ? 'linear-gradient(90deg, rgba(212,160,32,0.6) 0%, rgba(245,208,96,0.9) 100%)'
              : 'rgba(255,255,255,0.2)',
          }}
        />
      </div>
    </div>
  );
}
