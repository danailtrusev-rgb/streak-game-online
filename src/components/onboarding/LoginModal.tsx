import { useState, useEffect } from 'react';
import { X, Mail, Eye, EyeOff, Lock, ChevronLeft, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const FF = "'Metal Mania', 'Cinzel', Georgia, serif";
const BF = "'Lora', Georgia, serif";
const UF = "'Inter', system-ui, sans-serif";

const inputBase: React.CSSProperties = {
  width:      '100%',
  padding:    '12px 14px',
  background: 'rgba(255,255,255,0.04)',
  border:     '1px solid rgba(255,255,255,0.10)',
  color:      '#E8E0D4',
  fontFamily: UF,
  fontSize:    14,
  outline:    'none',
  boxSizing:  'border-box',
  transition: 'border-color 0.15s ease',
};

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function PrimaryButton({ onClick, disabled, loading, children }: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width:         '100%',
        padding:       '15px',
        background:    !disabled && !loading
          ? 'linear-gradient(180deg,rgba(40,65,30,0.97)0%,rgba(22,38,16,0.99)100%)'
          : 'rgba(20,28,22,0.5)',
        border:        `1px solid ${!disabled && !loading ? 'rgba(80,140,50,0.45)' : 'rgba(40,55,42,0.15)'}`,
        cursor:        !disabled && !loading ? 'pointer' : 'not-allowed',
        fontFamily:    UF,
        fontSize:      13,
        fontWeight:    600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color:         !disabled && !loading ? '#A8D090' : 'rgba(255,255,255,0.2)',
        transition:    'all 0.15s ease',
      }}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}

function OAuthButton({ icon, label, onClick, disabled }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:     'flex',
        alignItems:  'center',
        gap:          12,
        width:       '100%',
        padding:     '13px 16px',
        background:   hovered ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.025)',
        border:      `1px solid ${hovered ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.08)'}`,
        cursor:       disabled ? 'not-allowed' : 'pointer',
        transition:  'background 0.15s ease, border-color 0.15s ease',
        opacity:      disabled ? 0.5 : 1,
      }}
    >
      <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <span style={{ fontFamily: UF, fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
        {label}
      </span>
    </button>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{ padding: '10px 14px', background: 'rgba(80,0,0,0.2)', border: '1px solid rgba(180,30,30,0.3)', fontSize: 12, color: '#CC5555', fontFamily: UF, lineHeight: 1.5 }}>
      {msg}
    </div>
  );
}

// ── Guest warning confirmation step ─────────────────────────────────────────

