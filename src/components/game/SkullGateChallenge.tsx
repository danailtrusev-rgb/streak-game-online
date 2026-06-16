import { useState, useEffect, useCallback } from 'react';
import type { PlayResult } from '../../lib/types';
import { TORCH_TRIAL, BUTTONS } from '../../lib/assets';
import GameScene from './GameScene';
import type { ZoneState } from './GameScene';
import ImageButton from '../ui/ImageButton';
import AmbientFireflies from '../fx/AmbientFireflies';

// ── Constants ─────────────────────────────────────────────────────────────────

const REVEAL_HOLD_MS = 1800;

const GATE_CONFIG = {
  game_id:          'daily_gate',
  type:             'pick' as const,
  background:       TORCH_TRIAL.bg,
  foreground:       TORCH_TRIAL.foreground,
  instruction_text: 'Choose a torch. Only one lights the path.',
  win_text:         'The gate opens. Your streak lives.',
  lose_text:        'The flame fades. The gate rejects you.',
  winChance:        '1 in 2',
  zones: [
    {
      id:           0,
      label:        'Left Torch',
      x:            5,  y: 22, width: 35, height: 52,
      iconSize:     96,
      fallbackEmoji:'🔥',
      hiddenImage:  TORCH_TRIAL.choices.left,
      revealImage:  TORCH_TRIAL.choices.left,
    },
    {
      id:           1,
      label:        'Right Torch',
      x:            60, y: 22, width: 35, height: 52,
      iconSize:     96,
      fallbackEmoji:'🔥',
      hiddenImage:  TORCH_TRIAL.choices.right,
      revealImage:  TORCH_TRIAL.choices.right,
    },
  ],
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────

type ChallengePhase = 'idle' | 'selecting' | 'revealing' | 'done';

interface Props {
  pendingResult: PlayResult;
  onComplete:    () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SkullGateChallenge({ pendingResult, onComplete }: Props) {
  const [phase,        setPhase]        = useState<ChallengePhase>('idle');
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [visible,      setVisible]      = useState(false);

  const survived = pendingResult.outcome === 'SURVIVE';

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleZoneClick = useCallback((zoneId: number) => {
    if (phase !== 'idle' && phase !== 'selecting') return;
    setSelectedZone(zoneId);
    setPhase('selecting');
  }, [phase]);

  const handleConfirm = useCallback(() => {
    if (phase !== 'selecting' || selectedZone === null) return;
    setPhase('revealing');
    setTimeout(() => {
      setPhase('done');
      setTimeout(onComplete, 400);
    }, REVEAL_HOLD_MS);
  }, [phase, selectedZone, onComplete]);

  const zoneStates: Record<string | number, ZoneState> = {};
  for (const zone of GATE_CONFIG.zones) {
    if (phase === 'idle') {
      zoneStates[zone.id] = 'hidden';
    } else if (phase === 'selecting') {
      zoneStates[zone.id] = zone.id === selectedZone ? 'selected' : 'hidden';
    } else if (phase === 'revealing') {
      zoneStates[zone.id] = zone.id === selectedZone ? 'selected' : 'hidden';
    } else {
      // done — reveal outcome
      if (survived) {
        zoneStates[zone.id] = zone.id === selectedZone ? 'won' : 'dim';
      } else {
        zoneStates[zone.id] = zone.id === selectedZone ? 'lost' : 'dim';
      }
    }
  }

  const interactive  = phase === 'idle' || phase === 'selecting';
  const isRevealing  = phase === 'revealing';
  const isDone       = phase === 'done';
  const canConfirm   = phase === 'selecting' && selectedZone !== null;

  const resultText = isDone
    ? (survived ? GATE_CONFIG.win_text : GATE_CONFIG.lose_text)
    : GATE_CONFIG.instruction_text;

  const hasLost = isDone && !survived;

  return (
    <div
      style={{
        position:      'fixed',
        inset:          0,
        zIndex:         150,
        opacity:        visible ? 1 : 0,
        transition:    'opacity 0.4s ease',
        overflow:      'hidden',
        display:       'flex',
        flexDirection: 'column',
      }}
    >
      {/* Full-viewport background */}
      <div
        aria-hidden="true"
        style={{
          position:           'absolute',
          inset:               0,
          backgroundImage:    `url(${GATE_CONFIG.background})`,
          backgroundSize:     'cover',
          backgroundPosition: 'center top',
          zIndex:              0,
          transition:         'filter 600ms ease',
          filter:              hasLost ? 'brightness(0.55) saturate(0.4)' : undefined,
        }}
      />
      {/* Vignette */}
      <div
        aria-hidden="true"
        style={{
          position:      'absolute',
          inset:          0,
          background:    'radial-gradient(ellipse at 50% 35%, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.75) 100%)',
          zIndex:         1,
          pointerEvents: 'none',
        }}
      />
      <AmbientFireflies count={18} intensity="low" zIndex={2} yBand={[5, 90]} />

      {/* Content */}
      <div
        className="animate-scene-enter"
        style={{
          position:      'relative',
          zIndex:         2,
          display:       'flex',
          flexDirection: 'column',
          flex:           1,
          paddingTop:    'max(env(safe-area-inset-top, 0px), 20px)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)',
          paddingLeft:    16,
          paddingRight:   16,
          maxWidth:       480,
          margin:        '0 auto',
          width:         '100%',
        }}
      >
        {/* Instruction / result text */}
        <div
          className="animate-fade-up animate-delay-1"
          style={{
            paddingTop:     16,
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
              ? (survived ? '#F5D060' : '#CC4444')
              : 'rgba(255,255,255,0.8)',
            transition: 'color 0.5s ease',
            margin:      0,
            textShadow: '0 1px 6px rgba(0,0,0,0.9)',
          }}>
            {resultText}
          </p>
        </div>

        {/* Game scene */}
        <div className="animate-fade-up animate-delay-2" style={{ flex: 1, minHeight: 0 }}>
          <GameScene
            config={GATE_CONFIG as Parameters<typeof GameScene>[0]['config']}
            zoneStates={zoneStates}
            onZoneClick={handleZoneClick}
            interactive={interactive}
            hideBackground
          />
        </div>

        {/* CTA button */}
        <div className="animate-soft-scale-in animate-delay-3" style={{ paddingTop: 14 }}>
          <ImageButton
            base={BUTTONS.confirm_default}
            hover={BUTTONS.confirm_hover}
            pressed={BUTTONS.confirm_pressed}
            onClick={handleConfirm}
            disabled={!canConfirm || isRevealing}
            style={{ width: '100%' }}
          >
            <span style={{
              fontFamily:    "'Metal Mania', 'Cinzel', Georgia, serif",
              fontSize:       24,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color:         '#F5D060',
            }}>
              {isRevealing ? 'Revealing…' : canConfirm ? 'Light the Torch' : 'Choose a Torch'}
            </span>
          </ImageButton>
        </div>
      </div>
    </div>
  );
}
