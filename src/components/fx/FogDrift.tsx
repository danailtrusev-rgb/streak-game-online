import { useMemo } from 'react';

export interface FogDriftProps {
  /** Number of fog layers. Default 4 */
  layers?:    number;
  /** 0–1 opacity multiplier. Default 1 */
  opacity?:   number;
  /** Tint color. Default '#0B1A10' (dark jungle green) */
  color?:     string;
  style?:     React.CSSProperties;
  className?: string;
  zIndex?:    number;
}

const FOG_STYLE_ID = 'fog-drift-keyframes';
const FOG_KEYFRAMES = `
@keyframes fog-drift-l {
  0%   { transform: translateX(-12%) scaleY(1); }
  50%  { transform: translateX(6%)  scaleY(1.04); }
  100% { transform: translateX(-12%) scaleY(1); }
}
@keyframes fog-drift-r {
  0%   { transform: translateX(8%)  scaleY(1); }
  50%  { transform: translateX(-8%) scaleY(0.97); }
  100% { transform: translateX(8%)  scaleY(1); }
}
@media (prefers-reduced-motion: reduce) {
  .fog-layer { animation: none !important; }
}`;

function ensureFogStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(FOG_STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = FOG_STYLE_ID;
  s.textContent = FOG_KEYFRAMES;
  document.head.appendChild(s);
}

export default function FogDrift({
  layers  = 4,
  opacity = 1,
  color   = '#0B1A10',
  style,
  className,
  zIndex  = 2,
}: FogDriftProps) {
  ensureFogStyles();

  const defs = useMemo(() => Array.from({ length: layers }, (_, i) => {
    const even = i % 2 === 0;
    return {
      id:        i,
      bottom:    `${i * (22 / layers)}%`,
      height:    `${14 + i * 6}%`,
      opac:      (0.06 + i * 0.04) * opacity,
      duration:  18 + i * 6,
      delay:     i * -5,
      anim:      even ? 'fog-drift-l' : 'fog-drift-r',
      blur:      6 + i * 3,
    };
  }), [layers, opacity]);

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex, overflow: 'hidden', ...style }}
    >
      {defs.map((d) => (
        <div
          key={d.id}
          className="fog-layer"
          style={{
            position:   'absolute',
            left:       '-15%',
            right:      '-15%',
            bottom:      d.bottom,
            height:      d.height,
            background: `radial-gradient(ellipse 80% 100% at 50% 100%, ${color} 0%, transparent 70%)`,
            opacity:     d.opac,
            filter:     `blur(${d.blur}px)`,
            animation:  `${d.anim} ${d.duration}s ${d.delay}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}
