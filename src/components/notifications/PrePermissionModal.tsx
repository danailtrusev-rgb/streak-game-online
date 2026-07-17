import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';
import { Bell, X } from 'lucide-react';
import { isIOS, requiresHomeScreenInstall } from '../../lib/webPush';

interface PrePermissionModalProps {
  onEnable: () => void;
  onDismiss: () => void;
  loading?: boolean;
}

/**
 * The ONLY UI in this project that leads to calling
 * Notification.requestPermission() — always shown first, always
 * dismissible, never triggered automatically. On iOS/iPadOS Safari
 * outside Home Screen mode, shows install instructions instead of an
 * Enable button, since Web Push there requires an installed PWA.
 */
export default function PrePermissionModal({ onEnable, onDismiss, loading = false }: PrePermissionModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const needsInstall = requiresHomeScreenInstall();

  useEffect(() => {
    const first = panelRef.current?.querySelector<HTMLElement>('button');
    first?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDismiss(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  return createPortal(
    <div
      role="dialog" aria-modal="true" aria-labelledby="pre-permission-title"
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(3,5,4,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onDismiss}
    >
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 380, position: 'relative',
          background: 'linear-gradient(180deg, rgba(16,22,18,0.99) 0%, rgba(9,13,10,0.99) 100%)',
          border: '1px solid rgba(245,208,96,0.2)', boxShadow: '0 24px 70px rgba(0,0,0,0.85)',
          padding: '30px 24px 24px', textAlign: 'center',
        }}
      >
        <button
          onClick={onDismiss} aria-label="Close"
          style={{ position: 'absolute', top: 12, right: 12, width: 30, height: 30, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <X size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
        </button>

        <div style={{ width: 46, height: 46, margin: '0 auto 16px', borderRadius: '50%', background: 'rgba(245,208,96,0.1)', border: '1px solid rgba(245,208,96,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={20} style={{ color: '#F5D060' }} />
        </div>

        {needsInstall ? (
          <>
            <h2 id="pre-permission-title" style={{ fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif", fontSize: 19, color: '#E8E0D4', margin: '0 0 10px' }}>
              Add STS to your Home Screen
            </h2>
            <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 13.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.6)', margin: '0 0 20px' }}>
              Install Survive the Streak from your browser menu, open it from the new icon, then enable reminders.
            </p>
            {isIOS() && (
              <ol style={{ textAlign: 'left', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, margin: '0 0 20px', paddingLeft: 20 }}>
                <li>Tap the Share icon in Safari</li>
                <li>Tap "Add to Home Screen"</li>
                <li>Open Survive the Streak from your Home Screen</li>
                <li>Come back to Settings and tap Enable Reminders</li>
              </ol>
            )}
            <button
              onClick={onDismiss}
              style={{ width: '100%', padding: '14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}
            >
              Got It
            </button>
          </>
        ) : (
          <>
            <h2 id="pre-permission-title" style={{ fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif", fontSize: 19, color: '#E8E0D4', margin: '0 0 10px' }}>
              Protect your next chance
            </h2>
            <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 13.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.6)', margin: '0 0 20px' }}>
              Enable reminders when a new challenge is ready and when today's play window is nearly over.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={onEnable} disabled={loading}
                style={{ width: '100%', padding: '15px', border: 'none', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, background: 'linear-gradient(180deg, #F5D060 0%, #D4A020 100%)', fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif", fontSize: 17, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#1A1206' }}
              >
                {loading ? '…' : 'Enable Reminders'}
              </button>
              <button
                onClick={onDismiss}
                style={{ width: '100%', padding: '13px', background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}
              >
                Not Now
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
