import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';

interface OperatorPreviewNavProps {
  onExit: () => void;
}

export default function OperatorPreviewNav({ onExit }: OperatorPreviewNavProps) {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0', flexWrap: 'wrap', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link to="/overview" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <TrendingUp size={22} strokeWidth={1.4} color="#D4A020" />
          <span style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 16, letterSpacing: '0.04em', color: '#D4A020' }}>
            Survive the Streak — Partners
          </span>
        </Link>
        <span
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
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
        <Link to="/overview" style={navLinkStyle}>Overview</Link>
        <Link to="/deck" style={navLinkStyle}>Pilot</Link>
        <Link to="/contact" style={navLinkStyle}>Contact</Link>
        <button onClick={onExit} style={{ ...navLinkStyle, background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 999, padding: '6px 14px', cursor: 'pointer' }}>
          Exit Preview
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
