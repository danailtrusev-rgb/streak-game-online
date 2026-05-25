import { useMemo } from 'react';

const EMBER_COUNT = 18;

export default function EmberParticles() {
  const embers = useMemo(() => {
    return Array.from({ length: EMBER_COUNT }, (_, i) => ({
      id: i,
      left: `${5 + Math.random() * 90}%`,
      bottom: `${-5 - Math.random() * 15}%`,
      size: 2 + Math.random() * 2,
      duration: 6 + Math.random() * 8,
      delay: Math.random() * 10,
      opacity: 0.3 + Math.random() * 0.5,
    }));
  }, []);

  return (
    <div className="ritual-embers">
      {embers.map((e) => (
        <div
          key={e.id}
          className="ember"
          style={{
            left: e.left,
            bottom: e.bottom,
            width: e.size,
            height: e.size,
            animationDuration: `${e.duration}s`,
            animationDelay: `${e.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
