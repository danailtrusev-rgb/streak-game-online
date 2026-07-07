import type { ReactNode } from 'react';

interface LandingHeroProps {
  headline: string;
  subheadline: string;
  body: string;
  primaryCtaLabel: string;
  onPrimaryCta: () => void;
  secondaryCtaLabel: string;
  onSecondaryCta: () => void;
  /** Small decorative icon row rendered above the headline. */
  icon?: ReactNode;
}

export default function LandingHero({
  headline,
  subheadline,
  body,
  primaryCtaLabel,
  onPrimaryCta,
  secondaryCtaLabel,
  onSecondaryCta,
  icon,
}: LandingHeroProps) {
  return (
    <section
      style={{
        padding: '48px 0 56px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {icon}
      <h1
        style={{
          fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
          fontSize: 'clamp(32px, 6vw, 56px)',
          lineHeight: 1.1,
          color: '#F5EFE4',
          margin: '16px 0 18px',
          maxWidth: 780,
          textShadow: '0 0 40px rgba(255,122,0,0.2)',
        }}
      >
        {headline}
      </h1>
      <p
        style={{
          fontFamily: "'Cinzel', Georgia, serif",
          fontSize: 'clamp(15px, 2vw, 19px)',
          color: '#F5D060',
          maxWidth: 620,
          margin: '0 0 18px',
        }}
      >
        {subheadline}
      </p>
      <p
        style={{
          fontFamily: "'Lora', 'Inter', system-ui, sans-serif",
          fontSize: 16,
          lineHeight: 1.6,
          color: '#C8C0B5',
          maxWidth: 620,
          margin: '0 0 36px',
        }}
      >
        {body}
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={onPrimaryCta}
          style={{
            fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
            fontSize: 20,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#0B0F0C',
            background: 'linear-gradient(180deg, #FFB347 0%, #FF7A00 100%)',
            border: 'none',
            borderRadius: 2,
            padding: '16px 40px',
            boxShadow: '0 0 30px rgba(255,122,0,0.4), 0 0 80px rgba(255,122,0,0.15)',
            cursor: 'pointer',
          }}
        >
          {primaryCtaLabel}
        </button>
        <button
          onClick={onSecondaryCta}
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#E8E2DA',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 2,
            padding: '15px 28px',
            cursor: 'pointer',
          }}
        >
          {secondaryCtaLabel}
        </button>
      </div>
    </section>
  );
}
