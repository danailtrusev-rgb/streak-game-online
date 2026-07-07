interface PilotStepsProps {
  title: string;
  steps: readonly string[];
}

export default function PilotSteps({ title, steps }: PilotStepsProps) {
  return (
    <section style={{ padding: '52px 0' }}>
      <h2 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 'clamp(22px, 3vw, 28px)', color: '#F5EFE4', textAlign: 'center', margin: '0 0 32px' }}>
        {title}
      </h2>
      <ol style={{ listStyle: 'none', margin: '0 auto', padding: 0, maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {steps.map((step, i) => (
          <li key={step} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span
              style={{
                flexShrink: 0,
                width: 30,
                height: 30,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(212,160,32,0.3)',
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: 13,
                color: '#D4A020',
              }}
            >
              {i + 1}
            </span>
            <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14.5, color: '#EDEAE3' }}>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
