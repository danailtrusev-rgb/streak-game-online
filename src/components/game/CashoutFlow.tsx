import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../hooks/useGame';
import { useAuth } from '../../context/AuthContext';
import { formatCents } from '../../lib/constants';
import { cashoutContent, fillCashoutTemplate as fill } from '../../lib/cashoutMessages';
import type { CashoutResult } from '../../lib/types';

type Stage = 'confirm' | 'processing' | 'success' | 'error';
type ErrorKind = 'rejected' | 'uncertain' | 'already_processed' | 'no_pot';

interface CashoutFlowProps {
  /** Current pot in cents — a real, already-known value from playerState/game_state. Never client-authoritative for the actual payout; the server recalculates and confirms the final amount independently. */
  potCents: number;
  streak: number;
  /**
   * Whether the player can start a brand-new run again *today* (from the
   * real `played_today` flag the game already tracks) — used only to pick
   * the correct "today" vs "tomorrow" tomorrow-hook wording. Never
   * invented client-side.
   */
  playedToday: boolean;
  onClose: () => void;
  /** Called once, only after a real server-confirmed success. */
  onSuccess?: (result: CashoutResult) => void;
}

const SLOW_PROCESSING_MS = 6000;

export default function CashoutFlow({ potCents, streak, playedToday, onClose, onSuccess }: CashoutFlowProps) {
  const navigate = useNavigate();
  const { cashout, error: gameError } = useGame(); // intentionally a fresh, self-contained instance — see PROJECT_CHANGELOG.md
  const { refresh, playerState } = useAuth();

  const [stage, setStage] = useState<Stage>('confirm');
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [result, setResult] = useState<CashoutResult | null>(null);
  const [slowProcessing, setSlowProcessing] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const submittingRef = useRef(false); // synchronous double-submit guard — checked before any async work
  const panelRef = useRef<HTMLDivElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const amountLabel = `€${formatCents(potCents)}`;

  // ── Accessibility: focus trap + Escape handling ────────────────────────
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = panel.querySelectorAll<HTMLElement>('button, a[href], input, [tabindex]:not([tabindex="-1"])');
    focusable[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Never allow Escape to close while a transaction is actively processing.
        if (stage === 'processing') return;
        if (stage === 'confirm') onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const nodes = Array.from(focusable);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [stage, onClose]);

  // Announce stage changes to screen readers.
  useEffect(() => {
    if (!liveRegionRef.current) return;
    const text =
      stage === 'processing' ? cashoutContent.processing.title :
      stage === 'success' ? cashoutContent.success.title :
      stage === 'error' ? errorTitleFor(errorKind) :
      '';
    liveRegionRef.current.textContent = text;
  }, [stage, errorKind]);

  useEffect(() => () => { if (slowTimerRef.current) clearTimeout(slowTimerRef.current); }, []);

  const handleConfirm = useCallback(async () => {
    if (submittingRef.current) return; // guards double-click even before React re-renders the disabled state
    submittingRef.current = true;
    setStage('processing');
    setSlowProcessing(false);
    slowTimerRef.current = setTimeout(() => setSlowProcessing(true), SLOW_PROCESSING_MS);

    try {
      const res = await cashout('daily_gate');
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);

      if (res) {
        // Real server-confirmed result only — never shown before this point.
        setResult(res);
        setStage('success');
        onSuccess?.(res);
        return;
      }

      // cashout() returned null on a structured RPC error. Because
      // cashout_game() is a single atomic Postgres function, any explicit
      // error response means the whole transaction rolled back — no
      // partial state, so it's safe to say "nothing changed." Refine
      // exactly which error message via the effect below (gameError
      // updates on the same render cycle as the null return).
      setStage('error');
    } catch (err) {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      // A thrown (not RPC-structured) error — most likely a network
      // failure where we genuinely don't know if the server received or
      // finished the request. Never claim "nothing changed" here.
      setErrorKind('uncertain');
      setErrorDetail(err instanceof Error ? err.message : null);
      setStage('error');
    } finally {
      submittingRef.current = false;
    }
  }, [cashout, onSuccess]);

  // Refine the error classification once useGame's own error state updates.
  useEffect(() => {
    if (stage !== 'error' || errorKind === 'uncertain') return;
    if (gameError && /no pot to cash out/i.test(gameError)) {
      setErrorKind('already_processed');
    } else if (gameError) {
      setErrorKind('rejected');
      setErrorDetail(gameError);
    }
  }, [stage, gameError, errorKind]);

  const handleRetryStatus = useCallback(async () => {
    setCheckingStatus(true);
    try {
      await refresh();
      const currentPot = playerState?.game_state?.pot_cents ?? 0;
      if (currentPot === 0) {
        // Can't fabricate a transaction id/amount we were never given —
        // just confirm the pot is gone rather than presenting a fake
        // success screen.
        setErrorKind('already_processed');
        setStage('error');
      } else {
        setStage('confirm');
        setErrorKind(null);
        setErrorDetail(null);
      }
    } finally {
      setCheckingStatus(false);
    }
  }, [refresh, playerState]);

  const handleReturnHome = () => { onClose(); navigate('/play'); };
  const handleViewWallet = () => { onClose(); navigate('/wallet'); };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cashout-flow-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(3,5,4,0.94)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={stage === 'processing' ? undefined : onClose}
    >
      <div ref={liveRegionRef} aria-live="polite" role="status" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }} />

      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 400,
          background: 'linear-gradient(180deg, rgba(16,22,18,0.99) 0%, rgba(9,13,10,0.99) 100%)',
          border: '1px solid rgba(245,208,96,0.22)',
          boxShadow: '0 24px 70px rgba(0,0,0,0.9)',
          padding: '30px 24px 24px',
          position: 'relative',
        }}
      >
        {stage !== 'processing' && (
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute', top: 12, right: 12,
              width: 30, height: 30,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
        )}

        {stage === 'confirm' && (
          <ConfirmStage
            amountLabel={amountLabel}
            streak={streak}
            playedToday={playedToday}
            onConfirm={handleConfirm}
            onCancel={onClose}
          />
        )}
        {stage === 'processing' && <ProcessingStage slow={slowProcessing} />}
        {stage === 'success' && result && (
          <SuccessStage
            result={result}
            onReturnHome={handleReturnHome}
            onViewWallet={handleViewWallet}
          />
        )}
        {stage === 'error' && (
          <ErrorStage
            kind={errorKind}
            detail={errorDetail}
            checkingStatus={checkingStatus}
            onRetryStatus={handleRetryStatus}
            onReturnHome={handleReturnHome}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}

function errorTitleFor(kind: ErrorKind | null): string {
  switch (kind) {
    case 'rejected': return cashoutContent.error.rejectedTitle;
    case 'uncertain': return cashoutContent.error.uncertainTitle;
    case 'already_processed': return cashoutContent.error.alreadyProcessedTitle;
    case 'no_pot': return cashoutContent.error.noPotTitle;
    default: return cashoutContent.error.rejectedTitle;
  }
}

// ── Stage 2 — Confirmation ─────────────────────────────────────────────────

function ConfirmStage({
  amountLabel, streak, playedToday, onConfirm, onCancel,
}: {
  amountLabel: string; streak: number; playedToday: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const c = cashoutContent.confirm;
  return (
    <>
      <h2 id="cashout-flow-title" style={{
        fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
        fontSize: 21, letterSpacing: '0.05em', color: '#E8E0D4', textAlign: 'center',
        margin: '0 0 10px',
      }}>
        {c.title}
      </h2>
      <p style={{
        fontFamily: "'Lora', Georgia, serif", fontSize: 13.5, lineHeight: 1.6,
        color: 'rgba(255,255,255,0.6)', textAlign: 'center', margin: '0 0 20px',
      }}>
        {fill(c.body, { amount: amountLabel })}
      </p>

      {/* Decision summary — real values only */}
      <div style={{ border: '1px solid rgba(245,208,96,0.18)', background: 'rgba(0,0,0,0.3)', marginBottom: 20 }}>
        <SummaryRow label={c.summaryStreakLabel} value={fill(c.summaryStreakValue, { streak })} />
        <SummaryRow label={c.summaryValueLabel} value={amountLabel} highlight />
        <SummaryRow
          label={c.summaryAfterLabel}
          value={playedToday ? c.summaryAfterValueSameDay : c.summaryAfterValueNextDay}
          small
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={onConfirm}
          style={{
            width: '100%', padding: '16px', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(180deg, #F5D060 0%, #D4A020 100%)',
            fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
            fontSize: 18, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: '#1A1206',
          }}
        >
          {fill(c.primaryCta, { amount: amountLabel })}
        </button>
        <button
          onClick={onCancel}
          style={{
            width: '100%', padding: '14px', background: 'transparent',
            border: '1px solid rgba(255,255,255,0.14)', cursor: 'pointer',
            fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13,
            letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)',
          }}
        >
          {c.secondaryCta}
        </button>
      </div>
    </>
  );
}

function SummaryRow({ label, value, highlight, small }: { label: string; value: string; highlight?: boolean; small?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)',
    }}>
      <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
        {label}
      </span>
      <span style={{
        fontFamily: highlight ? "'Lora', Georgia, serif" : "'Inter', system-ui, sans-serif",
        fontSize: small ? 12 : highlight ? 20 : 13,
        fontWeight: highlight ? 700 : 500,
        color: highlight ? '#F5D060' : 'rgba(255,255,255,0.75)',
        textAlign: 'right',
        lineHeight: 1.4,
      }}>
        {value}
      </span>
    </div>
  );
}

