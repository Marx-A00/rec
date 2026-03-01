interface Guess {
  guessNumber: number;
  albumId: string | null;
  albumTitle: string;
  artistName: string;
  isCorrect: boolean;
}

interface GuessListProps {
  guesses: Guess[];
}

/**
 * V2 display list of previous guesses.
 * Each guess in a subtle zinc-900 row with correct/wrong indicator.
 */
export function GuessList({ guesses }: GuessListProps) {
  if (guesses.length === 0) {
    return null;
  }

  return (
    <div className='w-full space-y-1.5'>
      <h3 className='text-xs font-medium uppercase tracking-wide text-zinc-600'>
        Previous Guesses
      </h3>
      <div className='space-y-1.5'>
        {guesses.map(guess => (
          <div
            key={guess.guessNumber}
            className='flex items-center justify-between rounded-lg bg-zinc-900/80 px-3 py-2.5'
          >
            <div className='min-w-0 flex-1'>
              <div className='truncate text-sm font-medium text-zinc-200'>
                {guess.albumId ? guess.albumTitle : '(skipped)'}
              </div>
              {guess.artistName && (
                <div className='truncate text-xs text-zinc-500'>
                  {guess.artistName}
                </div>
              )}
            </div>
            <div className='ml-3 flex-shrink-0'>
              {guess.isCorrect ? (
                <span className='text-sm text-emerald-400' aria-label='Correct'>
                  ✓
                </span>
              ) : (
                <span className='text-sm text-red-400' aria-label='Wrong'>
                  ✗
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
