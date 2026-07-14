import { Share2, Flame } from 'lucide-react';
import AssetIcon from '../ui/AssetIcon';
import { ICONS } from '../../lib/assets';

interface SocialSectionProps {
  title: string;
  text: string;
  bullets: readonly string[];
}

export default function SocialSection({ title, text, bullets }: SocialSectionProps) {
  return (
    <section style={{ padding: '48px 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32, alignItems: 'center' }}>
      <div>
        <h2 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 'clamp(22px, 3vw, 30px)', color: '#F5EFE4', margin: '0 0 14px' }}>
          {title}
        </h2>
        <p style={{ fontFamily: "'Lora', 'Inter', system-ui, sans-serif", fontSize: 15, lineHeight: 1.6, color: '#C8C0B5', margin: '0 0 20px', maxWidth: 440 }}>
          {text}
        </p>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bullets.map((b) => (
            <li key={b} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14, color: '#E8E2DA' }}>
              <Share2 size={15} strokeWidth={1.6} color="#F5D060" />
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Stylized preview — clearly a UI mock, not a real player claim */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            width: 260,
            borderRadius: 4,
            border: '1px solid rgba(255,122,0,0.2)',
            background: 'linear-gradient(160deg, rgba(30,45,36,0.7) 0%, rgba(11,15,12,0.95) 100%)',
            padding: 22,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          <span style={{ display: 'block', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>
            Share preview
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <AssetIcon src={ICONS.flame} fallback={Flame} size={26} strokeWidth={1.3} />
            <div>
              <div style={{ fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif", fontSize: 22, color: '#F5D060', lineHeight: 1 }}>Day 14</div>
              <div style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>current streak</div>
            </div>
          </div>
          <p style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 13, color: '#E8E2DA', margin: 0 }}>
            "Halfway to day 30. Think you can beat it?"
          </p>
        </div>
      </div>
    </section>
  );
}
