import { useMemo } from 'react';

export type BloodMoonPhase = 'idle' | 'holding' | 'resolving' | 'survived' | 'failed';

export interface BloodMoonRelicEffectProps {
  phase:         BloodMoonPhase;
  /** 0–1 hold progress (used during 'holding' phase for ring fill) */
  holdProgress?: number;
  style?:        React.CSSProperties;
  className?:    string;
}

const STYLE_ID = 'bmr-keyframes';
const KEYFRAMES = `
@keyframes bmr-pulse {
  0%,100% { transform: scale(1);    opacity: var(--bmr-op, 0.5); }
  50%     { transform: scale(1.08); opacity: calc(var(--bmr-op, 0.5) * 1.35); }
}
@keyframes bmr-glow-breathe {
  0%,100% { opacity: var(--bmr-glow-op, 0.35); filter: blur(18px); }
  50%     { opacity: calc(var(--bmr-glow-op, 0.35) * 1.5); filter: blur(22px); }
}
@keyframes bmr-smoke-rise {
  0%   { transform: translateY(0)    translateX(var(--bmr-dx, 0px)) scale(1);    opacity: 0.4; }
  60%  { transform: translateY(-45%) translateX(var(--bmr-dx, 0px)) scale(1.25); opacity: 0.2; }
  100% { transform: translateY(-90%) translateX(var(--bmr-dx, 0px)) scale(1.6);  opacity: 0; }
}
@keyframes bmr-crack-flash {
  0%,100% { opacity: 0; }
  15%     { opacity: 0.6; }
  30%     { opacity: 0.25; }
  50%     { opacity: 0.5; }
  70%     { opacity: 0.15; }
}
@keyframes bmr-gold-bloom {
  0%   { opacity: 0;    transform: scale(0.85); }
  40%  { opacity: 0.75; transform: scale(1.05); }
  100% { opacity: 0.55; transform: scale(1.0); }
}
@keyframes bmr-ring-spin {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to   { transform: translate(-50%, -50%) rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .bmr-anim { animation: none !important; }
}`;

function ensureBmrStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = KEYFRAMES;
  document.head.appendChild(s);
}

function seededRand(seed: number) {
  let s = seed;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) | 0; return (s >>> 0) / 0x100000000; };
}

