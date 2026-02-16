'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { signIn } from 'next-auth/react';

import { useUncoverGame } from '@/hooks/useUncoverGame';
import { useDailyChallengeQuery } from '@/generated/graphql';
import { RevealImage } from '@/components/uncover/RevealImage';
import { AlbumGuessInput } from '@/components/uncover/AlbumGuessInput';
import { GuessList } from '@/components/uncover/GuessList';
import { AttemptDots } from '@/components/uncover/AttemptDots';

/**
 * Mobile teaser image component for unauthenticated users.
 * Shows stage 1 obscured image to create curiosity.
 */
function MobileTeaserImage() {
  const { data, isLoading } = useDailyChallengeQuery();

  if (isLoading) {
    return (
      <div className='aspect-square w-full overflow-hidden rounded-lg bg-zinc-900 animate-pulse' />
    );
  }

  if (!data?.dailyChallenge?.imageUrl || !data?.dailyChallenge?.id) {
    return null;
  }

  return (
    <div className='w-full'>
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
 * Mobile game client component for Uncover daily challenge.
 *
 * Mobile-optimized layout with:
 * - Sticky header with back navigation
 * - Touch-friendly controls (44px+ targets)
 * - Full-width layout
 * - Same game logic as desktop UncoverGame
 *
 * Desktop equivalent: src/components/uncover/UncoverGame.tsx
 */
export function MobileGameClient() {
  const router = useRouter();
  const game = useUncoverGame();

  const [challengeImageUrl, setChallengeImageUrl] = useState<string | null>(
    null
  );
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
    game.sessionId,
    game,
    isInitializing,
  ]);

  // AUTH-01: Show login prompt for unauthenticated users with teaser
  if (!game.isAuthenticated) {
    if (game.isAuthLoading) {
      return (
        <div className='min-h-screen bg-black'>
          <div className='sticky top-0 z-10 border-b border-zinc-800 bg-black/90 px-4 py-3 backdrop-blur-sm'>
            <button
              onClick={() => router.back()}
              className='flex min-h-[44px] min-w-[44px] items-center gap-2 text-white'
              aria-label='Go back'
            >
              <ArrowLeft className='h-5 w-5' />
              <span>Back</span>
            </button>
          </div>
          <div className='flex min-h-[400px] items-center justify-center'>
            <div className='text-zinc-400'>Loading...</div>
          </div>
        </div>
      );
    }

    return (
      <div className='min-h-screen bg-black'>
        <div className='sticky top-0 z-10 border-b border-zinc-800 bg-black/90 px-4 py-3 backdrop-blur-sm'>
          <button
            onClick={() => router.back()}
            className='flex min-h-[44px] min-w-[44px] items-center gap-2 text-white'
            aria-label='Go back'
          >
            <ArrowLeft className='h-5 w-5' />
            <span>Back</span>
          </button>
        </div>
        <div className='flex min-h-[400px] flex-col items-center justify-center gap-6 px-6 py-8'>
          {/* Mobile teaser image - stage 1 obscured */}
          <MobileTeaserImage />
          
          {/* Login CTA overlay */}
          <div className='relative -mt-8 flex w-full flex-col items-center gap-4 rounded-lg bg-zinc-900/95 p-6 shadow-lg backdrop-blur-sm'>
            <div className='text-center'>
              <h2 className='mb-2 text-2xl font-bold text-white'>Daily Album Uncover</h2>
              <p className='text-zinc-400 mb-4 text-sm'>
                Guess the album from its cover art. 6 attempts. New puzzle daily.
              </p>
            </div>
            <button
              onClick={() => signIn(undefined, { callbackUrl: '/m/game' })}
              className='min-h-[48px] w-full max-w-xs rounded-full bg-emeraled-green px-6 py-3 font-medium text-black transition-transform active:scale-[0.98]'
            >
              Sign In to Play
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state during initial session start
  if (isInitializing || (game.isAuthenticated && !game.sessionId)) {
    return (
      <div className='min-h-screen bg-black'>
        <div className='sticky top-0 z-10 border-b border-zinc-800 bg-black/90 px-4 py-3 backdrop-blur-sm'>
          <button
            onClick={() => router.back()}
            className='flex min-h-[44px] min-w-[44px] items-center gap-2 text-white'
            aria-label='Go back'
          >
            <ArrowLeft className='h-5 w-5' />
            <span>Back</span>
          </button>
        </div>
        <div className='flex min-h-[400px] items-center justify-center'>
          <div className='text-zinc-400'>Starting game...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (game.error && !game.sessionId) {
    return (
      <div className='min-h-screen bg-black'>
        <div className='sticky top-0 z-10 border-b border-zinc-800 bg-black/90 px-4 py-3 backdrop-blur-sm'>
          <button
            onClick={() => router.back()}
            className='flex min-h-[44px] min-w-[44px] items-center gap-2 text-white'
            aria-label='Go back'
          >
            <ArrowLeft className='h-5 w-5' />
            <span>Back</span>
          </button>
        </div>
        <div className='flex min-h-[400px] flex-col items-center justify-center gap-4 px-6 text-center'>
          <div>
            <h2 className='mb-2 text-xl font-bold text-red-500'>Error</h2>
            <p className='text-zinc-400'>{game.error}</p>
          </div>
          <button
            onClick={() => {
              game.clearError();
              window.location.reload();
            }}
            className='min-h-[44px] rounded-full bg-emeraled-green px-6 py-3 font-medium text-black'
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // DAILY-03 + GAME-07: Show results for completed games (won/lost)
  if (game.isGameOver) {
    return (
      <div className='min-h-screen bg-black pb-8'>
        <div className='sticky top-0 z-10 border-b border-zinc-800 bg-black/90 px-4 py-3 backdrop-blur-sm'>
          <button
            onClick={() => router.back()}
            className='flex min-h-[44px] min-w-[44px] items-center gap-2 text-white'
            aria-label='Go back'
          >
            <ArrowLeft className='h-5 w-5' />
            <span>Back</span>
          </button>
        </div>
        <div className='flex min-h-[400px] flex-col items-center justify-center gap-6 px-6 py-8'>
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
            <div className='w-full px-4'>
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
            <div className='w-full px-4'>
              <GuessList guesses={game.guesses} />
            </div>
          )}

          <div className='text-center text-sm text-zinc-500'>
            Come back tomorrow for a new challenge!
          </div>
        </div>
      </div>
    );
  }

  // Game board for IN_PROGRESS sessions
  return (
    <div className='min-h-screen bg-black pb-8'>
      {/* Sticky Header */}
      <div className='sticky top-0 z-10 border-b border-zinc-800 bg-black/90 px-4 py-3 backdrop-blur-sm'>
        <button
          onClick={() => router.back()}
          className='flex min-h-[44px] min-w-[44px] items-center gap-2 text-white'
          aria-label='Go back'
        >
          <ArrowLeft className='h-5 w-5' />
          <span>Back</span>
        </button>
      </div>

      <div className='flex flex-col gap-6 px-4 py-8'>
        {/* Header */}
        <div className='text-center'>
          <h2 className='mb-1 text-2xl font-bold text-white'>Daily Uncover</h2>
          <p className='text-sm text-zinc-400'>
            Guess the album from the cover art
          </p>
        </div>

        {/* Reveal image - full width */}
        {challengeImageUrl && game.challengeId && (
          <div className='w-full'>
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
        <div className='w-full'>
          <AlbumGuessInput
            onGuess={game.submitGuess}
            onSkip={game.skipGuess}
            disabled={game.isGameOver}
            isSubmitting={game.isSubmitting}
          />
        </div>

        {/* Previous guesses */}
        {game.guesses.length > 0 && (
          <div className='w-full'>
            <GuessList guesses={game.guesses} />
          </div>
        )}

        {/* Error display */}
        {game.error && (
          <div className='w-full rounded-md border border-red-500/50 bg-red-950/20 p-4 text-center text-red-400'>
            {game.error}
          </div>
        )}
      </div>
    </div>
  );
}
