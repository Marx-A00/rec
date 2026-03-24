'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, Archive, Calendar, Zap, Share2, Lock } from 'lucide-react';
import { signIn } from 'next-auth/react';

import { useUncoverGame } from '@/hooks/useUncoverGame';
import { TOTAL_STAGES } from '@/lib/uncover/reveal-constants';
import {
  useDailyChallengeQuery,
  useSearchGameAlbumsQuery,
} from '@/generated/graphql';
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

// ─── Sub-components (daily-only) ────────────────────────────────

/**
 * Teaser image component for unauthenticated users.
 * Shows stage 1 obscured image to create curiosity.
 */
function TeaserImage() {
  const { data, isLoading } = useDailyChallengeQuery();

  if (isLoading) {
    return (
      <div className='aspect-square w-full overflow-hidden rounded-2xl bg-zinc-800/50 animate-pulse' />
    );
  }

  if (!data?.dailyChallenge?.imageUrl || !data?.dailyChallenge?.id) {
    return null;
  }

  return (
    <RevealImage
      imageUrl={data.dailyChallenge.imageUrl}
      challengeId={data.dailyChallenge.id}
      stage={1}
      revealMode='regions'
      showToggle={false}
      className='aspect-square w-full overflow-hidden rounded-2xl'
    />
  );
}

// ─── Game Over ──────────────────────────────────────────────────

