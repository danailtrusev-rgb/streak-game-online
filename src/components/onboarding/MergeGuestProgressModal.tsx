import { useState, useEffect } from 'react';
import { X, GitMerge, Coins, Star, Shield, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const FF = "'Metal Mania', 'Cinzel', Georgia, serif";
const BF = "'Lora', Georgia, serif";
const UF = "'Inter', system-ui, sans-serif";

interface EligibilityResult {
  eligible: boolean;
  reason: string;
  wallet_cents: number;
  qualification_points: number;
  badges_count: number;
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function MergeRow({ icon, label, value, sub }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '12px 16px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
    }}>
      <div style={{
        width: 36,
        height: 36,
        background: 'rgba(255,154,48,0.08)',
        border: '1px solid rgba(255,154,48,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: '#FF9A30',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: UF, fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontFamily: UF, fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
            {sub}
          </div>
        )}
      </div>
      <div style={{ fontFamily: FF, fontSize: 15, color: '#F5D060', letterSpacing: '0.04em', flexShrink: 0 }}>
        {value}
      </div>
    </div>
  );
}

interface MergeGuestProgressModalProps {
  guestUserId: string;
  onDismiss: () => void;
  onMergeComplete: () => void;
}

export default function MergeGuestProgressModal({
  guestUserId,
  onDismiss,
  onMergeComplete,
}: MergeGuestProgressModalProps) {
  const { refresh } = useAuth();

  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [checkLoading, setCheckLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [merged, setMerged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      setCheckLoading(true);
      const { data, error: rpcErr } = await supabase.rpc('check_guest_merge_eligibility', {
        p_guest_user_id: guestUserId,
      });
      if (cancelled) return;
      setCheckLoading(false);
      if (rpcErr || !data) {
        setError('Could not check guest progress. You can continue without merging.');
        return;
      }
      setEligibility(data as EligibilityResult);
    }
    check();
    return () => { cancelled = true; };
  }, [guestUserId]);

  const hasAnything = eligibility &&
    (eligibility.wallet_cents > 0 || eligibility.qualification_points > 0 || eligibility.badges_count > 0);

  const handleMerge = async () => {
    if (!eligibility?.eligible) return;
    setMerging(true);
    setError(null);
    const { data, error: rpcErr } = await supabase.rpc('execute_guest_merge', {
      p_guest_user_id: guestUserId,
    });
    setMerging(false);
    if (rpcErr || !data) {
      setError('Merge failed. Please try again or continue without merging.');
      return;
    }
    const result = data as { success: boolean; error?: string };
    if (!result.success) {
      setError(result.error === 'already_merged'
        ? 'This guest session was already merged previously.'
        : 'Merge failed. Please try again.');
      return;
    }
    setMerged(true);
    await refresh();
    setTimeout(onMergeComplete, 1600);
  };

  const modalBase: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 300,
    background: 'rgba(0,0,0,0.92)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  };

  const cardBase: React.CSSProperties = {
    width: '100%',
    maxWidth: 440,
    background: 'linear-gradient(180deg,rgba(14,20,16,0.99)0%,rgba(8,12,9,0.99)100%)',
    border: '1px solid rgba(245,208,96,0.12)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.95)',
    position: 'relative',
    overflow: 'hidden',
  };

  // ── Merged success screen ────────────────────────────────────────────────
  if (merged) {
    return (
      <div style={modalBase}>
        <div style={cardBase}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(120,176,96,0.5),transparent)' }} />
          <div style={{ padding: '48px 28px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 60, height: 60, background: 'rgba(120,176,96,0.1)', border: '1px solid rgba(120,176,96,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={28} style={{ color: '#78B060' }} />
            </div>
            <div style={{ fontFamily: FF, fontSize: 20, color: '#F5D060', letterSpacing: '0.06em' }}>
              Progress Merged
            </div>
            <div style={{ fontFamily: BF, fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>
              Your guest session credits, points, and badges have been added to this account.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading state ────────────────────────────────────────────────────────
  if (checkLoading) {
    return (
      <div style={modalBase}>
        <div style={cardBase}>
          <div style={{ padding: '48px 28px', textAlign: 'center' }}>
            <div style={{ fontFamily: UF, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              Checking guest progress…
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Not eligible (already merged, not a guest, etc.) ─────────────────────
  if (!eligibility?.eligible) {
    return (
      <div style={modalBase}>
        <div style={cardBase}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(255,122,0,0.3),transparent)' }} />
          <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <CloseButton onClick={onDismiss} />
            <div style={{ fontFamily: FF, fontSize: 18, letterSpacing: '0.06em', color: '#F5D060' }}>
              No Merge Available
            </div>
            <div style={{ fontFamily: BF, fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>
              {eligibility?.reason === 'already_merged'
                ? 'This guest session has already been merged previously.'
                : 'No eligible guest progress was found to merge.'}
            </div>
            <DismissButton onClick={onDismiss} label="Continue" />
          </div>
        </div>
      </div>
    );
  }

  // ── Main merge offer ─────────────────────────────────────────────────────
  return (
    <div style={modalBase}>
      <div style={cardBase} onClick={(e) => e.stopPropagation()}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(245,208,96,0.4),transparent)' }} />

        <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <CloseButton onClick={onDismiss} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, background: 'rgba(255,154,48,0.08)', border: '1px solid rgba(255,154,48,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <GitMerge size={18} style={{ color: '#FF9A30' }} />
            </div>
            <div>
              <h2 style={{ fontFamily: FF, fontSize: 19, letterSpacing: '0.07em', color: '#F5D060', margin: 0 }}>
                Merge guest progress?
              </h2>
            </div>
          </div>

          {/* Body */}
          <div style={{ fontFamily: BF, fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
            You were playing as a guest before logging in. You can merge eligible guest progress into this account. Your existing account streak and pot will stay protected.
          </div>

          {/* Eligible items */}
          {hasAnything ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {eligibility.wallet_cents > 0 && (
                <MergeRow
                  icon={<Coins size={16} />}
                  label="Wallet Credits"
                  value={`€${formatCents(eligibility.wallet_cents)}`}
                  sub="Transferred from guest wallet"
                />
              )}
              {eligibility.qualification_points > 0 && (
                <MergeRow
                  icon={<Star size={16} />}
                  label="Qualification Points"
                  value={`${eligibility.qualification_points} pts`}
                  sub="Current week points added"
                />
              )}
              {eligibility.badges_count > 0 && (
                <MergeRow
                  icon={<Shield size={16} />}
                  label="Earned Badges"
                  value={`${eligibility.badges_count}`}
                  sub="Badges from real game plays"
                />
              )}
            </div>
          ) : (
            <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', fontFamily: BF, fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
              No eligible progress found in the guest session — nothing to merge.
            </div>
          )}

          {/* Protected note */}
          <div style={{ padding: '10px 14px', background: 'rgba(120,176,96,0.04)', border: '1px solid rgba(120,176,96,0.15)', borderLeft: '2px solid rgba(120,176,96,0.4)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Shield size={13} style={{ color: '#78B060', flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontFamily: UF, fontSize: 11, color: 'rgba(120,176,96,0.9)', lineHeight: 1.6 }}>
              Your existing streak, pot, and daily gate result are never touched — they always stay as-is.
            </div>
          </div>

          {/* Warning */}
          <div style={{ padding: '10px 14px', background: 'rgba(255,180,40,0.04)', border: '1px solid rgba(255,180,40,0.14)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertTriangle size={13} style={{ color: 'rgba(255,180,40,0.8)', flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontFamily: UF, fontSize: 11, color: 'rgba(255,180,40,0.75)', lineHeight: 1.6 }}>
              If you continue without merging, this guest session progress may be lost.
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(80,0,0,0.2)', border: '1px solid rgba(180,30,30,0.3)', fontSize: 12, color: '#CC5555', fontFamily: UF, lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {hasAnything && (
              <button
                onClick={handleMerge}
                disabled={merging}
                style={{
                  width: '100%',
                  padding: '15px',
                  background: !merging
                    ? 'linear-gradient(180deg,rgba(40,65,30,0.97)0%,rgba(22,38,16,0.99)100%)'
                    : 'rgba(20,28,22,0.5)',
                  border: `1px solid ${!merging ? 'rgba(80,140,50,0.45)' : 'rgba(40,55,42,0.15)'}`,
                  cursor: merging ? 'not-allowed' : 'pointer',
                  fontFamily: UF,
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: !merging ? '#A8D090' : 'rgba(255,255,255,0.2)',
                  transition: 'all 0.15s ease',
                }}
              >
                {merging ? 'Merging…' : 'Merge Eligible Progress'}
              </button>
            )}
            <DismissButton
              onClick={onDismiss}
              label={hasAnything ? 'Continue Without Merging' : 'Continue'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'absolute',
        top: 14,
        right: 14,
        width: 30,
        height: 30,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'rgba(255,255,255,0.4)',
        transition: 'color 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
    >
      <X size={15} />
    </button>
  );
}

function DismissButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '13px',
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.08)',
        cursor: 'pointer',
        fontFamily: UF,
        fontSize: 13,
        color: 'rgba(255,255,255,0.45)',
        transition: 'color 0.15s, border-color 0.15s',
        width: '100%',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.75)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
      }}
    >
      {label}
    </button>
  );
}
