/**
 * Archive Stats Service
 *
 * Handles archive game statistics (separate from daily stats).
 * No streak logic - archive games don't affect daily streaks.
 */

import type { PrismaClient } from '@prisma/client';

// ----- Types -----

export interface UpdateArchiveStatsInput {
  userId: string;
  won: boolean;
  attemptCount: number;
}

export interface ArchiveStats {
  gamesPlayed: number;
  gamesWon: number;
  totalAttempts: number;
  winRate: number;
  winDistribution: number[];
}

// ----- Service Functions -----

/**
 * Update archive game stats after a game ends.
 * No streak logic - archive games are separate from daily stats.
 */
export async function updateArchiveStats(
  input: UpdateArchiveStatsInput,
  prisma: PrismaClient
): Promise<void> {
  const { userId, won, attemptCount } = input;

  // Fetch existing stats
  const existingStats = await prisma.uncoverArchiveStats.findUnique({
    where: { userId },
  });

  // Calculate new win distribution
  const currentDistribution = existingStats?.winDistribution ?? [0, 0, 0, 0, 0, 0];
  const newDistribution = [...currentDistribution];

  if (won && attemptCount >= 1 && attemptCount <= 6) {
    newDistribution[attemptCount - 1] += 1;
  }

  // Upsert stats
  await prisma.uncoverArchiveStats.upsert({
    where: { userId },
    create: {
      userId,
      gamesPlayed: 1,
      gamesWon: won ? 1 : 0,
      totalAttempts: attemptCount,
      winDistribution: newDistribution,
    },
    update: {
      gamesPlayed: { increment: 1 },
      gamesWon: won ? { increment: 1 } : undefined,
      totalAttempts: { increment: attemptCount },
      winDistribution: newDistribution,
    },
  });
}

/**
 * Get archive game stats for a user.
 * Returns zeros if user has no archive stats yet.
 */
export async function getArchiveStats(
  userId: string,
  prisma: PrismaClient
): Promise<ArchiveStats> {
  const stats = await prisma.uncoverArchiveStats.findUnique({
    where: { userId },
  });

  if (!stats) {
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      totalAttempts: 0,
      winRate: 0,
      winDistribution: [0, 0, 0, 0, 0, 0],
    };
  }

  const winRate = stats.gamesPlayed > 0 
    ? (stats.gamesWon / stats.gamesPlayed) * 100 
    : 0;

  return {
    gamesPlayed: stats.gamesPlayed,
    gamesWon: stats.gamesWon,
    totalAttempts: stats.totalAttempts,
    winRate,
    winDistribution: stats.winDistribution,
  };
}
