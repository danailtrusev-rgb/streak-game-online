import { useState, useEffect } from 'react';
import MissingAssetOverlay from './MissingAssetOverlay';

interface ValidatedImageProps {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  inline?: boolean;
}

export default function ValidatedImage({ src, alt = '', className, style, inline = true }: ValidatedImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const imgSrc = (e.target as HTMLImageElement).src;
    const path = imgSrc.replace(window.location.origin, '');
    console.error('Missing Asset:', path);
    setFailed(true);
  };

  if (failed) {
    return <MissingAssetOverlay filePath={src} inline={inline} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={handleError}
      draggable={false}
    />
  );
}
