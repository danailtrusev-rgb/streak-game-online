interface FeatureCard {
  title: string;
  text: string;
  metric?: string;
}

interface FeatureCardsProps {
  title: string;
  cards: readonly FeatureCard[];
  intro?: string;
  variant?: 'player' | 'operator';
}

export default function FeatureCards({ title, cards, intro, variant = 'player' }: FeatureCardsProps) {
  const isOperator = variant === 'operator';
  return (
    <section style={{ padding: isOperator ? '52px 0' : '40px 0' }}>
      <h2
        style={{
          fontFamily: "'Cinzel', Georgia, serif",
          fontSize: 'clamp(22px, 3vw, 30px)',
          color: '#F5EFE4',
          textAlign: 'center',
          margin: intro ? '0 0 16px' : '0 0 32px',
        }}
      >
        {title}
      </h2>
      {intro && (
        <p
          style={{
            fontFamily: "'Lora', 'Inter', system-ui, sans-serif",
            fontSize: 15,
            lineHeight: 1.6,
            color: '#C8C0B5',
            textAlign: 'center',
            maxWidth: 680,
            margin: '0 auto 32px',
          }}
        >
          {intro}
        </p>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: isOperator ? 22 : 18,
        }}
      >
        {cards.map((card) => (
          <div
            key={card.title}
            style={{
              background: isOperator ? 'rgba(255,255,255,0.03)' : 'rgba(24,32,25,0.6)',
              border: isOperator ? '1px solid rgba(212,160,32,0.14)' : '1px solid rgba(255,122,0,0.10)',
              borderRadius: 2,
              padding: isOperator ? '28px 24px' : '24px 22px',
            }}
          >
            <h3
              style={{
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: 17,
                color: isOperator ? '#D4A020' : '#F5D060',
                margin: '0 0 10px',
              }}
            >
              {card.title}
            </h3>
            <p
              style={{
                fontFamily: "'Lora', 'Inter', system-ui, sans-serif",
                fontSize: 14.5,
                lineHeight: 1.6,
                color: '#C8C0B5',
                margin: card.metric ? '0 0 12px' : 0,
              }}
            >
              {card.text}
            </p>
            {card.metric && (
              <span
                style={{
                  display: 'inline-block',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#9C9992',
                  border: '1px solid rgba(212,160,32,0.25)',
                  borderRadius: 999,
                  padding: '4px 10px',
                }}
              >
                {card.metric}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
