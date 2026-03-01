/**
 * Daily Challenge Selection Service
 *
 * Deterministically selects an album for a given date from the curated challenge list.
 * Uses modulo arithmetic on days-since-epoch for reproducible, debuggable selection.
 */

import { prisma } from '@/lib/prisma';

import { toUTCMidnight, getDaysSinceEpoch } from './date-utils';

export class NoCuratedAlbumsError extends Error {
  constructor() {
    super(
      'No curated albums available. Admin must add albums to the curated challenge list.'
    );
    this.name = 'NoCuratedAlbumsError';
  }
}

export class AlbumNotFoundError extends Error {
  constructor(sequence: number) {
    super(
      `No album found at sequence ${sequence}. Curated list may have gaps.`
    );
    this.name = 'AlbumNotFoundError';
  }
}

/**
 * Select the album ID for a given date.
 *
 * Selection priority:
 * 1. Admin-pinned album for this specific date (override)
 * 2. Deterministic selection from ordered curated list using date modulo
 *
 * @param date - The date to select an album for (will be normalized to UTC midnight)
 * @returns Album ID to use for this date's challenge
 * @throws NoCuratedAlbumsError if curated list is empty
 * @throws AlbumNotFoundError if sequence calculation finds no album
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

  // 2. Deterministic selection with recent-duplicate avoidance
  const totalCurated = await prisma.curatedChallenge.count();

  if (totalCurated === 0) {
    throw new NoCuratedAlbumsError();
  }

  // Collect album IDs already used in recent challenges (within the last cycle)
  const recentChallenges = await prisma.uncoverChallenge.findMany({
    where: {
      date: { lt: normalizedDate },
    },
    orderBy: { date: 'desc' },
    take: totalCurated - 1, // At most N-1 recent; guarantees at least 1 unused
    select: { albumId: true },
  });
  const recentAlbumIds = new Set(recentChallenges.map(c => c.albumId));

  const daysSinceEpoch = getDaysSinceEpoch(normalizedDate);
  const startSequence = daysSinceEpoch % totalCurated;

  // Walk through the curated list starting at the deterministic position.
  // Skip albums already used in recent challenges.
  for (let offset = 0; offset < totalCurated; offset++) {
    const seq = (startSequence + offset) % totalCurated;
    const candidate = await prisma.curatedChallenge.findUnique({
      where: { sequence: seq },
      select: { albumId: true },
    });

    if (!candidate) {
      continue;
    }

    if (!recentAlbumIds.has(candidate.albumId)) {
      return candidate.albumId;
    }
  }

  // Fallback: all curated albums were used recently (shouldn't happen
  // since we take at most totalCurated-1). Use the deterministic pick.
  const fallback = await prisma.curatedChallenge.findUnique({
    where: { sequence: startSequence },
    select: { albumId: true },
  });

  if (!fallback) {
    throw new AlbumNotFoundError(startSequence);
  }

  return fallback.albumId;
}

/**
 * Get information about which album will be selected for a date.
 * Useful for admin preview and debugging.
 *
 * @param date - The date to check
 * @returns Object with selection details
 */
export async function getSelectionInfo(date: Date): Promise<{
  date: Date;
  daysSinceEpoch: number;
  totalCurated: number;
  sequence: number;
  isPinned: boolean;
  albumId: string | null;
}> {
  const normalizedDate = toUTCMidnight(date);
  const daysSinceEpoch = getDaysSinceEpoch(normalizedDate);
  const totalCurated = await prisma.curatedChallenge.count();

  // Check for pinned
  const pinned = await prisma.curatedChallenge.findFirst({
    where: { pinnedDate: normalizedDate },
    select: { albumId: true },
  });

  if (pinned) {
    return {
      date: normalizedDate,
      daysSinceEpoch,
      totalCurated,
      sequence: -1, // Not applicable for pinned
      isPinned: true,
      albumId: pinned.albumId,
    };
  }

  const sequence = totalCurated > 0 ? daysSinceEpoch % totalCurated : -1;
  const challenge =
    totalCurated > 0
      ? await prisma.curatedChallenge.findUnique({
          where: { sequence },
          select: { albumId: true },
        })
      : null;

  return {
    date: normalizedDate,
    daysSinceEpoch,
    totalCurated,
    sequence,
    isPinned: false,
    albumId: challenge?.albumId ?? null,
  };
}
