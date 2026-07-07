import { Skull, Flame, ScrollText, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import AssetIcon from '../ui/AssetIcon';
import { ICONS } from '../../lib/assets';

interface ChallengeItem {
  name: string;
  text: string;
}

const PANEL_ICONS: { icon: string; fallback: LucideIcon; glow: string }[] = [
  { icon: ICONS.skull, fallback: Skull, glow: 'rgba(255,122,0,0.25)' },
  { icon: ICONS.flame, fallback: Flame, glow: 'rgba(255,179,71,0.3)' },
  { icon: ICONS.scroll, fallback: ScrollText, glow: 'rgba(245,208,96,0.25)' },
  { icon: ICONS.sparkles, fallback: Sparkles, glow: 'rgba(200,192,181,0.2)' },
];

interface ChallengePreviewGridProps {
  title: string;
  text: string;
  items: readonly ChallengeItem[];
}

export default function ChallengePreviewGrid({ title, text, items }: ChallengePreviewGridProps) {
  return (
    <section style={{ padding: '48px 0' }}>
      <h2 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 'clamp(22px, 3vw, 30px)', color: '#F5EFE4', textAlign: 'center', margin: '0 0 12px' }}>
        {title}
      </h2>
      <p style={{ fontFamily: "'Lora', 'Inter', system-ui, sans-serif", fontSize: 14.5, color: '#C8C0B5', textAlign: 'center', maxWidth: 640, margin: '0 auto 32px' }}>
        {text}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {items.map((item, i) => {
          const { icon, fallback, glow } = PANEL_ICONS[i % PANEL_ICONS.length];
          return (
            <div
              key={item.name}
              style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 2,
                border: '1px solid rgba(255,122,0,0.14)',
                padding: '28px 20px',
                background: 'linear-gradient(160deg, rgba(30,45,36,0.5) 0%, rgba(11,15,12,0.85) 80%)',
                minHeight: 168,
              }}
            >
              <div
                aria-hidden="true"
                style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${glow} 0%, transparent 70%)` }}
              />
              <AssetIcon src={icon} fallback={fallback} size={28} strokeWidth={1.3} style={{ position: 'relative', zIndex: 1, filter: 'drop-shadow(0 0 8px rgba(255,122,0,0.35))' }} />
              <h3 style={{ position: 'relative', zIndex: 1, fontFamily: "'Cinzel', Georgia, serif", fontSize: 16, color: '#F5D060', margin: '16px 0 8px' }}>
                {item.name}
              </h3>
              <p style={{ position: 'relative', zIndex: 1, fontFamily: "'Lora', 'Inter', system-ui, sans-serif", fontSize: 13.5, lineHeight: 1.5, color: '#C8C0B5', margin: 0 }}>
                {item.text}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
