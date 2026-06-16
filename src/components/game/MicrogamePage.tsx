import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMicrogame } from '../../hooks/useMicrogame';
import { useQualification } from '../../hooks/useQualification';
import { getGameConfig } from '../../lib/gameConfigs';
import { BUTTONS } from '../../lib/assets';
import GameScene from './GameScene';
import type { ZoneState } from './GameScene';
import DiceDisplay from './DiceDisplay';
import ImageButton from '../ui/ImageButton';
import AmbientFireflies from '../fx/AmbientFireflies';
import type { DiceResult, PickResult } from '../../lib/types';
import { useI18n } from '../../context/I18nContext';

interface MicrogamePageProps {
  gameId: string;
}

const DICE_ROLL_MIN_MS = 1600;

export default function MicrogamePage({ gameId }: MicrogamePageProps) {
  const navigate  = useNavigate();
  const { t }     = useI18n();
  const config    = getGameConfig(gameId);
  const { phase, selectedZone, result, loading, error, select, confirm, reset } = useMicrogame(gameId);
  const { todayProgress, fetchQualification } = useQualification();

  useEffect(() => {
    fetchQualification();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const alreadyPlayed = todayProgress.some((p) => p.game_id === gameId && p.played_today);
  const isDice = config?.type === 'dice';

  const [diceRolling, setDiceRolling] = useState(false);
  const rollStartRef = useRef<number>(0);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  useEffect(() => {
    if (isDice && phase === 'revealing') {
      rollStartRef.current = Date.now();
      setDiceRolling(true);
    }
  }, [isDice, phase]);

  useEffect(() => {
    if (isDice && phase === 'done' && diceRolling) {
      const elapsed = Date.now() - rollStartRef.current;
      const remaining = Math.max(0, DICE_ROLL_MIN_MS - elapsed);
      const timer = setTimeout(() => setDiceRolling(false), remaining);
      return () => clearTimeout(timer);
    }
  }, [isDice, phase, diceRolling]);

  // ── Already played screen ────────────────────────────────────────────────────
  if (alreadyPlayed && phase === 'idle') {
    return (
      <div style={{
        position:       'fixed',
        inset:          0,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            24,
        padding:        'max(env(safe-area-inset-top, 20px), 20px) 24px max(env(safe-area-inset-bottom, 20px), 20px)',
        background:     'linear-gradient(180deg, #070A08 0%, #0B0F0C 60%, #080C09 100%)',
      }}>
        <div style={{
          width: 72, height: 72,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(11,15,12,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Moon size={32} strokeWidth={1.2} style={{ color: 'rgba(255,255,255,0.25)' }} />
        </div>

        <div style={{ textAlign: 'center', maxWidth: 260 }}>
          <div style={{
            fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
            fontSize: 20, letterSpacing: '0.06em',
            color: 'rgba(255,255,255,0.4)', marginBottom: 10,
          }}>
            {t('game.already_played')}
          </div>
          <p style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: 14, lineHeight: 1.65,
            color: 'rgba(255,255,255,0.35)', margin: 0,
          }}>
            {t('game.already_played_desc')}
          </p>
        </div>

        <ImageButton
          base={BUTTONS.return_default}
          hover={BUTTONS.return_hover}
          pressed={BUTTONS.return_pressed}
          onClick={() => navigate('/')}
          style={{ width: '100%', maxWidth: 340 }}
        >
          <span style={{ fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif", fontSize: 24, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#F5D060' }}>
            {t('common.back_home')}
          </span>
        </ImageButton>
      </div>
    );
  }

  if (!config) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CC4444' }}>
        Game not found: {gameId}
      </div>
    );
  }

  const pickResult = result as PickResult | null;
  const diceResult = result as DiceResult | null;
  const won = result ? ('won' in result ? result.won : false) : false;

  const showDiceResult = isDice && phase === 'done' && !diceRolling;

  const zoneStates: Record<string | number, ZoneState> = {};
  for (const zone of config.zones) {
    if (phase === 'idle') {
      zoneStates[zone.id] = 'hidden';
    } else if (phase === 'selecting') {
      zoneStates[zone.id] = zone.id === selectedZone ? 'selected' : 'hidden';
    } else if (phase === 'revealing') {
      zoneStates[zone.id] = zone.id === selectedZone ? 'selected' : 'hidden';
    } else if (phase === 'done') {
      if (isDice) {
        zoneStates[zone.id] = showDiceResult ? (won ? 'won' : 'lost') : 'hidden';
      } else if (pickResult) {
        if (Number(zone.id) === pickResult.winning_idx)    zoneStates[zone.id] = 'won';
        else if (Number(zone.id) === pickResult.player_choice) zoneStates[zone.id] = 'lost';
        else zoneStates[zone.id] = 'dim';
      }
    }
  }

  const canConfirm  = phase === 'selecting' || (isDice && phase === 'idle');
  const interactive = phase === 'idle' || phase === 'selecting';
  const isRevealing = phase === 'revealing' || loading || diceRolling;
  const isDone      = phase === 'done' && !diceRolling;

  // Back button is only shown before the player has committed to a reveal
  const showBack = !isRevealing && !isDone && phase !== 'selecting';

  const resultText = isDone
    ? (won ? config.win_text : config.lose_text)
    : config.instruction_text;

  const ctaButton = isDice
    ? { base: BUTTONS.roll_default,    hover: BUTTONS.roll_hover,    pressed: BUTTONS.roll_pressed    }
    : { base: BUTTONS.confirm_default, hover: BUTTONS.confirm_hover, pressed: BUTTONS.confirm_pressed };

  const doneButton = { base: BUTTONS.return_default, hover: BUTTONS.return_hover, pressed: BUTTONS.return_pressed };

  const hasLost = Object.values(zoneStates).some(s => s === 'lost');

  return (
    <div
      className="animate-scene-enter"
      style={{
        position:      'fixed',
        inset:         0,
        display:       'flex',
        flexDirection: 'column',
        overflow:      'hidden',
      }}
    >
      {/* ── Full-viewport background ── */}
      <div
        aria-hidden="true"
        style={{
          position:           'absolute',
          inset:              0,
          backgroundImage:    `url(${config.background})`,
          backgroundSize:     'cover',
          backgroundPosition: 'center top',
          zIndex:             0,
          transition:         'filter 600ms ease',
          filter:             hasLost ? 'brightness(0.55) saturate(0.4)' : undefined,
        }}
      />
      {/* Vignette */}
      <div
        aria-hidden="true"
        style={{
          position:      'absolute',
          inset:         0,
          background:    'radial-gradient(ellipse at 50% 35%, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.75) 100%)',
          zIndex:        1,
          pointerEvents: 'none',
        }}
      />
      {/* Fireflies */}
      <AmbientFireflies count={18} intensity="low" zIndex={2} yBand={[5, 90]} />

      {/* ── All content above background ── */}
      <div style={{
        position:       'relative',
        zIndex:         2,
        display:        'flex',
        flexDirection:  'column',
        flex:           1,
        paddingTop:     'max(env(safe-area-inset-top, 0px), 20px)',
        paddingBottom:  'max(env(safe-area-inset-bottom, 0px), 20px)',
        paddingLeft:    16,
        paddingRight:   16,
      }}>

        {/* ── Top bar: back button ── */}
        <div style={{ height: 40, display: 'flex', alignItems: 'center' }}>
          {showBack && (
            <button
              onClick={() => navigate('/games')}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:           4,
                fontSize:      11,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color:         'rgba(255,255,255,0.5)',
                background:    'none',
                border:        'none',
                cursor:        'pointer',
                padding:       '6px 0',
                transition:    'color 0.15s ease',
                fontFamily:    "'Inter', system-ui, sans-serif",
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <ChevronLeft size={15} />
              {t('common.games')}
            </button>
          )}
        </div>

        {/* ── Instruction / result text ── */}
        <div
          className="animate-fade-up animate-delay-1"
          style={{
            paddingTop:     8,
            paddingBottom:  12,
            minHeight:      52,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
          }}
        >
          <p style={{
            fontSize:   14,
            lineHeight: 1.55,
            textAlign:  'center',
            fontFamily: "'Lora', Georgia, serif",
            color:      isDone
              ? won ? '#F5D060' : '#CC4444'
              : 'rgba(255,255,255,0.8)',
            transition: 'color 0.5s ease',
            margin:     0,
            textShadow: '0 1px 6px rgba(0,0,0,0.9)',
          }}>
            {resultText}
          </p>
        </div>

        {/* ── Game scene ── */}
        <div className="animate-fade-up animate-delay-2" style={{ flex: 1, minHeight: 0 }}>
          <GameScene
            config={config}
            zoneStates={zoneStates}
            onZoneClick={!isDice ? select : undefined}
            interactive={interactive}
            hideBackground
          >
            {isDice && (
              <DiceDisplay
                value={showDiceResult ? (diceResult?.dice_value ?? null) : null}
                rolling={diceRolling || phase === 'revealing'}
                won={showDiceResult ? won : undefined}
              />
            )}
          </GameScene>
        </div>

        {/* ── Points earned ── */}
        {isDone && result && 'points_earned' in result && (
          <div style={{ paddingTop: 10, textAlign: 'center' }} className="animate-fade-in">
            <span style={{
              fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
              fontSize:    28,
              fontWeight:  700,
              color:       won ? '#F5D060' : '#9E9688',
              textShadow:  '0 0 12px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.9)',
            }}>
              +{result.points_earned}
            </span>
            <span style={{
              fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em',
              color: 'rgba(255,255,255,0.4)', marginLeft: 8,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}>
              pts
            </span>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div style={{
            marginTop: 10,
            border:     '1px solid rgba(180,30,30,0.3)',
            background: 'rgba(60,0,0,0.45)',
            padding:    '12px 16px',
            textAlign:  'center',
            fontSize:   13,
            color:      '#CC4444',
            lineHeight: 1.5,
            fontFamily: "'Lora', Georgia, serif",
          }}>
            {error}
          </div>
        )}

        {/* ── CTA button ── */}
        <div className="animate-soft-scale-in animate-delay-3" style={{ paddingTop: 14 }}>
          {isDone ? (
            <ImageButton
              base={doneButton.base}
              hover={doneButton.hover}
              pressed={doneButton.pressed}
              onClick={() => navigate('/games')}
              style={{ width: '100%' }}
            >
              <span style={{ fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif", fontSize: 24, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#F5D060' }}>
                {t('common.back_games')}
              </span>
            </ImageButton>
          ) : (
            <ImageButton
              base={ctaButton.base}
              hover={ctaButton.hover}
              pressed={ctaButton.pressed}
              onClick={confirm}
              disabled={(!canConfirm && !isDice) || isRevealing}
              style={{ width: '100%' }}
            >
              <span style={{ fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif", fontSize: 24, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#F5D060' }}>
                {isRevealing
                  ? (isDice ? t('game.rolling') : t('game.revealing'))
                  : isDice
                  ? t('game.roll_dice')
                  : selectedZone !== null
                  ? t('game.confirm_choice', { label: config.zones.find((z) => z.id === selectedZone)?.label ?? '' })
                  : t('game.choose_option')}
              </span>
            </ImageButton>
          )}
        </div>

      </div>
    </div>
  );
}
