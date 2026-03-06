/**
 * Daily Challenge Selection Service
 *
 * Selects an album for a given date from the curated pool.
 * Uses the uncover_challenges table as the "used" list — any curated album
 * whose ID appears there has already been played. Selection picks from
 * the remaining unused albums (random or FIFO based on admin settings).
 */

import { UncoverSelectionMode, UncoverPoolExhaustedMode } from '@prisma/client';

import { prisma } from '@/lib/prisma';

import { toUTCMidnight } from './date-utils';

export class NoCuratedAlbumsError extends Error {
  constructor() {
    super(
      'No curated albums available. Admin must add albums to the curated challenge list.'
    );
    this.name = 'NoCuratedAlbumsError';
  }
}

export class PoolExhaustedError extends Error {
  constructor() {
    super(
      'All curated albums have been used and pool exhausted mode is set to STOP. Admin must add more albums.'
    );
    this.name = 'PoolExhaustedError';
  }
}

/**
 * Load uncover game settings from AppConfig.
 */
async function getUncoverSettings(): Promise<{
  selectionMode: UncoverSelectionMode;
  poolExhaustedMode: UncoverPoolExhaustedMode;
}> {
  const config = await prisma.appConfig.findUnique({
    where: { id: 'default' },
    select: {
      uncoverSelectionMode: true,
      uncoverPoolExhaustedMode: true,
    },
  });

  return {
    selectionMode: config?.uncoverSelectionMode ?? 'RANDOM',
    poolExhaustedMode: config?.uncoverPoolExhaustedMode ?? 'AUTO_RESET',
  };
}

/**
 * Pick an album ID from a list of candidates based on the selection mode.
 */
function pickAlbum(
  candidates: Array<{ albumId: string }>,
  mode: UncoverSelectionMode
): string {
  if (mode === 'FIFO') {
    // Candidates are already ordered by createdAt ASC, take the first
    return candidates[0].albumId;
  }

  // RANDOM: pick a random candidate
  const index = Math.floor(Math.random() * candidates.length);
  return candidates[index].albumId;
}

/**
 * Select the album ID for a given date.
 *
 * Selection priority:
 * 1. Admin-pinned album for this specific date (override)
 * 2. Pick from unused pool (curated albums not yet in uncover_challenges)
 * 3. If pool empty: auto-reset (pick from full pool) or throw PoolExhaustedError
 *
 * @param date - The date to select an album for (will be normalized to UTC midnight)
 * @returns Album ID to use for this date's challenge
 * @throws NoCuratedAlbumsError if curated list is empty
 * @throws PoolExhaustedError if all albums used and mode is STOP
 */
export async function selectAlbumForDate(date: Date): Promise<string> {
  const normalizedDate = toUTCMidnight(date);

  // 1. Check for admin-pinned album on this date
  const pinned = await prisma.curatedChallenge.findFirst({
    where: { pinnedDate: normalizedDate },
    select: { albumId: true },
  });

  if (pinned) {
    return pinned.albumId;
  }

  // 2. Check we have curated albums at all
  const totalCurated = await prisma.curatedChallenge.count();

  if (totalCurated === 0) {
    throw new NoCuratedAlbumsError();
  }

  // 3. Load settings
  const { selectionMode, poolExhaustedMode } = await getUncoverSettings();

  // 4. Find unused albums: curated albums whose albumId is NOT in uncover_challenges
  const unusedAlbums = await prisma.curatedChallenge.findMany({
    where: {
      albumId: {
        notIn: (
          await prisma.uncoverChallenge.findMany({
            select: { albumId: true },
          })
        ).map(c => c.albumId),
      },
    },
    select: { albumId: true },
    orderBy: { createdAt: 'asc' },
  });

  if (unusedAlbums.length > 0) {
    return pickAlbum(unusedAlbums, selectionMode);
  }

  // 5. Pool is exhausted — all curated albums have been used
  if (poolExhaustedMode === 'STOP') {
    throw new PoolExhaustedError();
  }

  // AUTO_RESET: pick from the full curated pool (ignore used history)
  const allAlbums = await prisma.curatedChallenge.findMany({
    select: { albumId: true },
    orderBy: { createdAt: 'asc' },
  });

  return pickAlbum(allAlbums, selectionMode);
}
