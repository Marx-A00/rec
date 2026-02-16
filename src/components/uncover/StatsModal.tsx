'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMyUncoverStatsQuery } from '@/generated/graphql';
import { GuessDistributionChart } from './GuessDistributionChart';
import { Flame, Trophy } from 'lucide-react';

interface StatsModalProps {
  /** Whether modal is open */
  open: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Whether player won this game */
  won: boolean;
  /** Number of attempts in this game (for highlight) */
  attemptCount: number;
}

/**
 * Post-game stats modal (Wordle-style).
 * Shows games played, win rate, streaks, and guess distribution.
 */
export function StatsModal({
  open,
  onClose,
  won,
  attemptCount,
}: StatsModalProps) {
  const { data, isLoading } = useMyUncoverStatsQuery(
    {},
    { enabled: open } // Only fetch when modal opens
  );

  const stats = data?.myUncoverStats;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {won ? '🎉 You Won!' : 'Game Over'}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading stats...</div>
          </div>
        ) : stats ? (
          <div className="space-y-6 py-4">
            {/* Stats Grid - 4 columns */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-2xl font-bold md:text-3xl">
                  {stats.gamesPlayed}
                </div>
                <div className="text-[10px] text-muted-foreground md:text-xs">
                  Played
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold md:text-3xl">
                  {Math.round(stats.winRate * 100)}
                </div>
                <div className="text-[10px] text-muted-foreground md:text-xs">
                  Win %
                </div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-2xl font-bold md:text-3xl">
                  <Flame className="h-5 w-5 text-orange-500 md:h-6 md:w-6" />
                  {stats.currentStreak}
                </div>
                <div className="text-[10px] text-muted-foreground md:text-xs">
                  Streak
                </div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-2xl font-bold md:text-3xl">
                  <Trophy className="h-5 w-5 text-yellow-500 md:h-6 md:w-6" />
                  {stats.maxStreak}
                </div>
                <div className="text-[10px] text-muted-foreground md:text-xs">
                  Best
                </div>
              </div>
            </div>

            {/* Guess Distribution Chart */}
            <GuessDistributionChart
              distribution={stats.winDistribution}
              todayAttempts={won ? attemptCount : null}
            />

            {/* Next Game Message */}
            <p className="text-center text-sm text-muted-foreground">
              Come back tomorrow for a new challenge!
            </p>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-full rounded-md bg-primary px-4 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No stats available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
