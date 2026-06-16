import { useState, useEffect, useCallback, useRef } from 'react';
import {
  User, Shield, Bell, Flame, BookOpen, ChevronRight, ChevronLeft,
  HelpCircle, Info, LogOut, Globe,
  Mail, MessageCircle, Send, Hash, Smartphone, Check, RefreshCw, ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { ICONS } from '../lib/assets';
import AssetIcon from '../components/ui/AssetIcon';
import { useNotifications, type NotificationChannel, type NotificationPref } from '../hooks/useNotifications';
import UpgradeModal from '../components/onboarding/UpgradeModal';
import LoginModal from '../components/onboarding/LoginModal';
import PhoneInput, { validatePhone, buildE164, COUNTRIES } from '../components/ui/PhoneInput';
import { supabase } from '../lib/supabase';

// ── Shared style helpers ──────────────────────────────────────────────────────

const FF  = "'Metal Mania', 'Cinzel', Georgia, serif";
const BF  = "'Lora', Georgia, serif";
const UF  = "'Inter', system-ui, sans-serif";

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

// ── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={disabled ? undefined : onChange}
      style={{
        position:   'relative',
        width:       44,
        height:      24,
        borderRadius:12,
        background:  disabled ? 'rgba(255,255,255,0.05)' : enabled ? 'rgba(255,122,0,0.5)' : 'rgba(255,255,255,0.08)',
        border:     `1px solid ${disabled ? 'rgba(255,255,255,0.06)' : enabled ? 'rgba(255,122,0,0.4)' : 'rgba(255,255,255,0.10)'}`,
        cursor:      disabled ? 'not-allowed' : 'pointer',
        flexShrink:  0,
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}
    >
      <span style={{
        position:     'absolute',
        top:           3,
        left:          enabled && !disabled ? 21 : 3,
        width:         16,
        height:        16,
        borderRadius: '50%',
        background:    disabled ? 'rgba(255,255,255,0.15)' : enabled ? '#FF9A30' : 'rgba(255,255,255,0.3)',
        transition:   'left 0.2s ease, background 0.2s ease',
      }} />
    </button>
  );
}

// ── SectionLabel ─────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ fontFamily: UF, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.3)', fontWeight: 600, marginBottom: 10 }}>
      {label}
    </div>
  );
}

// ── Countdown timer hook ──────────────────────────────────────────────────────

function useCountdown(sentAt: string | null, duration = 120) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!sentAt) { setRemaining(0); return; }
    const calc = () => {
      const elapsed = Math.floor((Date.now() - new Date(sentAt).getTime()) / 1000);
      setRemaining(Math.max(0, duration - elapsed));
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [sentAt, duration]);
  return remaining;
}

// ── Verification code input ───────────────────────────────────────────────────

function CodeInput({ onSubmit, loading }: { onSubmit: (code: string) => void; loading: boolean }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const handleChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...digits];
    next[i] = val.slice(-1);
    setDigits(next);
    if (val && i < 5) refs[i + 1].current?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs[i - 1].current?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      refs[5].current?.focus();
    }
  };

  const code = digits.join('');
  const ready = code.length === 6;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={refs[i]}
            type="text"
            inputMode="numeric"
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            maxLength={1}
            style={{
              ...inputBase,
              width:     44,
              height:    52,
              padding:    0,
              textAlign: 'center',
              fontSize:   22,
              fontFamily: FF,
              color:      d ? '#F5D060' : 'rgba(255,255,255,0.3)',
              borderColor: d ? 'rgba(245,208,96,0.3)' : 'rgba(255,255,255,0.10)',
            }}
          />
        ))}
      </div>
      <button
        onClick={() => ready && !loading && onSubmit(code)}
        disabled={!ready || loading}
        style={{
          width:      '100%',
          padding:    '13px',
          background:  ready && !loading ? 'linear-gradient(180deg,rgba(40,65,30,0.97)0%,rgba(22,38,16,0.99)100%)' : 'rgba(20,28,22,0.5)',
          border:     `1px solid ${ready && !loading ? 'rgba(80,140,50,0.4)' : 'rgba(40,55,42,0.15)'}`,
          cursor:      ready && !loading ? 'pointer' : 'not-allowed',
          fontFamily:  UF,
          fontSize:    13,
          fontWeight:  600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color:       ready && !loading ? '#A8D090' : 'rgba(255,255,255,0.2)',
        }}
      >
        {loading ? t('settings.verifying') : t('settings.confirm_code')}
      </button>
    </div>
  );
}

