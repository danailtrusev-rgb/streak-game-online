import { useMemo } from 'react';

export interface TorchFireEffectProps {
  /** Width of the flame column in px. Default 28 */
  width?:     number;
  /** Height of the flame in px. Default 60 */
  height?:    number;
  /** 0–1 overall intensity multiplier. Default 1 */
  intensity?: number;
  /** CSS color of the hottest core. Default '#FFF5C0' */
  coreColor?: string;
  /** CSS color of the mid flame. Default '#FF9A20' */
  midColor?:  string;
  /** CSS color of the outer glow. Default '#FF4A00' */
  outerColor?: string;
  /** Number of rising particles. Default 8 */
  particleCount?: number;
  /** Extra inline styles on root element */
  style?:      React.CSSProperties;
  className?:  string;
}

const TORCH_STYLE_ID = 'torch-fire-keyframes';
const TORCH_KEYFRAMES = `
@keyframes tf-flicker {
  0%,100% { transform: scaleX(1)    scaleY(1)    skewX(0deg);   opacity:1; }
  18%     { transform: scaleX(0.95) scaleY(1.03) skewX(-1.2deg); opacity:0.93; }
  35%     { transform: scaleX(1.04) scaleY(0.98) skewX(1deg);    opacity:0.97; }
  52%     { transform: scaleX(0.97) scaleY(1.04) skewX(-0.7deg); opacity:0.95; }
  68%     { transform: scaleX(1.03) scaleY(0.97) skewX(1.2deg);  opacity:0.97; }
  84%     { transform: scaleX(0.96) scaleY(1.02) skewX(-0.9deg); opacity:0.94; }
}
@keyframes tf-particle {
  0%   { transform: translateY(0)    translateX(0)   scale(1);   opacity: var(--p-op); }
  40%  { transform: translateY(-40%) translateX(var(--p-dx)) scale(0.78); opacity: calc(var(--p-op) * 0.65); }
  100% { transform: translateY(-100%) translateX(calc(var(--p-dx) * 1.4)) scale(0.2); opacity: 0; }
}
@keyframes tf-glow-pulse {
  0%,100% { opacity: 0.5; transform: scale(1); }
  50%     { opacity: 0.68; transform: scale(1.06); }
}
@media (prefers-reduced-motion: reduce) {
  .tf-flicker, .tf-particle { animation: none !important; }
  .tf-glow { animation: none !important; opacity: 0.5 !important; }
}`;

function ensureTorchStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(TORCH_STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = TORCH_STYLE_ID;
  s.textContent = TORCH_KEYFRAMES;
  document.head.appendChild(s);
}

function seededRand(seed: number) {
  let s = seed;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) | 0; return (s >>> 0) / 0x100000000; };
}

export default function TorchFireEffect({
  width          = 28,
  height         = 60,
  intensity      = 1,
  coreColor      = '#FFF5C0',
  midColor       = '#FF9A20',
  outerColor     = '#FF4A00',
  particleCount  = 8,
  style,
  className,
}: TorchFireEffectProps) {
  ensureTorchStyles();

  const particles = useMemo(() => {
    const rand = seededRand(0xf1f0 ^ particleCount);
    return Array.from({ length: particleCount }, (_, i) => ({
      id:       i,
      left:     20 + rand() * 60,
      bottom:   rand() * 30,
      size:     (1.5 + rand() * 2) * intensity,
      dx:       (rand() - 0.5) * width * 0.5,
      duration: 1.4 + rand() * 1.4,
      delay:    rand() * -3,
      opacity:  (0.5 + rand() * 0.45) * intensity,
    }));
  }, [particleCount, intensity, width]);

  // Slower, calmer flicker: 0.55–0.7s base
  const flickerDuration = 0.55 + (1 - intensity) * 0.15;

  return (
    <div
      className={className}
      aria-hidden="true"
      style={{
        position:   'relative',
        width,
        height,
        mixBlendMode: 'screen',
        ...style,
      }}
    >
      {/* Outer glow halo */}
      <div
        className="tf-glow"
        style={{
          position:     'absolute',
          bottom:       '-20%',
          left:         '50%',
          transform:    'translateX(-50%)',
          width:        width * 2.4,
          height:       height * 1.5,
          borderRadius: '50%',
          background:   `radial-gradient(ellipse at 50% 70%, ${outerColor}40 0%, ${outerColor}18 40%, transparent 70%)`,
          opacity:      0.6 * intensity,
          pointerEvents:'none',
          animation:    `tf-glow-pulse 2.8s ease-in-out infinite`,
        }}
      />

      {/* Flame body — layered cones */}
      <div
        className="tf-flicker"
        style={{
          position:    'absolute',
          inset:       0,
          transformOrigin: '50% 90%',
          animation:   `tf-flicker ${flickerDuration}s ease-in-out infinite`,
        }}
      >
        {/* Outermost — coolest */}
        <div style={{
          position:    'absolute',
          bottom:       0,
          left:        '50%',
          transform:   'translateX(-50%)',
          width:       '100%',
          height:      '85%',
          background:  `radial-gradient(ellipse 55% 100% at 50% 100%, ${outerColor}CC 0%, ${outerColor}44 55%, transparent 100%)`,
          filter:      'blur(3px)',
        }} />
        {/* Mid */}
        <div style={{
          position:    'absolute',
          bottom:       0,
          left:        '50%',
          transform:   'translateX(-50%)',
          width:       '72%',
          height:      '75%',
          background:  `radial-gradient(ellipse 52% 100% at 50% 100%, ${midColor}EE 0%, ${midColor}66 50%, transparent 100%)`,
          filter:      'blur(2px)',
        }} />
        {/* Core — hottest, white-ish */}
        <div style={{
          position:    'absolute',
          bottom:       0,
          left:        '50%',
          transform:   'translateX(-50%)',
          width:       '38%',
          height:      '55%',
          background:  `radial-gradient(ellipse 48% 100% at 50% 100%, ${coreColor} 0%, ${midColor}BB 45%, transparent 100%)`,
          filter:      'blur(1px)',
        }} />
      </div>

      {/* Rising spark particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="tf-particle"
          style={{
            position:     'absolute',
            left:         `${p.left}%`,
            bottom:       `${p.bottom}%`,
            width:         p.size,
            height:        p.size,
            borderRadius: '50%',
            background:   midColor,
            boxShadow:    `0 0 ${p.size * 2}px ${midColor}`,
            '--p-op':     p.opacity,
            '--p-dx':     `${p.dx}px`,
            animation:    `tf-particle ${p.duration}s ${p.delay}s ease-out infinite`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
