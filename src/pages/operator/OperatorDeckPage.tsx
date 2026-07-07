import LandingShell from '../../components/landing/LandingShell';
import OperatorNav from '../../components/operator/OperatorNav';
import LandingFooter from '../../components/landing/LandingFooter';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';

interface OperatorDeckPageProps {
  onLockAccess: () => void;
}

/** Reserved route — no materials yet. Kept as a simple placeholder per the spec. */
export default function OperatorDeckPage({ onLockAccess }: OperatorDeckPageProps) {
  useDocumentMeta({ title: 'Partner Materials — Survive the Streak Partners', robots: 'noindex, nofollow, noarchive' });

  return (
    <LandingShell>
      <OperatorNav onLockAccess={onLockAccess} />
      <section style={{ padding: '64px 0', textAlign: 'center' }}>
        <h1 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 24, color: '#EDEAE3', margin: '0 0 12px' }}>
          Partner materials
        </h1>
        <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14, color: '#9C9992' }}>
          Deck and supporting materials will be published here for pilot partners.
        </p>
      </section>
      <LandingFooter />
    </LandingShell>
  );
}
