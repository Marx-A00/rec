'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Archive, Play } from 'lucide-react';
import Link from 'next/link';

import { TeaserImage } from '@/components/uncover/TeaserImage';

/**
 * Mobile home screen for Uncover game.
 * Shows teaser image and navigation to play or browse archive.
 *
 * Path: /m/game
 */
export function MobileHomeClient() {
  const router = useRouter();

  return (
    <div className='min-h-screen bg-black'>
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

      <div className='flex flex-col items-center gap-8 px-6 py-12'>
        {/* Teaser image */}
        <div className='w-full max-w-sm'>
          <TeaserImage />
        </div>

        {/* Title + description */}
        <div className='text-center'>
          <h1 className='text-3xl font-bold text-white'>Uncover</h1>
          <p className='mt-2 text-sm text-zinc-400'>
            Guess the album from its cover art. 6 attempts. New puzzle daily.
          </p>
        </div>

        {/* Actions */}
        <div className='flex w-full max-w-xs flex-col gap-3'>
          <Link
            href='/m/game/play'
            className='flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white transition-transform active:scale-[0.98]'
          >
            <Play className='h-5 w-5 fill-current' />
            Play
          </Link>

          <Link
            href='/m/game/archive'
            className='flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/50 px-6 py-3 text-sm text-zinc-300 transition-colors active:bg-zinc-800'
          >
            <Archive className='h-4 w-4' />
            Archive
          </Link>
        </div>
      </div>
    </div>
  );
}
