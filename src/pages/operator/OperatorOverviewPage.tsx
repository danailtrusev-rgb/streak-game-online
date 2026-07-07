import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import LandingShell from '../../components/landing/LandingShell';
import AtmosphericHero from '../../components/landing/AtmosphericHero';
import FeatureCards from '../../components/landing/FeatureCards';
import OperatorUseCases from '../../components/landing/OperatorUseCases';
import SystemDiagram from '../../components/landing/SystemDiagram';
import PilotSteps from '../../components/landing/PilotSteps';
import CTASection from '../../components/landing/CTASection';
import OperatorFooter from '../../components/operator/OperatorFooter';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { operatorLandingContent as copy } from '../../content/operatorLandingContent';
import { BACKGROUNDS } from '../../lib/assets';

interface OperatorOverviewPageProps {
  /** Pre-built nav element (real OperatorNav + Lock Access, or the preview nav + Exit Preview). */
  nav: ReactNode;
}

export default function OperatorOverviewPage({ nav }: OperatorOverviewPageProps) {
  const navigate = useNavigate();
  useDocumentMeta({ title: `${copy.hero.headline} — Survive the Streak Partners`, robots: 'noindex, nofollow, noarchive' });

  const scrollToSystem = () => document.getElementById('product-system')?.scrollIntoView({ behavior: 'smooth' });
  const goToContact = () => navigate('/contact');

  return (
    <LandingShell>
      {nav}

      <AtmosphericHero
        variant="operator"
        backgroundSrc={BACKGROUNDS.ritual_floor}
        headline={copy.hero.headline}
        subheadline={copy.hero.subheadline}
        body={copy.hero.body}
        primaryCtaLabel={copy.hero.primaryCta}
        onPrimaryCta={goToContact}
        secondaryCtaLabel={copy.hero.secondaryCta}
        onSecondaryCta={scrollToSystem}
      />

      <section style={{ padding: '48px 0', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 'clamp(20px, 2.6vw, 26px)', color: '#EDEAE3', maxWidth: 760, margin: '0 auto 22px' }}>
          {copy.problem.title}
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 auto', maxWidth: 620, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, textAlign: 'left' }}>
          {copy.problem.points.map((p) => (
            <li key={p} style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13.5, color: '#9C9992', padding: '10px 14px', border: '1px solid rgba(212,160,32,0.12)', borderRadius: 2 }}>
              {p}
            </li>
          ))}
        </ul>
      </section>

      <div id="product-system">
        <SystemDiagram title={copy.system.title} text={copy.system.text} steps={copy.system.steps} />
      </div>

      <FeatureCards title={copy.value.title} cards={copy.value.cards} variant="operator" />

      <div id="use-cases">
        <OperatorUseCases title={copy.useCases.title} chips={copy.useCases.chips} />
      </div>

      <div id="formats">
        <FeatureCards title={copy.formats.title} cards={copy.formats.cards} variant="operator" />
      </div>

      <PilotSteps title={copy.pilot.title} steps={copy.pilot.steps} />

      <CTASection
        title={copy.finalCta.title}
        text={copy.finalCta.text}
        ctaLabel={copy.finalCta.cta}
        onCta={goToContact}
        variant="operator"
      />

      <OperatorFooter />
    </LandingShell>
  );
}
