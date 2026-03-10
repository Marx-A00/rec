/**
 * Daily Challenge Service
 *
 * Manages UncoverChallenge records.
 *
 * Challenge creation is handled ONLY by the scheduler (7 AM Central daily).
 * Public-facing code should use:
 *   - getLatestChallenge()  — for the live game (returns most recent challenge)
 *   - getChallengeByDate()  — for archive playback (returns challenge for a specific date)
 *
 * getOrCreateDailyChallenge() is reserved for the scheduler processor.
 */

import { UncoverChallenge, Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { detectAnswerRegions } from '@/lib/vision/text-detection';

import { toUTCMidnight, formatDateUTC } from './date-utils';
import {
  selectAlbumForDate,
  NoCuratedAlbumsError,
  PoolExhaustedError,
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

/** Shared include clause for album details */
const ALBUM_INCLUDE = {
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
} as const;

// ---------------------------------------------------------------------------
// Read-only queries (used by game, resolvers, UI)
// ---------------------------------------------------------------------------

/**
 * Get the latest (most recent) challenge.
 *
 * This is the primary entry point for the live game. It returns whichever
 * challenge was most recently created by the scheduler, regardless of the
 * current UTC date. Before the scheduler runs at 7 AM Central, users still
 * see yesterday's challenge.
 *
 * @returns The most recent challenge, or null if none exist yet.
 */
export async function getLatestChallenge(): Promise<DailyChallengeWithAlbum | null> {
  const latest = await prisma.uncoverChallenge.findFirst({
    orderBy: { date: 'desc' },
    include: ALBUM_INCLUDE,
  });

  return latest as DailyChallengeWithAlbum | null;
}

/**
 * Get the challenge for a specific date (read-only, no creation).
 *
 * Used for archive playback — looks up a challenge by its date.
 * Returns null if no challenge exists for that date.
 *
 * @param date - The date to look up
 * @returns The challenge for that date, or null if none exists.
 */
export async function getChallengeByDate(
  date: Date
): Promise<DailyChallengeWithAlbum | null> {
  const normalizedDate = toUTCMidnight(date);

  const challenge = await prisma.uncoverChallenge.findUnique({
    where: { date: normalizedDate },
    include: ALBUM_INCLUDE,
  });

  return challenge as DailyChallengeWithAlbum | null;
}

// ---------------------------------------------------------------------------
// Creation (scheduler only)
// ---------------------------------------------------------------------------

/**
 * Get or create the challenge for a specific date.
 *
 * WARNING: This should ONLY be called by the scheduler processor.
 * Public-facing code should use getLatestChallenge() or getChallengeByDate().
 *
 * Race condition handling: Uses database unique constraint on date.
 * If two requests try to create simultaneously, one will fail with
 * P2002 error and fall back to reading the created record.
 *
 * @param date - The date to get/create challenge for (defaults to today)
 * @returns The challenge record with album details
 * @throws NoCuratedAlbumsError if no curated albums exist
 */
export async function getOrCreateDailyChallenge(
  date: Date = new Date()
): Promise<DailyChallengeWithAlbum> {
  const normalizedDate = toUTCMidnight(date);

  // Try to find existing challenge
  const existing = await prisma.uncoverChallenge.findUnique({
    where: { date: normalizedDate },
    include: ALBUM_INCLUDE,
  });

  if (existing) {
    return existing as DailyChallengeWithAlbum;
  }

  // Select album from the pool
  const albumId = await selectAlbumForDate(normalizedDate);

  // Run text detection on the album cover
  let textRegions: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
  }> | null = null;
  try {
    const albumDetails = await prisma.album.findUnique({
      where: { id: albumId },
      select: {
        title: true,
        coverArtUrl: true,
        cloudflareImageId: true,
        artists: {
          select: { artist: { select: { name: true } } },
        },
      },
    });

    if (albumDetails) {
      const deliveryUrl =
        process.env.CLOUDFLARE_IMAGES_DELIVERY_URL ||
        `https://imagedelivery.net/${process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH}`;
      const imageUrl = albumDetails.cloudflareImageId
        ? `${deliveryUrl}/${albumDetails.cloudflareImageId}/public`
        : albumDetails.coverArtUrl;

      const artistName = albumDetails.artists[0]?.artist.name ?? '';

      if (imageUrl) {
        textRegions = await detectAnswerRegions(
          imageUrl,
          albumDetails.title,
          artistName
        );
        const regionCount = textRegions?.length ?? 0;
        console.log(
          `[DailyChallenge] Text detection: ${regionCount} answer-revealing region(s) found`
        );
      } else {
        console.log(
          '[DailyChallenge] No image URL available, skipping text detection'
        );
      }
    }
  } catch (error) {
    console.warn(
      '[DailyChallenge] Text detection failed, using fallback:',
      error
    );
    // textRegions stays null — fallback heuristic will apply during gameplay
  }

  // Try to create new challenge
  try {
    const created = await prisma.uncoverChallenge.create({
      data: {
        date: normalizedDate,
        albumId,
        maxAttempts: 4,
        textRegions: textRegions ?? Prisma.JsonNull,
      },
      include: ALBUM_INCLUDE,
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
        include: ALBUM_INCLUDE,
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

// ---------------------------------------------------------------------------
// Utility queries
// ---------------------------------------------------------------------------

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
export { NoCuratedAlbumsError, PoolExhaustedError };
