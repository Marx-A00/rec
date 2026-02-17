'use client';

import { Flame, Trophy } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMyUncoverStatsQuery, useMyArchiveStatsQuery } from '@/generated/graphql';

import { GuessDistributionChart } from './GuessDistributionChart';

interface StatsModalProps {
  /** Whether modal is open */
  open: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Whether player won this game */
  won: boolean;
  /** Number of attempts in this game (for highlight) */
  attemptCount: number;
  /** Game mode - determines which stats to highlight */
  mode?: 'daily' | 'archive';
}

/**
 * Post-game stats modal (Wordle-style).
 * Shows games played, win rate, streaks, and guess distribution.
 * Displays both daily and archive stats when available.
 */
export function StatsModal({
  open,
  onClose,
  won,
  attemptCount,
  mode = 'daily',
}: StatsModalProps) {
  const { data: dailyData, isLoading: isDailyLoading } = useMyUncoverStatsQuery(
    {},
    { enabled: open }
  );
  const { data: archiveData, isLoading: isArchiveLoading } = useMyArchiveStatsQuery(
    {},
    { enabled: open }
  );

  const dailyStats = dailyData?.myUncoverStats;
  const archiveStats = archiveData?.myArchiveStats;

  const isLoading = isDailyLoading || isArchiveLoading;

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent className='max-w-sm'>
        <DialogHeader>
          <DialogTitle className='text-center text-2xl'>
            {won ? '🎉 You Won!' : 'Game Over'}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className='flex items-center justify-center py-8'>
            <div className='text-muted-foreground'>Loading stats...</div>
          </div>
        ) : (
          <div className='space-y-6 py-4'>
            {/* Daily Stats Section */}
            {dailyStats && (
              <div className='space-y-4'>
                <h3 className='text-sm font-medium uppercase tracking-wide text-muted-foreground'>
                  Daily Challenge Stats
                </h3>

                {/* Stats Grid - 4 columns */}
                <div className='grid grid-cols-4 gap-2 text-center'>
                  <div>
                    <div className='text-2xl font-bold md:text-3xl'>
                      {dailyStats.gamesPlayed}
                    </div>
                    <div className='text-[10px] text-muted-foreground md:text-xs'>
                      Played
                    </div>
                  </div>
                  <div>
                    <div className='text-2xl font-bold md:text-3xl'>
                      {Math.round(dailyStats.winRate * 100)}
                    </div>
                    <div className='text-[10px] text-muted-foreground md:text-xs'>
                      Win %
                    </div>
                  </div>
                  <div>
                    <div className='flex items-center justify-center gap-1 text-2xl font-bold md:text-3xl'>
                      <Flame className='h-5 w-5 text-orange-500 md:h-6 md:w-6' />
                      {dailyStats.currentStreak}
                    </div>
                    <div className='text-[10px] text-muted-foreground md:text-xs'>
                      Streak
                    </div>
                  </div>
                  <div>
                    <div className='flex items-center justify-center gap-1 text-2xl font-bold md:text-3xl'>
                      <Trophy className='h-5 w-5 text-yellow-500 md:h-6 md:w-6' />
                      {dailyStats.maxStreak}
                    </div>
                    <div className='text-[10px] text-muted-foreground md:text-xs'>
                      Best
                    </div>
                  </div>
                </div>

                {/* Daily Guess Distribution Chart */}
                <GuessDistributionChart
                  distribution={dailyStats.winDistribution}
                  todayAttempts={mode === 'daily' && won ? attemptCount : null}
                />
              </div>
            )}

            {/* Archive Stats Section */}
            {archiveStats && archiveStats.gamesPlayed > 0 && (
              <>
                <div className='border-t border-zinc-700' />
                <div className='space-y-4'>
                  <h3 className='text-sm font-medium uppercase tracking-wide text-muted-foreground'>
                    Archive Stats
                  </h3>

                  {/* Archive Stats Grid - 3 columns (no streaks) */}
                  <div className='grid grid-cols-3 gap-2 text-center'>
                    <div>
                      <div className='text-2xl font-bold md:text-3xl'>
                        {archiveStats.gamesPlayed}
                      </div>
                      <div className='text-[10px] text-muted-foreground md:text-xs'>
                        Played
                      </div>
                    </div>
                    <div>
                      <div className='text-2xl font-bold md:text-3xl'>
                        {Math.round(archiveStats.winRate * 100)}
                      </div>
                      <div className='text-[10px] text-muted-foreground md:text-xs'>
                        Win %
                      </div>
                    </div>
                    <div>
                      <div className='text-2xl font-bold md:text-3xl'>
                        {archiveStats.gamesWon}
                      </div>
                      <div className='text-[10px] text-muted-foreground md:text-xs'>
                        Wins
                      </div>
                    </div>
                  </div>

                  {/* Archive Guess Distribution Chart */}
                  <GuessDistributionChart
                    distribution={archiveStats.winDistribution}
                    todayAttempts={mode === 'archive' && won ? attemptCount : null}
                  />
                </div>
              </>
            )}

            {/* Next Game Message */}
            <p className='text-center text-sm text-muted-foreground'>
              {mode === 'daily'
                ? 'Come back tomorrow for a new challenge!'
                : 'Try another archive puzzle!'}
            </p>

            {/* Close Button */}
            <button
              onClick={onClose}
              className='w-full rounded-md bg-primary px-4 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90'
            >
              Close
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
