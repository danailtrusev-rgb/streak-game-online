import { Trophy, Crown, CheckCircle, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { QualificationStatus } from '../../lib/types';
import { ICONS } from '../../lib/assets';
import AssetIcon from '../ui/AssetIcon';
import { useI18n } from '../../context/I18nContext';

interface QualificationBarProps {
  qualification: QualificationStatus | null;
  compact?: boolean;
  showPlayButtons?: boolean;
}

export default function QualificationBar({
  qualification,
  compact = false,
  showPlayButtons = false,
}: QualificationBarProps) {
  const navigate = useNavigate();
  const { t } = useI18n();

  if (!qualification) {
    return (
      <div className="flex items-center gap-3 animate-pulse">
        <div className="h-3 w-full rounded-full bg-moss-dark/40" />
      </div>
    );
  }

  const satPct = Math.min(100, Math.round((qualification.total_points / (qualification.sat_pts_threshold || 1)) * 100));
  const sunPct = Math.min(100, Math.round((qualification.total_points / (qualification.sun_pts_threshold || 1)) * 100));
  const satQual = qualification.saturday_qualified;
  const sunQual = qualification.sunday_qualified;

  // ── Compact variant (used in HUD / header) ─────────────────────────────────
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          {satQual ? (
            <AssetIcon src={ICONS.check_circle} fallback={CheckCircle} size={14} style={{ filter: 'drop-shadow(0 0 3px rgba(245,208,96,0.5))' }} />
          ) : (
            <AssetIcon src={ICONS.trophy} fallback={Trophy} size={14} style={{ opacity: 0.5 }} />
          )}
          <span className={`text-[9px] font-semibold uppercase tracking-wider ${satQual ? 'text-gold-300' : 'text-bone-dark'}`}>
            SAT
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {sunQual ? (
            <AssetIcon src={ICONS.check_circle} fallback={CheckCircle} size={14} style={{ filter: 'drop-shadow(0 0 3px rgba(255,122,0,0.5))' }} />
          ) : (
            <AssetIcon src={ICONS.crown} fallback={Crown} size={14} style={{ opacity: 0.5 }} />
          )}
          <span className={`text-[9px] font-semibold uppercase tracking-wider ${sunQual ? 'text-torch-ember' : 'text-bone-dark'}`}>
            SUN
          </span>
        </div>
        <span className="text-[9px] text-bone-dark">
          {qualification.total_points}pts
        </span>
      </div>
    );
  }

  // ── Full variant ────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Saturday row ── */}
      <EventRow
        iconSrc={ICONS.trophy}
        iconFallback={Trophy}
        iconGlow="rgba(245,208,96,0.55)"
        name={t('qual.saturday_name')}
        pts={qualification.total_points}
        threshold={qualification.sat_pts_threshold}
        pct={satPct}
        qualified={satQual}
        qualifiedColor="#F5D060"
        barActiveGradient="linear-gradient(90deg, #B08018, #F5D060)"
        barInactiveGradient="linear-gradient(90deg, #2A4030, #4A6850)"
        showPlayButton={showPlayButtons}
        onPlay={() => navigate('/weekend/saturday')}
      />

      {/* ── Sunday row ── */}
      <EventRow
        iconSrc={ICONS.crown}
        iconFallback={Crown}
        iconGlow="rgba(255,179,71,0.55)"
        name={t('qual.sunday_name')}
        pts={qualification.total_points}
        threshold={qualification.sun_pts_threshold}
        pct={sunPct}
        qualified={sunQual}
        qualifiedColor="#FFB347"
        barActiveGradient="linear-gradient(90deg, #CC6200, #FFB347)"
        barInactiveGradient="linear-gradient(90deg, #2A3020, #3A3F28)"
        showPlayButton={showPlayButtons}
        onPlay={() => navigate('/weekend/sunday')}
      />

      {/* ── Stats row ── */}
      <div style={{ display: 'flex', gap: 24, paddingTop: 4 }}>
        {[
          { label: t('qual.stats_points'), value: qualification.total_points, color: '#F5D060' },
          { label: t('qual.stats_played'), value: qualification.games_played_count, color: '#E8E0D4' },
          { label: t('qual.stats_won'),    value: qualification.games_won_count,    color: '#E8E0D4' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "'Lora', Georgia, serif", lineHeight: 1, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
              {value}
            </div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.45)', marginTop: 3, fontFamily: "'Inter', system-ui, sans-serif" }}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── EventRow sub-component ─────────────────────────────────────────────────────

interface EventRowProps {
  iconSrc: string;
  iconFallback: React.ComponentType<{ size?: number }>;
  iconGlow: string;
  name: string;
  pts: number;
  threshold: number;
  pct: number;
  qualified: boolean;
  qualifiedColor: string;
  barActiveGradient: string;
  barInactiveGradient: string;
  showPlayButton: boolean;
  onPlay: () => void;
}

function EventRow({
  iconSrc, iconFallback, iconGlow,
  name, pts, threshold, pct,
  qualified, qualifiedColor,
  barActiveGradient, barInactiveGradient,
  showPlayButton, onPlay,
}: EventRowProps) {
  const { t } = useI18n();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Top: icon + name + pts + button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Icon */}
        <AssetIcon
          src={iconSrc}
          fallback={iconFallback}
          size={20}
          style={{
            filter:   qualified ? `drop-shadow(0 0 6px ${iconGlow})` : 'none',
            opacity:  qualified ? 1 : 0.4,
            flexShrink: 0,
          }}
        />

        {/* Name + pts */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize:   16,
            color:      '#FFFFFF',
            fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
            lineHeight: 1.15,
            whiteSpace: 'nowrap',
            overflow:   'hidden',
            textOverflow: 'ellipsis',
          }}>
            {name}
          </div>
          <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
            {qualified ? (
              <>
                <AssetIcon src={ICONS.check_circle} fallback={CheckCircle} size={12} style={{ filter: `drop-shadow(0 0 3px ${iconGlow})` }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: qualifiedColor, fontFamily: "'Inter', system-ui, sans-serif" }}>
                  {t('qual.qualified')}
                </span>
              </>
            ) : (
              <>
                <AssetIcon src={ICONS.lock} fallback={Lock} size={12} style={{ opacity: 0.5 }} />
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: "'Inter', system-ui, sans-serif" }}>
                  {pts} / {threshold} pts
                </span>
              </>
            )}
          </div>
        </div>

        {/* Play button */}
        {showPlayButton && (
          <button
            onClick={qualified ? onPlay : undefined}
            disabled={!qualified}
            style={{
              flexShrink:   0,
              padding:      '8px 18px',
              fontSize:     13,
              fontWeight:   700,
              fontFamily:   "'Inter', system-ui, sans-serif",
              textTransform:'uppercase',
              letterSpacing:'0.08em',
              background:   qualified ? `rgba(${qualified ? '245,208,96' : '255,255,255'},0.1)` : 'rgba(255,255,255,0.04)',
              border:       `1px solid ${qualified ? qualifiedColor.replace(')', ',0.45)').replace('rgb', 'rgba') : 'rgba(255,255,255,0.1)'}`,
              color:        qualified ? qualifiedColor : 'rgba(255,255,255,0.22)',
              cursor:       qualified ? 'pointer' : 'not-allowed',
              transition:   'all 0.2s ease',
            }}
          >
            {qualified ? t('qual.play') : t('qual.locked')}
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(30,50,36,0.55)', overflow: 'hidden' }}>
        <div
          className="animate-bar-fill"
          style={{
            width:      `${pct}%`,
            height:     '100%',
            background: qualified ? barActiveGradient : barInactiveGradient,
          }}
        />
      </div>
    </div>
  );
}
