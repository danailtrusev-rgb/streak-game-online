interface OperatorUseCasesProps {
  title: string;
  chips: readonly string[];
}

export default function OperatorUseCases({ title, chips }: OperatorUseCasesProps) {
  return (
    <section style={{ padding: '40px 0' }}>
      <h2
        style={{
          fontFamily: "'Cinzel', Georgia, serif",
          fontSize: 'clamp(22px, 3vw, 30px)',
          color: '#F5EFE4',
          textAlign: 'center',
          margin: '0 0 28px',
        }}
      >
        {title}
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {chips.map((chip) => (
          <span
            key={chip}
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: '#F5D060',
              background: 'rgba(245,208,96,0.08)',
              border: '1px solid rgba(245,208,96,0.25)',
              borderRadius: 999,
              padding: '8px 18px',
            }}
          >
            {chip}
          </span>
        ))}
      </div>
    </section>
  );
}
