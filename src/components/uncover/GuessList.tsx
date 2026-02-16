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
 * Display list of previous guesses.
 * Shows album title + artist name for each guess.
 * 
 * @param guesses - Array of previous guess attempts
 */
export function GuessList({ guesses }: GuessListProps) {
  if (guesses.length === 0) {
    return null;
  }
  
  return (
    <div className="w-full space-y-0">
      <h3 className="mb-3 text-sm font-semibold text-zinc-300">
        Previous Guesses
      </h3>
      <div className="divide-y divide-zinc-700">
        {guesses.map((guess) => (
          <div
            key={guess.guessNumber}
            className="flex items-center justify-between py-2"
          >
            <div className="flex-1">
              <div className="font-medium text-zinc-100">
                {guess.albumId ? guess.albumTitle : '(skipped)'}
              </div>
              {guess.artistName && (
                <div className="text-sm text-zinc-400">
                  {guess.artistName}
                </div>
              )}
            </div>
            <div className="ml-4 flex-shrink-0">
              {guess.isCorrect ? (
                <span className="text-lg text-green-400" aria-label="Correct">
                  ✓
                </span>
              ) : (
                <span className="text-lg text-red-400" aria-label="Wrong">
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
