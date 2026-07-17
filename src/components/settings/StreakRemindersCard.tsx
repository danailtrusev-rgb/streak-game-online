import { useState } from 'react';
import { Bell, BellOff, Smartphone } from 'lucide-react';
import { useWebPush } from '../../hooks/useWebPush';
import PrePermissionModal from '../notifications/PrePermissionModal';

function StatusPill({ label, active }: { label: string; active: boolean }) {
  return (
    <span style={{
      fontFamily: "'Inter', system-ui, sans-serif", fontSize: 10.5, fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 9px',
      border: `1px solid ${active ? 'rgba(245,208,96,0.4)' : 'rgba(255,255,255,0.12)'}`,
      color: active ? '#F5D060' : 'rgba(255,255,255,0.4)',
      background: active ? 'rgba(245,208,96,0.08)' : 'transparent',
    }}>
      {label}
    </span>
  );
}

function ToggleRow({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', opacity: disabled ? 0.5 : 1 }}>
      <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13.5, color: 'rgba(255,255,255,0.8)' }}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        style={{
          width: 42, height: 24, borderRadius: 999, border: '1px solid rgba(255,255,255,0.14)',
          background: checked ? 'linear-gradient(180deg, #F5D060, #D4A020)' : 'rgba(255,255,255,0.06)',
          position: 'relative', cursor: disabled ? 'default' : 'pointer', flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 2, left: checked ? 20 : 2, width: 18, height: 18, borderRadius: '50%',
          background: checked ? '#1A1206' : 'rgba(255,255,255,0.5)', transition: 'left 150ms ease',
        }} />
      </button>
    </label>
  );
}

export default function StreakRemindersCard() {
  const {
    supported, needsHomeScreenInstall, permission, subscribed, prefs, loading, error,
    enableReminders, disableCurrentDevice, disableAllNotifications, updatePreference,
  } = useWebPush();
  const [showPrePermission, setShowPrePermission] = useState(false);

  return (
    <div style={{
      background: 'rgba(11,15,12,0.75)', border: '1px solid rgba(40,55,42,0.4)', padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Bell size={16} style={{ color: '#F5D060' }} strokeWidth={1.5} />
        <h3 style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.8)', margin: 0 }}>
          Streak Reminders
        </h3>
      </div>

      <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, margin: '0 0 14px' }}>
        Get a reminder when a new challenge is ready and when today's play window is close to ending.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        <StatusPill label={supported ? 'Browser: Supported' : 'Browser: Not Supported'} active={supported} />
        <StatusPill label={`Permission: ${permission === 'unsupported' ? 'N/A' : permission}`} active={permission === 'granted'} />
        <StatusPill label={subscribed ? 'This device: Subscribed' : 'This device: Not Subscribed'} active={subscribed} />
        <StatusPill label={prefs.push_enabled ? 'STS Reminders: On' : 'STS Reminders: Off'} active={prefs.push_enabled} />
      </div>

      {!supported && (
        <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          Your browser doesn't support push notifications.
        </p>
      )}

      {supported && needsHomeScreenInstall && !subscribed && (
        <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
          <Smartphone size={12} style={{ display: 'inline', marginRight: 5, verticalAlign: -1 }} />
          Add Survive the Streak to your Home Screen first, then enable reminders from here.
        </p>
      )}

      {supported && permission === 'denied' && (
        <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
          Notifications are blocked in your browser settings. You can restore permission from your browser's site settings for this page.
        </p>
      )}

      {error && (
        <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, color: '#E0785A', marginBottom: 12 }}>{error}</p>
      )}

      {supported && !subscribed && permission !== 'denied' && (
        <button
          onClick={() => setShowPrePermission(true)}
          style={{
            width: '100%', padding: '13px', border: '1px solid rgba(245,208,96,0.3)', background: 'rgba(245,208,96,0.08)',
            fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12.5, fontWeight: 600, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: '#F5D060', cursor: 'pointer', marginBottom: prefs.push_enabled ? 14 : 0,
          }}
        >
          Enable Reminders
        </button>
      )}

      {subscribed && (
        <>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4, marginBottom: 4 }}>
            <ToggleRow label="Next challenge reminder" checked={prefs.next_day_enabled} onChange={(v) => updatePreference('next_day_enabled', v)} disabled={loading} />
            <ToggleRow label="Last-call reminder" checked={prefs.last_call_enabled} onChange={(v) => updatePreference('last_call_enabled', v)} disabled={loading} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button
              onClick={disableCurrentDevice} disabled={loading}
              style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}
            >
              <BellOff size={11} style={{ display: 'inline', marginRight: 5, verticalAlign: -1 }} />
              Disable This Device
            </button>
            <button
              onClick={disableAllNotifications} disabled={loading}
              style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}
            >
              Disable All Reminders
            </button>
          </div>
        </>
      )}

      {showPrePermission && (
        <PrePermissionModal
          loading={loading}
          onEnable={async () => { const ok = await enableReminders(); if (ok) setShowPrePermission(false); }}
          onDismiss={() => setShowPrePermission(false)}
        />
      )}
    </div>
  );
}
