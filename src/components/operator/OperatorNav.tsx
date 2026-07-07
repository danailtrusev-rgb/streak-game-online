import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { operatorLandingContent as copy } from '../../content/operatorLandingContent';
import { isPartnerPreviewActive } from '../../lib/partnerBasePath';

interface OperatorNavProps {
  onLockAccess: () => void;
}

export default function OperatorNav({ onLockAccess }: OperatorNavProps) {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0', flexWrap: 'wrap', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link to="/overview" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <TrendingUp size={22} strokeWidth={1.4} color="#D4A020" />
          <span style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 16, letterSpacing: '0.04em', color: '#D4A020' }}>
            Survive the Streak — Partners
          </span>
        </Link>
        {isPartnerPreviewActive() && (
          <span
            title="This is a development/Bolt preview build — not production security."
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#0B0F0C',
              background: '#D97757',
              borderRadius: 999,
              padding: '3px 9px',
            }}
          >
            Preview Environment
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
        <a href="#product-system" style={navLinkStyle}>How It Works</a>
        <a href="#use-cases" style={navLinkStyle}>Use Cases</a>
        <a href="#formats" style={navLinkStyle}>Formats</a>
        <Link to="/contact" style={navLinkStyle}>Contact</Link>
        <a href={copy.nav.playerUrl} target="_blank" rel="noopener noreferrer" style={navLinkStyle}>
          {copy.nav.viewPlayerExperience}
        </a>
        <button onClick={onLockAccess} style={{ ...navLinkStyle, background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 999, padding: '6px 14px', cursor: 'pointer' }}>
          Lock Access
        </button>
      </div>
    </nav>
  );
}

const navLinkStyle = {
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.55)',
  textDecoration: 'none',
} as const;
