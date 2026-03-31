'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, Calendar, Zap, Share2, ChevronLeft, ChevronRight, Archive } from 'lucide-react';

import { useUncoverGame } from '@/hooks/useUncoverGame';
import { TOTAL_STAGES } from '@/lib/uncover/reveal-constants';
import { useSearchGameAlbumsQuery } from '@/generated/graphql';
import { Lens } from '@/components/ui/lens';
import { RevealImage } from '@/components/uncover/RevealImage';
import { AlbumGuessInput } from '@/components/uncover/AlbumGuessInput';
import { GuessList } from '@/components/uncover/GuessList';
import { AttemptDots } from '@/components/uncover/AttemptDots';
import { LumaSpinner } from '@/components/ui/LumaSpinner';

// ─── Props ──────────────────────────────────────────────────────

export interface UncoverGameProps {
  /** Game mode. Default: 'daily' */
  mode?: 'daily' | 'archive';
  /** Date of the archive challenge. Required when mode='archive'. */
  challengeDate?: Date;
}

// ─── Date Navigation ─────────────────────────────────────────────

/** Chevron arrows around the date for navigating between daily challenges. */
function DateNav({
  displayDate,
  formattedDate,
  className,
}: {
  displayDate: Date;
  formattedDate: string;
  className?: string;
}) {
  const router = useRouter();

  const prevDateStr = new Date(displayDate.getTime() - 86_400_000)
    .toISOString()
    .split('T')[0];
  const nextDateStr = new Date(displayDate.getTime() + 86_400_000)
    .toISOString()
    .split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];

  const canGoNext = nextDateStr <= todayStr;

  const navigate = (dateStr: string) => {
    if (dateStr === todayStr) {
      router.push('/game/play');
    } else {
      router.push(`/game/archive/${dateStr}`);
    }
  };

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ''}`}>
      <button
        onClick={() => navigate(prevDateStr)}
        className='rounded-md p-0.5 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-zinc-300'
      >
        <ChevronLeft className='h-4 w-4' />
      </button>
      <span className='text-sm text-zinc-500'>{formattedDate}</span>
      <button
        onClick={() => navigate(nextDateStr)}
        disabled={!canGoNext}
        className='rounded-md p-0.5 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-20 disabled:pointer-events-none'
      >
        <ChevronRight className='h-4 w-4' />
      </button>
    </div>
  );
}

// ─── Game Over ──────────────────────────────────────────────────

function GameOver({
  game,
  challengeImageUrl,
  mode,
  displayDate,
  formattedDate,
  archiveUrl,
  onDevReset,
}: {
  game: ReturnType<typeof useUncoverGame>;
  challengeImageUrl: string | null;
  mode: 'daily' | 'archive';
  displayDate: Date;
  formattedDate: string;
  archiveUrl: string;
  onDevReset?: () => void;
}) {
  const isDaily = mode === 'daily';
  const won = game.won;

  return (
    <div className='relative flex h-full items-start gap-12 px-[60px] pt-8'>
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
      <div className='flex min-h-0 flex-1 flex-col'>
        {/* Date nav */}
        <DateNav displayDate={displayDate} formattedDate={formattedDate} className='pb-1' />

        {/* Result header */}
        <h2 className='pb-1 text-2xl font-bold text-white'>
          {won
            ? 'You got it!'
            : isDaily
              ? 'Better luck tomorrow'
              : 'Better luck next time'}
        </h2>
        <div className='flex items-center gap-2 pb-5'>
          {won ? (
            <>
              <Zap className='h-3.5 w-3.5 text-emerald-400' />
              <span className='text-xs text-zinc-400'>
                Guessed in {game.attemptCount}{' '}
                {game.attemptCount === 1 ? 'attempt' : 'attempts'}
              </span>
            </>
          ) : (
            <>
              <X className='h-3.5 w-3.5 text-red-400' />
              <span className='text-xs text-zinc-400'>
                Used all {game.attemptCount} attempts
              </span>
            </>
          )}
        </div>

        {/* Action buttons */}
        <div className='flex gap-3 pb-5'>
          <button
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
              won
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-red-600 hover:bg-red-500'
            }`}
          >
            <Share2 className='h-3.5 w-3.5' />
            Share Result
          </button>
          <Link
            href={archiveUrl}
            className='flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/50 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800'
          >
            {isDaily ? (
              <>
                <Archive className='h-3.5 w-3.5' />
                Play Archive
              </>
            ) : (
              <>
                <Calendar className='h-3.5 w-3.5' />
                Back to Archive
              </>
            )}
          </Link>
        </div>

        {/* Divider */}
        <div className='h-px w-full bg-zinc-800' />

        {/* Daily: next puzzle message */}
        {isDaily && (
          <p className='pt-3 text-xs text-zinc-500'>
            Next puzzle drops at midnight
          </p>
        )}

        {/* Guesses list */}
        {game.guesses.length > 0 && (
          <div className='min-h-0 flex-1 overflow-y-auto pt-3'>
            <GuessList guesses={game.guesses} />
          </div>
        )}

        {/* Dev-only reset button */}
        {process.env.NODE_ENV === 'development' && onDevReset && (
          <button
            onClick={onDevReset}
            className='mt-4 rounded-md border border-yellow-600/50 bg-yellow-950/20 px-3 py-1.5 text-xs font-mono text-yellow-400 transition-colors hover:bg-yellow-900/30'
          >
            [DEV] Reset Session
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

/**
 * Unified Uncover game component for both daily and archive modes.
 * Always auto-starts the game on mount (home screen is at /game).
 *
 * Daily mode (default): Starts today's challenge immediately.
 * Archive mode: Starts the archive challenge for the given date.
 */
export function UncoverGame({
  mode = 'daily',
  challengeDate,
}: UncoverGameProps) {
  const router = useRouter();
  const isArchive = mode === 'archive';

  const game = useUncoverGame(
    isArchive && challengeDate ? { mode: 'archive', challengeDate } : undefined
  );

  const [challengeImageUrl, setChallengeImageUrl] = useState<string | null>(
    null
  );
  const [isInitializing, setIsInitializing] = useState(false);

  // Format date in UTC — archive uses challengeDate, daily uses today
  const displayDate = challengeDate ?? new Date();
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(displayDate);

  const archiveUrl = '/game/archive';

  // Prefetch: fire a throwaway search to warm the D1 worker while the user
  // is looking at the game screen. The query result is discarded — we just
  // want the cold-start penalty to happen before they start typing.
  useSearchGameAlbumsQuery(
    { query: 'the', limit: 1 },
    {
      enabled: game.isAuthenticated && !game.isAuthLoading,
      staleTime: Infinity,
      gcTime: 0,
    }
  );

  const startGameRef = useRef(game.startGame);
  startGameRef.current = game.startGame;

  /** Auto-start game session on mount. */
  useEffect(() => {
    if (!game.isAuthenticated || game.isAuthLoading) return;
    if (challengeImageUrl) return;

    let cancelled = false;
    const initializeGame = async () => {
      setIsInitializing(true);
      try {
        const result = await startGameRef.current();
        if (!cancelled && result) {
          setChallengeImageUrl(result.imageUrl);
        }
      } catch (error) {
        console.error('Failed to start game:', error);
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    };

    initializeGame();
    return () => {
      cancelled = true;
    };
  }, [game.isAuthenticated, game.isAuthLoading, challengeImageUrl]);

  // ─── Auth loading ─────────────────────────────────────────────
  if (!game.isAuthenticated) {
    if (game.isAuthLoading) {
      return (
        <div className='flex h-full items-center justify-center'>
          <div className='text-zinc-400'>Loading...</div>
        </div>
      );
    }

    // Not authenticated — redirect to home screen which has the auth gate
    router.replace(isArchive ? '/game' : '/game');
    return null;
  }

  // ─── Initializing ─────────────────────────────────────────────
  if (isInitializing || game.isPuzzleLoading || (game.isAuthenticated && !game.sessionId)) {
    return (
      <div className='flex h-full items-center justify-center'>
        <LumaSpinner />
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────
  if (game.error && !game.sessionId) {
    // Archive: "No challenge available" style error
    if (isArchive) {
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

    // Daily: generic error
    return (
      <div className='flex h-full flex-col items-center justify-center gap-4 p-8'>
        <div className='text-center'>
          <h2 className='mb-2 text-xl font-bold text-red-400'>Error</h2>
          <p className='text-zinc-400'>{game.error}</p>
        </div>
        <button
          onClick={() => {
            game.clearError();
            window.location.reload();
          }}
          className='rounded-xl bg-zinc-800 px-6 py-3 font-medium text-zinc-200 hover:bg-zinc-700 transition-colors'
        >
          Try Again
        </button>
      </div>
    );
  }

  // ─── Game Over → Two-column result ────────────────────────────
  if (game.isGameOver) {
    return (
      <GameOver
        game={game}
        challengeImageUrl={challengeImageUrl}
        mode={mode}
        displayDate={displayDate}
        formattedDate={formattedDate}
        archiveUrl={archiveUrl}
        onDevReset={() => {
          game.resetGame();
          setChallengeImageUrl(null);
        }}
      />
    );
  }

  // ─── Two-Column Game Board ────────────────────────────────────
  return (
    <div className='relative flex h-full items-start gap-12 px-[60px] pt-8'>
      {/* Art Column */}
      <div className='flex flex-col items-center gap-4'>
        <DateNav displayDate={displayDate} formattedDate={formattedDate} />
        {challengeImageUrl && game.challengeId && (
          <Lens
            zoomFactor={2}
            lensSize={170}
            className='rounded-2xl border border-cosmic-latte/25 bg-zinc-900'
          >
            <div className='h-[500px] w-[500px]'>
              <RevealImage
                imageUrl={challengeImageUrl}
                challengeId={game.challengeId}
                stage={game.revealStage}
                revealMode='regions'
                textRegions={game.textRegions}
                className='h-full w-full'
              />
            </div>
          </Lens>
        )}

        {/* Dots + Attempt label */}
        <div className='flex items-center gap-3'>
          <AttemptDots attemptCount={game.attemptCount} isActive />
          <span className='text-xs text-zinc-500'>
            Attempt {game.attemptCount + 1} of 4
          </span>
        </div>
      </div>

      {/* Controls Column */}
      <div className='flex min-h-0 flex-1 flex-col'>
        {/* Invisible spacer to align input with album art (matches date height above art) */}
        <p className='invisible text-sm'>&nbsp;</p>
        <div className='h-4' />
        {/* Search input */}
        <div className='pb-3'>
          <AlbumGuessInput
            onGuess={game.submitGuess}
            onSkip={game.skipGuess}
            disabled={game.isGameOver}
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
          <div className='mt-3 rounded-lg border border-red-500/50 bg-red-950/20 p-3 text-center text-sm text-red-400'>
            {game.error}
          </div>
        )}

        {/* Dev-only reset button */}
        {process.env.NODE_ENV === 'development' && (
          <button
            onClick={() => {
              game.resetGame();
              setChallengeImageUrl(null);
            }}
            className='mt-4 rounded-md border border-yellow-600/50 bg-yellow-950/20 px-3 py-1.5 text-xs font-mono text-yellow-400 transition-colors hover:bg-yellow-900/30'
          >
            [DEV] Reset Session
          </button>
        )}
      </div>
    </div>
  );
}
