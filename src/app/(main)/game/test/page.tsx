'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw } from 'lucide-react';

import {
  useAlbumsByGameStatusQuery,
  AlbumGameStatus,
} from '@/generated/graphql';
import AlbumImage from '@/components/ui/AlbumImage';
import { RevealImage } from '@/components/uncover/RevealImage';
import { AlbumGuessInput } from '@/components/uncover/AlbumGuessInput';
import { GuessList } from '@/components/uncover/GuessList';
import { AttemptDots } from '@/components/uncover/AttemptDots';
import type { RevealMode } from '@/hooks/useRevealImage';

const MAX_ATTEMPTS = 6;

const CLOUDFLARE_DELIVERY =
  process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_DELIVERY_URL ?? '';
const CLOUDFLARE_HASH = CLOUDFLARE_DELIVERY.split('/').pop() ?? '';

function buildImageUrl(
  cloudflareImageId: string | null | undefined,
  coverArtUrl: string | null | undefined
): string | null {
  if (cloudflareImageId && CLOUDFLARE_HASH) {
    return `https://imagedelivery.net/${CLOUDFLARE_HASH}/${cloudflareImageId}/public`;
  }
  return coverArtUrl ?? null;
}

interface LocalGuess {
  guessNumber: number;
  albumId: string | null;
  albumTitle: string;
  artistName: string;
  isCorrect: boolean;
}

