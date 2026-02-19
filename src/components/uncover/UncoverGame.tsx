'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Wrench,
  X,
  RotateCcw,
  BarChart3,
  Archive,
  Flame,
  Trophy,
} from 'lucide-react';
import { signIn } from 'next-auth/react';

import { useUncoverGame } from '@/hooks/useUncoverGame';
import {
  useDailyChallengeQuery,
  useAlbumsByGameStatusQuery,
  useResetDailySessionMutation,
  useMyUncoverStatsQuery,
  AlbumGameStatus,
} from '@/generated/graphql';
import AlbumImage from '@/components/ui/AlbumImage';
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
        revealMode='regions'
        showToggle={false}
        className='aspect-square w-full overflow-hidden rounded-lg'
      />
    </div>
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
      // Clear Zustand persisted state and reload
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
      {/* Header */}
      <div className='flex items-center justify-between border-b border-zinc-700 px-4 py-3'>
        <span className='text-sm font-semibold text-zinc-200'>Test Panel</span>
        <button onClick={onClose} className='text-zinc-400 hover:text-white'>
          <X className='h-4 w-4' />
        </button>
      </div>

      {/* Stage slider */}
      <div className='border-b border-zinc-800 px-4 py-3'>
        <label className='mb-2 block text-xs font-medium text-zinc-400'>
          Reveal Stage: {stageOverride ?? 'auto'}
        </label>
        <input
          type='range'
          min={1}
          max={6}
          value={stageOverride ?? 1}
          onChange={e => onStageChange(Number(e.target.value))}
          className='w-full accent-emerald-500'
        />
        <div className='mt-1 flex justify-between text-[10px] text-zinc-500'>
          <span>1 (heavy)</span>
          <span>6 (clear)</span>
        </div>
      </div>

      {/* Reset / Replay */}
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

      {/* Album picker */}
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
 * Post-game home screen.
 * Shows today's result, quick stats, and navigation to other game features.
 */
