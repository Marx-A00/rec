/**
 * Processor for the daily Uncover challenge creation job.
 *
 * Called by the BullMQ scheduler every day at 7 AM Central Time.
 * Creates the UncoverChallenge row for today (or a specified date).
 */

import { queueLogger } from '@/lib/logger';

import type {
  UncoverCreateDailyChallengeJobData,
  UncoverResetChallengesJobData,
} from '../jobs';

export async function handleCreateDailyChallenge(
  data: UncoverCreateDailyChallengeJobData
): Promise<{ albumId: string; date: string }> {
  // Dynamic import to avoid circular dependency issues at worker boot
  const { getOrCreateDailyChallenge } = await import(
    '@/lib/daily-challenge/challenge-service'
  );
  const { formatDateUTC } = await import('@/lib/daily-challenge/date-utils');

  const date = data.date ? new Date(data.date) : new Date();

  queueLogger.info({ date: formatDateUTC(date), source: data.source ?? 'unknown' }, 'Creating daily challenge');

  const challenge = await getOrCreateDailyChallenge(date);

  queueLogger.info({ date: formatDateUTC(challenge.date), albumTitle: challenge.album.title }, 'Daily challenge ready');

  return {
    albumId: challenge.albumId,
    date: formatDateUTC(challenge.date),
  };
}

/** Number of past days to backfill as archive challenges after a reset. */
const BACKFILL_DAYS = 7;

export async function handleResetChallenges(
  _data: UncoverResetChallengesJobData
): Promise<{
  challengesDeleted: number;
  sessionsDeleted: number;
  guessesDeleted: number;
  playerStatsDeleted: number;
  archiveStatsDeleted: number;
  challengesCreated: number;
  newChallengeAlbumTitles: string[];
}> {
  const { prisma } = await import('@/lib/prisma');

  queueLogger.info('Resetting all challenge data');

  // Delete in FK order: guesses → sessions → challenges → stats
  const guessesDeleted = await prisma.uncoverGuess.deleteMany({});
  const sessionsDeleted = await prisma.uncoverSession.deleteMany({});
  const challengesDeleted = await prisma.uncoverChallenge.deleteMany({});
  const playerStatsDeleted = await prisma.uncoverPlayerStats.deleteMany({});
  const archiveStatsDeleted = await prisma.uncoverArchiveStats.deleteMany({});

  queueLogger.info(
    { guesses: guessesDeleted.count, sessions: sessionsDeleted.count, challenges: challengesDeleted.count, playerStats: playerStatsDeleted.count, archiveStats: archiveStatsDeleted.count },
    'Challenge data deleted'
  );

  // Backfill challenges: 7 past days + today (oldest first so archive dates are sequential)
  const { getOrCreateDailyChallenge } = await import(
    '@/lib/daily-challenge/challenge-service'
  );
  const { getCentralToday } = await import('@/lib/daily-challenge/date-utils');

  const today = getCentralToday();
  const newChallengeAlbumTitles: string[] = [];

  queueLogger.info({ backfillDays: BACKFILL_DAYS }, 'Backfilling archive days');

  for (let daysAgo = BACKFILL_DAYS; daysAgo >= 0; daysAgo--) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - daysAgo);

    try {
      const challenge = await getOrCreateDailyChallenge(date);
      newChallengeAlbumTitles.push(challenge.album.title);
      queueLogger.debug({ date: date.toISOString().split('T')[0], albumTitle: challenge.album.title }, 'Backfill challenge created');
    } catch (error) {
      queueLogger.error({ date: date.toISOString().split('T')[0], error: error instanceof Error ? error.message : String(error) }, 'Failed to create backfill challenge');
      // Continue with remaining days — partial backfill is better than none
    }
  }

  queueLogger.info({ challengesCreated: newChallengeAlbumTitles.length }, 'Reset complete');

  return {
    challengesDeleted: challengesDeleted.count,
    sessionsDeleted: sessionsDeleted.count,
    guessesDeleted: guessesDeleted.count,
    playerStatsDeleted: playerStatsDeleted.count,
    archiveStatsDeleted: archiveStatsDeleted.count,
    challengesCreated: newChallengeAlbumTitles.length,
    newChallengeAlbumTitles,
  };
}
