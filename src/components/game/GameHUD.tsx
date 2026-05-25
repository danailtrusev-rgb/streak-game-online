import { useNavigate } from 'react-router-dom';
import { Flame, Trophy, Crown, Wallet } from 'lucide-react';
import AssetIcon from '../ui/AssetIcon';
import { ICONS } from '../../lib/assets';
import type { QualificationStatus } from '../../lib/types';

interface GameHUDProps {
  streak?:        number;
  potCents?:      number;
  walletCents?:   number;
  qualification?: QualificationStatus | null;
  /** When true, pot is hidden from header to prevent result leaking */
  hidePot?:       boolean;
}

export default function GameHUD({
  streak      = 0,
  potCents    = 0,
  walletCents = 0,
  qualification,
  hidePot     = false,
}: GameHUDProps) {
  const navigate  = useNavigate();
  const satQual   = qualification?.saturday_qualified ?? false;
  const sunQual   = qualification?.sunday_qualified   ?? false;
  const pts       = qualification?.total_points       ?? 0;
  const hasPot    = !hidePot && potCents > 0;

  const handleStreakClick = () => navigate('/streak');
  const handlePotClick    = () => { if (hasPot) navigate('/pot'); };

  return (
    <div
      style={{
        background:          'linear-gradient(180deg, rgba(5,8,6,0.98) 0%, rgba(9,13,10,0.96) 100%)',
        borderBottom:        '1px solid rgba(255,122,0,0.12)',
        backdropFilter:      'blur(16px)',
        WebkitBackdropFilter:'blur(16px)',
        height:               74,
        display:             'flex',
        flexDirection:       'column',
        justifyContent:      'center',
        padding:             '0 16px',
        gap:                  5,
      }}
    >
      {/* Row 1: App title + wallet */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          fontFamily:    "'Metal Mania', 'Cinzel', Georgia, serif",
          fontSize:       17,
          letterSpacing: '0.06em',
          color:          '#F5D060',
          textShadow:    '0 0 18px rgba(255,180,40,0.5), 0 1px 4px rgba(0,0,0,0.9)',
          lineHeight:     1,
        }}>
          Survive the Streak
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AssetIcon src={ICONS.wallet} fallback={Wallet} size={16} style={{ opacity: 0.55 }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize:    16,
              fontWeight:  700,
              color:       '#E8E0D4',
              lineHeight:  1,
              textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            }}>
              {(walletCents / 100).toFixed(2)}
            </div>
            <div style={{
              fontFamily:    "'Inter', system-ui, sans-serif",
              fontSize:       10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color:          'rgba(255,255,255,0.55)',
              lineHeight:     1,
              marginTop:      2,
            }}>
              Credits
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Streak · Pot · Qual badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

        {/* Streak block — clickable */}
        <button
          onClick={handleStreakClick}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
            borderRadius: 0,
            transition: 'opacity 0.15s ease',
            WebkitTapHighlightColor: 'transparent',
          } as React.CSSProperties}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.75'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
        >
          <AssetIcon
            src={ICONS.flame}
            fallback={Flame}
            size={18}
            style={{ filter: 'drop-shadow(0 0 5px rgba(204,98,0,0.9))' }}
          />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize:    20,
              fontWeight:  700,
              color:       '#F5D060',
              lineHeight:  1,
              textShadow: '0 0 10px rgba(245,208,96,0.35)',
            }}>
              {streak}
            </span>
            <span style={{
              fontFamily:    "'Inter', system-ui, sans-serif",
              fontSize:       11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color:          'rgba(255,255,255,0.6)',
            }}>
              streak
            </span>
          </div>
        </button>

        {/* Pot — clickable when available, hidden when anti-leak is active */}
        {hasPot && (
          <>
            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
            <button
              onClick={handlePotClick}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                transition: 'opacity 0.15s ease',
                WebkitTapHighlightColor: 'transparent',
              } as React.CSSProperties}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.75'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
            >
              <AssetIcon src={ICONS.coin} fallback={Flame} size={14} style={{ opacity: 0.65 }} />
              <span style={{
                fontFamily: "'Lora', Georgia, serif",
                fontSize:    16,
                fontWeight:  700,
                color:       '#F5D060',
                lineHeight:  1,
              }}>
                {(potCents / 100).toFixed(2)}
              </span>
              <span style={{
                fontFamily:    "'Inter', system-ui, sans-serif",
                fontSize:       11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color:          'rgba(255,255,255,0.6)',
              }}>
                pot
              </span>
            </button>
          </>
        )}

        {/* Qual badges — right-aligned */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {pts > 0 && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span style={{
                fontFamily: "'Lora', Georgia, serif",
                fontSize:    14,
                fontWeight:  700,
                color:       satQual ? '#F5D060' : 'rgba(255,255,255,0.45)',
              }}>
                {pts}
              </span>
              <span style={{
                fontFamily:    "'Inter', system-ui, sans-serif",
                fontSize:       10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color:          'rgba(255,255,255,0.45)',
              }}>
                pts
              </span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <AssetIcon
              src={ICONS.trophy}
              fallback={Trophy}
              size={20}
              style={{
                filter: satQual
                  ? 'drop-shadow(0 0 6px rgba(245,208,96,0.85)) brightness(1.3)'
                  : 'brightness(0.22)',
                transition: 'filter 0.3s ease',
              }}
            />
            <AssetIcon
              src={ICONS.crown}
              fallback={Crown}
              size={20}
              style={{
                filter: sunQual
                  ? 'drop-shadow(0 0 6px rgba(255,179,71,0.85)) brightness(1.2)'
                  : 'brightness(0.22)',
                transition: 'filter 0.3s ease',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
