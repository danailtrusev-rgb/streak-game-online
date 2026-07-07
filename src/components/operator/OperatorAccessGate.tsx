import { useState, type FormEvent } from 'react';
import { Skull } from 'lucide-react';
import { operatorAccessContent as copy } from '../../content/operatorAccessContent';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { isPartnerPreviewActive } from '../../lib/partnerBasePath';

interface OperatorAccessGateProps {
  onAccessGranted: () => void;
}

export default function OperatorAccessGate({ onAccessGranted }: OperatorAccessGateProps) {
  useDocumentMeta({ title: copy.meta.title, robots: 'noindex, nofollow, noarchive' });
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'invalid' | 'rate_limited' | 'error'>('idle');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      const res = await fetch('/api/operator-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        onAccessGranted();
        return;
      }
      if (res.status === 429) {
        setStatus('rate_limited');
        return;
      }
      setStatus('invalid');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center',
      }}
    >
      <Skull size={36} strokeWidth={1.2} color="#D4A020" style={{ marginBottom: 18 }} />
      {isPartnerPreviewActive() && (
        <span
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#0B0F0C',
            background: '#D97757',
            borderRadius: 999,
            padding: '3px 9px',
            marginBottom: 14,
          }}
        >
          Preview Environment
        </span>
      )}
      <h1 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 'clamp(22px, 3vw, 28px)', color: '#EDEAE3', margin: '0 0 12px' }}>
        {copy.title}
      </h1>
      <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14, color: '#9C9992', maxWidth: 380, margin: '0 0 28px' }}>
        {copy.instructions}
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 320 }}>
        <label htmlFor="operator-access-code" style={{ textAlign: 'left', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9C9992' }}>
          {copy.codeLabel}
        </label>
        <input
          id="operator-access-code"
          type="password"
          autoComplete="off"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 15,
            padding: '12px 14px',
            borderRadius: 2,
            border: '1px solid rgba(212,160,32,0.25)',
            background: 'rgba(255,255,255,0.03)',
            color: '#EDEAE3',
          }}
        />
        <button
          type="submit"
          disabled={status === 'submitting' || !code}
          style={{
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#0B0F0C',
            background: 'linear-gradient(180deg, #D4A020 0%, #B08018 100%)',
            border: 'none',
            borderRadius: 2,
            padding: '13px 20px',
            cursor: status === 'submitting' || !code ? 'not-allowed' : 'pointer',
            opacity: status === 'submitting' || !code ? 0.6 : 1,
          }}
        >
          {status === 'submitting' ? '…' : copy.continueCta}
        </button>

        {status === 'invalid' && (
          <p role="alert" style={{ color: '#D97757', fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif" }}>{copy.invalidMessage}</p>
        )}
        {status === 'rate_limited' && (
          <p role="alert" style={{ color: '#D97757', fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif" }}>{copy.rateLimitedMessage}</p>
        )}
        {status === 'error' && (
          <p role="alert" style={{ color: '#D97757', fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif" }}>
            Something went wrong. Please try again.
          </p>
        )}
      </form>

      <p style={{ marginTop: 28, fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, color: '#6B6862' }}>
        {copy.contactLine}{' '}
        <a href={copy.contactHref} style={{ color: '#D4A020' }}>{copy.contactCta}</a>
      </p>
    </div>
  );
}
