'use client';

import { Archive, Check, Eye, Play, X } from 'lucide-react';
import Link from 'next/link';

import { useDailyChallengeQuery } from '@/generated/graphql';
import { RevealImage } from '@/components/uncover/RevealImage';
import { TeaserImage } from '@/components/uncover/TeaserImage';
import { TOTAL_STAGES } from '@/lib/uncover/reveal-constants';

/**
 * Mobile home screen for Uncover game.
 * Shows teaser image and navigation to play or browse archive.
 * If the user has already completed today's challenge, shows the
 * fully revealed album cover with their result.
 *
 * Path: /m/game
 */
export function MobileHomeClient() {
  const { data } = useDailyChallengeQuery();

  const challenge = data?.dailyChallenge;
  const mySession = challenge?.mySession;
  const hasCompleted =
    mySession?.status === 'WON' || mySession?.status === 'LOST';

  return (
    <div className='flex h-full flex-col items-center justify-center gap-6 px-6'>
      {/* Album cover — full reveal if completed, teaser otherwise */}
      <div className='w-full max-w-[200px]'>
        {hasCompleted && challenge?.imageUrl && challenge?.id ? (
          <RevealImage
            imageUrl={challenge.imageUrl}
            challengeId={challenge.id}
            stage={TOTAL_STAGES}
            showToggle={false}
            className='aspect-square w-full overflow-hidden rounded-lg'
          />
        ) : (
          <TeaserImage />
        )}
      </div>

      {/* Title + description */}
      <div className='text-center'>
        <h1 className='text-3xl font-bold text-white'>Uncover</h1>
        {hasCompleted ? (
          <div className='mt-2'>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                mySession?.won
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-red-500/15 text-red-400'
              }`}
            >
              {mySession?.won ? (
                <Check className='h-3.5 w-3.5' />
              ) : (
                <X className='h-3.5 w-3.5' />
              )}
              {mySession?.won
                ? `Solved in ${mySession.attemptCount} ${mySession.attemptCount === 1 ? 'attempt' : 'attempts'}`
                : 'Better luck tomorrow'}
            </span>
          </div>
        ) : (
          <p className='mt-2 text-sm text-zinc-400'>
            Guess the album from its cover art. 4 attempts. New puzzle daily.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className='flex w-full max-w-xs flex-col gap-3'>
        <Link
          href='/m/game/play'
          className='flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-emeraled-green px-6 py-3.5 text-base font-semibold text-white transition-transform active:scale-[0.98]'
        >
          {hasCompleted ? (
            <>
              <Eye className='h-5 w-5' />
              View Results
            </>
          ) : (
            <>
              <Play className='h-5 w-5 fill-current' />
              Play
            </>
          )}
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
  );
}
