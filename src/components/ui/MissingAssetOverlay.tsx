import { useEffect } from 'react';

interface MissingAssetOverlayProps {
  filePath: string;
  inline?: boolean;
}

export default function MissingAssetOverlay({ filePath, inline = false }: MissingAssetOverlayProps) {
  useEffect(() => {
    console.error('Missing Asset:', filePath);
  }, [filePath]);

  if (inline) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          minHeight: 48,
          background: 'rgba(0,0,0,0.7)',
          border: '1px solid #cc2222',
          padding: '4px 8px',
        }}
      >
        <span style={{ color: '#ff4444', fontSize: 10, fontFamily: 'monospace', textAlign: 'center', wordBreak: 'break-all' }}>
          Missing Asset:<br />{filePath}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        border: '2px solid #cc2222',
        borderRadius: 4,
        padding: '16px 24px',
        minWidth: 240,
        textAlign: 'center',
        pointerEvents: 'none',
      }}
    >
      <div style={{ color: '#ff4444', fontFamily: 'monospace', fontSize: 12 }}>
        <div style={{ marginBottom: 6, fontWeight: 700 }}>Missing Asset</div>
        <div style={{ wordBreak: 'break-all', opacity: 0.85 }}>{filePath}</div>
      </div>
    </div>
  );
}
