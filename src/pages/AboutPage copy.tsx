import { useNavigate } from 'react-router-dom';
import { Skull } from 'lucide-react';
import LandingShell from '../components/landing/LandingShell';
import LandingNav from '../components/landing/LandingNav';
import CTASection from '../components/landing/CTASection';
import LandingFooter from '../components/landing/LandingFooter';
import AssetIcon from '../components/ui/AssetIcon';
import { ICONS, BACKGROUNDS } from '../lib/assets';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { aboutPageContent as copy } from '../content/aboutPageContent';

export default function AboutPage() {
  const navigate = useNavigate();
  useDocumentMeta({ title: copy.meta.title, description: copy.meta.description });
  const goToGame = () => navigate('/play');

  return (
    <LandingShell>
      <LandingNav />

      <section
        style={{
          position: 'relative',
          padding: '56px 20px 40px',
          textAlign: 'center',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <img
          src={BACKGROUNDS.inner_jungle}
          alt=""
          aria-hidden="true"
          onError={(e) => { (e.currentTarget.style.display = 'none'); }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.25, zIndex: 0 }}
        />
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'radial-gradient(ellipse at 50% 20%, rgba(11,15,12,0.4) 0%, rgba(7,10,8,0.9) 70%)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <AssetIcon src={ICONS.skull} fallback={Skull} size={44} strokeWidth={1.2} style={{ margin: '0 auto 20px', display: 'block' }} />
          <h1 style={{ fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif", fontSize: 'clamp(28px, 5vw, 42px)', color: '#F5EFE4', margin: '0 0 16px' }}>
            {copy.intro.title}
          </h1>
          <p style={{ fontFamily: "'Lora', 'Inter', system-ui, sans-serif", fontSize: 16, lineHeight: 1.7, color: '#C8C0B5', maxWidth: 620, margin: '0 auto' }}>
            {copy.intro.text}
          </p>
        </div>
      </section>

      <section style={{ padding: '32px 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
        {copy.sections.map((s) => (
          <div key={s.title} style={{ background: 'rgba(24,32,25,0.5)', border: '1px solid rgba(255,122,0,0.10)', borderRadius: 2, padding: '22px 20px' }}>
            <h2 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 16, color: '#F5D060', margin: '0 0 10px' }}>{s.title}</h2>
            <p style={{ fontFamily: "'Lora', 'Inter', system-ui, sans-serif", fontSize: 14, lineHeight: 1.6, color: '#C8C0B5', margin: 0 }}>{s.text}</p>
          </div>
        ))}
      </section>

      <CTASection
        title={copy.finalCta.title}
        text=""
        ctaLabel={copy.finalCta.cta}
        onCta={goToGame}
      />

      <LandingFooter />
    </LandingShell>
  );
}
