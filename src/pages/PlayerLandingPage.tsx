import { useNavigate } from 'react-router-dom';
import { Skull, Flame, Trophy, Shield, Star, Gamepad2 } from 'lucide-react';
import LandingShell from '../components/landing/LandingShell';
import LandingNav from '../components/landing/LandingNav';
import LandingHero from '../components/landing/LandingHero';
import FeatureCards from '../components/landing/FeatureCards';
import CTASection from '../components/landing/CTASection';
import LandingFooter from '../components/landing/LandingFooter';
import AssetIcon from '../components/ui/AssetIcon';
import { ICONS } from '../lib/assets';
import { playerLandingContent as copy } from '../content/landingContent';

export default function PlayerLandingPage() {
  const navigate = useNavigate();

  const scrollToHowItWorks = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  const goToGame = () => navigate('/play');

  return (
    <LandingShell>
      <LandingNav variant="player" />

      <LandingHero
        headline={copy.hero.headline}
        subheadline={copy.hero.subheadline}
        body={copy.hero.body}
        primaryCtaLabel={copy.hero.primaryCta}
        onPrimaryCta={goToGame}
        secondaryCtaLabel={copy.hero.secondaryCta}
        onSecondaryCta={scrollToHowItWorks}
        icon={<AssetIcon src={ICONS.skull} fallback={Skull} size={56} strokeWidth={1.2} style={{ filter: 'drop-shadow(0 0 20px rgba(255,122,0,0.4))' }} />}
      />

      <div id="how-it-works">
        <FeatureCards title={copy.howItWorks.title} cards={copy.howItWorks.cards} />
      </div>

      {/* Every day feels different */}
      <section style={{ padding: '40px 0' }}>
        <h2
          style={{
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: 'clamp(22px, 3vw, 30px)',
            color: '#F5EFE4',
            textAlign: 'center',
            margin: '0 0 16px',
          }}
        >
          {copy.everyDay.title}
        </h2>
        <p
          style={{
            fontFamily: "'Lora', 'Inter', system-ui, sans-serif",
            fontSize: 15,
            lineHeight: 1.6,
            color: '#C8C0B5',
            textAlign: 'center',
            maxWidth: 680,
            margin: '0 auto 28px',
          }}
        >
          {copy.everyDay.text}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          {copy.everyDay.examples.map((label, i) => {
            const icons = [ICONS.skull, ICONS.flame, ICONS.scroll, ICONS.star];
            const fallbacks = [Skull, Flame, Shield, Star];
            return (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(24,32,25,0.6)',
                  border: '1px solid rgba(255,122,0,0.10)',
                  borderRadius: 2,
                  padding: '10px 16px',
                  fontFamily: "'Cinzel', Georgia, serif",
                  fontSize: 13.5,
                  color: '#E8E2DA',
                }}
              >
                <AssetIcon src={icons[i] ?? ICONS.star} fallback={fallbacks[i] ?? Star} size={18} strokeWidth={1.4} />
                {label}
              </div>
            );
          })}
        </div>
      </section>

      {/* Weekend section */}
      <section style={{ padding: '40px 0', textAlign: 'center' }}>
        <AssetIcon src={ICONS.trophy} fallback={Trophy} size={34} strokeWidth={1.3} style={{ margin: '0 auto 14px', display: 'block' }} />
        <h2 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 'clamp(22px, 3vw, 30px)', color: '#F5EFE4', margin: '0 0 14px' }}>
          {copy.weekend.title}
        </h2>
        <p style={{ fontFamily: "'Lora', 'Inter', system-ui, sans-serif", fontSize: 15, lineHeight: 1.6, color: '#C8C0B5', maxWidth: 620, margin: '0 auto' }}>
          {copy.weekend.text}
        </p>
      </section>

      {/* Made for mobile */}
      <section style={{ padding: '40px 0', textAlign: 'center' }}>
        <AssetIcon src={ICONS.gamepad} fallback={Gamepad2} size={34} strokeWidth={1.3} style={{ margin: '0 auto 14px', display: 'block' }} />
        <h2 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 'clamp(22px, 3vw, 30px)', color: '#F5EFE4', margin: '0 0 14px' }}>
          {copy.mobile.title}
        </h2>
        <p style={{ fontFamily: "'Lora', 'Inter', system-ui, sans-serif", fontSize: 15, lineHeight: 1.6, color: '#C8C0B5', maxWidth: 620, margin: '0 auto' }}>
          {copy.mobile.text}
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
