interface EmptyStepPlaceholderProps {
  message: string;
  subtitle?: string;
  variant?: 'default' | 'error';
}

export function EmptyStepPlaceholder({
  message,
  subtitle,
  variant = 'default',
}: EmptyStepPlaceholderProps) {
  const borderClass =
    variant === 'error'
      ? 'border-destructive/30'
      : 'border-muted-foreground/30';
  const textClass =
    variant === 'error' ? 'text-destructive' : 'text-zinc-500';

  return (
    <div
      className={`flex items-center justify-center h-[300px] border border-dashed ${borderClass} rounded-lg`}
    >
      <div className='text-center'>
        <p className={textClass}>{message}</p>
        {subtitle && (
          <p className='text-sm text-zinc-600 mt-1'>{subtitle}</p>
        )}
      </div>
    </div>
  );
}
