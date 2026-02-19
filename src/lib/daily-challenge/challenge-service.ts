/**
 * Daily Challenge Service
 *
 * Manages UncoverChallenge records. Creates challenges on-demand
 * when first requested for a date, handling race conditions gracefully.
 */

import { UncoverChallenge, Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

import { toUTCMidnight, getToday, formatDateUTC } from './date-utils';
import {
  selectAlbumForDate,
  NoCuratedAlbumsError,
  AlbumNotFoundError,
} from './selection-service';

// Type for challenge info (safe for public API - does NOT include answer)
export type DailyChallengeInfo = {
  id: string;
  date: Date;
  maxAttempts: number;
  totalPlays: number;
  totalWins: number;
  avgAttempts: number | null;
  // Note: albumId intentionally NOT exposed - that's the answer!
};

// Full challenge type for internal use only
export type DailyChallengeWithAlbum = UncoverChallenge & {
  album: {
    id: string;
    title: string;
    cloudflareImageId: string | null;
    artists: Array<{
      artist: {
        id: string;
        name: string;
      };
    }>;
  };
};

/**
 * Get or create the challenge for a specific date.
 *
 * This is the main entry point for retrieving daily challenges.
 * If the challenge doesn not exist, it will be created on-demand
 * using deterministic album selection.
 *
 * Race condition handling: Uses database unique constraint on date.
 * If two requests try to create simultaneously, one will fail with
 * P2002 error and fall back to reading the created record.
 *
 * @param date - The date to get/create challenge for (defaults to today)
 * @returns The challenge record with album details (for internal use)
 * @throws NoCuratedAlbumsError if no curated albums exist
 */
export async function getOrCreateDailyChallenge(
  date: Date = new Date()
): Promise<DailyChallengeWithAlbum> {
  const normalizedDate = toUTCMidnight(date);

  // Try to find existing challenge
  const existing = await prisma.uncoverChallenge.findUnique({
    where: { date: normalizedDate },
    include: {
      album: {
        select: {
          id: true,
          title: true,
          cloudflareImageId: true,
          artists: {
            select: {
              artist: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (existing) {
    return existing as DailyChallengeWithAlbum;
  }

  // Select album deterministically
  const albumId = await selectAlbumForDate(normalizedDate);

  // Try to create new challenge
  try {
    const created = await prisma.uncoverChallenge.create({
      data: {
        date: normalizedDate,
        albumId,
        maxAttempts: 6,
      },
      include: {
        album: {
          select: {
            id: true,
            title: true,
            cloudflareImageId: true,
            artists: {
              select: {
                artist: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const dateStr = formatDateUTC(normalizedDate);
    console.log('[DailyChallenge] Created challenge for ' + dateStr);
    return created as DailyChallengeWithAlbum;
  } catch (error) {
    // Handle race condition: another request created it first
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const dateStr = formatDateUTC(normalizedDate);
      console.log(
        '[DailyChallenge] Race condition on ' + dateStr + ', fetching existing'
      );

      const raceResolved = await prisma.uncoverChallenge.findUnique({
        where: { date: normalizedDate },
        include: {
          album: {
            select: {
              id: true,
              title: true,
              cloudflareImageId: true,
              artists: {
                select: {
                  artist: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!raceResolved) {
        throw new Error(
          'Challenge creation race condition unresolved for ' + dateStr
        );
      }

      return raceResolved as DailyChallengeWithAlbum;
    }

    throw error;
  }
}

/**
 * Get today's challenge (convenience wrapper).
 */
export async function getTodayChallenge(): Promise<DailyChallengeWithAlbum> {
  return getOrCreateDailyChallenge(getToday());
}

/**
 * Get public challenge info (safe to expose to clients).
 * Does NOT include albumId or album details - that's the answer!
 */
export async function getDailyChallengeInfo(
  date: Date = new Date()
): Promise<DailyChallengeInfo> {
  const challenge = await getOrCreateDailyChallenge(date);

  return {
    id: challenge.id,
    date: challenge.date,
    maxAttempts: challenge.maxAttempts,
    totalPlays: challenge.totalPlays,
    totalWins: challenge.totalWins,
    avgAttempts: challenge.avgAttempts,
  };
}

/**
 * Check if a challenge exists for a date (without creating it).
 */
export async function challengeExistsForDate(date: Date): Promise<boolean> {
  const normalizedDate = toUTCMidnight(date);
  const count = await prisma.uncoverChallenge.count({
    where: { date: normalizedDate },
  });
  return count > 0;
}

// Re-export errors for convenience
export { NoCuratedAlbumsError, AlbumNotFoundError };
