'use client';

import Link from 'next/link';
import { Archive, Play } from 'lucide-react';

import { TeaserImage } from '@/components/uncover/TeaserImage';

/**
 * Desktop home screen for Uncover game.
 * Shows teaser image and navigation to play or browse archive.
 * Fills parent container height without scrolling.
 */
export function UncoverHome() {
  return (
    <div className='flex h-full flex-col items-center justify-center gap-6 px-4'>
      {/* Teaser image — constrained so it doesn't eat all the space */}
      <div className='w-full max-w-[240px]'>
        <TeaserImage />
      </div>

      {/* Title + description */}
      <div className='text-center'>
        <h1 className='text-3xl font-bold text-white'>Uncover</h1>
        <p className='mt-2 text-sm text-zinc-400'>
          Guess the album from its cover art. 4 attempts. New puzzle daily.
        </p>
      </div>

      {/* Actions */}
      <div className='flex w-full max-w-xs flex-col gap-3'>
        <Link
          href='/game/play'
          className='flex items-center justify-center gap-2 rounded-lg bg-emeraled-green px-6 py-3.5 text-base font-semibold text-white transition-colors hover:brightness-110'
        >
          <Play className='h-5 w-5 fill-current' />
          Play
        </Link>

        <Link
          href='/game/archive'
          className='flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/50 px-6 py-3 text-sm text-zinc-300 transition-colors hover:bg-zinc-800'
        >
          <Archive className='h-4 w-4' />
          Archive
        </Link>
      </div>
    </div>
  );
}
