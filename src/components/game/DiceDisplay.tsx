import { useEffect, useRef, useState } from 'react';
import { GAME_ASSETS } from '../../lib/assets';

const FACE_SRCS = [
  GAME_ASSETS.dice_face_1,
  GAME_ASSETS.dice_face_2,
  GAME_ASSETS.dice_face_3,
  GAME_ASSETS.dice_face_4,
  GAME_ASSETS.dice_face_5,
  GAME_ASSETS.dice_face_6,
];

interface DiceDisplayProps {
  value:   number | null;
  rolling: boolean;
  won?:    boolean;
}

// Pre-computed shuffle across all six faces for visible variety during roll
const ROLL_SEQUENCE = [2, 5, 0, 3, 1, 4, 2, 0, 5, 3, 1, 4, 0, 2, 5, 1, 3, 4, 0, 5];

export default function DiceDisplay({ value, rolling, won }: DiceDisplayProps) {
  const [displayFace, setDisplayFace] = useState<number>(value != null ? value - 1 : 0);
  const [rollPhase, setRollPhase] = useState<'idle' | 'fast' | 'slow' | 'settle'>('idle');
  const frameIdxRef = useRef(0);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevRolling = useRef(rolling);

  const clearTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  useEffect(() => {
    const wasRolling = prevRolling.current;
    prevRolling.current = rolling;

    if (!rolling) {
      if (!wasRolling) return;
      clearTimer();
      setRollPhase('settle');
      if (value != null) {
        timerRef.current = setTimeout(() => {
          setDisplayFace(value - 1);
          setRollPhase('idle');
        }, 60);
      }
      return () => clearTimer();
    }

    // rolling became true
    frameIdxRef.current = 0;
    setRollPhase('fast');

    const tick = (delay: number) => {
      clearTimer();
      timerRef.current = setTimeout(() => {
        const idx = ROLL_SEQUENCE[frameIdxRef.current % ROLL_SEQUENCE.length];
        setDisplayFace(idx);
        frameIdxRef.current += 1;

        const nextDelay = frameIdxRef.current < 5
          ? 110
          : frameIdxRef.current < 10
          ? 160
          : frameIdxRef.current < 15
          ? 220
          : 320;

        if (frameIdxRef.current >= 5) setRollPhase('slow');
        tick(nextDelay);
      }, delay);
    };

    tick(100);
    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolling, value]);

  const isSettling = rollPhase === 'settle';
  const isRolling  = rolling || rollPhase === 'fast' || rollPhase === 'slow';

  const src = FACE_SRCS[displayFace] ?? FACE_SRCS[0];

  // Outer glow — only on result, never during roll
  const ringGlow = !isRolling && !isSettling
    ? won === true
      ? '0 0 40px rgba(245,208,96,0.5), 0 0 16px rgba(245,208,96,0.25)'
      : won === false
      ? '0 0 30px rgba(200,50,50,0.4)'
      : undefined
    : undefined;

  // Image filter on the dice face
  const imgFilter = !isRolling && !isSettling
    ? won === true
      ? 'brightness(1.25) drop-shadow(0 0 10px rgba(245,208,96,0.6))'
      : won === false
      ? 'brightness(0.55) saturate(0.3)'
      : 'brightness(1.05)'
    : 'brightness(1.05)';

  // Text color for the numeric result
  const resultColor = won === true ? '#F5D060' : won === false ? '#CC4444' : '#D8D0C5';
  const resultShadow = won === true
    ? '0 0 20px rgba(245,208,96,0.6), 0 2px 6px rgba(0,0,0,0.8)'
    : won === false
    ? '0 0 16px rgba(200,50,50,0.4), 0 2px 6px rgba(0,0,0,0.8)'
    : '0 2px 6px rgba(0,0,0,0.8)';

  const winLoseLabel = won === true ? 'WIN' : won === false ? 'LOSE' : '';
  const winLoseLabelColor = won === true ? '#D4A020' : won === false ? '#993333' : '#6B655C';

  const animClass = isRolling
    ? rollPhase === 'fast' ? 'dice-roll-fast' : 'dice-roll-slow'
    : isSettling
    ? 'dice-settle'
    : won === true
    ? 'dice-win-pulse'
    : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {/* Atmospheric glow behind the dice */}
      <div style={{ position: 'relative' }}>
        <div style={{
          position:   'absolute',
          inset:      '-60%',
          background: won === true
            ? 'radial-gradient(ellipse 55% 55% at 50% 50%, rgba(245,208,96,0.12) 0%, transparent 70%)'
            : won === false
            ? 'radial-gradient(ellipse 55% 55% at 50% 50%, rgba(160,20,20,0.12) 0%, transparent 70%)'
            : 'radial-gradient(ellipse 55% 55% at 50% 50%, rgba(255,140,20,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
          transition: 'background 0.6s ease',
        }} />

        <div style={{ perspective: '400px', position: 'relative' }}>
          <div
            className={animClass}
            style={{
              width:          128,
              height:         128,
              boxShadow:      ringGlow,
              background:     'transparent',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              transition:     isRolling ? undefined : 'box-shadow 600ms ease',
              transformStyle: 'preserve-3d',
              willChange:     'transform',
            }}
          >
            <img
              src={src}
              alt={`Dice face ${displayFace + 1}`}
              style={{
                width:         96,
                height:        96,
                objectFit:     'contain',
                display:       'block',
                filter:        imgFilter,
                transition:    isRolling ? undefined : 'filter 500ms ease',
                userSelect:    'none',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* Result display — visible only after settling */}
      <div style={{
        minHeight:  44,
        display:    'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap:        3,
        opacity:    isSettling || isRolling ? 0 : 1,
        transition: 'opacity 400ms ease',
      }}>
        {value != null && (
          <>
            <div style={{
              fontFamily:    "'Metal Mania', 'Cinzel', Georgia, serif",
              fontSize:       40,
              fontWeight:     700,
              lineHeight:     1,
              color:          resultColor,
              textShadow:     resultShadow,
              letterSpacing: '0.04em',
            }}>
              {value}
            </div>
            {winLoseLabel && (
              <div style={{
                fontFamily:    "'Inter', system-ui, sans-serif",
                fontSize:       11,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color:          winLoseLabelColor,
              }}>
                {winLoseLabel}
              </div>
            )}
          </>
        )}
        {value == null && !isRolling && (
          <div style={{
            fontFamily:    "'Inter', system-ui, sans-serif",
            fontSize:       12,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color:          '#4A453E',
          }}>
            Ready
          </div>
        )}
      </div>

      {/* Rolling indicator — strictly only during active roll */}
      {isRolling && (
        <div style={{
          fontFamily:    "'Inter', system-ui, sans-serif",
          fontSize:       11,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color:          'rgba(255,255,255,0.4)',
          minHeight:      20,
          animation:      'pulse 1s ease-in-out infinite',
        }}>
          rolling…
        </div>
      )}

      <style>{`
        @keyframes diceRollFast {
          0%   { transform: rotateX(0deg)   rotateY(0deg)   rotateZ(0deg)   scale(1); }
          15%  { transform: rotateX(25deg)  rotateY(-20deg) rotateZ(8deg)   scale(1.04); }
          30%  { transform: rotateX(-20deg) rotateY(30deg)  rotateZ(-10deg) scale(0.97); }
          45%  { transform: rotateX(30deg)  rotateY(-25deg) rotateZ(12deg)  scale(1.06); }
          60%  { transform: rotateX(-15deg) rotateY(20deg)  rotateZ(-8deg)  scale(0.96); }
          75%  { transform: rotateX(20deg)  rotateY(-15deg) rotateZ(6deg)   scale(1.03); }
          100% { transform: rotateX(0deg)   rotateY(0deg)   rotateZ(0deg)   scale(1); }
        }
        @keyframes diceRollSlow {
          0%   { transform: rotateX(0deg)   rotateY(0deg)   rotateZ(0deg)   scale(1); }
          25%  { transform: rotateX(18deg)  rotateY(-14deg) rotateZ(6deg)   scale(1.03); }
          50%  { transform: rotateX(-12deg) rotateY(18deg)  rotateZ(-7deg)  scale(0.98); }
          75%  { transform: rotateX(14deg)  rotateY(-10deg) rotateZ(4deg)   scale(1.02); }
          100% { transform: rotateX(0deg)   rotateY(0deg)   rotateZ(0deg)   scale(1); }
        }
        @keyframes diceSettle {
          0%   { transform: scale(1) rotateZ(2deg); }
          42%  { transform: scale(1.06) rotateZ(-1deg); }
          65%  { transform: scale(0.97) rotateZ(0.5deg); }
          82%  { transform: scale(1.02) rotateZ(0deg); }
          100% { transform: scale(1) rotateZ(0deg); }
        }
        @keyframes diceWinPulse {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.07); }
          100% { transform: scale(1); }
        }
        .dice-roll-fast { animation: diceRollFast 0.22s ease-in-out infinite; }
        .dice-roll-slow { animation: diceRollSlow 0.38s ease-in-out infinite; }
        .dice-settle    { animation: diceSettle 0.75s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .dice-win-pulse { animation: diceWinPulse 1.8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
