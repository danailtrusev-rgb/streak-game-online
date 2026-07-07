import LandingShell from '../../components/landing/LandingShell';
import OperatorNav from '../../components/operator/OperatorNav';
import OperatorContactForm from '../../components/operator/OperatorContactForm';
import LandingFooter from '../../components/landing/LandingFooter';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';

interface OperatorContactPageProps {
  onLockAccess: () => void;
}

export default function OperatorContactPage({ onLockAccess }: OperatorContactPageProps) {
  useDocumentMeta({ title: 'Request a Pilot — Survive the Streak Partners', robots: 'noindex, nofollow, noarchive' });

  return (
    <LandingShell>
      <OperatorNav onLockAccess={onLockAccess} />
      <section style={{ padding: '48px 0 64px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 'clamp(24px, 3.4vw, 32px)', color: '#EDEAE3', margin: '0 0 12px' }}>
          Want to test a daily streak campaign?
        </h1>
        <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14.5, color: '#9C9992', maxWidth: 480, margin: '0 auto 36px' }}>
          We are preparing early operator pilots for selected partners. Tell us a bit about your use case and we'll follow up.
        </p>
        <OperatorContactForm />
      </section>
      <LandingFooter />
    </LandingShell>
  );
}
