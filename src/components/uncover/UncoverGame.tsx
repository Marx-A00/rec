'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';

import { useUncoverGame } from '@/hooks/useUncoverGame';
import { useRevealStore } from '@/stores/useRevealStore';
import { RevealImage } from '@/components/uncover/RevealImage';

/**
 * Main game container component for Uncover daily challenge.
 * 
 * Handles:
 * - Auth gate (AUTH-01): Show login prompt for unauthenticated users
 * - Auto-start session on mount for authenticated users
 * - Loading state during session start
 * - Game board for IN_PROGRESS sessions
 * - Results screen for completed sessions (DAILY-03)
 */
export function UncoverGame() {
  const game = useUncoverGame();
  const { preferredStyle } = useRevealStore();
  
  const [challengeImageUrl, setChallengeImageUrl] = useState<string | null>(null);
  const [challengeImageId, setChallengeImageId] = useState<string | undefined>(undefined);
  const [isInitializing, setIsInitializing] = useState(false);
  
  /**
   * Auto-start session on mount if authenticated and no active session.
   * Resume existing session if sessionId in store.
   */
  useEffect(() => {
    if (!game.isAuthenticated || game.isAuthLoading) {
      return;
    }
    
    // Already have session - don't start again
    if (game.sessionId) {
      return;
    }
    
    // Already initializing - prevent duplicate calls
    if (isInitializing) {
      return;
    }
    
    // Start new session
    const initializeGame = async () => {
      setIsInitializing(true);
      try {
        const result = await game.startGame();
        setChallengeImageUrl(result.imageUrl);
        setChallengeImageId(result.cloudflareImageId);
      } catch (error) {
        console.error('Failed to start game:', error);
        // Error already set in game.error by useUncoverGame
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeGame();
  }, [game.isAuthenticated, game.isAuthLoading, game.sessionId, game, isInitializing]);
  
  // AUTH-01: Show login prompt for unauthenticated users
  if (!game.isAuthenticated) {
    if (game.isAuthLoading) {
      return (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      );
    }
    
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 p-8">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold">Login Required</h2>
          <p className="text-muted-foreground">
            Please sign in to play the daily Uncover challenge.
          </p>
        </div>
        <button
          onClick={() => signIn()}
          className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
        >
          Sign In to Play
        </button>
      </div>
    );
  }
  
  // Loading state during initial session start
  if (isInitializing || (game.isAuthenticated && !game.sessionId)) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-muted-foreground">Starting game...</div>
      </div>
    );
  }
  
  // Error state
  if (game.error && !game.sessionId) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-bold text-red-600">Error</h2>
          <p className="text-muted-foreground">{game.error}</p>
        </div>
        <button
          onClick={() => {
            game.clearError();
            window.location.reload();
          }}
          className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  // DAILY-03 + GAME-07: Show results for completed games (won/lost)
  if (game.isGameOver) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 p-8">
        <div className="text-center">
          <h2 className="mb-2 text-3xl font-bold">
            {game.won ? '🎉 You Won!' : '😔 Game Over'}
          </h2>
          <p className="text-muted-foreground">
            {game.won 
              ? `You guessed correctly in ${game.attemptCount} ${game.attemptCount === 1 ? 'attempt' : 'attempts'}!`
              : `You used all ${game.attemptCount} attempts.`
            }
          </p>
        </div>
        
        {/* GAME-07: Full reveal (stage 6) on game end */}
        {challengeImageUrl && (
          <div className="w-full max-w-md">
            <RevealImage
              imageUrl={challengeImageUrl}
              challengeId={game.challengeId ?? 'unknown'}
              stage={6}
              showToggle={false}
              className="aspect-square w-full overflow-hidden rounded-lg"
            />
          </div>
        )}
        
        {/* Previous guesses */}
        {game.guesses.length > 0 && (
          <div className="w-full max-w-md">
            <h3 className="mb-2 font-semibold">Your Guesses:</h3>
            <div className="space-y-2">
              {game.guesses.map((guess) => (
                <div
                  key={guess.guessNumber}
                  className={`rounded-md border p-3 ${
                    guess.isCorrect
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {guess.albumId ? guess.albumTitle : '(skipped)'}
                      </div>
                      {guess.artistName && (
                        <div className="text-sm text-muted-foreground">
                          {guess.artistName}
                        </div>
                      )}
                    </div>
                    <div className="text-xl">
                      {guess.isCorrect ? '✓' : '✗'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="text-center text-sm text-muted-foreground">
          Come back tomorrow for a new challenge!
        </div>
      </div>
    );
  }
  
  // Game board for IN_PROGRESS sessions
  return (
    <div className="flex min-h-[400px] flex-col items-center gap-6 p-8">
      <div className="text-center">
        <h2 className="mb-2 text-2xl font-bold">Daily Uncover Challenge</h2>
        <p className="text-muted-foreground">
          Guess the album from the revealed image
        </p>
      </div>
      
      {/* Reveal image at current stage (GAME-03) */}
      {challengeImageUrl && (
        <div className="w-full max-w-md">
          <RevealImage
            imageUrl={challengeImageUrl}
            challengeId={game.challengeId ?? 'unknown'}
            stage={game.revealStage}
            className="aspect-square w-full overflow-hidden rounded-lg"
          />
        </div>
      )}
      
      {/* Attempt counter */}
      <div className="text-center">
        <div className="text-lg font-semibold">
          Attempt {game.attemptCount} / 6
        </div>
        <div className="text-sm text-muted-foreground">
          Stage {game.revealStage} of 6
        </div>
      </div>
      
      {/* Previous guesses */}
      {game.guesses.length > 0 && (
        <div className="w-full max-w-md">
          <h3 className="mb-2 font-semibold">Previous Guesses:</h3>
          <div className="space-y-2">
            {game.guesses.map((guess) => (
              <div
                key={guess.guessNumber}
                className="flex items-center justify-between rounded-md border border-gray-300 bg-gray-50 p-3"
              >
                <div>
                  <div className="font-medium">
                    {guess.albumId ? guess.albumTitle : '(skipped)'}
                  </div>
                  {guess.artistName && (
                    <div className="text-sm text-muted-foreground">
                      {guess.artistName}
                    </div>
                  )}
                </div>
                <div className="text-xl">✗</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Skip button (GAME-04) */}
      <button
        onClick={game.skipGuess}
        disabled={game.isSubmitting}
        className="rounded-md border border-gray-300 bg-white px-6 py-3 font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {game.isSubmitting ? 'Skipping...' : 'Skip Guess'}
      </button>
      
      {/* Error display */}
      {game.error && (
        <div className="w-full max-w-md rounded-md border border-red-300 bg-red-50 p-4 text-center text-red-700">
          {game.error}
        </div>
      )}
      
      {/* Placeholder for album search input (to be added in Phase 38) */}
      <div className="w-full max-w-md rounded-md border-2 border-dashed border-gray-300 p-8 text-center text-muted-foreground">
        Album search input will be added in Phase 38
      </div>
    </div>
  );
}
