import { NavLink } from 'react-router-dom';
import { Skull, Gamepad2, Wallet, Trophy, Settings } from 'lucide-react';
import AssetIcon from '../ui/AssetIcon';
import { ICONS } from '../../lib/assets';

const navItems = [
  { to: '/',            assetSrc: ICONS.skull,    fallback: Skull,    label: 'Gate'   },
  { to: '/games',       assetSrc: ICONS.gamepad,  fallback: Gamepad2, label: 'Games'  },
  { to: '/wallet',      assetSrc: ICONS.wallet,   fallback: Wallet,   label: 'Wallet' },
  { to: '/leaderboard', assetSrc: ICONS.trophy,   fallback: Trophy,   label: 'Ranks'  },
  { to: '/settings',    assetSrc: ICONS.settings, fallback: Settings, label: 'Settings' },
];

export default function BottomNav() {
  return (
    <nav
      style={{
        height:              74,
        borderTop:           '1px solid rgba(255,122,0,0.10)',
        background:          'linear-gradient(180deg, rgba(8,12,9,0.97) 0%, rgba(5,8,6,0.99) 100%)',
        backdropFilter:      'blur(16px)',
        WebkitBackdropFilter:'blur(16px)',
        display:             'flex',
        alignItems:          'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', width: '100%', padding: '0 4px' }}>
        {navItems.map(({ to, assetSrc, fallback, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={{ textDecoration: 'none', flex: 1, minWidth: 0, cursor: 'pointer' }}
          >
            {({ isActive }) => (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                <AssetIcon
                  src={assetSrc}
                  fallback={fallback}
                  size={30}
                  strokeWidth={1.3}
                  style={{
                    filter: isActive
                      ? 'drop-shadow(0 0 8px rgba(255,122,0,0.75)) brightness(1.35)'
                      : 'brightness(0.4)',
                    transition: 'filter 0.2s ease',
                  }}
                />
                <span
                  style={{
                    fontFamily:    "'Inter', system-ui, sans-serif",
                    fontSize:       10,
                    fontWeight:     600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color:          isActive ? '#FF7A00' : 'rgba(255,255,255,0.55)',
                    transition:    'color 0.2s ease',
                    lineHeight:     1,
                  }}
                >
                  {label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
