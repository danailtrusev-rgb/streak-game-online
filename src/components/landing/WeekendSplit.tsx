import { Trophy, Crown } from 'lucide-react';

interface Stage {
  label: string;
  title: string;
  text: string;
}

interface WeekendSplitProps {
  title: string;
  text: string;
  stages: readonly Stage[];
}

export default function WeekendSplit({ title, text, stages }: WeekendSplitProps) {
  const icons = [Trophy, Crown];
  return (
    <section style={{ padding: '48px 0' }}>
      <h2 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 'clamp(22px, 3vw, 30px)', color: '#F5EFE4', textAlign: 'center', margin: '0 0 12px' }}>
        {title}
      </h2>
      <p style={{ fontFamily: "'Lora', 'Inter', system-ui, sans-serif", fontSize: 14.5, color: '#C8C0B5', textAlign: 'center', maxWidth: 640, margin: '0 auto 32px' }}>
        {text}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {stages.map((stage, i) => {
          const Icon = icons[i % icons.length];
          return (
            <div
              key={stage.label}
              style={{
                borderRadius: 2,
                border: '1px solid rgba(245,208,96,0.18)',
                padding: '28px 24px',
                background: i === stages.length - 1
                  ? 'linear-gradient(160deg, rgba(176,128,24,0.14) 0%, rgba(11,15,12,0.9) 80%)'
                  : 'rgba(24,32,25,0.55)',
              }}
            >
              <Icon size={26} strokeWidth={1.3} color="#F5D060" style={{ marginBottom: 14 }} />
              <span style={{ display: 'block', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                {stage.label}
              </span>
              <h3 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 18, color: '#F5EFE4', margin: '0 0 10px' }}>
                {stage.title}
              </h3>
              <p style={{ fontFamily: "'Lora', 'Inter', system-ui, sans-serif", fontSize: 14, lineHeight: 1.55, color: '#C8C0B5', margin: 0 }}>
                {stage.text}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
