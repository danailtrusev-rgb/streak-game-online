import { useNavigate } from 'react-router-dom';
import LandingShell from '../components/landing/LandingShell';
import LandingNav from '../components/landing/LandingNav';
import AtmosphericHero from '../components/landing/AtmosphericHero';
import DayMotif from '../components/landing/DayMotif';
import StepSequence from '../components/landing/StepSequence';
import ChallengePreviewGrid from '../components/landing/ChallengePreviewGrid';
import WeekendSplit from '../components/landing/WeekendSplit';
import SocialSection from '../components/landing/SocialSection';
import MobileShowcase from '../components/landing/MobileShowcase';
import CTASection from '../components/landing/CTASection';
import LandingFooter from '../components/landing/LandingFooter';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { BACKGROUNDS } from '../lib/assets';
import { playerLandingContent as copy } from '../content/playerLandingContent';

export default function PlayerLandingPage() {
  const navigate = useNavigate();
  useDocumentMeta({ title: copy.meta.title, description: copy.meta.description });

  const scrollToHowItWorks = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };
  const goToGame = () => navigate('/play');

  return (
    <LandingShell>
      <LandingNav />

      <AtmosphericHero
        backgroundSrc={BACKGROUNDS.gate_home}
        eyebrow={copy.hero.eyebrow}
        headline={copy.hero.headline}
        subheadline={copy.hero.subheadline}
        primaryCtaLabel={copy.hero.primaryCta}
        onPrimaryCta={goToGame}
        secondaryCtaLabel={copy.hero.secondaryCta}
        onSecondaryCta={scrollToHowItWorks}
      >
        <DayMotif title={copy.motif.title} text={copy.motif.text} milestones={copy.motif.milestones} />
      </AtmosphericHero>

      <div id="how-it-works">
        <StepSequence title={copy.howItWorks.title} steps={copy.howItWorks.steps} />
      </div>

      <ChallengePreviewGrid title={copy.challenges.title} text={copy.challenges.text} items={copy.challenges.items} />

      <WeekendSplit title={copy.weekend.title} text={copy.weekend.text} stages={copy.weekend.stages} />

      <SocialSection title={copy.social.title} text={copy.social.text} bullets={copy.social.bullets} />

      <MobileShowcase title={copy.mobile.title} text={copy.mobile.text} />

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
