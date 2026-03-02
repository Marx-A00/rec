interface AttemptDotsProps {
  attemptCount: number;
  maxAttempts?: number;
  /** Show the "Attempt X of Y" label inline */
  showLabel?: boolean;
  /** Whether the game is still in progress (shows current attempt as white) */
  isActive?: boolean;
}

/**
 * V2 visual indicator for attempt progress.
 * Red filled = used attempts, white filled = current attempt, outline = remaining.
 */
export function AttemptDots({
  attemptCount,
  maxAttempts = 4,
  showLabel = false,
  isActive = false,
}: AttemptDotsProps) {
  return (
    <div
      className='flex items-center gap-2'
      aria-label={`${attemptCount} of ${maxAttempts} attempts used`}
    >
      {Array.from({ length: maxAttempts }, (_, index) => {
        const isUsed = index < attemptCount;
        const isCurrent = isActive && index === attemptCount;

        return (
          <div
            key={index}
            className={`h-2.5 w-2.5 rounded-full transition-colors ${
              isUsed
                ? 'bg-red-400'
                : isCurrent
                  ? 'bg-white'
                  : 'border-[1.5px] border-zinc-600 bg-transparent'
            }`}
            aria-hidden='true'
          />
        );
      })}
      {showLabel && (
        <span className='ml-1 text-xs text-zinc-500'>
          Attempt {Math.min(attemptCount + 1, maxAttempts)} of {maxAttempts}
        </span>
      )}
    </div>
  );
}