export default function GameTestPage() {
  // Album selection state (sidebar)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedAlbumTitle, setSelectedAlbumTitle] = useState<string | null>(
    null
  );
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);

  // Stage override from slider (null = auto from attemptCount)
  const [stageOverride, setStageOverride] = useState<number | null>(null);

  // Reveal mode toggle
  const [revealMode, setRevealMode] = useState<RevealMode>('regions');

  // Local game state
  const [attemptCount, setAttemptCount] = useState(0);
  const [guesses, setGuesses] = useState<LocalGuess[]>([]);
  const [won, setWon] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const { data, isLoading } = useAlbumsByGameStatusQuery({
    status: AlbumGameStatus.Eligible,
    limit: 100,
    offset: 0,
  });

  const albums = data?.albumsByGameStatus ?? [];

  // Reveal stage: use slider override, or derive from attempt count
  const autoStage = isGameOver ? 6 : Math.min(attemptCount + 1, 6);
  const revealStage = stageOverride ?? autoStage;

  const handleSelectAlbum = (album: (typeof albums)[0]) => {
    const url = buildImageUrl(album.cloudflareImageId, album.coverArtUrl);
    if (url) {
      setSelectedImageUrl(url);
      setSelectedAlbumTitle(album.title);
      setSelectedAlbumId(album.id);
      // Reset game state when picking a new album
      setAttemptCount(0);
      setGuesses([]);
      setWon(false);
      setIsGameOver(false);
      setStageOverride(null);
    }
  };

  const handleGuess = useCallback(
    (albumId: string, albumTitle: string, artistName: string) => {
      if (isGameOver || !selectedAlbumId) return;

      const isCorrect = albumId === selectedAlbumId;
      const newAttemptCount = attemptCount + 1;

      const guess: LocalGuess = {
        guessNumber: newAttemptCount,
        albumId,
        albumTitle,
        artistName,
        isCorrect,
      };

      setGuesses(prev => [...prev, guess]);
      setAttemptCount(newAttemptCount);

      if (isCorrect) {
        setWon(true);
        setIsGameOver(true);
      } else if (newAttemptCount >= MAX_ATTEMPTS) {
        setIsGameOver(true);
      }
    },
    [isGameOver, selectedAlbumId, attemptCount]
  );

  const handleSkip = useCallback(() => {
    if (isGameOver || !selectedAlbumId) return;

    const newAttemptCount = attemptCount + 1;

    const guess: LocalGuess = {
      guessNumber: newAttemptCount,
      albumId: null,
      albumTitle: '(skipped)',
      artistName: '',
      isCorrect: false,
    };

    setGuesses(prev => [...prev, guess]);
    setAttemptCount(newAttemptCount);

    if (newAttemptCount >= MAX_ATTEMPTS) {
      setIsGameOver(true);
    }
  }, [isGameOver, selectedAlbumId, attemptCount]);

  const handleReset = () => {
    setAttemptCount(0);
    setGuesses([]);
    setWon(false);
    setIsGameOver(false);
    setStageOverride(null);
  };

  return (
    <div className='fixed inset-x-0 bottom-0 top-[65px] overflow-hidden md:left-16'>
      <div className='flex h-full'>
        {/* Main area — game board */}
        <div className='flex flex-1 flex-col items-center overflow-hidden py-2'>
          {/* Header */}
          <div className='shrink-0 pb-1 text-center'>
            <Link
              href='/game'
              className='mb-1 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors'
            >
              <ArrowLeft className='h-3 w-3' />
              Back to Game
            </Link>
            <h2 className='text-lg font-bold text-white'>Visual Test</h2>
            {selectedAlbumTitle && (
              <p className='text-xs text-zinc-400'>{selectedAlbumTitle}</p>
            )}
            {isGameOver && (
              <p className='mt-0.5 text-xs font-medium text-emerald-400'>
                {won
                  ? `Correct in ${attemptCount}!`
                  : `Game over — it was "${selectedAlbumTitle}"`}
              </p>
            )}
          </div>

          {/* Reveal image — capped at 45vh */}
          {selectedImageUrl && selectedAlbumId ? (
            <div
              className='flex shrink-0 justify-center'
              style={{ height: '45dvh' }}
            >
              <div className='aspect-square h-full'>
                <RevealImage
                  imageUrl={selectedImageUrl}
                  challengeId={selectedAlbumId}
                  stage={revealStage}
                  revealMode={revealMode}
                  showToggle={false}
                  className='h-full w-full overflow-hidden rounded-lg'
                />
              </div>
            </div>
          ) : (
            <div className='flex flex-1 items-center justify-center'>
              <p className='text-zinc-500'>
                Select an album from the sidebar to start testing
              </p>
            </div>
          )}

          {/* Game controls — only show when album is selected */}
          {selectedAlbumId && (
            <>
              {/* Attempt dots */}
              <div className='shrink-0 py-1.5'>
                <AttemptDots attemptCount={attemptCount} />
              </div>

              {/* Search input */}
              <div className='w-full max-w-md shrink-0 px-4'>
                <AlbumGuessInput
                  onGuess={handleGuess}
                  onSkip={handleSkip}
                  disabled={isGameOver}
                  isSubmitting={false}
                />
              </div>

              {/* Previous guesses — fills remaining space, scrolls if needed */}
              {guesses.length > 0 && (
                <div className='w-full max-w-md min-h-0 flex-1 overflow-y-auto px-4 pt-2'>
                  <GuessList guesses={guesses} />
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar — album picker + stage slider + reset */}
        <div className='flex h-full w-72 shrink-0 flex-col border-l border-zinc-700 bg-zinc-900/95'>
          {/* Reveal mode toggle */}
          <div className='border-b border-zinc-800 px-4 py-3'>
            <label className='mb-2 block text-xs font-medium text-zinc-400'>
              Reveal Mode
            </label>
            <div className='flex gap-1'>
              {(['scattered', 'regions'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setRevealMode(mode)}
                  className={`flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                    revealMode === mode
                      ? 'bg-emerald-700 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {mode === 'scattered' ? 'Scattered' : 'Regions'}
                </button>
              ))}
            </div>
          </div>

          {/* Stage slider */}
          <div className='border-b border-zinc-800 px-4 py-3'>
            <div className='mb-2 flex items-center justify-between'>
              <label className='block text-xs font-medium text-zinc-400'>
                Reveal Stage: {stageOverride ?? `auto (${autoStage})`}
              </label>
              {stageOverride !== null && (
                <button
                  onClick={() => setStageOverride(null)}
                  className='text-[10px] text-zinc-500 hover:text-zinc-300'
                >
                  reset
                </button>
              )}
            </div>
            <input
              type='range'
              min={1}
              max={6}
              value={stageOverride ?? autoStage}
              onChange={e => setStageOverride(Number(e.target.value))}
              className='w-full accent-emerald-500'
            />
            <div className='mt-1 flex justify-between text-[10px] text-zinc-500'>
              <span>1 (heavy)</span>
              <span>6 (clear)</span>
            </div>
          </div>

          {/* Reset button */}
          <div className='border-b border-zinc-800 px-4 py-2'>
            <button
              onClick={handleReset}
              className='flex w-full items-center justify-center gap-1.5 rounded bg-emerald-800 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-700'
            >
              <RotateCcw className='h-3 w-3' />
              Reset Game
            </button>
          </div>

          {/* Album picker */}
          <div className='flex-1 overflow-y-auto px-3 py-3'>
            <span className='mb-2 block text-xs font-medium text-zinc-400'>
              {isLoading
                ? 'Loading albums...'
                : `Pick an album (${albums.length})`}
            </span>
            <div className='grid grid-cols-3 gap-2'>
              {albums.map(album => (
                <button
                  key={album.id}
                  onClick={() => handleSelectAlbum(album)}
                  className={`group flex flex-col items-center gap-1 rounded p-1 transition-colors ${
                    selectedAlbumId === album.id
                      ? 'bg-emerald-900/50 ring-1 ring-emerald-500'
                      : 'hover:bg-zinc-800'
                  }`}
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
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
