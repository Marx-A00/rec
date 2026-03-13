'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  Users,
  Trophy,
  BarChart3,
  Flame,
  Target,
  TrendingUp,
  TrendingDown,
  Crown,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

import { AlbumImage } from '@/components/ui/AlbumImage';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useUncoverGameStatsQuery } from '@/generated/graphql';

export function UncoverStatsTab() {
  const { data, isLoading } = useUncoverGameStatsQuery();
  const stats = data?.uncoverGameStats;

  if (isLoading) {
    return (
      <div className='space-y-6'>
        {/* Skeleton for stat cards */}
        <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className='h-24 animate-pulse rounded-lg border border-zinc-800 bg-zinc-900/50'
            />
          ))}
        </div>
        <div className='h-48 animate-pulse rounded-lg border border-zinc-800 bg-zinc-900/50' />
        <div className='h-64 animate-pulse rounded-lg border border-zinc-800 bg-zinc-900/50' />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className='text-center text-sm text-zinc-400 py-8'>
        No stats available yet.
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Overview Stat Cards */}
      <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
        <StatCard
          icon={<Users className='h-4 w-4' />}
          label='Unique Players'
          value={stats.totalUniquePlayers}
          color='text-blue-400'
        />
        <StatCard
          icon={<BarChart3 className='h-4 w-4' />}
          label='Total Plays'
          value={stats.totalPlays}
          subtitle={`across ${stats.totalChallenges} challenge${stats.totalChallenges !== 1 ? 's' : ''}`}
          color='text-purple-400'
        />
        <StatCard
          icon={<Trophy className='h-4 w-4' />}
          label='Win Rate'
          value={`${(stats.overallWinRate * 100).toFixed(1)}%`}
          subtitle={`${stats.totalWins} wins`}
          color='text-green-400'
        />
        <StatCard
          icon={<Target className='h-4 w-4' />}
          label='Avg Attempts'
          value={stats.overallAvgAttempts?.toFixed(1) ?? '—'}
          subtitle={
            stats.avgPlaysPerChallenge != null
              ? `~${stats.avgPlaysPerChallenge.toFixed(1)} plays/challenge`
              : undefined
          }
          color='text-amber-400'
        />
      </div>

      {/* Win Distribution Bar Chart */}
      <WinDistribution distribution={stats.globalWinDistribution} />

      {/* Notable Challenges */}
      <NotableChallenges
        mostPlayed={stats.mostPlayedChallenge ?? undefined}
        hardest={stats.hardestChallenge ?? undefined}
        easiest={stats.easiestChallenge ?? undefined}
      />

      {/* Two columns: Top Players + Recent Activity */}
      <div className='grid gap-6 lg:grid-cols-2'>
        <TopPlayers players={stats.topPlayers} />
        <RecentActivity sessions={stats.recentSessions} />
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  color: string;
}) {
  return (
    <div className='rounded-lg border border-zinc-800 bg-zinc-900/50 p-4'>
      <div className={`flex items-center gap-2 text-xs font-medium ${color}`}>
        {icon}
        {label}
      </div>
      <p className='mt-2 text-2xl font-bold text-white'>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {subtitle && <p className='mt-0.5 text-xs text-zinc-500'>{subtitle}</p>}
    </div>
  );
}

