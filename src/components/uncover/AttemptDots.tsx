interface AttemptDotsProps {
  attemptCount: number;
  maxAttempts?: number;
}

/**
 * Visual indicator for attempt progress.
 * Renders dots to show used vs remaining attempts.
 *
 * @param attemptCount - Number of attempts used (0-4)
 * @param maxAttempts - Maximum attempts allowed (default: 4)
 */
export function AttemptDots({
  attemptCount,
  maxAttempts = 4,
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
          className={`h-3 w-3 rounded-full ${
            filled ? 'bg-zinc-400' : 'border-2 border-zinc-600 bg-transparent'
          }`}
          aria-hidden='true'
        />
      ))}
    </div>
  );
}
