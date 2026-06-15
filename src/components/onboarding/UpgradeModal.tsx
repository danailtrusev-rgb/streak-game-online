import { useState, useEffect, useRef } from 'react';
import {
  X, Mail, ChevronLeft, RefreshCw, Check, Eye, EyeOff, Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';

// ── Shared ─────────────────────────────────────────────────────────────────

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

// ── Countdown hook ──────────────────────────────────────────────────────────

function useCountdown(sentAt: number | null, duration = 120) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!sentAt) { setRemaining(0); return; }
    const calc = () => {
      const elapsed = Math.floor((Date.now() - sentAt) / 1000);
      setRemaining(Math.max(0, duration - elapsed));
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [sentAt, duration]);
  return remaining;
}

// ── 6-digit code input ──────────────────────────────────────────────────────

function CodeInput({ onSubmit, loading }: { onSubmit: (code: string) => void; loading: boolean }) {
  const { t } = useI18n();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null));

  const handleChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...digits];
    next[i] = val.slice(-1);
    setDigits(next);
    if (val && i < 5) inputRefs[i + 1].current?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputRefs[i - 1].current?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      inputRefs[5].current?.focus();
    }
    e.preventDefault();
  };

  const code = digits.join('');
  const ready = code.length === 6;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={inputRefs[i]}
            type="text"
            inputMode="numeric"
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            maxLength={1}
            style={{
              ...inputBase,
              width:       44,
              height:      54,
              padding:      0,
              textAlign:   'center',
              fontSize:     22,
              fontFamily:   FF,
              color:        d ? '#F5D060' : 'rgba(255,255,255,0.25)',
              borderColor:  d ? 'rgba(245,208,96,0.35)' : 'rgba(255,255,255,0.08)',
              background:   d ? 'rgba(245,208,96,0.04)' : 'rgba(255,255,255,0.03)',
            }}
          />
        ))}
      </div>
      <PrimaryButton onClick={() => ready && !loading && onSubmit(code)} disabled={!ready || loading} loading={loading}>
        {t('upgrade.confirm_code')}
      </PrimaryButton>
    </div>
  );
}

// ── Shared UI atoms ─────────────────────────────────────────────────────────

function PrimaryButton({ onClick, disabled, loading, children }: { onClick: () => void; disabled?: boolean; loading?: boolean; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width:          '100%',
        padding:        '15px',
        background:      !disabled && !loading
          ? 'linear-gradient(180deg,rgba(40,65,30,0.97)0%,rgba(22,38,16,0.99)100%)'
          : 'rgba(20,28,22,0.5)',
        border:         `1px solid ${!disabled && !loading ? 'rgba(80,140,50,0.45)' : 'rgba(40,55,42,0.15)'}`,
        cursor:          !disabled && !loading ? 'pointer' : 'not-allowed',
        fontFamily:      UF,
        fontSize:        13,
        fontWeight:      600,
        letterSpacing:  '0.12em',
        textTransform:  'uppercase',
        color:           !disabled && !loading ? '#A8D090' : 'rgba(255,255,255,0.2)',
        transition:     'all 0.15s ease',
      }}
    >
      {loading ? t('upgrade.please_wait') : children}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.35)', fontFamily: UF, marginBottom: 7 }}>
      {children}
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{ padding: '10px 14px', background: 'rgba(80,0,0,0.2)', border: '1px solid rgba(180,30,30,0.3)', fontSize: 12, color: '#CC5555', fontFamily: UF, lineHeight: 1.5 }}>
      {msg}
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: BF, lineHeight: 1.6 }}>
      {children}
    </div>
  );
}

// ── Method selection screen ─────────────────────────────────────────────────

interface MethodOption {
  id:    'email' | 'google' | 'facebook';
  label: string;
  icon:  React.ReactNode;
  desc:  string;
}

function getMethodOptions(t: (k: string) => string): MethodOption[] {
  return [
    { id: 'email',    label: t('upgrade.method_email'),    icon: <Mail size={20} strokeWidth={1.4} />, desc: t('upgrade.method_email_desc') },
    { id: 'google',   label: t('upgrade.method_google'),   icon: <GoogleIcon />,                       desc: t('upgrade.method_google_desc') },
    { id: 'facebook', label: t('upgrade.method_facebook'), icon: <FacebookIcon />,                     desc: t('upgrade.method_facebook_desc') },
  ];
}

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

