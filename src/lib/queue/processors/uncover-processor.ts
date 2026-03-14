/**
 * Processor for the daily Uncover challenge creation job.
 *
 * Called by the BullMQ scheduler every day at 7 AM Central Time.
 * Creates the UncoverChallenge row for today (or a specified date).
 */

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

  console.log(
    `🎯 [Uncover] Creating daily challenge for ${formatDateUTC(date)} (source: ${data.source ?? 'unknown'})`
  );

  const challenge = await getOrCreateDailyChallenge(date);

  console.log(
    `✅ [Uncover] Challenge ready for ${formatDateUTC(challenge.date)} — album: ${challenge.album.title}`
  );

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

  console.log('🗑️ [Uncover] Resetting all challenge data...');

  // Delete in FK order: guesses → sessions → challenges → stats
  const guessesDeleted = await prisma.uncoverGuess.deleteMany({});
  console.log(`   Deleted ${guessesDeleted.count} guesses`);

  const sessionsDeleted = await prisma.uncoverSession.deleteMany({});
  console.log(`   Deleted ${sessionsDeleted.count} sessions`);

  const challengesDeleted = await prisma.uncoverChallenge.deleteMany({});
  console.log(`   Deleted ${challengesDeleted.count} challenges`);

  const playerStatsDeleted = await prisma.uncoverPlayerStats.deleteMany({});
  console.log(`   Deleted ${playerStatsDeleted.count} player stats`);

  const archiveStatsDeleted = await prisma.uncoverArchiveStats.deleteMany({});
  console.log(`   Deleted ${archiveStatsDeleted.count} archive stats`);

  // Backfill challenges: 7 past days + today (oldest first so archive dates are sequential)
  const { getOrCreateDailyChallenge } = await import(
    '@/lib/daily-challenge/challenge-service'
  );
  const { getCentralToday } = await import('@/lib/daily-challenge/date-utils');

  const today = getCentralToday();
  const newChallengeAlbumTitles: string[] = [];

  console.log(
    `🔄 [Uncover] Backfilling ${BACKFILL_DAYS} archive days + today...`
  );

  for (let daysAgo = BACKFILL_DAYS; daysAgo >= 0; daysAgo--) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - daysAgo);

    try {
      const challenge = await getOrCreateDailyChallenge(date);
      newChallengeAlbumTitles.push(challenge.album.title);
      const label = daysAgo === 0 ? 'today' : `${daysAgo}d ago`;
      console.log(
        `   ✅ ${date.toISOString().split('T')[0]} (${label}): ${challenge.album.title}`
      );
    } catch (error) {
      console.error(
        `   ❌ Failed to create challenge for ${date.toISOString().split('T')[0]}:`,
        error
      );
      // Continue with remaining days — partial backfill is better than none
    }
  }

  console.log(
    `✅ [Uncover] Reset complete. Created ${newChallengeAlbumTitles.length} challenges.`
  );

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
