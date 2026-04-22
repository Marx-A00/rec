'use client';

import { Archive, Check, Eye, Play, X } from 'lucide-react';
import Link from 'next/link';

import { useDailyChallengeQuery } from '@/generated/graphql';
import { RevealImage } from '@/components/uncover/RevealImage';
import { TeaserImage } from '@/components/uncover/TeaserImage';
import { SmokeBackground } from '@/components/ui/smoke-background';
import { TOTAL_STAGES } from '@/lib/uncover/reveal-constants';
import { getLossPhrase } from '@/lib/uncover/endgame-phrases';

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

      {/* Status + description */}
      <div className='text-center'>
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
                : getLossPhrase(new Date().toISOString().split('T')[0])}
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
          className='relative flex min-h-[48px] items-center justify-center gap-2 overflow-hidden rounded-xl px-6 py-3.5 text-base font-semibold text-white transition-transform active:scale-[0.98] shadow-2xl shadow-black/90'
        >
          {/* Live smoke inside button */}
          <div className='absolute inset-0' style={{ opacity: 0.5 }}>
            <SmokeBackground smokeColor='#0d9668' speed={0.1} density={4.0} />
          </div>

          {/* Frosted glass overlay */}
          <div
            className='absolute inset-0 backdrop-blur-md rounded-xl border border-black/30'
            style={{ backgroundColor: 'rgba(16,185,129,0.12)' }}
          />

          {/* Button content */}
          <span className='relative z-10 flex items-center gap-2'>
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
          </span>
        </Link>

        <Link
          href='/m/game/archive'
          className='flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm text-zinc-400 transition-colors active:bg-zinc-800/50'
        >
          <Archive className='h-4 w-4' />
          Archive
        </Link>
      </div>
    </div>
  );
}