function MethodButton({ method, onClick }: { method: MethodOption; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      style={{
        display:        'flex',
        alignItems:     'center',
        gap:             14,
        width:          '100%',
        padding:        '14px 16px',
        background:      hovered ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.025)',
        border:         `1px solid ${hovered ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.08)'}`,
        cursor:         'pointer',
        textAlign:      'left',
        transition:     'background 0.15s ease, border-color 0.15s ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'rgba(255,255,255,0.6)' }}>
        {method.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: UF, fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.88)', lineHeight: 1.2 }}>{method.label}</div>
        <div style={{ fontFamily: UF, fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{method.desc}</div>
      </div>
    </button>
  );
}

// ── Email upgrade flow ──────────────────────────────────────────────────────

type EmailStep = 'address' | 'code' | 'password' | 'done';

function EmailFlow({ onBack, onSuccess, onOpenLogin }: {
  onBack: () => void;
  onSuccess: () => void;
  onOpenLogin?: (email: string) => void;
}) {
  const { sendEmailUpgradeCode, verifyEmailUpgradeCode, completeEmailUpgrade, session, setPendingGuestMergeId } = useAuth();
  const { t } = useI18n();

  const handleOpenLogin = (email: string) => {
    // Store current guest user_id before switching to login, so merge can be offered after
    const guestId = session?.user?.id;
    if (guestId) {
      setPendingGuestMergeId(guestId);
    }
    onOpenLogin?.(email);
  };

  const [step, setStep]                       = useState<EmailStep>('address');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirm, setConfirm]                 = useState('');
  const [showPwd, setShowPwd]                 = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [emailAlreadyExists, setEmailExists]  = useState(false);
  const [sentAt, setSentAt]                   = useState<number | null>(null);
  const [devCode, setDevCode]                 = useState<string | null>(null);

  const countdown = useCountdown(sentAt);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSendCode = async () => {
    if (!emailValid) return;
    setLoading(true);
    setError(null);
    setEmailExists(false);
    const { error: err, devCode: dc, code: errCode } = await sendEmailUpgradeCode(email);
    setLoading(false);
    if (err) {
      if (errCode === 'EMAIL_ALREADY_EXISTS') {
        setEmailExists(true);
      } else if (errCode === 'ACCOUNT_ALREADY_UPGRADED') {
        setStep('done');
        setTimeout(onSuccess, 1400);
        return;
      }
      setError(err);
      return;
    }
    setSentAt(Date.now());
    if (dc) setDevCode(dc);
    setStep('code');
  };

  const handleVerifyCode = async (code: string) => {
    setLoading(true);
    setError(null);
    const { error: err } = await verifyEmailUpgradeCode(email, code);
    setLoading(false);
    if (err) { setError(err); return; }
    setStep('password');
  };

  const handleSetPassword = async () => {
    if (password.length < 8 || password !== confirm) return;
    setLoading(true);
    setError(null);
    const { error: err } = await completeEmailUpgrade(email, password);
    setLoading(false);
    if (err) { setError(err); return; }
    setStep('done');
    setTimeout(onSuccess, 1400);
  };

  const handleSkipPassword = async () => {
    setLoading(true);
    setError(null);
    const { error: err } = await completeEmailUpgrade(email);
    setLoading(false);
    if (err) { setError(err); return; }
    setStep('done');
    setTimeout(onSuccess, 1400);
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setLoading(true);
    setError(null);
    const { error: err, devCode: dc } = await sendEmailUpgradeCode(email);
    setLoading(false);
    if (!err) {
      setSentAt(Date.now());
      if (dc) setDevCode(dc);
    } else {
      setError(err);
    }
  };

  if (step === 'done') {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ width: 56, height: 56, background: 'rgba(120,176,96,0.12)', border: '1px solid rgba(120,176,96,0.3)', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Check size={28} style={{ color: '#78B060' }} />
        </div>
        <div style={{ fontFamily: FF, fontSize: 20, color: '#F5D060', letterSpacing: '0.06em', marginBottom: 8 }}>{t('upgrade.account_secured')}</div>
        <div style={{ fontFamily: BF, fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{t('upgrade.account_secured_desc')}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <BackButton onClick={onBack} />
      <FlowTitle icon={<Mail size={18} style={{ color: '#FF9A30' }} />} title={t('upgrade.email_verification')} />

      {step === 'address' && (
        <>
          <div>
            <FieldLabel>{t('upgrade.email_address')}</FieldLabel>
            <div style={{ position: 'relative' }}>
              <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailExists(false); setError(null); }}
                placeholder="you@example.com"
                style={{ ...inputBase, paddingLeft: 36 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(255,122,0,0.45)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                onKeyDown={(e) => e.key === 'Enter' && emailValid && handleSendCode()}
                autoFocus
              />
            </div>
          </div>
          {error && <ErrorBox msg={error} />}
          {emailAlreadyExists && onOpenLogin && (
            <button
              onClick={() => handleOpenLogin(email)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px 16px', background: 'rgba(255,122,0,0.06)', border: '1px solid rgba(255,122,0,0.25)', cursor: 'pointer', fontFamily: 'Inter,system-ui,sans-serif', fontSize: 13, fontWeight: 600, color: '#FF9A30', transition: 'background 0.15s ease' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,122,0,0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,122,0,0.06)')}
            >
              {t('upgrade.log_in_with_email')}
            </button>
          )}
          {!emailAlreadyExists && (
            <PrimaryButton onClick={handleSendCode} disabled={!emailValid} loading={loading}>
              {t('upgrade.send_code')}
            </PrimaryButton>
          )}
        </>
      )}

      {step === 'code' && (
        <>
          <div style={{ fontFamily: UF, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
            {t('upgrade.code_sent_to')} <span style={{ color: '#FF9A30' }}>{email}</span>
          </div>
          <InfoBox>
            {t('upgrade.code_delay_note')}
          </InfoBox>
          {devCode && (
            <div style={{ padding: '8px 12px', background: 'rgba(245,208,96,0.06)', border: '1px solid rgba(245,208,96,0.2)', fontSize: 12, color: 'rgba(245,208,96,0.8)', fontFamily: UF }}>
              Dev mode — code: <strong style={{ letterSpacing: '0.12em' }}>{devCode}</strong>
            </div>
          )}
          {error && <ErrorBox msg={error} />}
          <CodeInput onSubmit={handleVerifyCode} loading={loading} />
          <div style={{ textAlign: 'center' }}>
            {countdown > 0 ? (
              <span style={{ fontFamily: UF, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{t('upgrade.resend_countdown', { n: String(countdown) })}</span>
            ) : (
              <button onClick={handleResend} disabled={loading} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: UF, fontSize: 12, color: 'rgba(255,122,0,0.7)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={12} /> Resend code
              </button>
            )}
          </div>
          <button onClick={() => { setStep('address'); setError(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: UF, fontSize: 12, color: 'rgba(255,255,255,0.3)', padding: '4px 0' }}>
            ← Change email
          </button>
        </>
      )}

      {step === 'password' && (
        <>
          <InfoBox>Email verified. Set a password to secure your account.</InfoBox>
          <div>
            <FieldLabel>Password (min 8 characters)</FieldLabel>
            <div style={{ position: 'relative' }}>
              <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                style={{ ...inputBase, paddingLeft: 36, paddingRight: 40 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(255,122,0,0.45)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                autoFocus
              />
              <button type="button" onClick={() => setShowPwd((v) => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}>
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <FieldLabel>Confirm Password</FieldLabel>
            <div style={{ position: 'relative' }}>
              <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
              <input
                type={showPwd ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                style={{ ...inputBase, paddingLeft: 36, borderColor: confirm && confirm !== password ? 'rgba(200,50,50,0.5)' : undefined }}
                onFocus={(e) => (e.currentTarget.style.borderColor = confirm !== password ? 'rgba(200,50,50,0.5)' : 'rgba(255,122,0,0.45)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = confirm && confirm !== password ? 'rgba(200,50,50,0.5)' : 'rgba(255,255,255,0.10)')}
              />
            </div>
            {confirm && confirm !== password && <div style={{ fontSize: 11, color: '#CC5555', marginTop: 4, fontFamily: UF }}>Passwords do not match</div>}
          </div>
          {error && <ErrorBox msg={error} />}
          <PrimaryButton onClick={handleSetPassword} disabled={password.length < 8 || password !== confirm} loading={loading}>
            Secure Account
          </PrimaryButton>
          <button onClick={handleSkipPassword} disabled={loading} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: UF, fontSize: 12, color: 'rgba(255,255,255,0.25)', padding: '4px 0', textAlign: 'center' }}>
            Skip — set password later
          </button>
        </>
      )}
    </div>
  );
}

// ── OAuth flow ───────────────────────────────────────────────────────────────

function OAuthFlow({ provider, onBack }: { provider: 'google' | 'facebook'; onBack: () => void }) {
  const { upgradeWithOAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const label = provider === 'google' ? 'Google' : 'Facebook';
  const Icon  = provider === 'google' ? GoogleIcon : FacebookIcon;

  const handleLink = async () => {
    setLoading(true);
    setError(null);
    const { error: err } = await upgradeWithOAuth(provider);
    setLoading(false);
    if (err) {
      if (err.toLowerCase().includes('provider') || err.toLowerCase().includes('not enabled') || err.toLowerCase().includes('unsupported')) {
        setError(`${label} sign-in is not yet configured. Enable the ${label} provider in the Supabase dashboard to use this option.`);
      } else {
        setError(err);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <BackButton onClick={onBack} />
      <FlowTitle icon={<Icon />} title={`Link ${label}`} />

      <InfoBox>
        Linking your {label} account secures your progress and wallet. Your streak and balance are preserved — no data is lost.
      </InfoBox>

      {error && (
        <div style={{ padding: '12px 14px', background: 'rgba(255,122,0,0.05)', border: '1px solid rgba(255,122,0,0.2)', fontSize: 12, color: 'rgba(255,200,100,0.8)', fontFamily: BF, lineHeight: 1.6 }}>
          {error}
        </div>
      )}

      <PrimaryButton onClick={handleLink} loading={loading}>
        Continue with {label}
      </PrimaryButton>
    </div>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────────

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: UF, fontSize: 12, color: 'rgba(255,255,255,0.4)', padding: '0 0 4px', transition: 'color 0.15s' }} onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')} onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
      <ChevronLeft size={14} /> Back
    </button>
  );
}

function FlowTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 4 }}>
      {icon}
      <div style={{ fontFamily: FF, fontSize: 18, letterSpacing: '0.06em', color: '#F5D060' }}>{title}</div>
    </div>
  );
}

// ── Main UpgradeModal ─────────────────────────────────────────────────────────

type ActiveMethod = null | 'email' | 'google' | 'facebook';

export default function UpgradeModal({ onClose, onSuccess, onOpenLogin }: {
  onClose: () => void;
  onSuccess: () => void;
  onOpenLogin?: (email: string) => void;
}) {
  const [active, setActive] = useState<ActiveMethod>(null);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={active ? undefined : onClose}
    >
      <div
        style={{ width: '100%', maxWidth: 420, background: 'linear-gradient(180deg,rgba(14,20,16,0.99)0%,rgba(8,12,9,0.99)100%)', border: '1px solid rgba(245,208,96,0.12)', boxShadow: '0 24px 80px rgba(0,0,0,0.95)', position: 'relative', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative top glow */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(245,208,96,0.4),transparent)' }} />

        <div style={{ padding: '28px 24px 28px' }}>
          {/* Close */}
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: 14, right: 14, width: 30, height: 30, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', transition: 'color 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
          >
            <X size={15} />
          </button>

          {/* Method selection */}
          {!active && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2 style={{ fontFamily: FF, fontSize: 22, letterSpacing: '0.08em', color: '#F5D060', textShadow: '0 0 20px rgba(245,208,96,0.3)', margin: '0 0 6px' }}>
                  Secure Your Account
                </h2>
                <p style={{ fontFamily: BF, fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.65, margin: 0 }}>
                  Link your account to protect your streak, wallet, and progress across devices. Nothing is lost.
                </p>
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {METHODS.map((m) => (
                  <MethodButton key={m.id} method={m} onClick={() => setActive(m.id)} />
                ))}
              </div>

              <div style={{ textAlign: 'center', paddingTop: 4 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: UF, lineHeight: 1.6 }}>
                  Upgrading does not create a new account. Your existing progress is preserved.
                </div>
              </div>
            </div>
          )}

          {/* Active method flows */}
          {active === 'email'    && <EmailFlow  onBack={() => setActive(null)} onSuccess={onSuccess} onOpenLogin={onOpenLogin} />}
          {active === 'google'   && <OAuthFlow  provider="google"   onBack={() => setActive(null)} />}
          {active === 'facebook' && <OAuthFlow  provider="facebook" onBack={() => setActive(null)} />}
        </div>
      </div>
    </div>
  );
}
