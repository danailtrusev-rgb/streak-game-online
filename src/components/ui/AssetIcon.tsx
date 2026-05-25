import { type LucideIcon } from 'lucide-react';
import { useState } from 'react';

interface AssetIconProps {
  src: string;
  fallback: LucideIcon;
  alt?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  strokeWidth?: number;
}

export default function AssetIcon({
  src,
  fallback: Fallback,
  alt = '',
  size = 24,
  className = '',
  style,
  strokeWidth = 1.5,
}: AssetIconProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <Fallback
        width={size}
        height={size}
        strokeWidth={strokeWidth}
        className={className}
        style={style}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain', ...style }}
      onError={() => setFailed(true)}
    />
  );
}
