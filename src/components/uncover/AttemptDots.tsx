interface AttemptDotsProps {
  attemptCount: number;
  maxAttempts?: number;
  /** Show the "Attempt X of Y" label inline */
  showLabel?: boolean;
}

/**
 * V2 visual indicator for attempt progress.
 * Red filled dots = used attempts, outline = remaining.
 */
export function AttemptDots({
  attemptCount,
  maxAttempts = 4,
  showLabel = false,
}: AttemptDotsProps) {
  const dots = Array.from({ length: maxAttempts }, (_, i) => i < attemptCount);

  return (
    <div
      className='flex items-center gap-2'
      aria-label={`${attemptCount} of ${maxAttempts} attempts used`}
    >
      {dots.map((filled, index) => (
        <div
          key={index}
          className={`h-2.5 w-2.5 rounded-full transition-colors ${
            filled
              ? 'bg-red-400'
              : 'border-[1.5px] border-zinc-600 bg-transparent'
          }`}
          aria-hidden='true'
        />
      ))}
      {showLabel && (
        <span className='ml-1 text-xs text-zinc-500'>
          Attempt {Math.min(attemptCount + 1, maxAttempts)} of {maxAttempts}
        </span>
      )}
    </div>
  );
}
