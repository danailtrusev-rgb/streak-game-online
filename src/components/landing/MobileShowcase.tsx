import { Gamepad2 } from 'lucide-react';
import AssetIcon from '../ui/AssetIcon';
import { ICONS } from '../../lib/assets';

interface MobileShowcaseProps {
  title: string;
  text: string;
}

export default function MobileShowcase({ title, text }: MobileShowcaseProps) {
  return (
    <section style={{ padding: '48px 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32, alignItems: 'center' }}>
      <div>
        <AssetIcon src={ICONS.gamepad} fallback={Gamepad2} size={30} strokeWidth={1.3} style={{ marginBottom: 14 }} />
        <h2 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 'clamp(22px, 3vw, 30px)', color: '#F5EFE4', margin: '0 0 14px' }}>
          {title}
        </h2>
        <p style={{ fontFamily: "'Lora', 'Inter', system-ui, sans-serif", fontSize: 15, lineHeight: 1.6, color: '#C8C0B5', margin: 0, maxWidth: 440 }}>
          {text}
        </p>
      </div>

      {/* Phone-shell preview — desktop only decoration; hidden on narrow
          viewports so we never wrap the user's real screen in a fake frame. */}
      <div className="mobile-showcase-frame" style={{ justifySelf: 'center' }}>
        <div
          style={{
            width: 220,
            height: 440,
            borderRadius: 28,
            border: '6px solid rgba(255,255,255,0.08)',
            background: 'linear-gradient(180deg, #0B0F0C 0%, #141A15 100%)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 40px rgba(255,122,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AssetIcon src={ICONS.skull} fallback={Gamepad2} size={64} strokeWidth={1} style={{ opacity: 0.6, filter: 'drop-shadow(0 0 20px rgba(255,122,0,0.35))' }} />
        </div>
      </div>
      <style>{`
        @media (max-width: 640px) {
          .mobile-showcase-frame { display: none; }
        }
      `}</style>
    </section>
  );
}
