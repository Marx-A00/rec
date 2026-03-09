'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Calendar, CalendarDays } from 'lucide-react';
import { signIn } from 'next-auth/react';

import { useUncoverGame } from '@/hooks/useUncoverGame';
import { TOTAL_STAGES } from '@/lib/uncover/reveal-constants';
import { RevealImage } from '@/components/uncover/RevealImage';
import { AlbumGuessInput } from '@/components/uncover/AlbumGuessInput';
import { GuessList } from '@/components/uncover/GuessList';
import { AttemptDots } from '@/components/uncover/AttemptDots';
import { LumaSpinner } from '@/components/ui/LumaSpinner';

/**
 * Available height for game content inside the mobile layout.
 * Mobile layout has: MobileHeader (~56px) + MobileBottomNav (56px + safe-area).
 * Using CSS calc so it adapts to actual safe-area insets.
 */
const MOBILE_CONTENT_HEIGHT =
  'calc(100dvh - 56px - 56px - env(safe-area-inset-bottom, 0px))';

interface MobilePlayClientProps {
  mode?: 'daily' | 'archive';
  challengeDate?: Date;
}

/**
 * Unified mobile game play client for Uncover.
 *
 * Handles both daily challenge and archive replays.
 * Sits inside mobile layout (MobileHeader + MobileBottomNav already present).
 * All states fill the available viewport without scrolling.
 *
 * Paths:
 *   /m/game/play            — mode='daily' (default)
 *   /m/game/archive/[date]  — mode='archive'
 */
