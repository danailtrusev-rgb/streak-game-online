import { useState, type FormEvent, type ChangeEvent } from 'react';

const initialForm = {
  name: '',
  company: '',
  workEmail: '',
  website: '',
  role: '',
  useCase: '',
  audienceSize: '',
  message: '',
  // Honeypot — real users never fill this in; bots often do.
  company_website_confirm: '',
};

export default function OperatorContactForm() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'unavailable' | 'error'>('idle');

  const update = (key: keyof typeof initialForm) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      const res = await fetch('/api/operator-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus('sent');
        return;
      }
      if (res.status === 501) {
        setStatus('unavailable');
        return;
      }
      setStatus('error');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <p style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 16, color: '#D4A020', textAlign: 'center' }}>
        Thanks — your request has been sent. We'll be in touch.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 520, margin: '0 auto' }}>
      {/* Honeypot field — hidden from real users via CSS, not display:none (some bots skip hidden inputs) */}
      <input
        type="text"
        value={form.company_website_confirm}
        onChange={update('company_website_confirm')}
        autoComplete="off"
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }}
      />

      <Field label="Name" required value={form.name} onChange={update('name')} />
      <Field label="Company" required value={form.company} onChange={update('company')} />
      <Field label="Work email" type="email" required value={form.workEmail} onChange={update('workEmail')} />
      <Field label="Website" value={form.website} onChange={update('website')} />
      <Field label="Role" value={form.role} onChange={update('role')} />
      <Field label="Primary use case" value={form.useCase} onChange={update('useCase')} />
      <Field label="Approximate audience size (optional)" value={form.audienceSize} onChange={update('audienceSize')} />

      <label style={labelStyle}>
        Message
        <textarea
          value={form.message}
          onChange={update('message')}
          rows={4}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: "'Inter', system-ui, sans-serif" }}
        />
      </label>

      <button
        type="submit"
        disabled={status === 'submitting'}
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
          padding: '14px 20px',
          cursor: status === 'submitting' ? 'not-allowed' : 'pointer',
          opacity: status === 'submitting' ? 0.6 : 1,
        }}
      >
        {status === 'submitting' ? 'Sending…' : 'Request a Private Pilot'}
      </button>

      {status === 'unavailable' && (
        <p role="alert" style={{ fontSize: 13, color: '#9C9992', fontFamily: "'Inter', system-ui, sans-serif" }}>
          This form isn't connected yet — please email{' '}
          <a href="mailto:partners@survivethestreak.com" style={{ color: '#D4A020' }}>partners@survivethestreak.com</a> directly.
        </p>
      )}
      {status === 'error' && (
        <p role="alert" style={{ fontSize: 13, color: '#D97757', fontFamily: "'Inter', system-ui, sans-serif" }}>
          Something went wrong. Please try again or email us directly.
        </p>
      )}
    </form>
  );
}

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: 12,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: '#9C9992',
} as const;

const inputStyle = {
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: 14,
  padding: '11px 13px',
  borderRadius: 2,
  border: '1px solid rgba(212,160,32,0.2)',
  background: 'rgba(255,255,255,0.03)',
  color: '#EDEAE3',
} as const;

function Field({
  label, value, onChange, type = 'text', required = false,
}: { label: string; value: string; onChange: (e: ChangeEvent<HTMLInputElement>) => void; type?: string; required?: boolean }) {
  return (
    <label style={labelStyle}>
      {label}{required ? ' *' : ''}
      <input type={type} value={value} onChange={onChange} required={required} style={inputStyle} />
    </label>
  );
}
