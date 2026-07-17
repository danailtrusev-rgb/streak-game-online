import { useState, useEffect, useRef, useCallback } from 'react';

interface ParallaxOffset {
  x: number;
  y: number;
}

/**
 * Returns subtle parallax offsets driven by DeviceOrientation or mouse movement.
 * Offsets are in pixels, kept very small for a premium ambient feel.
 */
export function useParallax(maxOffset = 8) {
  const [offset, setOffset] = useState<ParallaxOffset>({ x: 0, y: 0 });
  const smoothRef = useRef<ParallaxOffset>({ x: 0, y: 0 });
  const targetRef = useRef<ParallaxOffset>({ x: 0, y: 0 });
  const rafRef    = useRef<number>(0);
  const hasGyro   = useRef(false);

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const tick = useCallback(() => {
    const sx = lerp(smoothRef.current.x, targetRef.current.x, 0.06);
    const sy = lerp(smoothRef.current.y, targetRef.current.y, 0.06);
    smoothRef.current = { x: sx, y: sy };
    setOffset({ x: Math.round(sx * 10) / 10, y: Math.round(sy * 10) / 10 });
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      hasGyro.current = true;
      // gamma = left/right tilt (-90 to 90), beta = front/back tilt (-180 to 180)
      const nx = Math.max(-1, Math.min(1, e.gamma / 30));
      const ny = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
      targetRef.current = { x: nx * maxOffset, y: ny * maxOffset };
    };

    const handleMouse = (e: MouseEvent) => {
      if (hasGyro.current) return;
      const nx = (e.clientX / window.innerWidth  - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      targetRef.current = { x: nx * maxOffset, y: ny * maxOffset };
    };

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('mousemove', handleMouse);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('mousemove', handleMouse);
    };
  }, [maxOffset]);

  return offset;
}
