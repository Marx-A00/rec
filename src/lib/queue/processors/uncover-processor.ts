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

export async function handleResetChallenges(
  _data: UncoverResetChallengesJobData
): Promise<{
  challengesDeleted: number;
  sessionsDeleted: number;
  guessesDeleted: number;
  playerStatsDeleted: number;
  archiveStatsDeleted: number;
  newChallengeAlbumTitle: string | null;
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

  // Seed a new challenge for today
  const { getOrCreateDailyChallenge } = await import(
    '@/lib/daily-challenge/challenge-service'
  );
  const { getCentralToday } = await import('@/lib/daily-challenge/date-utils');

  const challenge = await getOrCreateDailyChallenge(getCentralToday());

  console.log(
    `✅ [Uncover] Reset complete. New challenge: ${challenge.album.title}`
  );

  return {
    challengesDeleted: challengesDeleted.count,
    sessionsDeleted: sessionsDeleted.count,
    guessesDeleted: guessesDeleted.count,
    playerStatsDeleted: playerStatsDeleted.count,
    archiveStatsDeleted: archiveStatsDeleted.count,
    newChallengeAlbumTitle: challenge.album.title,
  };
}
