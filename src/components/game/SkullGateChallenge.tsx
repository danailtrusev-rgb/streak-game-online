import { useState, useEffect } from 'react';
import { Flame } from 'lucide-react';
import type { PlayResult } from '../../lib/types';
import { PROPS, BACKGROUNDS, BUTTONS } from '../../lib/assets';
import ImageButton from '../ui/ImageButton';
import AmbientFireflies from '../fx/AmbientFireflies';

interface SkullGateChallengeProps {
  pendingResult: PlayResult;
  onComplete: () => void;
}

type ChallengePhase = 'idle' | 'revealing' | 'done';

const BG = BACKGROUNDS.gate_home;
const REVEAL_HOLD_MS = 1800;

export default function SkullGateChallenge({ pendingResult, onComplete }: SkullGateChallengeProps) {
  const [phase, setPhase] = useState<ChallengePhase>('idle');
  const [chosen, setChosen] = useState<'left' | 'right' | null>(null);
  const [visible, setVisible] = useState(false);

  const survived = pendingResult.outcome === 'SURVIVE';

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Torches are freely switchable until the CTA is pressed
  const handleTorchClick = (side: 'left' | 'right') => {
    if (phase !== 'idle') return;
    setChosen(side);
  };

  const handleLight = () => {
    if (phase !== 'idle' || !chosen) return;
    setPhase('revealing');
    setTimeout(() => {
      setPhase('done');
      setTimeout(onComplete, 400);
    }, REVEAL_HOLD_MS);
  };

  // ── Visual helpers ────────────────────────────────────────────────────────────

  const torchImgFilter = (side: 'left' | 'right'): string => {
    const isChosen = chosen === side;
    const isOther  = chosen !== null && chosen !== side;

    if (phase === 'revealing' || phase === 'done') {
      if (isChosen && survived)  return 'brightness(1.6) drop-shadow(0 0 20px rgba(255,210,50,0.9)) drop-shadow(0 0 8px rgba(255,160,40,0.6))';
      if (isChosen && !survived) return 'brightness(0.4) saturate(0.2) drop-shadow(0 0 12px rgba(160,20,20,0.7))';
      if (isOther)               return 'brightness(0.25) saturate(0.15)';
    }

    if (chosen !== null) {
      if (isChosen) return 'brightness(1.3) drop-shadow(0 0 14px rgba(255,140,20,0.8)) drop-shadow(0 0 5px rgba(255,100,0,0.5))';
      if (isOther)  return 'brightness(0.45) saturate(0.35)';
    }

    return 'brightness(0.92) drop-shadow(0 0 6px rgba(255,120,0,0.35))';
  };

  // Radial glow behind the torch — no box border at all
  const torchGlowStyle = (side: 'left' | 'right'): React.CSSProperties => {
    const isChosen = chosen === side;

    if (!isChosen || phase === 'idle' && chosen === null) {
      return { position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0 };
    }

    if (phase === 'revealing' || phase === 'done') {
      if (survived) return {
        position:   'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 85% 90% at 50% 65%, rgba(255,210,50,0.30) 0%, transparent 70%)',
        transition: 'opacity 0.5s ease',
        opacity:    isChosen ? 1 : 0,
      };
      return {
        position:   'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 75% 80% at 50% 65%, rgba(160,20,20,0.28) 0%, transparent 65%)',
        transition: 'opacity 0.5s ease',
        opacity:    isChosen ? 1 : 0,
      };
    }

    // Selected (idle phase, torch chosen)
    if (isChosen) return {
      position:   'absolute', inset: 0, pointerEvents: 'none',
      background: 'radial-gradient(ellipse 80% 85% at 50% 65%, rgba(255,130,20,0.22) 0%, transparent 70%)',
      transition: 'opacity 0.35s ease',
      opacity:    1,
    };

    return { position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0 };
  };

  const instructionText = (): string => {
    if (phase === 'idle' && chosen === null) return 'Choose the flame that calls to you.';
    if (phase === 'idle' && chosen !== null) return 'The torch is chosen. Light it.';
    if (phase === 'revealing') return 'The gate answers…';
    return '';
  };

  const overlayBg = (phase === 'revealing' || phase === 'done')
    ? survived
      ? 'rgba(3,8,5,0.50)'
      : 'rgba(6,2,2,0.72)'
    : 'rgba(3,8,5,0.58)';

  const isRevealing = phase === 'revealing' || phase === 'done';

  return (
    <div
      style={{
        position:   'fixed',
        inset:       0,
        zIndex:      150,
        display:    'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'rgba(2,5,3,0.96)',
        opacity:    visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
        overflow:   'hidden',
      }}
    >
      {/* ── Play area: max-width 480, fills viewport ── */}
      <div
        className="animate-scene-enter"
        style={{
          position: 'relative',
          width: '100%', maxWidth: 480, height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'flex-end',
          overflow: 'hidden',
        }}
      >
        {/* Background */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${BG})`,
          backgroundSize: 'cover', backgroundPosition: 'center top',
          transition: 'filter 0.6s ease',
          filter: isRevealing && !survived ? 'brightness(0.6) saturate(0.45)' : undefined,
        }} />

        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `linear-gradient(180deg, ${overlayBg} 0%, rgba(3,8,5,0.28) 40%, rgba(3,8,5,0.82) 100%)`,
          transition: 'background 0.6s ease',
        }} />

        {/* Vignette */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 90% 80% at 50% 45%, transparent 35%, rgba(0,0,0,0.55) 100%)',
        }} />

        {/* Fireflies — more during reveal */}
        <AmbientFireflies count={isRevealing ? 22 : 12} intensity={isRevealing ? 'medium' : 'low'} />

        {/* Gold bloom on survive */}
        {isRevealing && survived && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse 85% 65% at 50% 38%, rgba(245,208,96,0.13) 0%, transparent 70%)',
            transition: 'opacity 0.8s ease',
          }} />
        )}

        {/* Skull + title */}
        <div
          className="animate-fade-up-centered"
          style={{
            position: 'absolute',
            top: 'max(env(safe-area-inset-top, 0px), 20px)',
            left: '50%',
            zIndex: 2,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          }}
        >
          <img
            src={PROPS.skull_gate_icon}
            alt=""
            style={{
              width: 56, height: 56, objectFit: 'contain',
              filter: isRevealing
                ? survived
                  ? 'drop-shadow(0 0 22px rgba(255,200,40,0.75)) brightness(1.3)'
                  : 'drop-shadow(0 0 18px rgba(160,20,20,0.65)) brightness(0.7) saturate(0.35)'
                : 'drop-shadow(0 0 10px rgba(255,122,0,0.45))',
              transition: 'filter 0.6s ease',
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span style={{
            fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
            fontSize: 20, letterSpacing: '0.12em',
            background: 'linear-gradient(180deg, #F5D060 0%, #D4A020 80%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Skull Gate
          </span>
        </div>

        {/* ── Torches ── */}
        <div style={{
          position: 'absolute',
          bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 20px) + 120px)',
          left: 0, right: 0,
          display: 'flex', justifyContent: 'space-between',
          padding: '0 9%',
          zIndex: 3,
        }}>
          {(['left', 'right'] as const).map((side, idx) => {
            const isChosen = chosen === side;
            const isOther  = chosen !== null && chosen !== side;
            return (
              <button
                key={side}
                className={`animate-soft-scale-in ${idx === 0 ? 'animate-delay-2' : 'animate-delay-3'}`}
                onClick={() => handleTorchClick(side)}
                disabled={phase !== 'idle'}
                style={{
                  position: 'relative',
                  width: '36%',
                  paddingTop: '54%',
                  background: 'transparent',
                  border: 'none',
                  cursor: phase === 'idle' ? 'pointer' : 'default',
                  opacity: isOther && phase !== 'idle' ? 0.3 : 1,
                  transition: 'opacity 0.4s ease, transform 0.3s ease',
                  transform: isChosen && phase === 'idle' ? 'scale(1.06)' : 'scale(1)',
                  WebkitTapHighlightColor: 'transparent',
                  outline: 'none',
                }}
              >
                {/* Atmospheric glow — no box border */}
                <div style={torchGlowStyle(side)} />

                {/* Torch image */}
                <img
                  src={side === 'left' ? PROPS.torch_left : PROPS.torch_right}
                  alt={`${side} torch`}
                  style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    objectFit: 'contain', objectPosition: 'bottom center',
                    filter: torchImgFilter(side),
                    transition: 'filter 0.45s ease',
                    userSelect: 'none', pointerEvents: 'none', display: 'block',
                  }}
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.style.display = 'none';
                    const fb = img.nextElementSibling as HTMLElement | null;
                    if (fb) fb.style.display = 'flex';
                  }}
                />
                {/* Fallback */}
                <span style={{
                  display: 'none', position: 'absolute', inset: 0,
                  alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '8%',
                }}>
                  <Flame size={52} style={{ color: '#FF9A30', opacity: 0.85 }} />
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Bottom panel ── */}
        <div
          className="animate-fade-up animate-delay-3"
          style={{
            position: 'absolute',
            bottom: 'max(env(safe-area-inset-bottom, 0px), 20px)',
            left: 0, right: 0, zIndex: 4,
            padding: '0 20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}
        >
          {/* Instruction text */}
          <div style={{
            fontFamily: "'Cinzel', 'Metal Mania', Georgia, serif",
            fontSize: 15,
            color: isRevealing
              ? survived ? '#F5D060' : '#CC5555'
              : 'rgba(255,235,190,0.9)',
            textAlign: 'center',
            letterSpacing: '0.08em',
            lineHeight: 1.65,
            minHeight: 48,
            transition: 'color 0.5s ease',
            whiteSpace: 'pre-line',
            textShadow: isRevealing
              ? survived
                ? '0 0 20px rgba(245,208,96,0.6), 0 1px 4px rgba(0,0,0,0.9)'
                : '0 0 16px rgba(180,40,40,0.6), 0 1px 4px rgba(0,0,0,0.9)'
              : '0 0 12px rgba(255,160,60,0.35), 0 1px 4px rgba(0,0,0,0.75)',
          }}>
            {instructionText()}
          </div>

          {/* CTA: Light the Torch — visible when torch chosen and not yet revealing */}
          {phase === 'idle' && chosen !== null && (
            <div className="animate-soft-scale-in" style={{ width: '100%' }}>
              <ImageButton
                onClick={handleLight}
                base={BUTTONS.confirm_default}
                hover={BUTTONS.confirm_hover}
                pressed={BUTTONS.confirm_pressed}
                style={{ width: '100%' }}
              >
                <span style={{
                  fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
                  fontSize: 24, letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: '#F5D060',
                  textShadow: '0 0 12px rgba(245,208,96,0.5), 0 2px 4px rgba(0,0,0,0.9)',
                }}>
                  Light the Torch
                </span>
              </ImageButton>
            </div>
          )}

          {/* Reveal status bar — replaces CTA during and after reveal */}
          {isRevealing && (
            <div style={{
              width: '100%',
              padding: '14px 20px',
              border: `1px solid ${survived ? 'rgba(245,208,96,0.35)' : 'rgba(160,20,20,0.35)'}`,
              background: survived ? 'rgba(245,208,96,0.06)' : 'rgba(100,0,0,0.14)',
              fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
              fontSize: 15, letterSpacing: '0.1em',
              textAlign: 'center',
              color: survived ? '#D4A020' : '#993333',
              transition: 'all 0.5s ease',
              textShadow: survived
                ? '0 0 12px rgba(245,208,96,0.4)'
                : '0 0 10px rgba(160,20,20,0.5)',
            }}>
              {survived ? 'The torch burns bright…' : 'The flame fades to ash…'}
            </div>
          )}

          {/* Idle nudge — only before any selection */}
          {phase === 'idle' && chosen === null && (
            <div style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.28)',
              fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>
              Tap a torch to begin
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
