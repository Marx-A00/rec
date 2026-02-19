'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { signIn } from 'next-auth/react';

import { useArchiveGame } from '@/hooks/useArchiveGame';
import { RevealImage } from '@/components/uncover/RevealImage';
import { AlbumGuessInput } from '@/components/uncover/AlbumGuessInput';
import { GuessList } from '@/components/uncover/GuessList';
import { AttemptDots } from '@/components/uncover/AttemptDots';
import { StatsModal } from '@/components/uncover/StatsModal';

interface ArchiveGameProps {
  /** Date of the challenge to play (normalized UTC midnight) */
  challengeDate: Date;
  /** Mobile layout flag */
  mobile?: boolean;
}

/**
 * Archive game component for playing past Uncover challenges.
 *
 * Key differences from daily game:
 * - Takes challengeDate prop (not always "today")
 * - Shows formatted date in header
 * - Has "Back to Calendar" navigation
 * - Uses mode='archive' for stats modal
 * - No "tomorrow" messaging in results
 *
 * Desktop equivalent: src/components/uncover/UncoverGame.tsx
 */
export function ArchiveGame({ challengeDate, mobile = false }: ArchiveGameProps) {
  const router = useRouter();
  const game = useArchiveGame(challengeDate);

  const [challengeImageUrl, setChallengeImageUrl] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const formattedDate = format(challengeDate, 'MMMM d, yyyy');
  const archiveUrl = mobile ? '/m/game/archive' : '/game/archive';

  /**
   * Auto-start session on mount if authenticated and no active session.
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

    // Start archive session
    const initializeGame = async () => {
      setIsInitializing(true);
      try {
        const result = await game.startGame();
        setChallengeImageUrl(result.imageUrl);
      } catch (error) {
        console.error('Failed to start archive game:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeGame();
  }, [game.isAuthenticated, game.isAuthLoading, game.sessionId, game, isInitializing]);

  // Auto-show stats modal when game ends
  useEffect(() => {
    if (game.isGameOver && !showStats) {
      // Delay slightly for game-over animation to complete
      const timer = setTimeout(() => setShowStats(true), 800);
      return () => clearTimeout(timer);
    }
  }, [game.isGameOver, showStats]);

  // AUTH-01: Show login prompt for unauthenticated users
  if (!game.isAuthenticated) {
    if (game.isAuthLoading) {
      return (
        <div className='flex min-h-[400px] items-center justify-center'>
          <div className='text-muted-foreground'>Loading...</div>
        </div>
      );
    }

    const callbackUrl = mobile ? `/m/game/archive/${format(challengeDate, 'yyyy-MM-dd')}` : `/game/archive/${format(challengeDate, 'yyyy-MM-dd')}`;

    return (
      <div className='flex min-h-[400px] flex-col items-center justify-center gap-6 p-8'>
        <div className='text-center'>
          <h2 className='mb-2 text-2xl font-bold'>Archive Game - {formattedDate}</h2>
          <p className='text-muted-foreground mb-4'>Sign in to play past challenges</p>
        </div>
        <button
          onClick={() => signIn(undefined, { callbackUrl })}
          className='rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90 transition-colors'
        >
          Sign In to Play
        </button>
      </div>
    );
  }

  // Loading state during initial session start
  if (isInitializing || (game.isAuthenticated && !game.sessionId)) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <div className='text-muted-foreground'>Starting game...</div>
      </div>
    );
  }

  // Error state
  if (game.error && !game.sessionId) {
    return (
      <div className='flex min-h-[400px] flex-col items-center justify-center gap-4 p-8'>
        <div className='text-center'>
          <h2 className='mb-2 text-xl font-bold text-red-600'>Error</h2>
          <p className='text-muted-foreground'>{game.error}</p>
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

  // Game over state
  if (game.isGameOver) {
    return (
      <div className='flex min-h-[400px] flex-col items-center justify-center gap-6 p-8'>
        {/* Header with date */}
        <div className='text-center'>
          <div className='text-sm text-muted-foreground mb-2'>{formattedDate}</div>
          <h2 className='mb-2 text-3xl font-bold'>
            {game.won ? '🎉 You Won!' : '😔 Game Over'}
          </h2>
          <p className='text-muted-foreground'>
            {game.won
              ? `You guessed correctly in ${game.attemptCount} ${game.attemptCount === 1 ? 'attempt' : 'attempts'}!`
              : `You used all ${game.attemptCount} attempts.`}
          </p>
        </div>

        {/* Full reveal (stage 6) */}
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

        <div className='flex flex-col gap-3 w-full max-w-md'>
          {/* View Stats button */}
          <button
            onClick={() => setShowStats(true)}
            className='w-full rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90'
          >
            View Stats
          </button>

          {/* Back to Archive Calendar button */}
          <button
            onClick={() => router.push(archiveUrl)}
            className='w-full flex items-center justify-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-6 py-3 font-medium text-cosmic-latte transition-colors hover:bg-zinc-800'
          >
            <Calendar className='h-4 w-4' />
            Back to Archive
          </button>
        </div>

        {/* Stats Modal - archive mode */}
        <StatsModal
          open={showStats}
          onClose={() => setShowStats(false)}
          won={game.won}
          attemptCount={game.attemptCount}
          mode='archive'
        />
      </div>
    );
  }

  // Game board for IN_PROGRESS sessions
  return (
    <div className='flex min-h-[400px] flex-col items-center gap-6 p-4 md:p-8'>
      {/* Header with back button and date */}
      <div className='w-full max-w-md'>
        <button
          onClick={() => router.push(archiveUrl)}
          className='mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-cosmic-latte transition-colors'
        >
          <ArrowLeft className='h-4 w-4' />
          Back to Calendar
        </button>
        <div className='text-center'>
          <div className='text-sm text-muted-foreground mb-1'>{formattedDate}</div>
          <h2 className='mb-1 text-xl font-bold md:text-2xl'>Archive Challenge</h2>
          <p className='text-sm text-muted-foreground'>
            Guess the album from the cover art
          </p>
        </div>
      </div>

      {/* Reveal image */}
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
