interface CTASectionProps {
  title: string;
  text: string;
  ctaLabel: string;
  onCta: () => void;
}

export default function CTASection({ title, text, ctaLabel, onCta }: CTASectionProps) {
  return (
    <section
      style={{
        padding: '56px 0 72px',
        textAlign: 'center',
        borderTop: '1px solid rgba(255,122,0,0.10)',
        marginTop: 24,
      }}
    >
      <h2
        style={{
          fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
          fontSize: 'clamp(24px, 4vw, 34px)',
          color: '#F5EFE4',
          margin: '0 0 12px',
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontFamily: "'Lora', 'Inter', system-ui, sans-serif",
          fontSize: 15,
          color: '#C8C0B5',
          margin: '0 0 28px',
        }}
      >
        {text}
      </p>
      <button
        onClick={onCta}
        style={{
          fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
          fontSize: 20,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: '#0B0F0C',
          background: 'linear-gradient(180deg, #FFB347 0%, #FF7A00 100%)',
          border: 'none',
          borderRadius: 2,
          padding: '16px 44px',
          boxShadow: '0 0 30px rgba(255,122,0,0.4), 0 0 80px rgba(255,122,0,0.15)',
          cursor: 'pointer',
        }}
      >
        {ctaLabel}
      </button>
    </section>
  );
}
