import { useEffect, type ReactNode } from 'react';

interface LandingShellProps {
  children: ReactNode;
}

/**
 * Public landing pages (/ and /operators) need a real desktop layout instead
 * of the game's 480px phone-frame shell. This mirrors the existing
 * `admin-wide` pattern (see AdminPage.tsx) so the rest of the app is untouched.
 */
export default function LandingShell({ children }: LandingShellProps) {
  useEffect(() => {
    document.getElementById('root')?.classList.add('landing-wide');
    return () => { document.getElementById('root')?.classList.remove('landing-wide'); };
  }, []);

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(180deg, #070A08 0%, #0B0F0C 25%, #0E1410 60%, #080C09 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient torch glow, consistent with the in-game chrome */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '45%', height: '60%', zIndex: 0, background: 'radial-gradient(ellipse at 0% 20%, rgba(255,122,0,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, right: 0, width: '45%', height: '60%', zIndex: 0, background: 'radial-gradient(ellipse at 100% 20%, rgba(255,122,0,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1120, margin: '0 auto', padding: '0 20px' }}>
        {children}
      </div>
    </div>
  );
}
