import { useNavigate } from 'react-router-dom';
import { Skull } from 'lucide-react';
import LandingShell from '../components/landing/LandingShell';
import LandingNav from '../components/landing/LandingNav';
import CTASection from '../components/landing/CTASection';
import LandingFooter from '../components/landing/LandingFooter';
import AssetIcon from '../components/ui/AssetIcon';
import { ICONS } from '../lib/assets';
import { playerLandingContent as copy } from '../content/landingContent';

export default function AboutPage() {
  const navigate = useNavigate();
  const goToGame = () => navigate('/play');

  return (
    <LandingShell>
      <LandingNav variant="player" />

      <section style={{ padding: '48px 0', textAlign: 'center' }}>
        <AssetIcon src={ICONS.skull} fallback={Skull} size={48} strokeWidth={1.2} style={{ margin: '0 auto 20px', display: 'block' }} />
        <h1 style={{ fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif", fontSize: 'clamp(28px, 5vw, 42px)', color: '#F5EFE4', margin: '0 0 20px' }}>
          What is Survive the Streak?
        </h1>
        <p style={{ fontFamily: "'Lora', 'Inter', system-ui, sans-serif", fontSize: 16, lineHeight: 1.7, color: '#C8C0B5', maxWidth: 620, margin: '0 auto 16px' }}>
          {copy.hero.body}
        </p>
        <p style={{ fontFamily: "'Lora', 'Inter', system-ui, sans-serif", fontSize: 16, lineHeight: 1.7, color: '#C8C0B5', maxWidth: 620, margin: '0 auto' }}>
          {copy.everyDay.text}
        </p>
      </section>

      <CTASection
        title={copy.finalCta.title}
        text={copy.finalCta.text}
        ctaLabel={copy.finalCta.cta}
        onCta={goToGame}
      />

      <LandingFooter />
    </LandingShell>
  );
}