export function MobilePlayClient({
  mode = 'daily',
  challengeDate,
}: MobilePlayClientProps) {
  const isArchive = mode === 'archive';

  const game = useUncoverGame(
    isArchive ? { mode: 'archive', challengeDate: challengeDate! } : undefined
  );

  const [challengeImageUrl, setChallengeImageUrl] = useState<string | null>(
    null
  );
  const [isInitializing, setIsInitializing] = useState(false);

  const startGameRef = useRef(game.startGame);
  startGameRef.current = game.startGame;

  const formattedDate = useMemo(
    () =>
      challengeDate
        ? new Intl.DateTimeFormat('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
          }).format(challengeDate)
        : '',
    [challengeDate]
  );

  useEffect(() => {
    if (!game.isAuthenticated || game.isAuthLoading) return;
    if (challengeImageUrl) return;

    let cancelled = false;
    const initializeGame = async () => {
      setIsInitializing(true);
      try {
        const result = await startGameRef.current();
        if (!cancelled && result) setChallengeImageUrl(result.imageUrl);
      } catch (error) {
        console.error(
          `Failed to start ${isArchive ? 'archive' : 'daily'} game:`,
          error
        );
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    };

    initializeGame();
    return () => {
      cancelled = true;
    };
  }, [game.isAuthenticated, game.isAuthLoading, challengeImageUrl, isArchive]);

  // ── AUTH: Sign-in prompt ──────────────────────────────────────────
  if (!game.isAuthenticated) {
    const callbackUrl = isArchive
      ? `/m/game/archive/${challengeDate?.toISOString().split('T')[0]}`
      : '/m/game';

    return (
      <div
        className='flex flex-col items-center justify-center gap-6 px-6'
        style={{ height: MOBILE_CONTENT_HEIGHT }}
      >
        {game.isAuthLoading ? (
          <div className='text-zinc-400'>Loading...</div>
        ) : (
          <>
            <div className='text-center'>
              <h2 className='mb-2 text-2xl font-bold text-white'>
                Sign in to play
              </h2>
              <p className='text-sm text-zinc-400'>
                You need to be signed in to play Uncover.
              </p>
            </div>
            <button
              onClick={() => signIn(undefined, { callbackUrl })}
              className='min-h-[48px] w-full max-w-xs rounded-full bg-emeraled-green px-6 py-3 font-medium text-black transition-transform active:scale-[0.98]'
            >
              Sign In
            </button>
          </>
        )}
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────
  if (isInitializing || (game.isAuthenticated && !game.sessionId)) {
    return (
      <div
        className='flex items-center justify-center'
        style={{ height: MOBILE_CONTENT_HEIGHT }}
      >
        <LumaSpinner />
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────
  if (game.error && !game.sessionId) {
    return (
      <div
        className='flex flex-col items-center justify-center gap-4 px-6 text-center'
        style={{ height: MOBILE_CONTENT_HEIGHT }}
      >
        <div>
          {isArchive && (
            <p className='mb-1 text-sm text-zinc-500'>{formattedDate}</p>
          )}
          <h2 className='mb-2 text-xl font-bold text-white'>
            {isArchive ? 'No challenge available' : 'Error'}
          </h2>
          <p className='text-zinc-400'>
            {isArchive ? "There's no puzzle for this date yet." : game.error}
          </p>
        </div>
        {isArchive ? (
          <Link
            href='/m/game/archive'
            className='flex min-h-[44px] items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/50 px-6 py-3 text-sm text-zinc-300 transition-colors active:bg-zinc-800'
          >
            <Calendar className='h-4 w-4' />
            Back to Archive
          </Link>
        ) : (
          <button
            onClick={() => {
              game.clearError();
              window.location.reload();
            }}
            className='min-h-[44px] rounded-full bg-emeraled-green px-6 py-3 font-medium text-black'
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  // ── Game over — results ───────────────────────────────────────────
  if (game.isGameOver) {
    return (
      <div
        className='flex flex-col items-center overflow-y-auto px-4 py-4'
        style={{ height: MOBILE_CONTENT_HEIGHT }}
      >
        {isArchive && <p className='text-xs text-zinc-500'>{formattedDate}</p>}
        <div className='text-center'>
          <h2 className='mb-1 text-2xl font-bold text-white'>
            {game.won ? 'You Won!' : 'Game Over'}
          </h2>
          <p className='text-sm text-zinc-400'>
            {game.won
              ? `You guessed correctly in ${game.attemptCount} ${game.attemptCount === 1 ? 'attempt' : 'attempts'}!`
              : `You used all ${game.attemptCount} attempts.`}
          </p>
        </div>

        {challengeImageUrl && game.challengeId && (
          <div className='my-4 w-full max-w-[200px]'>
            <RevealImage
              imageUrl={challengeImageUrl}
              challengeId={game.challengeId}
              stage={TOTAL_STAGES}
              showToggle={false}
              className='aspect-square w-full overflow-hidden rounded-lg'
            />
          </div>
        )}

        {game.guesses.length > 0 && (
          <div className='w-full'>
            <GuessList guesses={game.guesses} />
          </div>
        )}

        {isArchive ? (
          <Link
            href='/m/game/archive'
            className='mt-4 flex min-h-[44px] items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/50 px-6 py-3 text-sm text-zinc-300 transition-colors active:bg-zinc-800'
          >
            <Calendar className='h-4 w-4' />
            Back to Archive
          </Link>
        ) : (
          <div className='mt-4 text-center text-sm text-zinc-500'>
            Come back tomorrow for a new challenge!
          </div>
        )}
      </div>
    );
  }

  // ── Game board — IN_PROGRESS ──────────────────────────────────────
  return (
    <div
      className='flex flex-col overflow-hidden px-4 py-2'
      style={{ height: MOBILE_CONTENT_HEIGHT }}
    >
      {/* Header */}
      <div className='shrink-0 text-center'>
        <h2 className='text-lg font-bold text-white'>
          {isArchive ? 'Archive' : 'Daily Uncover'}
        </h2>
        <p className='text-xs text-zinc-400'>
          {isArchive ? (
            <>
              <Link
                href='/m/game/archive'
                className='inline-flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-white'
              >
                <Calendar className='h-3 w-3' />
                Calendar
              </Link>
              {' · '}
              {formattedDate}
            </>
          ) : (
            <>
              <Link
                href='/m/game/archive'
                className='inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors'
              >
                <CalendarDays className='h-3 w-3' />
                Archive
              </Link>{' '}
              Guess the album from the cover art
            </>
          )}
        </p>
      </div>

      {/* Reveal image — capped height so it doesn't eat the viewport */}
      {challengeImageUrl && game.challengeId && (
        <div
          className='my-2 flex shrink-0 justify-center'
          style={{ height: '40dvh' }}
        >
          <div className='aspect-square h-full'>
            <RevealImage
              imageUrl={challengeImageUrl}
              challengeId={game.challengeId}
              stage={game.revealStage}
              className='h-full w-full overflow-hidden rounded-lg'
            />
          </div>
        </div>
      )}

      {/* Attempt dots */}
      <div className='flex shrink-0 justify-center py-1'>
        <AttemptDots attemptCount={game.attemptCount} isActive />
      </div>

      {/* Search input */}
      <div className='w-full shrink-0'>
        <AlbumGuessInput
          onGuess={game.submitGuess}
          onSkip={game.skipGuess}
          disabled={game.isGameOver}
        />
      </div>

      {/* Previous guesses — scrollable within remaining space */}
      {game.guesses.length > 0 && (
        <div className='min-h-0 flex-1 overflow-y-auto pt-2'>
          <GuessList guesses={game.guesses} />
        </div>
      )}

      {/* Error display */}
      {game.error && (
        <div className='shrink-0 rounded-md border border-red-500/50 bg-red-950/20 p-3 text-center text-sm text-red-400'>
          {game.error}
        </div>
      )}
    </div>
  );
}
