interface Milestone {
  day: number;
  label: string;
}

interface DayMotifProps {
  title: string;
  text: string;
  milestones: readonly Milestone[];
}

export default function DayMotif({ title, text, milestones }: DayMotifProps) {
  const maxDay = milestones[milestones.length - 1]?.day ?? 30;

  return (
    <section style={{ padding: '44px 0 24px' }} aria-label="30-day survival progression">
      <h2
        style={{
          fontFamily: "'Cinzel', Georgia, serif",
          fontSize: 'clamp(20px, 2.6vw, 26px)',
          color: '#F5EFE4',
          textAlign: 'center',
          margin: '0 0 8px',
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontFamily: "'Lora', 'Inter', system-ui, sans-serif",
          fontSize: 14.5,
          color: '#C8C0B5',
          textAlign: 'center',
          maxWidth: 560,
          margin: '0 auto 36px',
        }}
      >
        {text}
      </p>

      <div style={{ position: 'relative', padding: '0 12px' }}>
        {/* Carved path line */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 15,
            left: 0,
            right: 0,
            height: 2,
            background: 'linear-gradient(90deg, rgba(255,122,0,0.15) 0%, rgba(255,179,71,0.55) 50%, rgba(245,208,96,0.85) 100%)',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
          {milestones.map((m) => (
            <div key={m.day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div
                aria-hidden="true"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: m.day === maxDay ? 'linear-gradient(180deg, #FFB347 0%, #FF7A00 100%)' : 'rgba(24,32,25,0.8)',
                  border: m.day === maxDay ? 'none' : '1px solid rgba(245,208,96,0.4)',
                  fontFamily: "'Cinzel', Georgia, serif",
                  fontSize: 12,
                  fontWeight: 700,
                  color: m.day === maxDay ? '#0B0F0C' : '#F5D060',
                  boxShadow: m.day === maxDay ? '0 0 20px rgba(255,122,0,0.5)' : 'none',
                }}
              >
                {m.day}
              </div>
              <span
                style={{
                  marginTop: 10,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: 11,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.55)',
                  textAlign: 'center',
                }}
              >
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
