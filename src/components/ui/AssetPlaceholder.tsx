import { useState } from 'react';
import { Skull, Flame, Trophy, Crown, Zap, Gamepad2 } from 'lucide-react';

type PlaceholderVariant =
  | 'game-tile'
  | 'weekend-banner'
  | 'winner-card'
  | 'flyer'
  | 'qualification-badge'
  | 'background'
  | 'button'
  | 'default';

interface AssetPlaceholderProps {
  variant?: PlaceholderVariant;
  label?: string;
  className?: string;
  aspectRatio?: string;
}

const VARIANT_CONFIG: Record<PlaceholderVariant, {
  icon: typeof Skull;
  border: string;
  bg: string;
  iconColor: string;
  pattern: boolean;
}> = {
  'game-tile': { icon: Gamepad2, border: 'border-moss-dark/40', bg: 'bg-ritual-surface/40', iconColor: 'text-bone-dark', pattern: true },
  'weekend-banner': { icon: Trophy, border: 'border-gold-400/30', bg: 'bg-gradient-to-b from-gold-500/8 to-ritual-surface/20', iconColor: 'text-gold-400', pattern: true },
  'winner-card': { icon: Crown, border: 'border-torch-orange/30', bg: 'bg-gradient-to-b from-torch-orange/8 to-ritual-surface/20', iconColor: 'text-torch-ember', pattern: false },
  'flyer': { icon: Flame, border: 'border-torch-orange/25', bg: 'bg-ritual-surface/30', iconColor: 'text-torch-dim', pattern: true },
  'qualification-badge': { icon: Zap, border: 'border-moss-mid/30', bg: 'bg-moss-dark/20', iconColor: 'text-moss-light', pattern: false },
  'background': { icon: Skull, border: 'border-transparent', bg: 'bg-ritual-bg', iconColor: 'text-bone-faint', pattern: true },
  'button': { icon: Flame, border: 'border-torch-orange/20', bg: 'bg-torch-orange/5', iconColor: 'text-torch-dim', pattern: false },
  'default': { icon: Skull, border: 'border-moss-dark/30', bg: 'bg-ritual-surface/20', iconColor: 'text-bone-dark', pattern: true },
};

export default function AssetPlaceholder({
  variant = 'default',
  label,
  className = '',
  aspectRatio = 'aspect-video',
}: AssetPlaceholderProps) {
  const cfg = VARIANT_CONFIG[variant];
  const Icon = cfg.icon;

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden border ${cfg.border} ${cfg.bg} ${aspectRatio} ${className}`}
    >
      {cfg.pattern && (
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 50%)`,
            backgroundSize: '12px 12px',
          }}
        />
      )}
      <div className="relative flex flex-col items-center gap-2 opacity-40">
        <Icon className={`h-8 w-8 ${cfg.iconColor}`} strokeWidth={0.8} />
        {label && (
          <span className="text-[8px] uppercase tracking-[0.2em] text-bone-dark text-center px-2">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackVariant?: PlaceholderVariant;
  fallbackLabel?: string;
  placeholderClassName?: string;
}

export function SafeImage({
  src,
  alt = '',
  fallbackVariant = 'default',
  fallbackLabel,
  className = '',
  placeholderClassName = '',
  ...rest
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <AssetPlaceholder
        variant={fallbackVariant}
        label={fallbackLabel ?? alt}
        className={`${className} ${placeholderClassName}`}
        aspectRatio=""
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      {...rest}
    />
  );
}
