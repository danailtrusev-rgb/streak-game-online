export interface GateGlowProps {
  /** Color of the glow. Default 'rgba(255,122,0,0.18)' */
  color?:   string;
  /** Position: 'top' | 'bottom' | 'center'. Default 'top' */
  position?: 'top' | 'bottom' | 'center';
  /** 0–1 intensity. Default 1 */
  intensity?: number;
  style?:    React.CSSProperties;
  className?: string;
  zIndex?:   number;
  /** Whether to pulse. Default true */
  pulse?:    boolean;
}

export default function GateGlow({
  color     = 'rgba(255,122,0,0.18)',
  position  = 'top',
  intensity = 1,
  style,
  className,
  zIndex    = 2,
  pulse     = true,
}: GateGlowProps) {
  const yPos = position === 'top' ? '0%' : position === 'bottom' ? '100%' : '50%';

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        position:      'absolute',
        inset:          0,
        pointerEvents: 'none',
        zIndex,
        background:    `radial-gradient(ellipse 80% 50% at 50% ${yPos}, ${color} 0%, transparent 70%)`,
        opacity:        intensity,
        animation:      pulse ? 'torchPulse 3s ease-in-out infinite' : undefined,
        ...style,
      }}
    />
  );
}
