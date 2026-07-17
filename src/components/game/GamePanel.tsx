type PanelSize = 'large' | 'medium' | 'small';

const SIZE_PADDING: Record<PanelSize, string> = {
  large:  'p-6',
  medium: 'p-5',
  small:  'p-3',
};

interface GamePanelProps {
  size?: PanelSize;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function GamePanel({ size = 'large', children, className = '', style }: GamePanelProps) {
  return (
    <div
      className={`relative flex flex-col items-center ${SIZE_PADDING[size]} ${className}`}
      style={{
        background: 'linear-gradient(180deg, rgba(42,32,12,0.96) 0%, rgba(22,16,6,0.98) 100%)',
        border: '2px solid rgba(180,130,50,0.35)',
        boxShadow: 'inset 0 1px 0 rgba(255,200,100,0.10), inset 0 -1px 0 rgba(0,0,0,0.3), 0 6px 24px rgba(0,0,0,0.5)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