// ── Channel detail panel ──────────────────────────────────────────────────────

interface ChannelConfig {
  id:          NotificationChannel;
  label:       string;
  Icon:        typeof Mail;
  description: string;
  providerReady: boolean;
  pendingNote?: string;
}

type PanelState = 'form' | 'verify' | 'done';

function getChannels(t: (k: string) => string): ChannelConfig[] {
  return [
    {
      id:          'email',
      label:       t('settings.channel.email'),
      Icon:        Mail,
      description: t('settings.channel.email_desc'),
      providerReady: true,
    },
    {
      id:          'telegram',
      label:       t('settings.channel.telegram'),
      Icon:        Send,
      description: t('settings.channel.telegram_desc'),
      providerReady: false,
      pendingNote: t('settings.channel.telegram_pending'),
    },
    {
      id:          'whatsapp',
      label:       t('settings.channel.whatsapp'),
      Icon:        MessageCircle,
      description: t('settings.channel.whatsapp_desc'),
      providerReady: false,
      pendingNote: t('settings.channel.whatsapp_pending'),
    },
    {
      id:          'discord',
      label:       t('settings.channel.discord'),
      Icon:        Hash,
      description: t('settings.channel.discord_desc'),
      providerReady: false,
      pendingNote: t('settings.channel.discord_pending'),
    },
    {
      id:          'sms',
      label:       t('settings.channel.sms'),
      Icon:        Smartphone,
      description: t('settings.channel.sms_desc'),
      providerReady: false,
      pendingNote: t('settings.channel.sms_pending'),
    },
  ];
}

