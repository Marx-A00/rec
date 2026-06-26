import { Prisma } from '@prisma/client';

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

/**
 * Shape of each entry in the TasteMatch.sharedContext JSON column.
 */
export interface SharedContextEntry {
  artistId: string;
  artistName: string;
  sources: ('taste_profile' | 'collections')[];
}

/** Points awarded per overlap type */
const POINTS = {
  TASTE_PROFILE_ARTIST: 5,
  COLLECTION_ARTIST: 1,
  SHARED_ALBUM_BONUS: 2,
} as const;

const MAX_MATCHES_PER_USER = 15;

// --------------------------------------------------------------------------
// Internal types
// --------------------------------------------------------------------------

interface UserFingerprint {
  userId: string;
  /** Map of artistId -> { artistName, sources } */
  artists: Map<
    string,
    { artistName: string; sources: Set<'taste_profile' | 'collections'> }
  >;
  /** Set of albumIds from collections */
  albumIds: Set<string>;
}

// --------------------------------------------------------------------------
// Data fetching helpers
// --------------------------------------------------------------------------

/**
 * Fetch all non-deleted users who have at least a taste profile or a
 * collection album, and gather their artist fingerprints + album IDs.
 */
async function fetchAllFingerprints(): Promise<Map<string, UserFingerprint>> {
  // 1. Taste-profile artists (UserFavoriteArtist)
  const favoriteArtists = await prisma.userFavoriteArtist.findMany({
    where: { user: { deletedAt: null } },
    select: {
      userId: true,
      artistId: true,
      artist: { select: { name: true } },
    },
  });

  // 2. Collection artists & album IDs
  //    CollectionAlbum -> Album -> AlbumArtist -> Artist
  const collectionAlbums = await prisma.collectionAlbum.findMany({
    where: { collection: { user: { deletedAt: null } } },
    include: {
      collection: { select: { userId: true } },
      album: {
        include: {
          artists: {
            select: {
              artistId: true,
              artist: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  // Build fingerprints map
  const fingerprints = new Map<string, UserFingerprint>();

  const getOrCreate = (userId: string): UserFingerprint => {
    let fp = fingerprints.get(userId);
    if (!fp) {
      fp = { userId, artists: new Map(), albumIds: new Set() };
      fingerprints.set(userId, fp);
    }
    return fp;
  };

  // Add taste-profile artists
  for (const fav of favoriteArtists) {
    const fp = getOrCreate(fav.userId);
    const existing = fp.artists.get(fav.artistId);
    if (existing) {
      existing.sources.add('taste_profile');
    } else {
      fp.artists.set(fav.artistId, {
        artistName: fav.artist.name,
        sources: new Set(['taste_profile']),
      });
    }
  }

  // Add collection artists + album IDs
  for (const ca of collectionAlbums) {
    const userId = ca.collection.userId;
    const fp = getOrCreate(userId);
    fp.albumIds.add(ca.albumId);

    for (const aa of ca.album.artists) {
      const existing = fp.artists.get(aa.artistId);
      if (existing) {
        existing.sources.add('collections');
      } else {
        fp.artists.set(aa.artistId, {
          artistName: aa.artist.name,
          sources: new Set(['collections']),
        });
      }
    }
  }

  return fingerprints;
}

/**
 * Fetch fingerprint for a single user.
 */
async function fetchFingerprintForUser(
  userId: string
): Promise<UserFingerprint | null> {
  // Verify user exists and is not deleted
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true },
  });
  if (!user) return null;

  const fp: UserFingerprint = {
    userId,
    artists: new Map(),
    albumIds: new Set(),
  };

  // Taste-profile artists
  const favoriteArtists = await prisma.userFavoriteArtist.findMany({
    where: { userId },
    select: {
      artistId: true,
      artist: { select: { name: true } },
    },
  });

  for (const fav of favoriteArtists) {
    const existing = fp.artists.get(fav.artistId);
    if (existing) {
      existing.sources.add('taste_profile');
    } else {
      fp.artists.set(fav.artistId, {
        artistName: fav.artist.name,
        sources: new Set(['taste_profile']),
      });
    }
  }

  // Collection artists + album IDs
  const collectionAlbums = await prisma.collectionAlbum.findMany({
    where: { collection: { userId } },
    include: {
      album: {
        include: {
          artists: {
            select: {
              artistId: true,
              artist: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  for (const ca of collectionAlbums) {
    fp.albumIds.add(ca.albumId);
    for (const aa of ca.album.artists) {
      const existing = fp.artists.get(aa.artistId);
      if (existing) {
        existing.sources.add('collections');
      } else {
        fp.artists.set(aa.artistId, {
          artistName: aa.artist.name,
          sources: new Set(['collections']),
        });
      }
    }
  }

  return fp;
}

// --------------------------------------------------------------------------
// Scoring
// --------------------------------------------------------------------------

interface MatchResult {
  matchedUserId: string;
  score: number;
  sharedContext: SharedContextEntry[];
}

/**
 * Compute match scores between a target user and all other users.
 * Returns the top N matches sorted by score descending.
 */
function computeMatchesForUser(
  target: UserFingerprint,
  allFingerprints: Map<string, UserFingerprint>
): MatchResult[] {
  const results: MatchResult[] = [];

  for (const [otherUserId, other] of allFingerprints) {
    // Skip self-match
    if (otherUserId === target.userId) continue;

    let score = 0;
    const sharedArtists: SharedContextEntry[] = [];

    // Check artist overlaps
    for (const [artistId, targetInfo] of target.artists) {
      const otherInfo = other.artists.get(artistId);
      if (!otherInfo) continue;

      // Determine which sources are shared
      const sharedSources: ('taste_profile' | 'collections')[] = [];

      // Both have this artist in taste_profile
      if (
        targetInfo.sources.has('taste_profile') &&
        otherInfo.sources.has('taste_profile')
      ) {
        score += POINTS.TASTE_PROFILE_ARTIST;
        sharedSources.push('taste_profile');
      }

      // Both have this artist in collections
      if (
        targetInfo.sources.has('collections') &&
        otherInfo.sources.has('collections')
      ) {
        score += POINTS.COLLECTION_ARTIST;
        sharedSources.push('collections');
      }

      // Cross-source overlap: one user has it in taste_profile, the other in collections
      // Still a meaningful overlap — score at the lower rate, label with the strongest shared signal
      if (sharedSources.length === 0) {
        score += POINTS.COLLECTION_ARTIST;
        // Pick the strongest signal: if either side has it as a favorite, call it taste_profile
        if (
          targetInfo.sources.has('taste_profile') ||
          otherInfo.sources.has('taste_profile')
        ) {
          sharedSources.push('taste_profile');
        } else {
          sharedSources.push('collections');
        }
      }

      sharedArtists.push({
        artistId,
        artistName: targetInfo.artistName,
        sources: sharedSources,
      });
    }

    // Check exact album overlaps (bonus points)
    if (target.albumIds.size > 0 && other.albumIds.size > 0) {
      for (const albumId of target.albumIds) {
        if (other.albumIds.has(albumId)) {
          score += POINTS.SHARED_ALBUM_BONUS;
        }
      }
    }

    if (score > 0) {
      results.push({
        matchedUserId: otherUserId,
        score,
        sharedContext: sharedArtists,
      });
    }
  }

  // Sort descending by score, take top N
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, MAX_MATCHES_PER_USER);
}

// --------------------------------------------------------------------------
// Persistence
// --------------------------------------------------------------------------

/**
 * Persist taste matches for a single user: delete old matches and insert new ones.
 */
async function persistMatchesForUser(
  userId: string,
  matches: MatchResult[]
): Promise<void> {
  const now = new Date();

  await prisma.$transaction([
    prisma.tasteMatch.deleteMany({ where: { userId } }),
    ...matches.map(m =>
      prisma.tasteMatch.create({
        data: {
          userId,
          matchedUserId: m.matchedUserId,
          score: m.score,
          sharedContext: m.sharedContext as unknown as Prisma.InputJsonValue,
          computedAt: now,
        },
      })
    ),
  ]);
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

/**
 * Compute taste matches for ALL users. Fetches all data upfront, computes
 * pairwise scores in memory, and stores the top 15 matches per user.
 */
export async function computeAllTasteMatches(): Promise<void> {
  logger.info({ module: 'taste-match' }, 'Fetching user fingerprints');
  const fingerprints = await fetchAllFingerprints();
  logger.info({ module: 'taste-match', userCount: fingerprints.size }, 'Computing taste matches');

  let processed = 0;

  for (const [userId, fp] of fingerprints) {
    // Skip users with no artists at all (nothing to match on)
    if (fp.artists.size === 0) continue;

    const matches = computeMatchesForUser(fp, fingerprints);

    if (matches.length > 0) {
      await persistMatchesForUser(userId, matches);
    } else {
      // Clear any stale matches if user no longer has overlaps
      await prisma.tasteMatch.deleteMany({ where: { userId } });
    }

    processed++;
    if (processed % 50 === 0) {
      logger.debug({ module: 'taste-match', processed, total: fingerprints.size }, 'Processing taste matches');
    }
  }

  logger.info({ module: 'taste-match', processed }, 'Taste match computation complete');
}

/**
 * Compute taste matches for a single user against all other users.
 * Useful for targeted recomputes after a user updates their profile or collections.
 */
export async function computeTasteMatchesForUser(
  userId: string
): Promise<void> {
  logger.info({ module: 'taste-match', userId }, 'Computing matches for user');

  const targetFp = await fetchFingerprintForUser(userId);
  if (!targetFp) {
    logger.debug({ module: 'taste-match', userId }, 'User not found or deleted, skipping');
    return;
  }

  if (targetFp.artists.size === 0 && targetFp.albumIds.size === 0) {
    logger.debug({ module: 'taste-match', userId }, 'User has no artists or albums, clearing matches');
    await prisma.tasteMatch.deleteMany({ where: { userId } });
    return;
  }

  // Fetch all other users' fingerprints to compare against
  const allFingerprints = await fetchAllFingerprints();

  const matches = computeMatchesForUser(targetFp, allFingerprints);

  if (matches.length > 0) {
    await persistMatchesForUser(userId, matches);
  } else {
    await prisma.tasteMatch.deleteMany({ where: { userId } });
  }

  logger.info({ module: 'taste-match', userId, matchCount: matches.length, topScore: matches[0]?.score ?? 0 }, 'Stored taste matches for user');
}
