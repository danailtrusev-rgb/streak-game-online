import { useEffect, useRef, useState } from 'react';
import MissingAssetOverlay from '../ui/MissingAssetOverlay';

interface GameBackgroundProps {
  videoSrc?: string;
  imageSrc?: string;
}

export default function GameBackground({ videoSrc, imageSrc }: GameBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    setVideoError(false);
  }, [videoSrc]);

  const handleVideoError = () => {
    if (videoSrc) {
      console.error('Missing Asset:', videoSrc);
    }
    setVideoError(true);
  };

  if (videoSrc && !videoError) {
    return (
      <>
        <video
          ref={videoRef}
          key={videoSrc}
          autoPlay
          muted
          loop
          playsInline
          onError={handleVideoError}
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            objectFit: 'cover',
            zIndex: 0,
          }}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
        {videoError && <MissingAssetOverlay filePath={videoSrc} />}
      </>
    );
  }

  if (videoError && videoSrc) {
    return (
      <>
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: '#0B0F0C',
            zIndex: 0,
          }}
        />
        <MissingAssetOverlay filePath={videoSrc} />
      </>
    );
  }

  if (imageSrc) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: `url(${imageSrc})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundColor: '#0B0F0C',
          zIndex: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#0B0F0C',
        zIndex: 0,
      }}
    />
  );
}
