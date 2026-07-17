import { Link } from 'react-router-dom';

export default function LandingFooter() {
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
      <span>© {new Date().getFullYear()} Survive the Streak</span>
      <div style={{ display: 'flex', gap: 18 }}>
        <Link to="/play" style={{ color: 'inherit', textDecoration: 'none' }}>Play</Link>
        <Link to="/about" style={{ color: 'inherit', textDecoration: 'none' }}>About</Link>
      </div>
    </footer>
  );
}
