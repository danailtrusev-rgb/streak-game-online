import { useState, type ReactNode } from 'react';

interface AtmosphericHeroProps {
  backgroundSrc?: string;
  eyebrow?: string;
  headline: string;
  subheadline: string;
  body?: string;
  primaryCtaLabel: string;
  onPrimaryCta: () => void;
  secondaryCtaLabel?: string;
  onSecondaryCta?: () => void;
  /** Rendered below the CTAs — used for the 30-day motif on the player hero. */
  children?: ReactNode;
}

export default function AtmosphericHero({
  backgroundSrc,
  eyebrow,
  headline,
  subheadline,
  body,
  primaryCtaLabel,
  onPrimaryCta,
  secondaryCtaLabel,
  onSecondaryCta,
  children,
}: AtmosphericHeroProps) {
  const [bgFailed, setBgFailed] = useState(false);

  return (
    <section
      style={{
        position: 'relative',
        minHeight: 'min(88vh, 760px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        overflow: 'hidden',
        borderRadius: 2,
        margin: '20px 0 0',
      }}
    >
      {/* Layered background image (falls back to pure gradient if unavailable) */}
      {backgroundSrc && !bgFailed && (
        <img
          src={backgroundSrc}
          alt=""
          aria-hidden="true"
          onError={() => setBgFailed(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
            opacity: 0.55,
          }}
        />
      )}

      {/* Readability + atmosphere overlays */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background: 'radial-gradient(ellipse at 50% 30%, rgba(11,15,12,0.35) 0%, rgba(7,10,8,0.85) 65%, rgba(6,8,6,0.98) 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="landing-mist"
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: '140%',
          height: '40%',
          zIndex: 1,
          background: 'radial-gradient(ellipse at 30% 100%, rgba(200,192,181,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 2, padding: '48px 20px', maxWidth: 780 }}>
        {eyebrow && (
          <p
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#FFB347',
              margin: '0 0 18px',
            }}
          >
            {eyebrow}
          </p>
        )}
        <h1
          style={{
            fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
            fontSize: 'clamp(34px, 6.5vw, 62px)',
            lineHeight: 1.08,
            color: '#F5EFE4',
            margin: '0 0 18px',
            textShadow: '0 4px 30px rgba(0,0,0,0.6)',
          }}
        >
          {headline}
        </h1>
        <p
          style={{
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: 'clamp(15px, 2vw, 19px)',
            color: '#F5D060',
            margin: '0 0 16px',
          }}
        >
          {subheadline}
        </p>
        {body && (
          <p
            style={{
              fontFamily: "'Lora', 'Inter', system-ui, sans-serif",
              fontSize: 15.5,
              lineHeight: 1.6,
              color: '#C8C0B5',
              maxWidth: 560,
              margin: '0 auto 32px',
            }}
          >
            {body}
          </p>
        )}

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginTop: body ? 0 : 28 }}>
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
          {secondaryCtaLabel && onSecondaryCta && (
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
          )}
        </div>

        {children && <div style={{ marginTop: 40 }}>{children}</div>}
      </div>
    </section>
  );
}