function GuestWarning({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 40, height: 40, background: 'rgba(255,122,0,0.08)', border: '1px solid rgba(255,122,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <LogIn size={18} style={{ color: '#FF9A30' }} />
        </div>
        <div style={{ fontFamily: FF, fontSize: 17, letterSpacing: '0.06em', color: '#F5D060' }}>
          Switch Account?
        </div>
      </div>

      <div style={{ padding: '14px 16px', background: 'rgba(255,122,0,0.05)', border: '1px solid rgba(255,122,0,0.2)', borderLeft: '2px solid rgba(255,122,0,0.5)' }}>
        <div style={{ fontFamily: UF, fontSize: 13, color: 'rgba(255,200,120,0.9)', lineHeight: 1.6, marginBottom: 8 }}>
          You are currently using a guest account.
        </div>
        <div style={{ fontFamily: BF, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>
          Logging in will switch to your existing account. Your current guest progress and wallet balance will not be transferred to the new account.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <PrimaryButton onClick={onConfirm}>
          Continue to Log In
        </PrimaryButton>
        <button
          onClick={onCancel}
          style={{ padding: '13px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontFamily: UF, fontSize: 13, color: 'rgba(255,255,255,0.45)', transition: 'color 0.15s, border-color 0.15s' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.75)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
        >
          Cancel — Keep Guest Account
        </button>
      </div>
    </div>
  );
}

// ── Email/password login flow ────────────────────────────────────────────────

function EmailLoginFlow({ onBack, onSuccess, prefillEmail }: {
  onBack: () => void;
  onSuccess: () => void;
  prefillEmail?: string;
}) {
  const { signIn } = useAuth();
  const [email, setEmail]       = useState(prefillEmail ?? '');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (prefillEmail) setEmail(prefillEmail);
  }, [prefillEmail]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit  = emailValid && password.length >= 1;

  const handleLogin = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) {
      if (err.toLowerCase().includes('invalid login') || err.toLowerCase().includes('credentials')) {
        setError('Incorrect email or password. Please try again.');
      } else {
        setError(err);
      }
      return;
    }
    onSuccess();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button
        onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: UF, fontSize: 12, color: 'rgba(255,255,255,0.4)', padding: '0 0 4px', transition: 'color 0.15s' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
      >
        <ChevronLeft size={14} /> Back
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 4 }}>
        <Mail size={18} style={{ color: '#FF9A30' }} />
        <div style={{ fontFamily: FF, fontSize: 18, letterSpacing: '0.06em', color: '#F5D060' }}>
          Log In with Email
        </div>
      </div>

      <div>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.35)', fontFamily: UF, marginBottom: 7 }}>
          Email Address
        </div>
        <div style={{ position: 'relative' }}>
          <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ ...inputBase, paddingLeft: 36 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(255,122,0,0.45)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
            autoFocus={!prefillEmail}
          />
        </div>
      </div>

      <div>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.35)', fontFamily: UF, marginBottom: 7 }}>
          Password
        </div>
        <div style={{ position: 'relative' }}>
          <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
          <input
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            style={{ ...inputBase, paddingLeft: 36, paddingRight: 40 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(255,122,0,0.45)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
            onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleLogin()}
            autoFocus={!!prefillEmail}
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}
          >
            {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {error && <ErrorBox msg={error} />}

      <PrimaryButton onClick={handleLogin} disabled={!canSubmit} loading={loading}>
        Log In
      </PrimaryButton>

      <div style={{ textAlign: 'center' }}>
        <button
          style={{ background: 'none', border: 'none', cursor: 'default', fontFamily: UF, fontSize: 12, color: 'rgba(255,255,255,0.2)', padding: '2px 0' }}
          title="Password reset coming soon"
        >
          Forgot password?
        </button>
      </div>
    </div>
  );
}

// ── OAuth login flow ──────────────────────────────────────────────────────────

function OAuthLoginFlow({ provider, onBack }: { provider: 'google' | 'facebook'; onBack: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const label = provider === 'google' ? 'Google' : 'Facebook';
  const Icon  = provider === 'google' ? GoogleIcon : FacebookIcon;

  const handleOAuth = async () => {
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({ provider });
    setLoading(false);
    if (err) {
      if (err.message.toLowerCase().includes('provider') || err.message.toLowerCase().includes('not enabled')) {
        setError(`${label} sign-in is not yet configured. Enable the ${label} provider in the Supabase dashboard.`);
      } else {
        setError(err.message);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button
        onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: UF, fontSize: 12, color: 'rgba(255,255,255,0.4)', padding: '0 0 4px', transition: 'color 0.15s' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
      >
        <ChevronLeft size={14} /> Back
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 4 }}>
        <Icon />
        <div style={{ fontFamily: FF, fontSize: 18, letterSpacing: '0.06em', color: '#F5D060' }}>
          Log In with {label}
        </div>
      </div>

      <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: BF, lineHeight: 1.6 }}>
        You will be redirected to {label} to authenticate. Return here after signing in.
      </div>

      {error && (
        <div style={{ padding: '12px 14px', background: 'rgba(255,122,0,0.05)', border: '1px solid rgba(255,122,0,0.2)', fontSize: 12, color: 'rgba(255,200,100,0.8)', fontFamily: BF, lineHeight: 1.6 }}>
          {error}
        </div>
      )}

      <PrimaryButton onClick={handleOAuth} loading={loading}>
        Continue with {label}
      </PrimaryButton>
    </div>
  );
}

