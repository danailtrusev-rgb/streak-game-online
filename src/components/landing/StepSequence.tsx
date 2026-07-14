interface Step {
  title: string;
  text: string;
}

interface StepSequenceProps {
  title: string;
  steps: readonly Step[];
}

export default function StepSequence({ title, steps }: StepSequenceProps) {
  return (
    <section style={{ padding: '48px 0' }}>
      <h2
        style={{
          fontFamily: "'Cinzel', Georgia, serif",
          fontSize: 'clamp(22px, 3vw, 30px)',
          color: '#F5EFE4',
          textAlign: 'center',
          margin: '0 0 36px',
        }}
      >
        {title}
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${steps.length}, 1fr)`,
          gap: 0,
          position: 'relative',
        }}
        className="step-sequence"
      >
        {steps.map((step, i) => (
          <div key={step.title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 14px', position: 'relative' }}>
            {i > 0 && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 22,
                  right: '50%',
                  width: '100%',
                  height: 1,
                  background: 'linear-gradient(90deg, rgba(255,122,0,0.35), rgba(255,122,0,0.05))',
                }}
                className="step-connector"
              />
            )}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(24,32,25,0.75)',
                border: '1px solid rgba(255,122,0,0.35)',
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: 17,
                color: '#F5D060',
                position: 'relative',
                zIndex: 1,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <h3
              style={{
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: 16,
                color: '#F5EFE4',
                margin: '16px 0 8px',
                textAlign: 'center',
              }}
            >
              {step.title}
            </h3>
            <p
              style={{
                fontFamily: "'Lora', 'Inter', system-ui, sans-serif",
                fontSize: 14,
                lineHeight: 1.55,
                color: '#C8C0B5',
                margin: 0,
                textAlign: 'center',
              }}
            >
              {step.text}
            </p>
          </div>
        ))}
      </div>
      <style>{`
        @media (max-width: 720px) {
          .step-sequence { grid-template-columns: 1fr !important; gap: 28px !important; }
          .step-connector { display: none; }
        }
      `}</style>
    </section>
  );
}