function GameOver({
  game,
  challengeImageUrl,
  mode,
  formattedDate,
  archiveUrl,
  onDevReset,
}: {
  game: ReturnType<typeof useUncoverGame>;
  challengeImageUrl: string | null;
  mode: 'daily' | 'archive';
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
        {/* Date label */}
        <p className='pb-1 text-xs text-zinc-500'>{formattedDate}</p>

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
 *
 * Daily mode (default): Pre-game home screen, auth gate with providers,
 * streak/stats display.
 *
 * Archive mode: Auto-starts on mount, shows date label, "Back to Archive"
 * navigation, no pre-game screen.
 */
export function UncoverGame({
  mode = 'daily',
  challengeDate,
}: UncoverGameProps) {
  const router = useRouter();
  const isDaily = mode === 'daily';
  const isArchive = mode === 'archive';

  const game = useUncoverGame(
    isArchive && challengeDate ? { mode: 'archive', challengeDate } : undefined
  );

  const [challengeImageUrl, setChallengeImageUrl] = useState<string | null>(
    null
  );
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasStarted, setHasStarted] = useState(isArchive); // archive auto-starts

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

  /** Start session when user clicks play (daily) or on mount (archive). */
  useEffect(() => {
    if (!game.isAuthenticated || game.isAuthLoading) return;
    if (!hasStarted) return;
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
  }, [game.isAuthenticated, game.isAuthLoading, hasStarted, challengeImageUrl]);

  /** Daily: auto-resume in-progress sessions OR skip home screen when
   *  the server confirms the user already completed today's challenge. */
  useEffect(() => {
    if (isDaily && !hasStarted) {
      if (game.sessionId && !game.isGameOver) {
        setHasStarted(true); // resume in-progress game from store
      } else if (game.hasExistingResult) {
        setHasStarted(true); // server says already played — go straight to GameOver
      }
    }
  }, [isDaily, hasStarted, game.sessionId, game.isGameOver, game.hasExistingResult]);

  // ─── Auth loading ─────────────────────────────────────────────
  if (!game.isAuthenticated) {
    if (game.isAuthLoading) {
      return (
        <div className='flex h-full items-center justify-center'>
          <div className='text-zinc-400'>Loading...</div>
        </div>
      );
    }

    // Archive: simple sign-in prompt
    if (isArchive) {
      const dateStr = challengeDate?.toISOString().split('T')[0] ?? '';
      return (
        <div className='flex min-h-[400px] flex-col items-center justify-center gap-6 p-8'>
          <div className='text-center'>
            <h2 className='mb-2 text-2xl font-bold'>
              Archive Game - {formattedDate}
            </h2>
            <p className='text-zinc-400 mb-4'>
              Sign in to play past challenges
            </p>
          </div>
          <button
            onClick={() =>
              signIn(undefined, { callbackUrl: `/game/archive/${dateStr}` })
            }
            className='rounded-xl bg-white px-6 py-3 font-medium text-zinc-900 hover:bg-zinc-100 transition-colors'
          >
            Sign In to Play
          </button>
        </div>
      );
    }

    // Daily: full auth gate with provider buttons + teaser image
    return (
      <div className='flex h-full items-center justify-center gap-12 px-10'>
        {/* Art column — teaser */}
        <div className='flex flex-col items-center gap-4'>
          <div className='relative h-[500px] w-[500px] overflow-hidden rounded-2xl border border-emerald-500/25 bg-zinc-900 shadow-[0_0_48px_rgba(16,185,129,0.07)]'>
            <TeaserImage />
            {/* Lock overlay */}
            <div className='absolute inset-0 flex items-center justify-center'>
              <div className='flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800/80 backdrop-blur'>
                <Lock className='h-7 w-7 text-zinc-400' />
              </div>
            </div>
          </div>
        </div>

        {/* Sign-in card */}
        <div className='w-[420px] space-y-6'>
          <div>
            <h2 className='text-4xl font-bold text-white'>Daily Uncover</h2>
            <p className='mt-2 text-sm text-zinc-400'>
              Guess the album from its cover art. 4 attempts. New puzzle daily.
            </p>
          </div>
          <div className='space-y-3'>
            <button
              onClick={() => signIn('google', { callbackUrl: '/game/play' })}
              className='flex w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100'
            >
              Continue with Google
            </button>
            <button
              onClick={() => signIn('spotify', { callbackUrl: '/game/play' })}
              className='flex w-full items-center justify-center gap-3 rounded-xl bg-[#1DB954] px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#1ed760]'
            >
              Continue with Spotify
            </button>
            <button
              onClick={() => signIn('email', { callbackUrl: '/game/play' })}
              className='flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-700 px-5 py-3.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800'
            >
              Continue with Email
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Daily: Pre-game home state ───────────────────────────────
  // Wait for puzzle query before showing home screen so we can skip it
  // for users who already completed today's challenge.
  if (isDaily && !hasStarted && !isInitializing && !game.isPuzzleLoading && !game.hasExistingResult) {
    return (
      <div className='flex h-full flex-col items-center justify-center gap-7 px-4'>
        {/* Puzzle info */}
        <div className='relative z-10 flex items-center gap-3 text-[11px] font-semibold tracking-[0.15em] text-zinc-400'>
          <span>PUZZLE #47</span>
          <span className='text-zinc-600'>·</span>
          <span className='text-orange-400'>5 DAY STREAK</span>
        </div>

        {/* Album art teaser — center stage */}
        <div className='relative z-10 w-[300px]'>
          <div className='overflow-hidden rounded-2xl border border-emerald-500/20 shadow-[0_0_80px_rgba(16,185,129,0.12)]'>
            <TeaserImage />
          </div>
          <div className='absolute inset-0 flex items-center justify-center'>
            <div className='flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-black/50 backdrop-blur-sm'>
              <Lock className='h-6 w-6 text-zinc-300' />
            </div>
          </div>
        </div>

        {/* Hook line */}
        <div className='relative z-10 text-center'>
          <p className='text-3xl font-bold text-white drop-shadow-lg'>
            Can you name this album?
          </p>
          <p className='mt-1.5 text-sm text-zinc-400'>
            Guess the album from its cover art
          </p>
        </div>

        {/* Start button — pill shaped */}
        <button
          onClick={() => setHasStarted(true)}
          className='relative z-10 flex items-center gap-2.5 rounded-full bg-white px-9 py-4 text-sm font-semibold text-zinc-900 shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all hover:bg-zinc-100 hover:shadow-[0_0_50px_rgba(16,185,129,0.2)] focus:ring-2 focus:ring-white/50'
        >
          Start today&apos;s puzzle
          <span aria-hidden>→</span>
        </button>

        {/* Inline stats */}
        <div className='relative z-10 flex items-center gap-8 pt-2'>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-semibold text-white'>23</span>
            <span className='text-xs text-zinc-500'>played</span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-semibold text-white'>78%</span>
            <span className='text-xs text-zinc-500'>win rate</span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-semibold text-orange-400'>5</span>
            <span className='text-xs text-zinc-500'>streak</span>
          </div>
        </div>
      </div>
    );
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
        <p className='text-sm text-zinc-500'>{formattedDate}</p>
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