// ── Main method selection ────────────────────────────────────────────────────

type LoginView = 'methods' | 'email' | 'google' | 'facebook';

interface LoginModalProps {
  onClose: () => void;
  onSuccess: () => void;
  prefillEmail?: string;
}

export default function LoginModal({ onClose, onSuccess, prefillEmail }: LoginModalProps) {
  const { isGuest } = useAuth();

  // If guest, show warning first; track if they confirmed
  const [guestWarningDismissed, setGuestWarningDismissed] = useState(!isGuest);
  const [view, setView] = useState<LoginView>('methods');

  // If warning not yet dismissed, show it first
  if (!guestWarningDismissed) {
    return (
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      >
        <div
          style={{ width: '100%', maxWidth: 420, background: 'linear-gradient(180deg,rgba(14,20,16,0.99)0%,rgba(8,12,9,0.99)100%)', border: '1px solid rgba(245,208,96,0.12)', boxShadow: '0 24px 80px rgba(0,0,0,0.95)', position: 'relative', overflow: 'hidden' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(255,122,0,0.4),transparent)' }} />
          <div style={{ padding: '28px 24px' }}>
            <button
              onClick={onClose}
              style={{ position: 'absolute', top: 14, right: 14, width: 30, height: 30, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', transition: 'color 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
            >
              <X size={15} />
            </button>
            <GuestWarning
              onConfirm={() => setGuestWarningDismissed(true)}
              onCancel={onClose}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={view === 'methods' ? onClose : undefined}
    >
      <div
        style={{ width: '100%', maxWidth: 420, background: 'linear-gradient(180deg,rgba(14,20,16,0.99)0%,rgba(8,12,9,0.99)100%)', border: '1px solid rgba(245,208,96,0.12)', boxShadow: '0 24px 80px rgba(0,0,0,0.95)', position: 'relative', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(255,122,0,0.4),transparent)' }} />

        <div style={{ padding: '28px 24px 28px' }}>
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: 14, right: 14, width: 30, height: 30, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', transition: 'color 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
          >
            <X size={15} />
          </button>

          {view === 'methods' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2 style={{ fontFamily: FF, fontSize: 22, letterSpacing: '0.08em', color: '#F5D060', textShadow: '0 0 20px rgba(245,208,96,0.3)', margin: '0 0 6px' }}>
                  Log In
                </h2>
                <p style={{ fontFamily: BF, fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.65, margin: 0 }}>
                  Access your existing account to restore your streak, wallet, and progress.
                </p>
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <OAuthButton
                  icon={<Mail size={20} strokeWidth={1.4} style={{ color: 'rgba(255,255,255,0.6)' }} />}
                  label="Continue with Email"
                  onClick={() => setView('email')}
                  disabled={false}
                />
                <OAuthButton
                  icon={<GoogleIcon />}
                  label="Continue with Google"
                  onClick={() => setView('google')}
                  disabled={false}
                />
                <OAuthButton
                  icon={<FacebookIcon />}
                  label="Continue with Facebook"
                  onClick={() => setView('facebook')}
                  disabled={false}
                />
              </div>

              <div style={{ textAlign: 'center', paddingTop: 4 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: UF, lineHeight: 1.6 }}>
                  Logging in will switch you to your existing account.
                </div>
              </div>
            </div>
          )}

          {view === 'email' && (
            <EmailLoginFlow
              onBack={() => setView('methods')}
              onSuccess={onSuccess}
              prefillEmail={prefillEmail}
            />
          )}

          {view === 'google' && (
            <OAuthLoginFlow provider="google" onBack={() => setView('methods')} />
          )}

          {view === 'facebook' && (
            <OAuthLoginFlow provider="facebook" onBack={() => setView('methods')} />
          )}
        </div>
      </div>
    </div>
  );
}
