export interface InnerLightPulseProps {
  /** Glow color. Default 'rgba(245,208,96,0.12)' */
  color?:    string;
  /** Size as a CSS width/height value. Default '60%' */
  size?:     string;
  /** Position x. Default '50%' */
  x?:        string;
  /** Position y. Default '40%' */
  y?:        string;
  /** Pulse speed in seconds. Default 2.8 */
  speed?:    number;
  style?:    React.CSSProperties;
  className?: string;
  zIndex?:   number;
}

const ILP_STYLE_ID = 'ilp-keyframes';
const ILP_KEYFRAMES = `
@keyframes ilp-pulse {
  0%,100% { transform: translate(-50%,-50%) scale(1);    opacity: var(--ilp-lo); }
  50%     { transform: translate(-50%,-50%) scale(1.18); opacity: var(--ilp-hi); }
}
@media (prefers-reduced-motion: reduce) {
  .ilp-pulse { animation: none !important; opacity: var(--ilp-lo) !important; transform: translate(-50%,-50%) !important; }
}`;

function ensureILPStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(ILP_STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = ILP_STYLE_ID;
  s.textContent = ILP_KEYFRAMES;
  document.head.appendChild(s);
}

export default function InnerLightPulse({
  color = 'rgba(245,208,96,0.12)',
  size  = '60%',
  x     = '50%',
  y     = '40%',
  speed = 2.8,
  style,
  className,
  zIndex = 2,
}: InnerLightPulseProps) {
  ensureILPStyles();

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex, overflow: 'hidden', ...style }}
    >
      <div
        className="ilp-pulse"
        style={{
          position:     'absolute',
          left:          x,
          top:           y,
          width:         size,
          paddingBottom: size,
          transform:    'translate(-50%,-50%)',
          borderRadius: '50%',
          background:   `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          '--ilp-lo':   0.6,
          '--ilp-hi':   1,
          animation:    `ilp-pulse ${speed}s ease-in-out infinite`,
        } as React.CSSProperties}
      />
    </div>
  );
}