function WinDistribution({ distribution }: { distribution: number[] }) {
  const max = Math.max(...distribution, 1);
  const total = distribution.reduce((s, v) => s + v, 0);

  return (
    <div className='rounded-lg border border-zinc-800 bg-zinc-900/50 p-5'>
      <h3 className='text-sm font-semibold text-white mb-4'>
        Win Distribution
      </h3>
      <div className='space-y-2'>
        {distribution.map((count, i) => {
          const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
          return (
            <div key={i} className='flex items-center gap-3'>
              <span className='w-20 text-xs text-zinc-400 text-right'>
                Attempt {i + 1}
              </span>
              <div className='flex-1 h-6 bg-zinc-800 rounded overflow-hidden'>
                <div
                  className='h-full rounded bg-green-500/70 transition-all duration-500 flex items-center px-2'
                  style={{
                    width: `${(count / max) * 100}%`,
                    minWidth: count > 0 ? '2rem' : 0,
                  }}
                >
                  {count > 0 && (
                    <span className='text-[10px] font-medium text-white'>
                      {count}
                    </span>
                  )}
                </div>
              </div>
              <span className='w-12 text-xs text-zinc-500 text-right'>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ChallengeStatEntry {
  challengeId: string;
  date: Date | string;
  albumTitle: string;
  artistName: string;
  coverUrl?: string | null;
  cloudflareImageId?: string | null;
  totalPlays: number;
  totalWins: number;
  winRate: number;
  avgAttempts?: number | null;
}

function NotableChallenges({
  mostPlayed,
  hardest,
  easiest,
}: {
  mostPlayed?: ChallengeStatEntry;
  hardest?: ChallengeStatEntry;
  easiest?: ChallengeStatEntry;
}) {
  if (!mostPlayed && !hardest && !easiest) return null;

  return (
    <div className='rounded-lg border border-zinc-800 bg-zinc-900/50 p-5'>
      <h3 className='text-sm font-semibold text-white mb-4'>
        Notable Challenges
      </h3>
      <div className='grid gap-4 sm:grid-cols-3'>
        {mostPlayed && (
          <ChallengeCard
            label='Most Played'
            icon={<Crown className='h-3.5 w-3.5 text-amber-400' />}
            challenge={mostPlayed}
          />
        )}
        {hardest && (
          <ChallengeCard
            label='Hardest'
            icon={<TrendingDown className='h-3.5 w-3.5 text-red-400' />}
            challenge={hardest}
          />
        )}
        {easiest && (
          <ChallengeCard
            label='Easiest'
            icon={<TrendingUp className='h-3.5 w-3.5 text-green-400' />}
            challenge={easiest}
          />
        )}
      </div>
    </div>
  );
}

function ChallengeCard({
  label,
  icon,
  challenge,
}: {
  label: string;
  icon: React.ReactNode;
  challenge: ChallengeStatEntry;
}) {
  return (
    <div className='flex gap-3 rounded-md border border-zinc-800 bg-zinc-950/50 p-3'>
      <div className='relative w-12 h-12 flex-shrink-0 overflow-hidden rounded'>
        <AlbumImage
          src={challenge.coverUrl ?? undefined}
          cloudflareImageId={challenge.cloudflareImageId ?? undefined}
          alt={challenge.albumTitle}
          width={48}
          height={48}
          className='w-full h-full object-cover'
        />
      </div>
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-1.5 mb-0.5'>
          {icon}
          <span className='text-[10px] font-medium uppercase tracking-wider text-zinc-500'>
            {label}
          </span>
        </div>
        <p className='text-xs font-medium text-white truncate'>
          {challenge.albumTitle}
        </p>
        <p className='text-[10px] text-zinc-500 truncate'>
          {challenge.artistName}
        </p>
        <div className='mt-1 flex items-center gap-2 text-[10px] text-zinc-500'>
          <span>{challenge.totalPlays} plays</span>
          <span>&middot;</span>
          <span>{(challenge.winRate * 100).toFixed(0)}% win</span>
        </div>
      </div>
    </div>
  );
}

interface PlayerEntry {
  userId: string;
  username?: string | null;
  image?: string | null;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  currentStreak: number;
  maxStreak: number;
}

function TopPlayers({ players }: { players: PlayerEntry[] }) {
  if (players.length === 0) return null;

  return (
    <div className='rounded-lg border border-zinc-800 bg-zinc-900/50 p-5'>
      <h3 className='text-sm font-semibold text-white mb-3'>Top Players</h3>
      <div className='space-y-2.5'>
        {players.map((player, i) => (
          <Link
            key={player.userId}
            href={`/profile/${player.userId}`}
            className='flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-zinc-800/50'
          >
            <span className='w-5 text-xs text-zinc-600 font-mono text-right'>
              {i + 1}
            </span>
            <Avatar className='h-7 w-7'>
              {player.image ? (
                <AvatarImage src={player.image} alt={player.username ?? ''} />
              ) : null}
              <AvatarFallback className='text-[10px] bg-zinc-800 text-zinc-400'>
                {(player.username ?? '?')[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className='flex-1 min-w-0'>
              <p className='text-xs font-medium text-white truncate'>
                {player.username ?? 'Anonymous'}
              </p>
            </div>
            <div className='flex items-center gap-3 text-[11px] text-zinc-500'>
              <span className='flex items-center gap-1'>
                <Trophy className='h-3 w-3 text-green-500' />
                {player.gamesWon}
              </span>
              <span>{(player.winRate * 100).toFixed(0)}%</span>
              {player.currentStreak > 0 && (
                <span className='flex items-center gap-0.5 text-amber-400'>
                  <Flame className='h-3 w-3' />
                  {player.currentStreak}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

interface RecentSessionEntry {
  sessionId: string;
  userId: string;
  username?: string | null;
  image?: string | null;
  challengeDate: Date | string;
  albumTitle: string;
  artistName: string;
  won: boolean;
  attemptCount: number;
  completedAt?: Date | string | null;
}

function RecentActivity({ sessions }: { sessions: RecentSessionEntry[] }) {
  if (sessions.length === 0) return null;

  return (
    <div className='rounded-lg border border-zinc-800 bg-zinc-900/50 p-5'>
      <h3 className='text-sm font-semibold text-white mb-3'>Recent Activity</h3>
      <div className='space-y-1'>
        {sessions.map(session => (
          <div
            key={session.sessionId}
            className='flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-zinc-800/50'
          >
            <Avatar className='h-6 w-6'>
              {session.image ? (
                <AvatarImage src={session.image} alt={session.username ?? ''} />
              ) : null}
              <AvatarFallback className='text-[10px] bg-zinc-800 text-zinc-400'>
                {(session.username ?? '?')[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className='flex-1 min-w-0'>
              <p className='text-xs text-white'>
                <Link
                  href={`/profile/${session.userId}`}
                  className='font-medium hover:underline'
                >
                  {session.username ?? 'Anonymous'}
                </Link>
                <span className='text-zinc-500'>
                  {session.won ? ' guessed ' : ' failed '}
                </span>
                <span className='text-zinc-300'>{session.albumTitle}</span>
              </p>
              <p className='text-[10px] text-zinc-600 mt-0.5'>
                {session.completedAt
                  ? formatDistanceToNow(new Date(session.completedAt), {
                      addSuffix: true,
                    })
                  : 'In progress'}
                {session.won && (
                  <span className='text-zinc-500'>
                    {' '}
                    &middot; {session.attemptCount} attempt
                    {session.attemptCount !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
            {session.won ? (
              <CheckCircle2 className='h-4 w-4 flex-shrink-0 text-green-500' />
            ) : (
              <XCircle className='h-4 w-4 flex-shrink-0 text-red-500' />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
