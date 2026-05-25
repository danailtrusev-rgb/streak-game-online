interface PageTransitionProps {
  children:   React.ReactNode;
  className?: string;
  style?:     React.CSSProperties;
  /** Animation variant. Default 'fade-up' */
  variant?:   'fade-up' | 'fade-in' | 'scale-in';
}

const VARIANT_CLASS: Record<NonNullable<PageTransitionProps['variant']>, string> = {
  'fade-up':  'pg-transition pg-transition--fade-up',
  'fade-in':  'pg-transition pg-transition--fade-in',
  'scale-in': 'pg-transition pg-transition--scale-in',
};

export default function PageTransition({
  children,
  className = '',
  style,
  variant   = 'fade-up',
}: PageTransitionProps) {
  return (
    <div className={`${VARIANT_CLASS[variant]} ${className}`} style={style}>
      {children}
    </div>
  );
}
