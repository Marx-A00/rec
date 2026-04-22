'use client';

import Link from 'next/link';
import { Archive, Check, Eye, Lock, Play, X } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useSession } from 'next-auth/react';

import { useDailyChallengeQuery } from '@/generated/graphql';
import { RevealImage } from '@/components/uncover/RevealImage';
import { SmokeBackground } from '@/components/ui/smoke-background';
import { TOTAL_STAGES } from '@/lib/uncover/reveal-constants';
import { getLossPhrase } from '@/lib/uncover/endgame-phrases';

/**
 * Desktop home/landing screen for the Uncover game.
 * Shows teaser image (fully pixelated), frosted Play button, and ghost Archive link.
 * If the user already completed today's challenge, shows the revealed cover
 * and a "View Results" button instead.
 *
 * Path: /game
 */
export function DesktopHomeClient() {
  const { data: session, status: authStatus } = useSession();
  const isAuthenticated = !!session?.user;
  const isAuthLoading = authStatus === 'loading';

  const { data, isLoading: isPuzzleLoading } = useDailyChallengeQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const challenge = data?.dailyChallenge;
  const mySession = challenge?.mySession;
  const hasCompleted =
    mySession?.status === 'WON' || mySession?.status === 'LOST';

  // ── Auth loading ────────────────────────────────────────────────
  if (isAuthLoading) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='text-zinc-400'>Loading...</div>
      </div>
    );
  }

  // ── Not authenticated — auth gate ──────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className='flex h-full items-center justify-center gap-12 px-10'>
        {/* Art column — teaser */}
        <div className='flex flex-col items-center gap-4'>
          <div className='relative h-[400px] w-[400px] overflow-hidden rounded-2xl border border-emerald-500/25 bg-zinc-900 shadow-[0_0_48px_rgba(16,185,129,0.07)]'>
            {challenge?.imageUrl && challenge?.id ? (
              <RevealImage
                imageUrl={challenge.imageUrl}
                challengeId={challenge.id}
                stage={0}
                revealMode='regions'
                showToggle={false}
                className='h-full w-full'
              />
            ) : (
              <div className='h-full w-full animate-pulse bg-zinc-800/50' />
            )}
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

  // ── Puzzle loading ─────────────────────────────────────────────
  if (isPuzzleLoading) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='text-zinc-400'>Loading...</div>
      </div>
    );
  }

  // ── Authenticated home screen ──────────────────────────────────
  //
  // PREVIOUS PLAY BUTTON VERSION (emerald glow, brighter overlay):
  //   Link className: '... shadow-[0_0_40px_rgba(16,185,129,0.35),0_0_80px_rgba(16,185,129,0.15)]
  //     hover:shadow-[0_0_50px_rgba(16,185,129,0.5),0_0_100px_rgba(16,185,129,0.2)]'
  //   Smoke opacity: 0.5
  //   Overlay: border-emerald-400/25 backdrop-blur-md, bg rgba(16,185,129,0.18)
  //   No dark base layer.
  //
  return (
    <div className='flex h-full flex-col items-center justify-center gap-7 px-4'>
      {/* Title */}
      <h1 className='relative z-10 text-[36px] font-bold text-white'>Uncover</h1>

      {/* Puzzle info */}
      <div className='relative z-10 flex items-center gap-3 text-[11px] font-semibold tracking-[0.15em] text-zinc-400'>
        <span>DAILY CHALLENGE</span>
        {hasCompleted && (
          <>
            <span className='text-zinc-600'>&middot;</span>
            <span
              className={
                mySession?.won ? 'text-emerald-400' : 'text-red-400'
              }
            >
              {mySession?.won ? 'SOLVED' : 'MISSED'}
            </span>
          </>
        )}
      </div>

      {/* Album art */}
      <div className='relative z-10 w-[300px]'>
        <div className='overflow-hidden rounded-2xl border border-emerald-500/20 shadow-[0_0_80px_rgba(16,185,129,0.12)]'>
          {hasCompleted && challenge?.imageUrl && challenge?.id ? (
            <RevealImage
              imageUrl={challenge.imageUrl}
              challengeId={challenge.id}
              stage={TOTAL_STAGES}
              showToggle={false}
              className='aspect-square w-full'
            />
          ) : challenge?.imageUrl && challenge?.id ? (
            <RevealImage
              imageUrl={challenge.imageUrl}
              challengeId={challenge.id}
              stage={0}
              revealMode='regions'
              showToggle={false}
              className='aspect-square w-full'
            />
          ) : (
            <div className='aspect-square w-full animate-pulse bg-zinc-800/50' />
          )}
        </div>
        {!hasCompleted && (
          <div className='absolute inset-0 flex items-center justify-center'>
            <div className='flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-black/50 backdrop-blur-sm'>
              <Lock className='h-6 w-6 text-zinc-300' />
            </div>
          </div>
        )}
      </div>

      {/* Hook line */}
      <div className='relative z-10 text-center'>
        {hasCompleted ? (
          <div className='mt-1'>
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
          <>
            <p className='text-3xl font-bold text-white drop-shadow-lg'>
              Can you name this album?
            </p>
            <p className='mt-1.5 text-sm text-zinc-400'>
              Guess the album from its cover art
            </p>
          </>
        )}
      </div>

      {/* Actions */}
      <div className='relative z-10 flex flex-col items-center gap-3'>
        {/* Glow aura behind button — emerald + purple blend */}
        <div className='absolute top-0 left-1/2 -translate-x-1/2 w-[260px] h-[80px] rounded-full blur-2xl opacity-35 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.4)_0%,rgba(147,51,234,0.2)_60%,transparent_100%)]' />
        <Link
          href='/game/play'
          className='relative flex items-center justify-center gap-2.5 overflow-hidden rounded-xl px-12 py-4 text-base font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] ring-1 ring-white/[0.08] shadow-[0_0_20px_rgba(16,185,129,0.18),0_0_40px_rgba(147,51,234,0.1),0_4px_20px_rgba(0,0,0,0.5)]'
        >
          {/* Dark inset background — separates button from page smoke */}
          <div className='absolute inset-0 rounded-xl bg-black/60' />
          {/* Live smoke inside button (subtle, on top of dark base) */}
          <div className='absolute inset-0' style={{ opacity: 0.35 }}>
            <SmokeBackground smokeColor='#0d9668' speed={0.1} density={4.0} />
          </div>
          {/* Frosted glass overlay */}
          <div className='absolute inset-0 rounded-xl border border-emerald-400/20 backdrop-blur-sm' />
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
          href='/game/archive'
          className='flex items-center gap-2 px-6 py-2.5 text-sm text-zinc-400 transition-colors hover:text-zinc-200'
        >
          <Archive className='h-4 w-4' />
          Archive
        </Link>
      </div>
    </div>
  );
}
