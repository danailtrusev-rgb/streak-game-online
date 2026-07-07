import { Link } from 'react-router-dom';
import AssetIcon from '../ui/AssetIcon';
import { ICONS } from '../../lib/assets';
import { Skull } from 'lucide-react';

interface LandingNavProps {
  /** Which page is currently active, so we can link to the other one. */
  variant: 'player' | 'operator';
}

export default function LandingNav({ variant }: LandingNavProps) {
  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 0',
      }}
    >
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <AssetIcon src={ICONS.skull} fallback={Skull} size={28} strokeWidth={1.4} style={{ filter: 'drop-shadow(0 0 8px rgba(255,122,0,0.5))' }} />
        <span
          style={{
            fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
            fontSize: 18,
            letterSpacing: '0.04em',
            color: '#F5D060',
          }}
        >
          Survive the Streak
        </span>
      </Link>

      {variant === 'player' ? (
        <Link
          to="/operators"
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)',
            textDecoration: 'none',
          }}
        >
          For Operators
        </Link>
      ) : (
        <Link
          to="/"
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)',
            textDecoration: 'none',
          }}
        >
          Player Site
        </Link>
      )}
    </nav>
  );
}
