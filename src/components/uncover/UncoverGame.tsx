'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Wrench, X, RotateCcw, Archive, Zap, Share2, Lock } from 'lucide-react';
import { signIn } from 'next-auth/react';

import { useUncoverGame } from '@/hooks/useUncoverGame';
import { TOTAL_STAGES } from '@/lib/uncover/reveal-constants';
import {
  useDailyChallengeQuery,
  useAlbumsByGameStatusQuery,
  useResetDailySessionMutation,
  AlbumGameStatus,
} from '@/generated/graphql';
import AlbumImage from '@/components/ui/AlbumImage';
import { RevealImage } from '@/components/uncover/RevealImage';
import { AlbumGuessInput } from '@/components/uncover/AlbumGuessInput';
import { GuessList } from '@/components/uncover/GuessList';
import { AttemptDots } from '@/components/uncover/AttemptDots';

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

const CLOUDFLARE_BASE = `https://imagedelivery.net/${process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_DELIVERY_URL?.split('/').pop() ?? ''}`;

/**
 * Admin/dev test panel for swapping album images and reveal stages.
 * Only visible to ADMIN/OWNER users.
 */
function DevTestPanel({
  onSelectImage,
  stageOverride,
  onStageChange,
  onReset,
  onClose,
  onReplayGame,
}: {
  onSelectImage: (url: string) => void;
  stageOverride: number | null;
  onStageChange: (stage: number | null) => void;
  onReset: () => void;
  onClose: () => void;
  onReplayGame?: () => void;
}) {
  const { data } = useAlbumsByGameStatusQuery({
    status: AlbumGameStatus.Eligible,
    limit: 50,
    offset: 0,
  });

  const resetMutation = useResetDailySessionMutation();
  const [isResetting, setIsResetting] = useState(false);

  const handleResetDaily = async () => {
    if (!confirm("Reset today's session? This deletes your guesses.")) return;
    setIsResetting(true);
    try {
      await resetMutation.mutateAsync({});
      onReplayGame?.();
      window.location.reload();
    } catch (err) {
      console.error('Failed to reset daily session:', err);
      alert('Failed to reset session');
    } finally {
      setIsResetting(false);
    }
  };

  const albums = data?.albumsByGameStatus || [];

  return (
    <div
      className='fixed right-0 top-[65px] z-50 flex w-72 flex-col border-l border-zinc-700 bg-zinc-900/95 shadow-2xl backdrop-blur'
      style={{ height: 'calc(100dvh - 65px)' }}
    >
      <div className='flex items-center justify-between border-b border-zinc-700 px-4 py-3'>
        <span className='text-sm font-semibold text-zinc-200'>Test Panel</span>
        <button onClick={onClose} className='text-zinc-400 hover:text-white'>
          <X className='h-4 w-4' />
        </button>
      </div>

      <div className='border-b border-zinc-800 px-4 py-3'>
        <label className='mb-2 block text-xs font-medium text-zinc-400'>
          Reveal Stage: {stageOverride ?? 'auto'}
        </label>
        <input
          type='range'
          min={1}
          max={4}
          value={stageOverride ?? 1}
          onChange={e => onStageChange(Number(e.target.value))}
          className='w-full accent-emerald-500'
        />
        <div className='mt-1 flex justify-between text-[10px] text-zinc-500'>
          <span>1 (heavy)</span>
          <span>4 (clear)</span>
        </div>
      </div>

      <div className='space-y-1.5 border-b border-zinc-800 px-4 py-2'>
        <button
          onClick={onReset}
          className='flex w-full items-center justify-center gap-1.5 rounded bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700'
        >
          <RotateCcw className='h-3 w-3' />
          Reset overrides
        </button>
        <button
          onClick={handleResetDaily}
          disabled={isResetting}
          className='flex w-full items-center justify-center gap-1.5 rounded bg-red-900 px-3 py-1.5 text-xs text-red-200 hover:bg-red-800 disabled:opacity-50'
        >
          <RotateCcw
            className={`h-3 w-3 ${isResetting ? 'animate-spin' : ''}`}
          />
          {isResetting ? 'Resetting...' : 'Reset Daily Session'}
        </button>
      </div>

      <div className='flex-1 overflow-y-auto px-3 py-3'>
        <span className='mb-2 block text-xs font-medium text-zinc-400'>
          Pick an album ({albums.length})
        </span>
        <div className='grid grid-cols-3 gap-2'>
          {albums.map(album => {
            const cfUrl = album.cloudflareImageId
              ? `${CLOUDFLARE_BASE}/${album.cloudflareImageId}/public`
              : album.coverArtUrl;
            return (
              <button
                key={album.id}
                onClick={() => cfUrl && onSelectImage(cfUrl)}
                className='group flex flex-col items-center gap-1 rounded p-1 hover:bg-zinc-800'
                title={album.title}
              >
                <AlbumImage
                  src={album.coverArtUrl}
                  cloudflareImageId={album.cloudflareImageId}
                  alt={album.title}
                  width={56}
                  height={56}
                  className='rounded'
                />
                <span className='w-full truncate text-center text-[9px] text-zinc-500 group-hover:text-zinc-300'>
                  {album.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * V2 Two-Column Game Over state.
 * Shows full album reveal on the left, result message + actions on the right.
 */
function GameOver({
  game,
  challengeImageUrl,
  onResetGame,
}: {
  game: ReturnType<typeof useUncoverGame>;
  challengeImageUrl: string | null;
  onResetGame: () => void;
}) {
  const [showDevPanel, setShowDevPanel] = useState(false);
  const isAdmin = game.user?.role === 'ADMIN' || game.user?.role === 'OWNER';

  const won = game.won;

  return (
    <div className='flex h-full items-start gap-12 px-[60px] pt-8'>
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
        {/* Result header */}
        <h2 className='pb-1 text-2xl font-bold text-white'>
          {won ? 'You got it!' : 'Better luck tomorrow'}
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
            href='/game/archive'
            className='flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/50 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800'
          >
            <Archive className='h-3.5 w-3.5' />
            Play Archive
          </Link>
        </div>

        {/* Divider */}
        <div className='h-px w-full bg-zinc-800' />

        {/* Next game countdown */}
        <p className='pt-3 text-xs text-zinc-500'>
          Next puzzle drops at midnight
        </p>

        {/* Today's guesses */}
        {game.guesses.length > 0 && (
          <div className='min-h-0 flex-1 overflow-y-auto pt-3'>
            <GuessList guesses={game.guesses} />
          </div>
        )}
      </div>

      {/* Admin dev panel toggle */}
      {isAdmin && (
        <button
          onClick={() => setShowDevPanel(prev => !prev)}
          className='fixed right-4 top-20 z-[60] rounded-full bg-zinc-800 p-2.5 text-zinc-400 shadow-lg ring-1 ring-zinc-700 hover:bg-zinc-700 hover:text-white transition-colors'
          title='Toggle test panel'
        >
          <Wrench className='h-5 w-5' />
        </button>
      )}
      {isAdmin && showDevPanel && (
        <DevTestPanel
          onSelectImage={() => {}}
          stageOverride={null}
          onStageChange={() => {}}
          onReset={() => {}}
          onClose={() => setShowDevPanel(false)}
          onReplayGame={onResetGame}
        />
      )}
    </div>
  );
}

/**
 * Main game container component for Uncover daily challenge.
 * V2: Two-column layout — large album art left, controls right.
 *
 * Handles:
 * - Auth gate: Show login prompt for unauthenticated users
 * - Auto-start session on mount for authenticated users
 * - Loading state during session start
 * - Game board for IN_PROGRESS sessions (two-column)
 * - Results screen for completed sessions (two-column)
 */
export function UncoverGame() {
  const game = useUncoverGame();

  const [challengeImageUrl, setChallengeImageUrl] = useState<string | null>(
    null
  );
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Dev test panel state (admin only)
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [devImageOverride, setDevImageOverride] = useState<string | null>(null);
  const [devStageOverride, setDevStageOverride] = useState<number | null>(null);

  const isAdmin = game.user?.role === 'ADMIN' || game.user?.role === 'OWNER';

  const startGameRef = useRef(game.startGame);
  startGameRef.current = game.startGame;

  /** Start session when user clicks play (or if they already have an active session). */
  useEffect(() => {
    if (!game.isAuthenticated || game.isAuthLoading) return;
    if (!hasStarted) return;
    if (challengeImageUrl) return;

    let cancelled = false;
    const initializeGame = async () => {
      setIsInitializing(true);
      try {
        const result = await startGameRef.current();
        if (!cancelled) {
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

  /** Auto-start if user already has an active session (e.g. refreshed mid-game). */
  useEffect(() => {
    if (game.sessionId && !hasStarted) {
      setHasStarted(true);
    }
  }, [game.sessionId, hasStarted]);

  // ─── Auth loading ─────────────────────────────────────────────
  if (!game.isAuthenticated) {
    if (game.isAuthLoading) {
      return (
        <div className='flex h-full items-center justify-center'>
          <div className='text-zinc-400'>Loading...</div>
        </div>
      );
    }

    // ─── Unauthenticated state ────────────────────────────────────
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

  // ─── Pre-game home state ───────────────────────────────────────
  if (!hasStarted && !isInitializing) {
    return (
      <div className='flex h-full flex-col items-center justify-center gap-8 px-4'>
        {/* Puzzle info */}
        <div className='flex items-center gap-3 text-[11px] font-semibold tracking-[0.15em] text-zinc-500'>
          <span>PUZZLE #47</span>
          <span className='text-zinc-700'>·</span>
          <span>5 DAY STREAK</span>
        </div>

        {/* Album art teaser — center stage */}
        <div className='relative w-[340px]'>
          <div className='overflow-hidden rounded-2xl shadow-[0_0_120px_rgba(255,255,255,0.03)]'>
            <TeaserImage />
          </div>
          <div className='absolute inset-0 flex items-center justify-center'>
            <div className='flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800/80 backdrop-blur'>
              <Lock className='h-7 w-7 text-zinc-400' />
            </div>
          </div>
        </div>

        {/* Hook line */}
        <p className='text-xl font-medium text-white'>
          Can you name this album?
        </p>

        {/* Start button — pill shaped */}
        <button
          onClick={() => setHasStarted(true)}
          className='flex items-center gap-2.5 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100'
        >
          Start today&apos;s puzzle
          <span aria-hidden>→</span>
        </button>

        {/* Inline stats */}
        <div className='flex items-center gap-10 pt-2'>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-semibold text-white'>23</span>
            <span className='text-xs text-zinc-600'>played</span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-semibold text-white'>78%</span>
            <span className='text-xs text-zinc-600'>win rate</span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-semibold text-white'>5</span>
            <span className='text-xs text-zinc-600'>streak</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── Initializing ─────────────────────────────────────────────
  if (isInitializing || (game.isAuthenticated && !game.sessionId)) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='text-zinc-400'>Starting game...</div>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────
  if (game.error && !game.sessionId) {
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
        onResetGame={() => {
          game.resetGame();
          setChallengeImageUrl(null);
        }}
      />
    );
  }

  // ─── V2 Two-Column Game Board ─────────────────────────────────
  return (
    <div className='flex h-full items-start gap-12 px-[60px] pt-8'>
      {/* Art Column */}
      <div className='flex flex-col items-center gap-4'>
        {/* Art Frame */}
        {challengeImageUrl && game.challengeId && (
          <div className='overflow-hidden rounded-2xl border border-emerald-500/25 bg-zinc-900 shadow-[0_0_48px_rgba(16,185,129,0.07)]'>
            <div className='h-[500px] w-[500px]'>
              <RevealImage
                imageUrl={devImageOverride || challengeImageUrl}
                challengeId={game.challengeId}
                stage={devStageOverride ?? game.revealStage}
                revealMode='regions'
                isSubmitting={game.isSubmitting}
                className='h-full w-full'
              />
            </div>
          </div>
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
          <div className='mt-3 rounded-lg border border-red-500/50 bg-red-950/20 p-3 text-center text-sm text-red-400'>
            {game.error}
          </div>
        )}
      </div>

      {/* Admin dev panel toggle */}
      {isAdmin && (
        <button
          onClick={() => setShowDevPanel(prev => !prev)}
          className='fixed right-4 top-20 z-[60] rounded-full bg-zinc-800 p-2.5 text-zinc-400 shadow-lg ring-1 ring-zinc-700 hover:bg-zinc-700 hover:text-white transition-colors'
          title='Toggle test panel'
        >
          <Wrench className='h-5 w-5' />
        </button>
      )}
      {isAdmin && showDevPanel && (
        <DevTestPanel
          onSelectImage={setDevImageOverride}
          stageOverride={devStageOverride}
          onStageChange={setDevStageOverride}
          onReset={() => {
            setDevImageOverride(null);
            setDevStageOverride(null);
          }}
          onClose={() => setShowDevPanel(false)}
        />
      )}
    </div>
  );
}
