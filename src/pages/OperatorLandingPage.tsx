import { TrendingUp } from 'lucide-react';
import LandingShell from '../components/landing/LandingShell';
import LandingNav from '../components/landing/LandingNav';
import LandingHero from '../components/landing/LandingHero';
import FeatureCards from '../components/landing/FeatureCards';
import OperatorUseCases from '../components/landing/OperatorUseCases';
import CTASection from '../components/landing/CTASection';
import LandingFooter from '../components/landing/LandingFooter';
import { operatorLandingContent as copy } from '../content/landingContent';

// Placeholder contact target until a dedicated /operators/contact route or
// contact form exists. Update this constant once a real destination is ready.
const OPERATOR_CONTACT_TARGET = 'mailto:partners@survivethestreak.com';

export default function OperatorLandingPage() {
  const scrollToConcept = () => {
    document.getElementById('product-concept')?.scrollIntoView({ behavior: 'smooth' });
  };

  const requestAccess = () => {
    window.location.href = OPERATOR_CONTACT_TARGET;
  };

  return (
    <LandingShell>
      <LandingNav variant="operator" />

      <LandingHero
        headline={copy.hero.headline}
        subheadline={copy.hero.subheadline}
        body={copy.hero.body}
        primaryCtaLabel={copy.hero.primaryCta}
        onPrimaryCta={requestAccess}
        secondaryCtaLabel={copy.hero.secondaryCta}
        onSecondaryCta={scrollToConcept}
        icon={<TrendingUp size={48} strokeWidth={1.2} color="#FFB347" style={{ filter: 'drop-shadow(0 0 20px rgba(255,122,0,0.4))' }} />}
      />

      {/* Problem framing */}
      <section style={{ padding: '32px 0', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 'clamp(20px, 2.6vw, 26px)', color: '#F5EFE4', maxWidth: 760, margin: '0 auto 16px' }}>
          {copy.problem.title}
        </h2>
        <p style={{ fontFamily: "'Lora', 'Inter', system-ui, sans-serif", fontSize: 15, lineHeight: 1.6, color: '#C8C0B5', maxWidth: 680, margin: '0 auto' }}>
          {copy.problem.text}
        </p>
      </section>

      <div id="product-concept">
        <FeatureCards title={copy.whatItAdds.title} cards={copy.whatItAdds.cards} />
      </div>

      <OperatorUseCases title={copy.useCases.title} chips={copy.useCases.chips} />

      <FeatureCards title={copy.formats.title} cards={copy.formats.cards} />

      {/* Why the model works — operator page only, do not reuse on player page */}
      <section style={{ padding: '40px 0', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 'clamp(22px, 3vw, 30px)', color: '#F5EFE4', margin: '0 0 16px' }}>
          {copy.whyItWorks.title}
        </h2>
        <p style={{ fontFamily: "'Lora', 'Inter', system-ui, sans-serif", fontSize: 15, lineHeight: 1.6, color: '#C8C0B5', maxWidth: 680, margin: '0 auto' }}>
          {copy.whyItWorks.text}
        </p>
      </section>

      <CTASection
        title={copy.finalCta.title}
        text={copy.finalCta.text}
        ctaLabel={copy.finalCta.cta}
        onCta={requestAccess}
      />

      <LandingFooter />
    </LandingShell>
  );
}
