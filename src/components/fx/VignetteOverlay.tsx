export interface VignetteOverlayProps {
  /** How strong the vignette is (0–1). Default 0.65 */
  strength?:  number;
  /** Vertical focal point (0–100%). Default '35%' */
  focalY?:    string;
  /** Clear radius as a percentage. Default '25%' */
  clearRadius?: string;
  style?:     React.CSSProperties;
  className?: string;
  zIndex?:    number;
}

export default function VignetteOverlay({
  strength    = 0.65,
  focalY      = '35%',
  clearRadius = '25%',
  style,
  className,
  zIndex      = 1,
}: VignetteOverlayProps) {
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        position:      'absolute',
        inset:          0,
        pointerEvents: 'none',
        zIndex,
        background:    `radial-gradient(ellipse at 50% ${focalY}, transparent ${clearRadius}, rgba(0,0,0,${strength}) 100%)`,
        ...style,
      }}
    />
  );
}