// ── Stage 3 — Processing ────────────────────────────────────────────────────

function ProcessingStage({ slow }: { slow: boolean }) {
  const c = cashoutContent.processing;
  return (
    <div style={{ textAlign: 'center', padding: '20px 4px' }}>
      <div
        aria-hidden="true"
        style={{
          width: 46, height: 46, margin: '0 auto 20px',
          border: '3px solid rgba(245,208,96,0.2)',
          borderTopColor: '#F5D060',
          borderRadius: '50%',
          animation: 'cashout-spin 900ms linear infinite',
        }}
      />
      <h2 id="cashout-flow-title" style={{
        fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif", fontSize: 19,
        color: '#E8E0D4', margin: '0 0 10px',
      }}>
        {c.title}
      </h2>
      <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0 }}>
        {slow ? c.slowBody : c.body}
      </p>
      <style>{'@keyframes cashout-spin { to { transform: rotate(360deg); } } @media (prefers-reduced-motion: reduce) { [style*="cashout-spin"] { animation: none !important; } }'}</style>
    </div>
  );
}

// ── Stage 4 — Success ───────────────────────────────────────────────────────

function SuccessStage({
  result, onReturnHome, onViewWallet,
}: {
  result: CashoutResult;
  onReturnHome: () => void;
  onViewWallet: () => void;
}) {
  const c = cashoutContent.success;
  const amountLabel = `€${formatCents(result.cashout_amount_cents)}`;
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        aria-hidden="true"
        style={{
          width: 64, height: 64, margin: '0 auto 18px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,208,96,0.22) 0%, transparent 70%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'cashout-pulse 1400ms ease-out 1',
        }}
      >
        <div style={{ width: 34, height: 34, borderRadius: '50%', border: '2px solid #F5D060' }} />
      </div>

      <h2 id="cashout-flow-title" style={{
        fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif", fontSize: 21,
        letterSpacing: '0.05em', color: '#F5D060', margin: '0 0 12px',
        textShadow: '0 0 18px rgba(245,208,96,0.4)',
      }}>
        {c.title}
      </h2>

      <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 34, fontWeight: 700, color: '#F5D060', marginBottom: 6 }}>
        {amountLabel}
      </div>
      <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 4px' }}>
        {fill(c.consequence, { amount: amountLabel })}
      </p>
      <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 4px' }}>
        {fill(c.streakMessage, { streak: result.streak === 0 ? '' : result.streak })}
      </p>
      <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 12.5, color: 'rgba(255,255,255,0.4)', margin: '0 0 18px' }}>
        {result.played_today ? c.tomorrowHookSameDay : c.tomorrowHookNextDay}
      </p>

      <div style={{
        fontFamily: "'Inter', system-ui, sans-serif", fontSize: 10.5, color: 'rgba(255,255,255,0.3)',
        letterSpacing: '0.06em', marginBottom: 22, wordBreak: 'break-all',
      }}>
        {c.transactionLabel}: {result.transaction_id}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={onReturnHome}
          style={{
            width: '100%', padding: '15px', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(180deg, #F5D060 0%, #D4A020 100%)',
            fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
            fontSize: 17, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#1A1206',
          }}
        >
          {c.primaryCta}
        </button>
        <button
          onClick={onViewWallet}
          style={{
            width: '100%', padding: '13px', background: 'transparent',
            border: '1px solid rgba(255,255,255,0.14)', cursor: 'pointer',
            fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12.5,
            letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)',
          }}
        >
          {c.secondaryCta}
        </button>
      </div>
      <style>{'@keyframes cashout-pulse { 0% { transform: scale(0.85); opacity: 0; } 40% { opacity: 1; } 100% { transform: scale(1.15); opacity: 0; } } @media (prefers-reduced-motion: reduce) { [style*="cashout-pulse"] { animation: none !important; } }'}</style>
    </div>
  );
}

