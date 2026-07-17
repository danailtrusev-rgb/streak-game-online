import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useWebPush } from '../../hooks/useWebPush';
import PrePermissionModal from './PrePermissionModal';
import { shouldShowReminderPrompt, recordDismissal, type PromptStore } from '../../lib/promptCooldown';

const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — required Phase 1 default
const PROMPT_VERSION = 1; // bump to reset the cooldown deliberately after a copy/behavior change

function localStorageStore(): PromptStore {
  return {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* non-fatal */ } },
  };
}

/**
 * Renders nothing (returns null) unless every condition in
 * shouldShowReminderPrompt (src/lib/promptCooldown.ts, real shared logic,
 * not a duplicate) is met. The caller (ResultModal) is responsible for
 * only mounting this after the result is fully shown and never while
 * cashout is processing — this component additionally passes fixed
 * `isCashoutOpen: false, resultSettled: true` reflecting that guarantee,
 * so the single shared gating function still covers every condition even
 * though two of them are structurally enforced by the mount point rather
 * than re-checked here.
 */
export default function ResultReminderPrompt() {
  const { supported, permission, subscribed, enableReminders, loading } = useWebPush();
  const [dismissed, setDismissed] = useState(false);
  const [showPrePermission, setShowPrePermission] = useState(false);
  const store = localStorageStore();

  const shouldShow = !dismissed && shouldShowReminderPrompt({
    supported,
    permission,
    subscribed,
    isCashoutOpen: false,
    resultSettled: true,
    store,
    promptVersion: PROMPT_VERSION,
    cooldownMs: DISMISS_COOLDOWN_MS,
  });

  if (!shouldShow) return null;

  const dismiss = () => { recordDismissal(store, PROMPT_VERSION); setDismissed(true); };

  return (
    <>
      <div style={{
        marginTop: 12, padding: '12px 14px',
        border: '1px solid rgba(245,208,96,0.16)', background: 'rgba(245,208,96,0.04)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Bell size={14} style={{ color: '#F5D060', flexShrink: 0 }} />
        <span style={{ flex: 1, fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>
          Get reminded when your next challenge is ready.
        </span>
        <button
          onClick={() => setShowPrePermission(true)}
          style={{ flexShrink: 0, padding: '7px 12px', background: 'rgba(245,208,96,0.12)', border: '1px solid rgba(245,208,96,0.3)', color: '#F5D060', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer' }}
        >
          Enable
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{ flexShrink: 0, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 16, lineHeight: 1, cursor: 'pointer', padding: 4 }}
        >
          &times;
        </button>
      </div>

      {showPrePermission && (
        <PrePermissionModal
          loading={loading}
          onEnable={async () => { await enableReminders(); setShowPrePermission(false); }}
          onDismiss={() => { setShowPrePermission(false); dismiss(); }}
        />
      )}
    </>
  );
}
