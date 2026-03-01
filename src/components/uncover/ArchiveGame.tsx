'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Share2, Zap, X } from 'lucide-react';
import { signIn } from 'next-auth/react';

import { useArchiveGame } from '@/hooks/useArchiveGame';
import { TOTAL_STAGES } from '@/lib/uncover/reveal-constants';
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
export function ArchiveGame({
  challengeDate,
  mobile = false,
}: ArchiveGameProps) {
  const router = useRouter();
  const game = useArchiveGame(challengeDate);

  const [challengeImageUrl, setChallengeImageUrl] = useState<string | null>(
    null
  );
  const [isInitializing, setIsInitializing] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Format in UTC to avoid timezone shift displaying wrong date
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(challengeDate);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    game.isAuthenticated,
    game.isAuthLoading,
    game.sessionId,
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

  // AUTH-01: Show login prompt for unauthenticated users
  if (!game.isAuthenticated) {
    if (game.isAuthLoading) {
      return (
        <div className='flex min-h-[400px] items-center justify-center'>
          <div className='text-muted-foreground'>Loading...</div>
        </div>
      );
    }

    const dateStr = challengeDate.toISOString().split('T')[0];
    const callbackUrl = mobile
      ? `/m/game/archive/${dateStr}`
      : `/game/archive/${dateStr}`;

    return (
      <div className='flex min-h-[400px] flex-col items-center justify-center gap-6 p-8'>
        <div className='text-center'>
          <h2 className='mb-2 text-2xl font-bold'>
            Archive Game - {formattedDate}
          </h2>
          <p className='text-muted-foreground mb-4'>
            Sign in to play past challenges
          </p>
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
      <div className='flex h-full items-center justify-center'>
        <div className='text-muted-foreground'>Starting game...</div>
      </div>
    );
  }

  // Error state — no challenge for this date or other failure
  if (game.error && !game.sessionId) {
    return (
      <div className='flex h-full flex-col items-center justify-center gap-5 p-8'>
        <div className='text-center'>
          <p className='mb-1 text-sm text-zinc-500'>{formattedDate}</p>
          <h2 className='mb-2 text-xl font-bold text-white'>
            No challenge available
          </h2>
          <p className='text-sm text-zinc-500'>
            There&apos;s no puzzle for this date yet.
          </p>
        </div>
        <button
          onClick={() => router.push(archiveUrl)}
          className='flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800'
        >
          <Calendar className='h-4 w-4' />
          Back to Archive
        </button>
      </div>
    );
  }

  // Game over state — V2 two-column layout
  if (game.isGameOver) {
    const won = game.won;
    return (
      <div className='flex h-full items-center justify-center gap-12 px-10'>
        {/* Art Column — full reveal */}
        <div className='flex flex-col items-center gap-4'>
          {challengeImageUrl && game.challengeId && (
            <div
              className={`overflow-hidden rounded-2xl border ${
                won
                  ? 'border-emerald-500/25 shadow-[0_0_48px_rgba(16,185,129,0.07)]'
                  : 'border-red-500/25 shadow-[0_0_48px_rgba(239,68,68,0.07)]'
              } bg-zinc-900`}
            >
              <div className='h-[500px] w-[500px]'>
                <RevealImage
                  imageUrl={challengeImageUrl}
                  challengeId={game.challengeId}
                  stage={TOTAL_STAGES}
                  showToggle={false}
                  className='h-full w-full'
                />
              </div>
            </div>
          )}
        </div>

        {/* Controls Column — result + actions */}
        <div className='flex w-[420px] flex-col justify-center'>
          {/* Date label */}
          <p className='pb-2 text-sm text-zinc-500'>{formattedDate}</p>

          {/* Result header */}
          <div className='space-y-1 pb-6'>
            <h2 className='text-4xl font-bold text-white'>
              {won ? 'You got it!' : 'Better luck next time'}
            </h2>
            <div className='flex items-center gap-2 pt-2'>
              {won ? (
                <>
                  <Zap className='h-4 w-4 text-emerald-400' />
                  <span className='text-sm text-zinc-400'>
                    Guessed in {game.attemptCount}{' '}
                    {game.attemptCount === 1 ? 'attempt' : 'attempts'}
                  </span>
                </>
              ) : (
                <>
                  <X className='h-4 w-4 text-red-400' />
                  <span className='text-sm text-zinc-400'>
                    Used all {game.attemptCount} attempts
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className='flex gap-3 pb-6'>
            <button
              className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-colors ${
                won
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-red-600 hover:bg-red-500'
              }`}
            >
              <Share2 className='h-4 w-4' />
              Share Result
            </button>
            <Link
              href={archiveUrl}
              className='flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/50 px-5 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800'
            >
              <Calendar className='h-4 w-4' />
              Back to Archive
            </Link>
          </div>

          {/* Guesses list */}
          {game.guesses.length > 0 && (
            <div className='border-t border-zinc-800 pt-4'>
              <GuessList guesses={game.guesses} />
            </div>
          )}
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

  // Game board for IN_PROGRESS sessions — V2 two-column layout
  return (
    <div className='flex h-full items-start gap-12 px-[60px] pt-8'>
      {/* Art Column */}
      <div className='flex flex-col items-center gap-4'>
        {challengeImageUrl && game.challengeId && (
          <div className='overflow-hidden rounded-2xl border border-emerald-500/25 bg-zinc-900 shadow-[0_0_48px_rgba(16,185,129,0.07)]'>
            <div className='h-[500px] w-[500px]'>
              <RevealImage
                imageUrl={challengeImageUrl}
                challengeId={game.challengeId}
                stage={game.revealStage}
                revealMode='regions'
                isSubmitting={game.isSubmitting}
                className='h-full w-full'
              />
            </div>
          </div>
        )}

        {/* Dots + Attempt label */}
        <div className='flex items-center gap-3'>
          <AttemptDots attemptCount={game.attemptCount} />
          <span className='text-xs text-zinc-500'>
            Attempt {game.attemptCount + 1} of 4
          </span>
        </div>
      </div>

      {/* Controls Column */}
      <div className='flex min-h-0 flex-1 flex-col'>
        {/* Date label */}
        <p className='pb-3 text-sm text-zinc-500'>{formattedDate}</p>

        {/* Search input */}
        <div className='pb-3'>
          <AlbumGuessInput
            onGuess={game.submitGuess}
            onSkip={game.skipGuess}
            disabled={game.isGameOver}
            isSubmitting={game.isSubmitting}
          />
        </div>

        {/* Divider */}
        <div className='h-px w-full bg-zinc-800' />

        {/* Previous guesses */}
        {game.guesses.length > 0 && (
          <div className='min-h-0 flex-1 overflow-y-auto pt-3'>
            <GuessList guesses={game.guesses} />
          </div>
        )}

        {/* Error display */}
        {game.error && (
          <div className='mt-3 rounded-md border border-red-500/50 bg-red-950/20 p-3 text-center text-sm text-red-400'>
            {game.error}
          </div>
        )}
      </div>
    </div>
  );
}
