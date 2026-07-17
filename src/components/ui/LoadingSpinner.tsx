export default function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = {
    sm: 'h-4 w-4 border',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-2',
  }[size];

  return (
    <div
      className={`${sizeClass} animate-spin rounded-full border-torch-orange/20 border-t-torch-orange`}
    />
  );
}
