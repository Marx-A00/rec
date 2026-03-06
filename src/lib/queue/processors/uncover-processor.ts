/**
 * Processor for the daily Uncover challenge creation job.
 *
 * Called by the BullMQ scheduler every day at 7 AM Central Time.
 * Creates the UncoverChallenge row for today (or a specified date).
 */

import type { UncoverCreateDailyChallengeJobData } from '../jobs';

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
