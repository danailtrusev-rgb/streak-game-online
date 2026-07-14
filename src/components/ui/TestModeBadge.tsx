interface TestModeBadgeProps {
  levelId: number | null;
}

export default function TestModeBadge({ levelId }: TestModeBadgeProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        left: 12,
        zIndex: 9000,
        background: 'rgba(0,0,0,0.85)',
        border: '1.5px solid #ff9900',
        borderRadius: 3,
        padding: '4px 10px',
        pointerEvents: 'none',
      }}
    >
      <span
        style={{
          color: '#ff9900',
          fontFamily: 'monospace',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        TEST MODE {levelId !== null ? `– LEVEL ${levelId}` : '– INVALID'}
      </span>
    </div>
  );
}
