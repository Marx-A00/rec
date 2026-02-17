'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { signIn } from 'next-auth/react';

import { useUncoverGame } from '@/hooks/useUncoverGame';
import { useDailyChallengeQuery } from '@/generated/graphql';
import { RevealImage } from '@/components/uncover/RevealImage';
import { AlbumGuessInput } from '@/components/uncover/AlbumGuessInput';
import { GuessList } from '@/components/uncover/GuessList';
import { AttemptDots } from '@/components/uncover/AttemptDots';
import { StatsModal } from '@/components/uncover/StatsModal';

/**
 * Teaser image component for unauthenticated users.
 * Shows stage 1 obscured image to create curiosity.
 */
function TeaserImage() {
  const { data, isLoading } = useDailyChallengeQuery();

  if (isLoading) {
    return (
      <div className='aspect-square w-full max-w-md overflow-hidden rounded-lg bg-muted animate-pulse' />
    );
  }

  if (!data?.dailyChallenge?.imageUrl || !data?.dailyChallenge?.id) {
    return null;
  }

  return (
    <div className='w-full max-w-md'>
      <RevealImage
        imageUrl={data.dailyChallenge.imageUrl}
        challengeId={data.dailyChallenge.id}
        stage={1}
        showToggle={false}
        className='aspect-square w-full overflow-hidden rounded-lg'
      />
    </div>
  );
}

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

  const [challengeImageUrl, setChallengeImageUrl] = useState<string | null>(
    null
  );
  const [isInitializing, setIsInitializing] = useState(false);
  const [showStats, setShowStats] = useState(false);

  /**
   * Auto-start session on mount if authenticated and no active session.
   * Resume existing session if sessionId in store.
   */
  useEffect(() => {
    if (!game.isAuthenticated || game.isAuthLoading) {
      return;
    }

    // Already initializing - prevent duplicate calls
    if (isInitializing) {
      return;
    }

    // Already have image - don't refetch
    if (challengeImageUrl) {
      return;
    }

    // Start or resume session (backend returns existing session if already started)
    const initializeGame = async () => {
      setIsInitializing(true);
      try {
        const result = await game.startGame();
        setChallengeImageUrl(result.imageUrl);
      } catch (error) {
        console.error('Failed to start game:', error);
        // Error already set in game.error by useUncoverGame
      } finally {
        setIsInitializing(false);
      }
    };

    initializeGame();
  }, [
    game.isAuthenticated,
    game.isAuthLoading,
    challengeImageUrl,
    game,
    isInitializing,
  ]);

  // Auto-show stats modal when game ends
  useEffect(() => {
    if (game.isGameOver && !showStats) {
      // Delay slightly for game-over animation to complete
      const timer = setTimeout(() => setShowStats(true), 800);
      return () => clearTimeout(timer);
    }
  }, [game.isGameOver, showStats]);

  // AUTH-01: Show login prompt for unauthenticated users with teaser
  if (!game.isAuthenticated) {
    if (game.isAuthLoading) {
      return (
        <div className='flex min-h-[400px] items-center justify-center'>
          <div className='text-zinc-400'>Loading...</div>
        </div>
      );
    }

    return (
      <div className='flex min-h-[400px] flex-col items-center justify-center gap-6 p-8'>
        {/* Teaser image - stage 1 obscured */}
        <TeaserImage />

        {/* Login CTA overlay */}
        <div className='relative -mt-12 flex flex-col items-center gap-4 rounded-lg bg-background/95 p-6 shadow-lg backdrop-blur-sm'>
          <div className='text-center'>
            <h2 className='mb-2 text-2xl font-bold text-white'>
              Daily Album Uncover
            </h2>
            <p className='text-zinc-400 mb-4'>
              Guess the album from its cover art. 6 attempts. New puzzle daily.
            </p>
          </div>
          <button
            onClick={() => signIn(undefined, { callbackUrl: '/game' })}
            className='rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90 transition-colors'
          >
            Sign In to Play
          </button>
        </div>
      </div>
    );
  }

  // Loading state during initial session start
  if (isInitializing || (game.isAuthenticated && !game.sessionId)) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <div className='text-zinc-400'>Starting game...</div>
      </div>
    );
  }

  // Error state
  if (game.error && !game.sessionId) {
    return (
      <div className='flex min-h-[400px] flex-col items-center justify-center gap-4 p-8'>
        <div className='text-center'>
          <h2 className='mb-2 text-xl font-bold text-red-400'>Error</h2>
          <p className='text-zinc-400'>{game.error}</p>
        </div>
        <button
          onClick={() => {
            game.clearError();
            window.location.reload();
          }}
          className='rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90'
        >
          Try Again
        </button>
      </div>
    );
  }

  // DAILY-03 + GAME-07: Show results for completed games (won/lost)
  if (game.isGameOver) {
    return (
      <div className='flex min-h-[400px] flex-col items-center justify-center gap-6 p-8'>
        <div className='text-center'>
          <h2 className='mb-2 text-3xl font-bold text-white'>
            {game.won ? '🎉 You Won!' : '😔 Game Over'}
          </h2>
          <p className='text-zinc-400'>
            {game.won
              ? `You guessed correctly in ${game.attemptCount} ${game.attemptCount === 1 ? 'attempt' : 'attempts'}!`
              : `You used all ${game.attemptCount} attempts.`}
          </p>
        </div>

        {/* GAME-07: Full reveal (stage 6) on game end */}
        {challengeImageUrl && game.challengeId && (
          <div className='w-full max-w-md'>
            <RevealImage
              imageUrl={challengeImageUrl}
              challengeId={game.challengeId}
              stage={6}
              showToggle={false}
              className='aspect-square w-full overflow-hidden rounded-lg'
            />
          </div>
        )}

        {/* Previous guesses */}
        {game.guesses.length > 0 && (
          <div className='w-full max-w-md'>
            <GuessList guesses={game.guesses} />
          </div>
        )}

        <div className='space-y-4 text-center'>
          <div className='text-sm text-zinc-400'>
            Come back tomorrow for a new challenge!
          </div>

          {/* View Stats button */}
          <button
            onClick={() => setShowStats(true)}
            className='rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90'
          >
            View Stats
          </button>
        </div>

        {/* Stats Modal */}
        <StatsModal
          open={showStats}
          onClose={() => setShowStats(false)}
          won={game.won}
          attemptCount={game.attemptCount}
        />
      </div>
    );
  }

  // Game board for IN_PROGRESS sessions
  return (
    <div className='flex min-h-[400px] flex-col items-center gap-6 p-4 md:p-8'>
      {/* Header */}
      <div className='text-center'>
        <h2 className='mb-1 text-xl font-bold text-white md:text-2xl'>
          Daily Uncover
        </h2>
        <p className='text-sm text-zinc-400'>
          Guess the album from the cover art
        </p>
        <Link
          href='/game/archive'
          className='mt-2 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-cosmic-latte transition-colors'
        >
          <CalendarDays className='h-3.5 w-3.5' />
          Archive
        </Link>
      </div>

      {/* Reveal image - large and dominant */}
      {challengeImageUrl && game.challengeId && (
        <div className='w-full max-w-md'>
          <RevealImage
            imageUrl={challengeImageUrl}
            challengeId={game.challengeId}
            stage={game.revealStage}
            isSubmitting={game.isSubmitting}
            className='aspect-square w-full overflow-hidden rounded-lg'
          />
        </div>
      )}

      {/* Attempt dots indicator */}
      <AttemptDots attemptCount={game.attemptCount} />

      {/* Search input */}
      <div className='w-full max-w-md'>
        <AlbumGuessInput
          onGuess={game.submitGuess}
          onSkip={game.skipGuess}
          disabled={game.isGameOver}
          isSubmitting={game.isSubmitting}
        />
      </div>

      {/* Previous guesses */}
      {game.guesses.length > 0 && (
        <div className='w-full max-w-md'>
          <GuessList guesses={game.guesses} />
        </div>
      )}

      {/* Error display */}
      {game.error && (
        <div className='w-full max-w-md rounded-md border border-red-500/50 bg-red-950/20 p-4 text-center text-red-400'>
          {game.error}
        </div>
      )}
    </div>
  );
}
