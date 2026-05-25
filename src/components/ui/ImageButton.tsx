import { useState, useCallback } from 'react';

type ButtonVariant = 'carved-green' | 'carved-orange' | 'jungle' | 'jungle-secondary' | 'ghost';

interface ImageButtonProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  type?: 'button' | 'submit' | 'reset';
  variant?: ButtonVariant;

  base?: string;
  hover?: string;
  pressed?: string;
  imageAlt?: string;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  'carved-green':    'btn-carved btn-carved--green',
  'carved-orange':   'btn-carved btn-carved--orange',
  'jungle':          'jungle-button',
  'jungle-secondary':'jungle-button-secondary',
  'ghost': 'flex items-center gap-1.5 border border-transparent px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase text-bone-dark transition-all duration-300 hover:border-moss-dark/30 hover:text-bone-muted cursor-pointer',
};

export default function ImageButton({
  onClick,
  disabled = false,
  children,
  className,
  style,
  type = 'button',
  variant,
  base,
  hover,
  pressed,
  imageAlt = '',
}: ImageButtonProps) {
  const [imgState, setImgState] = useState<'base' | 'hover' | 'pressed'>('base');

  const hasImages = Boolean(base);

  const currentSrc = hasImages
    ? imgState === 'pressed' && pressed
      ? pressed
      : imgState === 'hover' && hover
        ? hover
        : base!
    : undefined;

  const handleMouseEnter = useCallback(() => {
    if (!disabled) setImgState('hover');
  }, [disabled]);

  const handleMouseLeave = useCallback(() => {
    setImgState('base');
  }, []);

  const handleMouseDown = useCallback(() => {
    if (!disabled) setImgState('pressed');
  }, [disabled]);

  const handleMouseUp = useCallback(() => {
    if (!disabled) setImgState('hover');
  }, [disabled]);

  const handleTouchStart = useCallback(() => {
    if (!disabled) setImgState('pressed');
  }, [disabled]);

  const handleTouchEnd = useCallback(() => {
    if (!disabled) setImgState('base');
  }, [disabled]);

  if (hasImages) {
    return (
      <button
        type={type}
        disabled={disabled}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={className}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          border: 'none',
          background: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.45 : 1,
          transition: 'opacity 150ms ease',
          ...style,
        }}
      >
        <img
          src={currentSrc}
          alt={imageAlt}
          draggable={false}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'fill',
            pointerEvents: 'none',
            userSelect: 'none',
            transition: 'filter 120ms ease',
            filter: imgState === 'pressed' ? 'brightness(0.88)' : 'brightness(1)',
          }}
        />
        {children && (
          <span
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              textShadow: '0 0 6px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.8)',
            }}
          >
            {children}
          </span>
        )}
      </button>
    );
  }

  const variantClass = variant ? VARIANT_CLASSES[variant] : '';
  const combinedClass = [variantClass, className].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className={combinedClass || undefined}
      style={style}
    >
      {children}
    </button>
  );
}
