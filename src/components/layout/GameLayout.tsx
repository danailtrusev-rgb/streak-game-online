import { Outlet } from 'react-router-dom';

/**
 * Bare layout for active game screens and admin.
 * No GameHUD header, no BottomNav — games own their full viewport.
 */
export default function GameLayout() {
  return (
    <div
      style={{
        display:       'flex',
        flexDirection: 'column',
        minHeight:     '100dvh',
        position:      'relative',
        background:    'linear-gradient(180deg, #070A08 0%, #0B0F0C 25%, #0E1410 60%, #080C09 100%)',
        overflow:      'hidden',
      }}
    >
      <Outlet />
    </div>
  );
}