function GameHome({
  game,
  challengeImageUrl,
  showStats,
  setShowStats,
  onResetGame,
}: {
  game: ReturnType<typeof useUncoverGame>;
  challengeImageUrl: string | null;
  showStats: boolean;
  setShowStats: (open: boolean) => void;
  onResetGame: () => void;
}) {
  const { data: statsData } = useMyUncoverStatsQuery({}, { enabled: true });
  const stats = statsData?.myUncoverStats;

  const [showDevPanel, setShowDevPanel] = useState(false);
  const isAdmin = game.user?.role === 'ADMIN' || game.user?.role === 'OWNER';

  return (
    <div className='flex h-full flex-col items-center overflow-y-auto py-6'>
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

      {/* Admin dev test panel */}
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

      <div className='w-full max-w-md space-y-6 px-4'>
        {/* Title */}
        <div className='text-center'>
          <h2 className='text-2xl font-bold text-white'>Daily Uncover</h2>
          <p className='mt-1 text-sm text-zinc-400'>
            {game.won
              ? `You got it in ${game.attemptCount}!`
              : 'Better luck tomorrow!'}
          </p>
        </div>

        {/* Today's result — revealed album */}
        {challengeImageUrl && game.challengeId && (
          <div className='mx-auto w-48'>
            <RevealImage
              imageUrl={challengeImageUrl}
              challengeId={game.challengeId}
              stage={6}
              showToggle={false}
              className='aspect-square w-full overflow-hidden rounded-lg'
            />
          </div>
        )}

        {/* Quick stats row */}
        {stats && (
          <div className='grid grid-cols-4 gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-center'>
            <div>
              <div className='text-xl font-bold text-white'>
                {stats.gamesPlayed}
              </div>
              <div className='text-[10px] text-zinc-500'>Played</div>
            </div>
            <div>
              <div className='text-xl font-bold text-white'>
                {Math.round(stats.winRate * 100)}%
              </div>
              <div className='text-[10px] text-zinc-500'>Win Rate</div>
            </div>
            <div>
              <div className='flex items-center justify-center gap-1 text-xl font-bold text-white'>
                <Flame className='h-4 w-4 text-orange-500' />
                {stats.currentStreak}
              </div>
              <div className='text-[10px] text-zinc-500'>Streak</div>
            </div>
            <div>
              <div className='flex items-center justify-center gap-1 text-xl font-bold text-white'>
                <Trophy className='h-4 w-4 text-yellow-500' />
                {stats.maxStreak}
              </div>
              <div className='text-[10px] text-zinc-500'>Best</div>
            </div>
          </div>
        )}

        {/* Navigation links */}
        <div className='space-y-2'>
          <button
            onClick={() => setShowStats(true)}
            className='flex w-full items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-left text-sm text-zinc-200 transition-colors hover:bg-zinc-800'
          >
            <BarChart3 className='h-4 w-4 text-zinc-400' />
            Full Stats & Distribution
          </button>

          <Link
            href='/game/archive'
            className='flex w-full items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-left text-sm text-zinc-200 transition-colors hover:bg-zinc-800'
          >
            <Archive className='h-4 w-4 text-zinc-400' />
            Play Archive Puzzles
          </Link>
        </div>

        {/* Guesses from today */}
        {game.guesses.length > 0 && (
          <div>
            <h3 className='mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500'>
              Today&apos;s Guesses
            </h3>
            <GuessList guesses={game.guesses} />
          </div>
        )}
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
  const [hasAutoShownStats, setHasAutoShownStats] = useState(false);

  // Dev test panel state (admin only)
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [devImageOverride, setDevImageOverride] = useState<string | null>(null);
  const [devStageOverride, setDevStageOverride] = useState<number | null>(null);

  const isAdmin = game.user?.role === 'ADMIN' || game.user?.role === 'OWNER';

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

  // Auto-show stats modal once when game ends
  useEffect(() => {
    if (game.isGameOver && !hasAutoShownStats) {
      const timer = setTimeout(() => {
        setShowStats(true);
        setHasAutoShownStats(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [game.isGameOver, hasAutoShownStats]);

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

  // DAILY-03 + GAME-07: Game over → home screen
  if (game.isGameOver) {
    return (
      <GameHome
        game={game}
        challengeImageUrl={challengeImageUrl}
        showStats={showStats}
        setShowStats={setShowStats}
        onResetGame={() => {
          game.resetGame();
          setChallengeImageUrl(null);
          setHasAutoShownStats(false);
        }}
      />
    );
  }

  // Game board for IN_PROGRESS sessions
  return (
    <div className='flex h-full flex-col items-center overflow-hidden py-2'>
      {/* Header */}
      <div className='shrink-0 pb-1 text-center'>
        <h2 className='text-lg font-bold text-white md:text-xl'>
          Daily Uncover
        </h2>
        <div className='flex items-center justify-center gap-3'>
          <p className='text-xs text-zinc-400'>
            Guess the album from the cover art
          </p>
          <Link
            href='/game/archive'
            className='inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-cosmic-latte transition-colors'
          >
            <CalendarDays className='h-3 w-3' />
            Archive
          </Link>
        </div>
      </div>

      {/* Reveal image — capped at 45vh so there's room for guesses */}
      {challengeImageUrl && game.challengeId && (
        <div
          className='flex shrink-0 justify-center'
          style={{ height: '45dvh' }}
        >
          <div className='aspect-square h-full'>
            <RevealImage
              imageUrl={devImageOverride || challengeImageUrl}
              challengeId={game.challengeId}
              stage={devStageOverride ?? game.revealStage}
              revealMode='regions'
              isSubmitting={game.isSubmitting}
              className='h-full w-full overflow-hidden rounded-lg'
            />
          </div>
        </div>
      )}

      {/* Attempt dots */}
      <div className='shrink-0 py-1.5'>
        <AttemptDots attemptCount={game.attemptCount} />
      </div>

      {/* Search input */}
      <div className='w-full max-w-md shrink-0'>
        <AlbumGuessInput
          onGuess={game.submitGuess}
          onSkip={game.skipGuess}
          disabled={game.isGameOver}
          isSubmitting={game.isSubmitting}
        />
      </div>

      {/* Previous guesses — fills remaining space, scrolls if needed */}
      {game.guesses.length > 0 && (
        <div className='w-full max-w-md min-h-0 flex-1 overflow-y-auto pt-2'>
          <GuessList guesses={game.guesses} />
        </div>
      )}

      {/* Error display */}
      {game.error && (
        <div className='w-full max-w-md shrink-0 rounded-md border border-red-500/50 bg-red-950/20 p-3 text-center text-sm text-red-400'>
          {game.error}
        </div>
      )}

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

      {/* Admin dev test panel */}
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
