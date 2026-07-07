import { ArrowRight } from 'lucide-react';

interface SystemDiagramProps {
  title: string;
  text: string;
  steps: readonly string[];
}

export default function SystemDiagram({ title, text, steps }: SystemDiagramProps) {
  return (
    <section style={{ padding: '52px 0' }}>
      <h2 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 'clamp(22px, 3vw, 28px)', color: '#F5EFE4', textAlign: 'center', margin: '0 0 12px' }}>
        {title}
      </h2>
      <p style={{ fontFamily: "'Lora', 'Inter', system-ui, sans-serif", fontSize: 14.5, color: '#9C9992', textAlign: 'center', maxWidth: 600, margin: '0 auto 36px' }}>
        {text}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        {steps.map((step, i) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div
              style={{
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: 13.5,
                color: '#EDEAE3',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(212,160,32,0.2)',
                borderRadius: 999,
                padding: '10px 20px',
                whiteSpace: 'nowrap',
              }}
            >
              {step}
            </div>
            {i < steps.length - 1 && <ArrowRight size={16} color="#6B6862" style={{ flexShrink: 0 }} />}
          </div>
        ))}
      </div>
    </section>
  );
}
