interface FeatureCard {
  title: string;
  text: string;
}

interface FeatureCardsProps {
  title: string;
  cards: readonly FeatureCard[];
  /** Optional intro paragraph shown under the title, above the cards. */
  intro?: string;
}

export default function FeatureCards({ title, cards, intro }: FeatureCardsProps) {
  return (
    <section style={{ padding: '40px 0' }}>
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
          gap: 18,
        }}
      >
        {cards.map((card) => (
          <div
            key={card.title}
            style={{
              background: 'rgba(24,32,25,0.6)',
              border: '1px solid rgba(255,122,0,0.10)',
              borderRadius: 2,
              padding: '24px 22px',
            }}
          >
            <h3
              style={{
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: 17,
                color: '#F5D060',
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
                margin: 0,
              }}
            >
              {card.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