export default function BloodMoonRelicEffect({
  phase,
  holdProgress = 0,
  style,
  className,
}: BloodMoonRelicEffectProps) {
  ensureBmrStyles();

  const smokeParticles = useMemo(() => {
    const rand = seededRand(0xb100d);
    return Array.from({ length: 6 }, (_, i) => ({
      id:       i,
      left:     30 + rand() * 40,
      bottom:   20 + rand() * 25,
      size:     12 + rand() * 18,
      dx:       (rand() - 0.5) * 28,
      duration: 2.2 + rand() * 1.8,
      delay:    rand() * -4,
    }));
  }, []);

  const isActive   = phase !== 'idle';
  const isFailed   = phase === 'failed';
  const isSurvived = phase === 'survived';
  const isHolding  = phase === 'holding';
  const isResolving = phase === 'resolving';

  // Primary glow color
  const glowColor = isSurvived
    ? 'rgba(245,208,80,0.55)'
    : isFailed
    ? 'rgba(110,10,10,0.7)'
    : isResolving
    ? 'rgba(180,30,10,0.65)'
    : isHolding
    ? 'rgba(160,20,10,0.55)'
    : 'rgba(130,15,8,0.4)';

  const glowOp = isSurvived ? 0.65 : isFailed ? 0.7 : isHolding || isResolving ? 0.55 : 0.38;

  // Hold progress ring — drawn as an SVG arc
  const ringRadius = 44;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - (isHolding ? holdProgress : isResolving || isSurvived || isFailed ? 1 : 0));

  return (
    <div
      className={className}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset:     0,
        pointerEvents: 'none',
        ...style,
      }}
    >
      {/* Base radial glow behind relic */}
      {isActive && (
        <div
          className="bmr-anim"
          style={{
            position:   'absolute',
            left:       '50%',
            top:        '60%',
            transform:  'translate(-50%, -50%)',
            width:      '70%',
            height:     '35%',
            borderRadius: '50%',
            background:  `radial-gradient(ellipse 80% 80% at 50% 50%, ${glowColor} 0%, transparent 70%)`,
            filter:     'blur(18px)',
            animation:  `bmr-glow-breathe ${isFailed ? '0.4s' : '2.4s'} ease-in-out infinite`,
            '--bmr-glow-op': String(glowOp),
          } as React.CSSProperties}
        />
      )}

      {/* Hold progress ring — SVG */}
      {(isHolding || isResolving) && (
        <svg
          className="bmr-anim"
          style={{
            position: 'absolute',
            left:     '50%',
            top:      '62%',
            transform: 'translate(-50%, -50%)',
            width:    100,
            height:   100,
            overflow: 'visible',
            animation: isResolving ? `bmr-ring-spin 1.2s linear infinite` : undefined,
            transformOrigin: '50% 50%',
          }}
          viewBox="0 0 100 100"
        >
          {/* Track */}
          <circle
            cx={50} cy={50} r={ringRadius}
            fill="none"
            stroke="rgba(180,60,30,0.2)"
            strokeWidth={3}
          />
          {/* Progress arc */}
          <circle
            cx={50} cy={50} r={ringRadius}
            fill="none"
            stroke={isResolving ? 'rgba(220,100,20,0.85)' : 'rgba(200,60,20,0.8)'}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={ringCircumference}
            strokeDashoffset={ringOffset}
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dashoffset 0.1s linear' }}
          />
        </svg>
      )}

      {/* Gold bloom on survive */}
      {isSurvived && (
        <div
          className="bmr-anim"
          style={{
            position:   'absolute',
            left:       '50%',
            top:        '60%',
            transform:  'translate(-50%, -50%)',
            width:      '90%',
            height:     '50%',
            borderRadius: '50%',
            background:  'radial-gradient(ellipse 70% 65% at 50% 50%, rgba(255,220,60,0.55) 0%, rgba(220,160,20,0.2) 50%, transparent 75%)',
            animation:  'bmr-gold-bloom 0.7s ease-out 1 forwards',
          }}
        />
      )}

      {/* Smoke particles on fail */}
      {isFailed && smokeParticles.map((p) => (
        <div
          key={p.id}
          className="bmr-anim"
          style={{
            position:     'absolute',
            left:         `${p.left}%`,
            bottom:       `${p.bottom}%`,
            width:         p.size,
            height:        p.size,
            borderRadius: '50%',
            background:   'rgba(40,5,5,0.55)',
            filter:       'blur(6px)',
            animation:    `bmr-smoke-rise ${p.duration}s ${p.delay}s ease-out infinite`,
            '--bmr-dx':   `${p.dx}px`,
          } as React.CSSProperties}
        />
      ))}

      {/* Dark crack-flash on fail */}
      {isFailed && (
        <div
          className="bmr-anim"
          style={{
            position:   'absolute',
            inset:       0,
            background:  'rgba(60,0,0,0.45)',
            animation:  'bmr-crack-flash 0.5s ease-in-out 3',
          }}
        />
      )}

      {/* Idle subtle pulse glow — always visible when scene loads */}
      {!isActive && (
        <div
          className="bmr-anim"
          style={{
            position:   'absolute',
            left:       '50%',
            top:        '62%',
            transform:  'translate(-50%, -50%)',
            width:      '45%',
            height:     '20%',
            borderRadius: '50%',
            background:  'radial-gradient(ellipse at 50% 50%, rgba(110,10,5,0.35) 0%, transparent 70%)',
            filter:     'blur(14px)',
            animation:  'bmr-pulse 3.8s ease-in-out infinite',
            '--bmr-op': '0.3',
          } as React.CSSProperties}
        />
      )}
    </div>
  );
}
