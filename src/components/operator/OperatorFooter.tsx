import { operatorLandingContent as copy } from '../../content/operatorLandingContent';

export default function OperatorFooter() {
  return (
    <footer
      style={{
        padding: '24px 0 40px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 12,
        color: 'rgba(255,255,255,0.35)',
      }}
    >
      <span>© {new Date().getFullYear()} Survive the Streak — Partners</span>
      {/* Real cross-domain link (not a react-router Link) — the player site
          is a separate domain/app, not an internal route of this bundle. */}
      <a href={copy.nav.playerUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
        {copy.nav.viewPlayerExperience}
      </a>
    </footer>
  );
}