function ChannelPanel({
  config,
  pref,
  onBack,
  onUpdated,
  userEmail,
  isGuest,
}: {
  config:     ChannelConfig;
  pref:       NotificationPref | null;
  onBack:     () => void;
  onUpdated:  () => void;
  userEmail:  string;
  isGuest:    boolean;
}) {
  const { upsertChannel, sendCode, verifyCode, toggleChannel, error: hookError } = useNotifications();
  const { t } = useI18n();

  const isEmail = config.id === 'email';
  const isSms   = config.id === 'sms';

  // Pre-fill email if user has one
  const defaultContact = isEmail && userEmail ? userEmail : (pref?.contact_value ?? '');

  const [contact, setContact]             = useState(defaultContact);
  const [countryCode, setCountryCode]     = useState('+34');
  const [phoneLocal, setPhoneLocal]       = useState(() => {
    if (!isSms) return '';
    const v = pref?.contact_value ?? '';
    const cc = COUNTRIES.find((c) => v.startsWith(c.code));
    return cc ? v.slice(cc.code.length) : v;
  });
  const [panelState, setPanelState]       = useState<PanelState>(pref?.verified ? 'done' : 'form');
  const [saving, setSaving]               = useState(false);
  const [verifying, setVerifying]         = useState(false);
  const [localError, setLocalError]       = useState<string | null>(null);
  const [devCode, setDevCode]             = useState<string | null>(null);
  const [codeSentAt, setCodeSentAt]       = useState<string | null>(pref?.code_sent_at ?? null);

  const countdown = useCountdown(codeSentAt);

  const fullPhone    = isSms ? buildE164(countryCode, phoneLocal) : '';
  const contactValue = isSms ? fullPhone : contact.trim();
  const contactValid = isSms
    ? validatePhone(phoneLocal) === 'valid'
    : isEmail
    ? contactValue.includes('@') && contactValue.includes('.')
    : contactValue.length >= 2;

  // For email: if it matches the verified account email, skip verification
  const emailAlreadyVerified = isEmail && userEmail && contactValue === userEmail && !isGuest;

  const handleSendCode = async () => {
    if (!contactValid) return;
    setSaving(true);
    setLocalError(null);
    setDevCode(null);

    // Upsert channel first
    const ok = await upsertChannel(config.id, contactValue);
    if (!ok) { setSaving(false); setLocalError(hookError ?? 'Failed to save'); return; }

    const result = await sendCode(config.id, contactValue);
    if (!result) { setSaving(false); setLocalError(hookError ?? 'Failed to send code'); return; }

    const now = new Date().toISOString();
    setCodeSentAt(now);
    if (result.dev_code) setDevCode(result.dev_code);
    setSaving(false);
    setPanelState('verify');
  };

  const handleVerify = async (code: string) => {
    setVerifying(true);
    setLocalError(null);
    const ok = await verifyCode(config.id, code);
    setVerifying(false);
    if (!ok) { setLocalError(hookError ?? 'Invalid code. Please try again.'); return; }
    setPanelState('done');
    onUpdated();
  };

  const handleToggle = async () => {
    if (!pref?.verified) return;
    await toggleChannel(config.id, !pref.enabled);
    onUpdated();
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setSaving(true);
    const result = await sendCode(config.id, contactValue);
    setSaving(false);
    if (result) {
      setCodeSentAt(new Date().toISOString());
      if (result.dev_code) setDevCode(result.dev_code);
    }
  };

  const displayError = localError ?? hookError;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minHeight: '100%' }}>
      {/* Header */}
      <button
        onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 0 20px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontFamily: UF, fontSize: 13 }}
      >
        <ChevronLeft size={16} /> {t('common.back')}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <div style={{ width: 44, height: 44, background: 'rgba(255,122,0,0.06)', border: '1px solid rgba(255,122,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <config.Icon size={20} strokeWidth={1.4} style={{ color: '#FF9A30' }} />
        </div>
        <div>
          <div style={{ fontFamily: FF, fontSize: 18, letterSpacing: '0.06em', color: '#F5D060' }}>{config.label}</div>
          <div style={{ fontFamily: UF, fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{config.description}</div>
        </div>
      </div>

      {/* Provider pending notice */}
      {!config.providerReady && (
        <div style={{ padding: '10px 14px', background: 'rgba(255,122,0,0.04)', border: '1px solid rgba(255,122,0,0.12)', fontSize: 12, color: 'rgba(255,200,100,0.7)', fontFamily: BF, lineHeight: 1.6, margin: '14px 0', borderLeft: '2px solid rgba(255,122,0,0.35)' }}>
          {config.pendingNote}
        </div>
      )}

      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '14px 0' }} />

      {/* ── DONE state ── */}
      {panelState === 'done' && pref && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(120,176,96,0.06)', border: '1px solid rgba(120,176,96,0.18)' }}>
            <Check size={16} style={{ color: '#78B060', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: UF, fontSize: 13, color: '#A8D090' }}>{t('settings.verified')}</div>
              <div style={{ fontFamily: UF, fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pref.contact_value}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <div style={{ fontFamily: UF, fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>
                {config.label} {t('settings.reminders_suffix')}
              </div>
              <div style={{ fontFamily: UF, fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                {pref.enabled ? t('settings.reminders_active') : t('settings.reminders_off')}
              </div>
            </div>
            <Toggle enabled={pref.enabled} onChange={handleToggle} />
          </div>

          <button
            onClick={() => { setContact(pref.contact_value); setPanelState('form'); }}
            style={{ padding: '10px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', fontFamily: UF, fontSize: 12, color: 'rgba(255,255,255,0.35)', cursor: 'pointer', textAlign: 'left', transition: 'color 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
          >
            {t('settings.change_contact', { type: isEmail ? t('settings.contact_email') : isSms ? t('settings.contact_phone') : t('settings.contact_details') })}
          </button>
        </div>
      )}

      {/* ── FORM state ── */}
      {panelState === 'form' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isEmail && (
            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.35)', fontFamily: UF, marginBottom: 8 }}>{t('settings.email_address_label')}</div>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                <input
                  type="email"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="you@example.com"
                  style={{ ...inputBase, paddingLeft: 36 }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(255,122,0,0.4)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                />
              </div>
              {emailAlreadyVerified && (
                <div style={{ fontSize: 11, color: '#78B060', marginTop: 6, fontFamily: UF, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Check size={12} /> {t('settings.email_already_verified')}
                </div>
              )}
            </div>
          )}

          {isSms && (
            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.35)', fontFamily: UF, marginBottom: 8 }}>{t('settings.phone_number_label')}</div>
              <PhoneInput
                countryCode={countryCode}
                localNumber={phoneLocal}
                onCountryChange={setCountryCode}
                onLocalChange={setPhoneLocal}
              />
            </div>
          )}

          {!isEmail && !isSms && (
            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.35)', fontFamily: UF, marginBottom: 8 }}>
                {config.id === 'telegram' ? t('settings.telegram_username') : config.id === 'discord' ? t('settings.discord_username') : t('settings.contact_or_number')}
              </div>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={config.id === 'telegram' ? '@yourusername' : config.id === 'discord' ? 'username#0000' : '+34 612 345 678'}
                style={inputBase}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(255,122,0,0.4)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
              />
            </div>
          )}

          {displayError && (
            <div style={{ padding: '10px 14px', background: 'rgba(80,0,0,0.2)', border: '1px solid rgba(180,30,30,0.3)', fontSize: 12, color: '#CC5555', fontFamily: UF, lineHeight: 1.5 }}>
              {displayError}
            </div>
          )}

          <button
            onClick={handleSendCode}
            disabled={!contactValid || saving}
            style={{ width: '100%', padding: '14px', background: contactValid && !saving ? 'linear-gradient(180deg,rgba(40,65,30,0.97)0%,rgba(22,38,16,0.99)100%)' : 'rgba(20,28,22,0.5)', border: `1px solid ${contactValid && !saving ? 'rgba(80,140,50,0.4)' : 'rgba(40,55,42,0.15)'}`, cursor: contactValid && !saving ? 'pointer' : 'not-allowed', fontFamily: UF, fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: contactValid && !saving ? '#A8D090' : 'rgba(255,255,255,0.2)' }}
          >
            {saving ? t('settings.sending') : emailAlreadyVerified ? t('settings.confirm_enable') : t('settings.send_verification_code')}
          </button>
        </div>
      )}

      {/* ── VERIFY state ── */}
      {panelState === 'verify' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontFamily: UF, fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 6 }}>
              {t('settings.enter_code_sent_to')}
            </div>
            <div style={{ fontFamily: UF, fontSize: 13, fontWeight: 600, color: '#FF9A30' }}>
              {contactValue}
            </div>
          </div>

          {isEmail && (
            <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: BF, lineHeight: 1.6 }}>
              {t('settings.code_email_note')}
            </div>
          )}

          {/* Dev mode: show code directly */}
          {devCode && (
            <div style={{ padding: '10px 14px', background: 'rgba(245,208,96,0.04)', border: '1px solid rgba(245,208,96,0.18)', fontSize: 12, color: '#F5D060', fontFamily: UF }}>
              Dev mode — your code: <strong>{devCode}</strong>
            </div>
          )}

          {displayError && (
            <div style={{ padding: '10px 14px', background: 'rgba(80,0,0,0.2)', border: '1px solid rgba(180,30,30,0.3)', fontSize: 12, color: '#CC5555', fontFamily: UF }}>{displayError}</div>
          )}

          <CodeInput onSubmit={handleVerify} loading={verifying} />

          <div style={{ textAlign: 'center' }}>
            {countdown > 0 ? (
              <span style={{ fontFamily: UF, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                {t('settings.resend_countdown', { n: String(countdown) })}
              </span>
            ) : (
              <button
                onClick={handleResend}
                disabled={saving}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: UF, fontSize: 12, color: 'rgba(255,122,0,0.7)', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'color 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,122,0,1)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,122,0,0.7)')}
              >
                <RefreshCw size={13} className={saving ? 'animate-spin' : ''} /> {t('settings.resend_code')}
              </button>
            )}
          </div>

          <button
            onClick={() => setPanelState('form')}
            style={{ padding: '10px', background: 'transparent', border: 'none', fontFamily: UF, fontSize: 12, color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
          >
            {t('settings.change_contact', { type: isEmail ? t('settings.contact_email') : t('settings.contact_phone') })}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Channel list row ──────────────────────────────────────────────────────────

function ChannelRow({
  config,
  pref,
  onClick,
  disabled,
}: {
  config:   ChannelConfig;
  pref:     NotificationPref | null;
  onClick:  () => void;
  disabled: boolean;
}) {
  const { t } = useI18n();
  const statusLabel = disabled
    ? t('settings.upgrade_required')
    : !pref
    ? t('settings.channel_not_set_up')
    : pref.verified && pref.enabled
    ? t('settings.channel_on')
    : pref.verified
    ? t('settings.channel_off')
    : t('settings.channel_pending');

  const statusColor = disabled || !pref || !pref.verified
    ? 'rgba(255,255,255,0.25)'
    : pref.enabled
    ? '#78B060'
    : 'rgba(255,255,255,0.35)';

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: disabled ? 0.4 : 1, transition: 'background 0.15s ease' }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.02)'; }}
    >
      <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <config.Icon size={17} strokeWidth={1.4} style={{ color: 'rgba(255,255,255,0.45)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: UF, fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.85)', lineHeight: 1.3 }}>{config.label}</div>
        <div style={{ fontFamily: UF, fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{config.description}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontFamily: UF, fontSize: 11, color: statusColor, letterSpacing: '0.08em' }}>
          {statusLabel}
        </span>
        {!disabled && <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />}
      </div>
    </button>
  );
}

// ── FAQ Accordion ─────────────────────────────────────────────────────────────

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  enabled: boolean;
}

function FaqAccordion() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('faq_items')
      .select('id, question, answer, sort_order, enabled')
      .eq('enabled', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        setItems((data ?? []) as FaqItem[]);
        setLoading(false);
      });
  }, []);

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map((item) => {
        const isOpen = open === item.id;
        return (
          <div
            key={item.id}
            style={{
              border: `1px solid ${isOpen ? 'rgba(255,122,0,0.22)' : 'rgba(255,255,255,0.05)'}`,
              background: isOpen ? 'rgba(255,122,0,0.03)' : 'rgba(255,255,255,0.02)',
              transition: 'border-color 0.2s ease, background 0.2s ease',
            }}
          >
            <button
              onClick={() => setOpen(isOpen ? null : item.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '13px 16px',
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontFamily: UF, fontSize: 14, fontWeight: 500, color: isOpen ? '#FF9A30' : 'rgba(255,255,255,0.8)', lineHeight: 1.3, flex: 1, paddingRight: 8 }}>
                {item.question}
              </span>
              <ChevronDown
                size={15}
                style={{
                  color: isOpen ? '#FF9A30' : 'rgba(255,255,255,0.3)',
                  flexShrink: 0,
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease, color 0.2s ease',
                }}
              />
            </button>
            {isOpen && (
              <div style={{ padding: '0 16px 14px' }}>
                <p style={{
                  fontFamily: BF, fontSize: 13, color: 'rgba(255,255,255,0.55)',
                  lineHeight: 1.7, margin: 0,
                }}>
                  {item.answer}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main SettingsPage ─────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { playerState, session, isGuest, signOut } = useAuth();
  const { t, language, setLanguage, languages } = useI18n();
  const CHANNELS = getChannels(t);
  const {
    prefs, loading: prefsLoading, fetchPrefs, getPref, error: notifError,
  } = useNotifications();

  const [showUpgrade, setShowUpgrade]         = useState(false);
  const [showLogin, setShowLogin]             = useState(false);
  const [loginPrefillEmail, setLoginPrefill]  = useState<string | undefined>(undefined);
  const [upgraded, setUpgraded]               = useState(false);
  const [signingOut, setSigningOut]           = useState(false);
  const [activeChannel, setActiveChannel]     = useState<NotificationChannel | null>(null);
  const [refreshKey, setRefreshKey]           = useState(0);
  const signOutFallbackRef                    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOpenLoginFromUpgrade = useCallback((email: string) => {
    setShowUpgrade(false);
    setLoginPrefill(email);
    setShowLogin(true);
  }, []);

  const accountEmail = session?.user?.email ?? '';
  const isGuestAcc   = isGuest && !upgraded;

  // Reset local state whenever auth state switches back to guest (after logout)
  useEffect(() => {
    if (isGuest) {
      if (signOutFallbackRef.current) {
        clearTimeout(signOutFallbackRef.current);
        signOutFallbackRef.current = null;
      }
      setUpgraded(false);
      setSigningOut(false);
      setShowUpgrade(false);
      setShowLogin(false);
    }
  }, [isGuest]);

  useEffect(() => {
    if (!isGuestAcc) fetchPrefs();
  }, [isGuestAcc, fetchPrefs, refreshKey]);

  const handleChannelUpdated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    await signOut();
    // Keep signingOut=true — the isGuest effect clears it once the new guest
    // session arrives. Fallback reload if it takes more than 1500ms.
    if (signOutFallbackRef.current) clearTimeout(signOutFallbackRef.current);
    signOutFallbackRef.current = setTimeout(() => window.location.reload(), 1500);
  }, [signOut]);

  // ── Derive display name from session / identities ────────────────────────
  const displayName = (() => {
    if (isGuestAcc) {
      return playerState?.user?.guest_id
        ? `user_${playerState.user.guest_id.slice(0, 8)}`
        : 'Guest';
    }
    // Full email for email/password or upgraded accounts
    if (accountEmail && !accountEmail.endsWith('@survive.local')) {
      return accountEmail;
    }
    // OAuth — check identities for a display name or email
    const identities = session?.user?.identities ?? [];
    const googleId   = identities.find((id) => id.provider === 'google');
    const facebookId = identities.find((id) => id.provider === 'facebook');
    if (googleId) {
      return (googleId.identity_data?.email as string | undefined)
        ?? (googleId.identity_data?.name as string | undefined)
        ?? 'Google Account';
    }
    if (facebookId) {
      return (facebookId.identity_data?.email as string | undefined)
        ?? (facebookId.identity_data?.name as string | undefined)
        ?? 'Facebook Account';
    }
    return 'Registered Account';
  })();

  // Secondary label under the display name
  const accountLabel = (() => {
    if (isGuestAcc) return null;
    const identities = session?.user?.identities ?? [];
    const googleId   = identities.find((id) => id.provider === 'google');
    const facebookId = identities.find((id) => id.provider === 'facebook');
    if (googleId && displayName !== accountEmail) {
      const email = googleId.identity_data?.email as string | undefined;
      return email ? `Google · ${email}` : 'Google Account';
    }
    if (facebookId && displayName !== accountEmail) {
      const email = facebookId.identity_data?.email as string | undefined;
      return email ? `Facebook · ${email}` : 'Facebook Account';
    }
    return null;
  })();

  // ── Channel detail view ───────────────────────────────────────────────────
  if (activeChannel) {
    const config = CHANNELS.find((c) => c.id === activeChannel)!;
    const pref   = getPref(activeChannel);
    return (
      <div style={{ paddingBottom: 32 }}>
        <ChannelPanel
          config={config}
          pref={pref}
          onBack={() => setActiveChannel(null)}
          onUpdated={handleChannelUpdated}
          userEmail={accountEmail}
          isGuest={isGuestAcc}
        />
      </div>
    );
  }

  // ── Main settings list ────────────────────────────────────────────────────
  return (
    <div className="pg-transition pg-transition--fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Account block */}
      <div>
        <SectionLabel label={t('settings.section.account')} />
        <div style={{ background: 'linear-gradient(180deg,rgba(18,26,20,0.9)0%,rgba(10,14,11,0.95)100%)', border: '1px solid rgba(245,208,96,0.10)', padding: '20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,122,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AssetIcon src={ICONS.user} fallback={User} size={22} style={{ filter: 'drop-shadow(0 0 4px rgba(255,122,0,0.4))' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: UF, fontSize: 15, fontWeight: 600, color: '#E8E0D4', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </div>
              {accountLabel && (
                <div style={{ fontFamily: UF, fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {accountLabel}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: accountLabel ? 4 : 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: isGuestAcc ? '#FF7A00' : '#78B060', flexShrink: 0 }} />
                <span style={{ fontFamily: UF, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: isGuestAcc ? '#FF9A30' : '#78B060' }}>
                  {isGuestAcc ? t('settings.account_type_guest') : t('settings.account_type_registered')}
                </span>
              </div>
            </div>
          </div>

          {isGuestAcc && (
            <div style={{ marginTop: 16 }}>
              <div style={{ padding: '10px 14px', background: 'rgba(255,122,0,0.05)', border: '1px solid rgba(255,122,0,0.12)', fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: BF, lineHeight: 1.6, marginBottom: 14 }}>
                {t('settings.guest_warning')}
              </div>
              <button
                onClick={() => setShowUpgrade(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '13px 16px', background: 'linear-gradient(180deg,rgba(40,65,30,0.95)0%,rgba(22,38,16,0.98)100%)', border: '1px solid rgba(80,140,50,0.35)', cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(80,140,50,0.6)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(80,140,50,0.35)'; }}
              >
                <Shield size={16} strokeWidth={1.4} style={{ color: '#78B060' }} />
                <span style={{ fontFamily: UF, fontSize: 14, fontWeight: 600, color: '#A8D090' }}>{t('settings.upgrade_account')}</span>
                <ChevronRight size={14} style={{ color: 'rgba(120,176,96,0.5)', marginLeft: 'auto' }} />
              </button>
              <button
                onClick={() => setShowLogin(true)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '11px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', borderTop: 'none', cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}
              >
                <span style={{ fontFamily: UF, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{t('settings.already_have_account')}</span>
                <span style={{ fontFamily: UF, fontSize: 12, fontWeight: 600, color: '#FF9A30', marginLeft: 6 }}>{t('settings.log_in')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Language */}
      {languages.length > 1 && (
        <div>
          <SectionLabel label={t('settings.section.language')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {languages.map((lang) => {
              const active = lang.code === language;
              return (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    width: '100%', padding: '13px 16px',
                    background: active ? 'rgba(255,122,0,0.07)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${active ? 'rgba(255,122,0,0.28)' : 'rgba(255,255,255,0.05)'}`,
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.15s ease, border-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.02)'; }}
                >
                  <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Globe size={17} strokeWidth={1.4} style={{ color: active ? '#FF9A30' : 'rgba(255,255,255,0.4)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: UF, fontSize: 14, fontWeight: 500, color: active ? '#FF9A30' : 'rgba(255,255,255,0.85)' }}>
                      {lang.native_name}
                    </div>
                    {lang.native_name !== lang.name && (
                      <div style={{ fontFamily: UF, fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{lang.name}</div>
                    )}
                  </div>
                  {active && <Check size={15} style={{ color: '#FF9A30', flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Logout — only for registered accounts */}
      {!isGuestAcc && (
        <div>
          <SectionLabel label={t('settings.session')} />
          <button
            onClick={signingOut ? undefined : handleSignOut}
            disabled={signingOut}
            style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', cursor: signingOut ? 'not-allowed' : 'pointer', textAlign: 'left', transition: 'background 0.15s ease', opacity: signingOut ? 0.5 : 1 }}
            onMouseEnter={(e) => { if (!signingOut) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(180,40,40,0.07)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(180,40,40,0.2)'; } }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.02)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.05)'; }}
          >
            <div style={{ width: 38, height: 38, background: 'rgba(180,40,40,0.06)', border: '1px solid rgba(180,40,40,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LogOut size={17} strokeWidth={1.4} style={{ color: 'rgba(200,80,80,0.8)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: UF, fontSize: 14, fontWeight: 500, color: 'rgba(200,80,80,0.9)' }}>
                {signingOut ? t('settings.signing_out') : t('settings.log_out')}
              </div>
              <div style={{ fontFamily: UF, fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{t('settings.sign_out_desc')}</div>
            </div>
          </button>
        </div>
      )}

      {/* Notifications & Reminders */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <SectionLabel label={t('settings.section.notifications')} />
          {isGuestAcc && (
            <span style={{ fontFamily: UF, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,122,0,0.7)', border: '1px solid rgba(255,122,0,0.25)', padding: '2px 8px' }}>
              {t('settings.upgrade_required')}
            </span>
          )}
        </div>

        {isGuestAcc ? (
          <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: BF, lineHeight: 1.6 }}>
            {t('settings.upgrade_to_notify')}
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: BF, lineHeight: 1.6, marginBottom: 14 }}>
              {t('settings.notifications_desc')}
            </div>
            {prefsLoading && prefs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.2)', fontFamily: UF, fontSize: 12 }}>{t('common.loading')}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {CHANNELS.map((config) => (
                  <ChannelRow
                    key={config.id}
                    config={config}
                    pref={getPref(config.id)}
                    onClick={() => setActiveChannel(config.id)}
                    disabled={false}
                  />
                ))}
              </div>
            )}
            {notifError && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#CC5555', fontFamily: UF }}>{notifError}</div>
            )}
          </>
        )}
      </div>

      {/* Reminder types summary (if any channel active) */}
      {!isGuestAcc && prefs.some((p) => p.enabled) && (
        <div>
          <SectionLabel label={t('settings.reminders_title')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { Icon: Flame,    label: t('settings.reminder_streak'),  desc: t('settings.reminder_streak_desc') },
              { Icon: BookOpen, label: t('settings.reminder_qual'),    desc: t('settings.reminder_qual_desc') },
              { Icon: Bell,     label: t('settings.reminder_event'),   desc: t('settings.reminder_event_desc') },
            ].map(({ Icon, label, desc }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <Icon size={15} strokeWidth={1.4} style={{ color: 'rgba(255,122,0,0.6)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: UF, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{label}</div>
                  <div style={{ fontFamily: UF, fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Support */}
      <div>
        <SectionLabel label={t('settings.support')} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderBottom: 'none' }}>
            <div style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HelpCircle size={18} strokeWidth={1.4} style={{ color: 'rgba(255,255,255,0.5)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: UF, fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>{t('settings.faq_title')}</div>
              <div style={{ fontFamily: UF, fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{t('settings.faq_subtitle')}</div>
            </div>
          </div>
          <FaqAccordion />
        </div>
      </div>

      {/* About */}
      <div style={{ padding: '16px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Info size={14} strokeWidth={1.4} style={{ color: 'rgba(255,255,255,0.25)' }} />
          <span style={{ fontFamily: UF, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)' }}>{t('settings.about')}</span>
        </div>
        <p style={{ fontFamily: BF, fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, margin: 0 }}>
          {t('settings.about_desc')}
        </p>
        <div style={{ fontFamily: UF, fontSize: 10, color: 'rgba(255,255,255,0.15)', marginTop: 10, letterSpacing: '0.08em' }}>v1.3.0</div>
      </div>

      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          onSuccess={() => { setShowUpgrade(false); setUpgraded(true); }}
          onOpenLogin={handleOpenLoginFromUpgrade}
        />
      )}
      {showLogin && (
        <LoginModal
          onClose={() => { setShowLogin(false); setLoginPrefill(undefined); }}
          onSuccess={() => { setShowLogin(false); setLoginPrefill(undefined); setUpgraded(true); }}
          prefillEmail={loginPrefillEmail}
        />
      )}
    </div>
  );
}
