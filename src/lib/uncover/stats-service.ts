/**
 * Stats Service
 *
 * Handles player statistics updates and retrieval for Uncover game.
 * Implements UTC-aware streak calculation and idempotent updates.
 */

import type { PrismaClient } from '@prisma/client';

// ----- Types -----

export interface UpdateStatsInput {
  userId: string;
  won: boolean;
  attemptCount: number;
  challengeDate: Date;
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  totalAttempts: number;
  winRate: number;
  currentStreak: number;
  maxStreak: number;
  winDistribution: number[];
}

// ----- UTC Date Helpers -----

/**
 * Normalize a date to UTC midnight.
 * Ensures consistent date comparison across timezones.
 */
export function toUTCMidnight(date: Date): Date {
  const utc = new Date(date);
  utc.setUTCHours(0, 0, 0, 0);
  return utc;
}

/**
 * Check if two dates are exactly 1 day apart (UTC).
 * Used for consecutive day streak validation.
 */
export function isConsecutiveDay(
  lastPlayed: Date | null,
  challengeDate: Date
): boolean {
  if (!lastPlayed) return false;

  const lastPlayedUTC = toUTCMidnight(lastPlayed);
  const challengeDateUTC = toUTCMidnight(challengeDate);

  const diffMs = challengeDateUTC.getTime() - lastPlayedUTC.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays === 1;
}

/**
 * Check if two dates are the same day (UTC).
 * Used to prevent duplicate stats updates for same-day games.
 */
export function isSameDay(date1: Date | null, date2: Date): boolean {
  if (!date1) return false;

  const date1UTC = toUTCMidnight(date1);
  const date2UTC = toUTCMidnight(date2);

  return date1UTC.getTime() === date2UTC.getTime();
}

// ----- Service Functions -----

/**
 * Update player stats after a game ends.
 * Handles streak calculation, win distribution, and aggregate stats.
 * Idempotent - prevents duplicate updates for same-day games.
 */
export async function updatePlayerStats(
  input: UpdateStatsInput,
  prisma: PrismaClient
): Promise<void> {
  const { userId, won, attemptCount, challengeDate } = input;

  // Fetch existing stats
  const existingStats = await prisma.uncoverPlayerStats.findUnique({
    where: { userId },
  });

  // Prevent duplicate updates for same-day games (idempotent)
  if (
    existingStats &&
    isSameDay(existingStats.lastPlayedDate, challengeDate)
  ) {
    return; // Already updated for this challenge date
  }

  // Calculate streak
  let currentStreak = 0;
  if (won) {
    if (
      existingStats &&
      isConsecutiveDay(existingStats.lastPlayedDate, challengeDate)
    ) {
      // Consecutive day win - increment streak
      currentStreak = existingStats.currentStreak + 1;
    } else {
      // First win or non-consecutive - reset to 1
      currentStreak = 1;
    }
  }
  // If lost, currentStreak stays 0

  // Update maxStreak if current exceeds it
  const maxStreak = existingStats
    ? Math.max(currentStreak, existingStats.maxStreak)
    : currentStreak;

  // Update win distribution if won and attemptCount is valid (1-6)
  let winDistribution = existingStats
    ? [...existingStats.winDistribution]
    : [0, 0, 0, 0, 0, 0];

  if (won && attemptCount >= 1 && attemptCount <= 6) {
    const index = attemptCount - 1;
    winDistribution[index] = (winDistribution[index] || 0) + 1;
  }

  // Normalize challengeDate to UTC midnight for storage
  const lastPlayedDate = toUTCMidnight(challengeDate);

  // Upsert stats
  await prisma.uncoverPlayerStats.upsert({
    where: { userId },
    create: {
      userId,
      gamesPlayed: 1,
      gamesWon: won ? 1 : 0,
      totalAttempts: attemptCount,
      currentStreak,
      maxStreak,
      lastPlayedDate,
      winDistribution,
    },
    update: {
      gamesPlayed: {
        increment: 1,
      },
      gamesWon: won
        ? {
            increment: 1,
          }
        : undefined,
      totalAttempts: {
        increment: attemptCount,
      },
      currentStreak,
      maxStreak,
      lastPlayedDate,
      winDistribution,
    },
  });
}

/**
 * Get player stats for a user.
 * Returns zeros if no stats exist yet.
 */
export async function getPlayerStats(
  userId: string,
  prisma: PrismaClient
): Promise<PlayerStats> {
  const stats = await prisma.uncoverPlayerStats.findUnique({
    where: { userId },
  });

  if (!stats) {
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      totalAttempts: 0,
      winRate: 0,
      currentStreak: 0,
      maxStreak: 0,
      winDistribution: [0, 0, 0, 0, 0, 0],
    };
  }

  // Calculate win rate
  const winRate = stats.gamesPlayed > 0 ? stats.gamesWon / stats.gamesPlayed : 0;

  return {
    gamesPlayed: stats.gamesPlayed,
    gamesWon: stats.gamesWon,
    totalAttempts: stats.totalAttempts,
    winRate,
    currentStreak: stats.currentStreak,
    maxStreak: stats.maxStreak,
    winDistribution: stats.winDistribution,
  };
}