// ── Error / recovery states ─────────────────────────────────────────────────

function ErrorStage({
  kind, detail, checkingStatus, onRetryStatus, onReturnHome,
}: {
  kind: ErrorKind | null;
  detail: string | null;
  checkingStatus: boolean;
  onRetryStatus: () => void;
  onReturnHome: () => void;
}) {
  const e = cashoutContent.error;
  const title =
    kind === 'uncertain' ? e.uncertainTitle :
    kind === 'already_processed' ? e.alreadyProcessedTitle :
    kind === 'no_pot' ? e.noPotTitle :
    e.rejectedTitle;
  const body =
    kind === 'uncertain' ? e.uncertainBody :
    kind === 'already_processed' ? e.alreadyProcessedBody :
    kind === 'no_pot' ? e.noPotBody :
    e.rejectedBody;

  return (
    <div style={{ textAlign: 'center' }}>
      <h2 id="cashout-flow-title" style={{
        fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif", fontSize: 19,
        color: '#CC4444', margin: '0 0 10px',
      }}>
        {title}
      </h2>
      <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: '0 0 6px' }}>
        {body}
      </p>
      {detail && kind === 'rejected' && (
        <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '0 0 18px' }}>
          {detail}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
        {kind === 'uncertain' && (
          <button
            onClick={onRetryStatus}
            disabled={checkingStatus}
            style={{
              width: '100%', padding: '14px', cursor: checkingStatus ? 'default' : 'pointer',
              background: 'rgba(245,208,96,0.1)', border: '1px solid rgba(245,208,96,0.3)',
              fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: '#F5D060', opacity: checkingStatus ? 0.6 : 1,
            }}
          >
            {checkingStatus ? '…' : e.retryStatusCta}
          </button>
        )}
        <button
          onClick={onReturnHome}
          style={{
            width: '100%', padding: '14px', background: 'transparent',
            border: '1px solid rgba(255,255,255,0.14)', cursor: 'pointer',
            fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13,
            letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)',
          }}
        >
          {e.returnHomeCta}
        </button>
      </div>
    </div>
  );
}
