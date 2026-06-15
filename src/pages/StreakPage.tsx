import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Flame, Lock, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBadges } from '../hooks/useBadges';
import {
  MILESTONES,
  getMilestoneInfo,
  msUntilMidnight,
  formatCountdown,
} from '../lib/gateUtils';
import { STREAK_BADGES, PRESTIGE_BADGES } from '../lib/badges';
import type { BadgeDef } from '../lib/types';
import { ICONS } from '../lib/assets';
import AssetIcon from '../components/ui/AssetIcon';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useI18n } from '../context/I18nContext';

// ── Countdown hook ────────────────────────────────────────────────────────────
function useCountdown() {
  const [ms, setMs] = useState(msUntilMidnight);
  useEffect(() => {
    const id = setInterval(() => setMs(msUntilMidnight()), 1000);
    return () => clearInterval(id);
  }, []);
  return ms;
}

// ── Single badge card ─────────────────────────────────────────────────────────
function BadgeCard({
  def,
  unlocked,
  isNext,
  unlockedAt,
}: {
  def:         BadgeDef;
  unlocked:    boolean;
  isNext:      boolean;
  unlockedAt?: string | null;
}) {
  const { t } = useI18n();
  const dateStr = unlockedAt
    ? new Date(unlockedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px',
      background: unlocked
        ? 'rgba(18,26,20,0.9)'
        : isNext
        ? 'rgba(14,20,16,0.88)'
        : 'rgba(9,12,10,0.72)',
      border: `1px solid ${
        unlocked ? 'rgba(245,208,96,0.28)' :
        isNext   ? 'rgba(255,122,0,0.22)'  :
                   'rgba(30,45,36,0.3)'
      }`,
      position: 'relative', overflow: 'hidden',
      transition: 'all 0.2s ease',
    }}>
      {/* Soft glow backdrop for unlocked */}
      {unlocked && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 28% 50%, rgba(245,208,96,0.05) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Badge image */}
      <div style={{
        width: 60, height: 60, flexShrink: 0, position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <img
          src={def.asset}
          alt={def.name}
          style={{
            width: '100%', height: '100%', objectFit: 'contain',
            filter: unlocked
              ? 'drop-shadow(0 0 12px rgba(245,208,96,0.5)) brightness(1.1)'
              : isNext
              ? 'brightness(0.38) saturate(0.25)'
              : 'brightness(0.2) saturate(0)',
            transition: 'filter 0.35s ease',
          }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        {!unlocked && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Lock
              size={isNext ? 15 : 12}
              strokeWidth={1.5}
              style={{ color: isNext ? 'rgba(255,122,0,0.55)' : 'rgba(255,255,255,0.15)' }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
            fontSize: 16, lineHeight: 1,
            color: unlocked ? '#F5D060' : isNext ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.2)',
            transition: 'color 0.3s ease',
          }}>
            {def.name}
          </span>

          {unlocked && (
            <span style={{
              fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.18em',
              color: '#78B060', fontFamily: "'Inter', system-ui, sans-serif",
              background: 'rgba(120,176,96,0.12)', border: '1px solid rgba(120,176,96,0.28)',
              padding: '2px 7px', flexShrink: 0,
            }}>
            {t('badge.earned')}
            </span>
          )}

          {isNext && !unlocked && (
            <span style={{
              fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.18em',
              color: 'rgba(255,122,0,0.75)', fontFamily: "'Inter', system-ui, sans-serif",
              background: 'rgba(255,122,0,0.08)', border: '1px solid rgba(255,122,0,0.22)',
              padding: '2px 7px', flexShrink: 0,
            }}>
            {t('badge.next')}
            </span>
          )}
        </div>

        {/* Day/cycle label */}
        <div style={{
          fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em',
          color: unlocked ? 'rgba(255,255,255,0.35)' : isNext ? 'rgba(255,122,0,0.5)' : 'rgba(255,255,255,0.15)',
          fontFamily: "'Inter', system-ui, sans-serif", marginBottom: 4,
        }}>
          {def.isPrestige ? t('badge.cycle_n', { n: String(def.milestone) }) : t('badge.day_n', { n: String(def.milestone) })}
        </div>

        <p style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: 12, lineHeight: 1.5, margin: 0,
          color: unlocked ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
          transition: 'color 0.3s ease',
        }}>
          {def.lore}
        </p>

        {unlocked && dateStr && (
          <div style={{
            fontSize: 10, color: 'rgba(255,255,255,0.28)',
            fontFamily: "'Inter', system-ui, sans-serif",
            marginTop: 5, letterSpacing: '0.08em',
          }}>
            {t('badge.earned_on', { date: dateStr })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StreakPage() {
  const navigate  = useNavigate();
  const { playerState } = useAuth();
  const { badges, loading: badgesLoading, fetchBadges, isUnlocked, getUnlockedAt } = useBadges();
  const countdown = useCountdown();
  const { t } = useI18n();

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  const streak    = playerState?.game_state?.current_streak ?? 0;
  const milestone = getMilestoneInfo(streak);
  const prevMilestone = (MILESTONES as readonly number[]).filter((m) => m <= streak).pop() ?? 0;
  const milestoneProgress = milestone.target > prevMilestone
    ? (streak - prevMilestone) / (milestone.target - prevMilestone)
    : 1;

  const completedCycles = playerState?.game_state?.completed_cycles ?? 0;

  // Next badge = first badge the player has NOT yet earned (skip already-unlocked ones)
  const nextStreak   = STREAK_BADGES.find((b) => !isUnlocked(b.key)) ?? null;
  const nextPrestige = PRESTIGE_BADGES.find((b) => !isUnlocked(b.key)) ?? null;

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

        {/* Hero */}
        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          {/* Page title */}
          <div style={{
            fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.26em',
            color: 'rgba(255,255,255,0.35)', fontFamily: "'Inter', system-ui, sans-serif",
            marginBottom: 16,
          }}>
            {t('streak.streak_and_badges')}
          </div>

          {/* Compact streak tile */}
          <div style={{
            display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
            padding: '18px 36px',
            background: 'rgba(11,15,12,0.85)',
            border: `1px solid ${streak > 0 ? 'rgba(245,208,96,0.22)' : 'rgba(40,55,42,0.4)'}`,
            boxShadow: streak > 0 ? '0 0 24px rgba(245,208,96,0.06) inset' : 'none',
            position: 'relative',
          }}>
            {streak > 0 && (
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'rgba(11,15,12,0.95)', padding: '2px 10px',
                border: '1px solid rgba(245,208,96,0.18)',
                marginTop: -10,
              }}>
                <AssetIcon src={ICONS.flame} fallback={Flame} size={10} style={{ opacity: 0.7 }} />
                <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,154,48,0.7)', fontFamily: "'Inter', system-ui, sans-serif" }}>
                  {t('streak.active')}
                </span>
              </div>
            )}

            <div style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: 64, fontWeight: 700,
              color: streak > 0 ? '#F5D060' : 'rgba(255,255,255,0.2)',
              textShadow: streak > 0 ? '0 0 30px rgba(245,208,96,0.4), 0 2px 8px rgba(0,0,0,0.9)' : 'none',
              lineHeight: 1, transition: 'all 0.3s ease',
            }}>
              {streak}
            </div>
            <div style={{
              fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em',
              color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', system-ui, sans-serif",
              marginTop: 6,
            }}>
              {streak === 1 ? t('streak.day_survived') : t('streak.days_survived')}
            </div>

            {completedCycles > 0 && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                marginTop: 10, padding: '3px 10px',
                background: 'rgba(245,208,96,0.06)',
                border: '1px solid rgba(245,208,96,0.18)',
              }}>
                <Star size={10} style={{ color: '#F5D060' }} />
                <span style={{
                  fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.18em',
                  color: 'rgba(245,208,96,0.75)', fontFamily: "'Inter', system-ui, sans-serif",
                }}>
                  {completedCycles}× {t('streak.prestige')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Milestone progress bar */}
        <div style={{
          background: 'rgba(11,15,12,0.8)',
          border: '1px solid rgba(40,55,42,0.4)',
          padding: '16px 18px',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            marginBottom: 10,
          }}>
            <span style={{
              fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em',
              color: 'rgba(255,255,255,0.45)', fontFamily: "'Inter', system-ui, sans-serif",
            }}>
              {t('streak.streak_path')}
            </span>
            <span style={{
              fontSize: 11, color: 'rgba(255,154,48,0.8)',
              fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.1em',
            }}>
              {t('streak.day_n_next', { n: String(milestone.target) })}
            </span>
          </div>

          <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', marginBottom: 8, position: 'relative' }}>
            <div
              className="animate-bar-fill"
              style={{
                height: '100%',
                width: `${Math.round(milestoneProgress * 100)}%`,
                background: 'linear-gradient(90deg, rgba(212,160,32,0.6) 0%, rgba(245,208,96,0.9) 100%)',
              }}
            />
          </div>

          {/* Milestone dots */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {MILESTONES.map((m) => {
              const reached = streak >= m;
              return (
                <div key={m} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{
                    width: 8, height: 8,
                    background: reached ? '#F5D060' : 'rgba(255,255,255,0.12)',
                    border: reached ? '1px solid rgba(245,208,96,0.6)' : '1px solid rgba(255,255,255,0.1)',
                    transition: 'all 0.3s ease',
                    boxShadow: reached ? '0 0 6px rgba(245,208,96,0.5)' : 'none',
                  }} />
                  <span style={{
                    fontSize: 9,
                    color: reached ? 'rgba(245,208,96,0.7)' : 'rgba(255,255,255,0.25)',
                    fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.1em',
                  }}>
                    {m}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Countdown */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          background: 'rgba(11,15,12,0.8)',
          border: '1px solid rgba(40,55,42,0.35)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AssetIcon src={ICONS.calendar} fallback={Flame} size={16} style={{ opacity: 0.5 }} />
            <span style={{
              fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em',
              color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', system-ui, sans-serif",
            }}>
              {t('streak.next_gate_opens')}
            </span>
          </div>
          <span style={{
            fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
            fontSize: 18, letterSpacing: '0.1em',
            color: 'rgba(255,154,48,0.85)',
            textShadow: '0 0 10px rgba(255,122,0,0.3)',
          }}>
            {formatCountdown(countdown)}
          </span>
        </div>

        {/* ── Streak Milestone Badges ── */}
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12,
          }}>
            <span style={{
              fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em',
              color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', system-ui, sans-serif",
            }}>
              {t('streak.milestone_badges')}
            </span>
            {badgesLoading && <LoadingSpinner size="sm" />}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {STREAK_BADGES.map((def) => (
              <BadgeCard
                key={def.key}
                def={def}
                unlocked={isUnlocked(def.key)}
                isNext={!isUnlocked(def.key) && nextStreak?.key === def.key}
                unlockedAt={getUnlockedAt(def.key)}
              />
            ))}
          </div>
        </div>

        {/* ── Prestige Badges ── */}
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
          }}>
            <span style={{
              fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em',
              color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', system-ui, sans-serif",
            }}>
              {t('streak.prestige_cycles')}
            </span>
            {completedCycles > 0 && (
              <span style={{
                fontSize: 9, color: '#F5D060', fontFamily: "'Inter', system-ui, sans-serif",
                background: 'rgba(245,208,96,0.08)', border: '1px solid rgba(245,208,96,0.2)',
                padding: '2px 7px', letterSpacing: '0.12em', textTransform: 'uppercase',
                flexShrink: 0,
              }}>
                ×{completedCycles}
              </span>
            )}
          </div>

          <div style={{
            padding: '12px 14px', marginBottom: 8,
            background: 'rgba(11,15,12,0.7)',
            border: '1px solid rgba(40,55,42,0.3)',
          }}>
            <p style={{
              fontSize: 12, color: 'rgba(255,255,255,0.38)',
              fontFamily: "'Lora', Georgia, serif", lineHeight: 1.55, margin: 0,
            }}>
              {t('streak.prestige_desc')}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PRESTIGE_BADGES.map((def) => (
              <BadgeCard
                key={def.key}
                def={def}
                unlocked={isUnlocked(def.key)}
                isNext={!isUnlocked(def.key) && nextPrestige?.key === def.key}
                unlockedAt={getUnlockedAt(def.key)}
              />
            ))}
          </div>
        </div>

        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}
