import { useMemo, useEffect, useRef } from 'react';

interface FireflyDef {
  id:            number;
  x:             number;
  y:             number;
  size:          number;
  driftX:        number;
  driftY:        number;
  duration:      number;
  delay:         number;
  flashDuration: number;
  flashDelay:    number;
  opacity:       number;
}

export interface AmbientFirefliesProps {
  /** How many fireflies to render. Default 22 */
  count?:     number;
  /** Controls peak opacity and drift range */
  intensity?: 'low' | 'medium' | 'high';
  /** Extra class on the container */
  className?: string;
  /** Override z-index. Default 1 */
  zIndex?:    number;
  /** Restrict to a vertical band (0–100). Default [0,100] */
  yBand?:     [number, number];
}

// One shared style tag, injected once
const STYLE_ID = 'ff-keyframes';
const KEYFRAMES = `
@keyframes ff-drift {
  0%   { transform: translate(0, 0) scale(1); }
  20%  { transform: translate(var(--dx-a), var(--dy-a)) scale(1.05); }
  45%  { transform: translate(var(--dx-b), var(--dy-b)) scale(0.95); }
  70%  { transform: translate(var(--dx-a), calc(var(--dy-a) * -0.4)) scale(1.02); }
  100% { transform: translate(0, 0) scale(1); }
}
@keyframes ff-flash {
  0%, 100% { opacity: var(--base-op); filter: blur(0.4px); }
  45%      { opacity: var(--peak-op); filter: blur(0px); }
}
@media (prefers-reduced-motion: reduce) {
  .ff-particle {
    animation: none !important;
    opacity: var(--reduced-op) !important;
    filter: blur(0.5px) !important;
  }
}`;

function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = KEYFRAMES;
  document.head.appendChild(s);
}

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return (s >>> 0) / 0x100000000;
  };
}

export default function AmbientFireflies({
  count     = 22,
  intensity = 'medium',
  className,
  zIndex    = 1,
  yBand     = [3, 97],
}: AmbientFirefliesProps) {
  ensureKeyframes();

  const maxOp    = intensity === 'high' ? 0.82 : intensity === 'medium' ? 0.65 : 0.48;
  const minOp    = intensity === 'high' ? 0.22 : intensity === 'medium' ? 0.14 : 0.10;
  const drift    = intensity === 'high' ? 36  : intensity === 'medium' ? 28  : 18;
  const sizeMult = intensity === 'high' ? 1.2 : 1;

  const particles = useMemo<FireflyDef[]>(() => {
    const rand  = seededRand(0xc0ffee ^ count);
    const [yMin, yMax] = yBand;
    return Array.from({ length: count }, (_, i) => ({
      id:            i,
      x:             4 + rand() * 92,
      y:             yMin + rand() * (yMax - yMin),
      size:          (1.8 + rand() * 2.4) * sizeMult,
      driftX:        (rand() - 0.5) * 2 * drift,
      driftY:        (rand() - 0.5) * 2 * drift * 0.7,
      duration:      7 + rand() * 9,
      delay:         rand() * -14,
      flashDuration: 2 + rand() * 4,
      flashDelay:    rand() * -8,
      opacity:       minOp + rand() * (maxOp - minOp),
    }));
  }, [count, drift, maxOp, minOp, sizeMult, yBand]);

  return (
    <div
      className={className}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex, overflow: 'hidden' }}
    >
      {particles.map((p) => {
        const peakOp = Math.min(0.98, p.opacity * 2.4);
        const reducedOp = p.opacity * 0.55;
        return (
          <span
            key={p.id}
            className="ff-particle"
            style={{
              position:     'absolute',
              left:         `${p.x}%`,
              top:          `${p.y}%`,
              width:         p.size,
              height:        p.size,
              borderRadius: '50%',
              background:   'radial-gradient(circle, #FFFBE8 0%, #FFD44A 50%, transparent 100%)',
              boxShadow:    `0 0 ${p.size * 3}px ${p.size * 1.2}px rgba(255,218,60,0.38)`,
              '--base-op':    p.opacity,
              '--peak-op':    peakOp,
              '--reduced-op': reducedOp,
              '--dx-a':      `${p.driftX}px`,
              '--dy-a':      `${p.driftY}px`,
              '--dx-b':      `${-p.driftX * 0.55}px`,
              '--dy-b':      `${p.driftY * 0.45}px`,
              opacity:       p.opacity,
              willChange:   'transform, opacity',
              animation: [
                `ff-drift ${p.duration}s ${p.delay}s ease-in-out infinite`,
                `ff-flash ${p.flashDuration}s ${p.flashDelay}s ease-in-out infinite`,
              ].join(', '),
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}
