interface Guess {
  guessNumber: number;
  guessedText: string | null;
  isCorrect: boolean;
  guessedArtistName?: string;
  guessedYear?: number;
}

interface GuessListProps {
  guesses: Guess[];
  correctArtist?: string | null;
  correctYear?: number | null;
}

/** Case-insensitive artist name comparison */
function isArtistMatch(guessedArtist?: string, correctArtist?: string | null): boolean {
  if (!guessedArtist || !correctArtist) return false;
  return guessedArtist.toLowerCase().trim() === correctArtist.toLowerCase().trim();
}

/** Get the decade label for a year: 1997 → "90s", 2003 → "2000s" */
function getDecade(year: number): string {
  const decadeStart = Math.floor(year / 10) * 10;
  if (decadeStart < 2000) return `${decadeStart - 1900}s`;
  return `${decadeStart}s`;
}

/** Check if two years fall in the same decade */
function isDecadeMatch(guessedYear?: number, correctYear?: number | null): boolean {
  if (!guessedYear || !correctYear) return false;
  return Math.floor(guessedYear / 10) === Math.floor(correctYear / 10);
}

/**
 * Display list of previous guesses with partial-match hints.
 *
 * - Green: correct album
 * - Amber: wrong album but correct artist and/or same decade
 * - Red: no match
 */
export function GuessList({ guesses, correctArtist, correctYear }: GuessListProps) {
  if (guesses.length === 0) {
    return null;
  }

  return (
    <div className='w-full space-y-1.5'>
      <h3 className='text-xs font-medium uppercase tracking-wide text-zinc-600'>
        Previous Guesses
      </h3>
      <div className='space-y-1.5'>
        {guesses.map(guess => {
          const artistMatch =
            !guess.isCorrect &&
            isArtistMatch(guess.guessedArtistName, correctArtist);
          const decadeMatch =
            !guess.isCorrect &&
            isDecadeMatch(guess.guessedYear, correctYear);
          const hasPartialMatch = artistMatch || decadeMatch;

          // Build hint chips
          const hints: string[] = [];
          if (artistMatch) hints.push('Correct artist');
          if (decadeMatch && guess.guessedYear) hints.push(`${getDecade(guess.guessedYear)}`);

          return (
            <div
              key={guess.guessNumber}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${
                guess.isCorrect
                  ? 'bg-emerald-950/40 border border-emerald-500/20'
                  : hasPartialMatch
                    ? 'bg-amber-950/30 border border-amber-500/20'
                    : 'bg-zinc-900/80'
              }`}
            >
              <div className='min-w-0 flex-1'>
                <div className='truncate text-sm font-medium text-zinc-200'>
                  {guess.guessedText || '(skipped)'}
                </div>
                {hints.length > 0 && (
                  <div className='flex items-center gap-2 pt-0.5'>
                    {hints.map(hint => (
                      <span
                        key={hint}
                        className='text-xs text-amber-400/80'
                      >
                        {hint}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className='ml-3 shrink-0'>
                {guess.isCorrect ? (
                  <span className='text-sm text-emerald-400' aria-label='Correct'>
                    ✓
                  </span>
                ) : hasPartialMatch ? (
                  <span className='text-sm text-amber-400' aria-label='Partial match'>
                    ~
                  </span>
                ) : (
                  <span className='text-sm text-red-400' aria-label='Wrong'>
                    ✗
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
