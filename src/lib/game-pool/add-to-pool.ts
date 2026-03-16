// src/lib/game-pool/add-to-pool.ts
// Shared business logic for adding albums to the curated challenge pool.

import { Prisma, PrismaClient } from '@prisma/client';
import { GraphQLError } from 'graphql';

import { validateEligibility } from './eligibility';

/**
 * The return shape from addAlbumToPool — a curatedChallenge with nested album+artists.
 */
export type CuratedChallengeWithAlbum = Awaited<
  ReturnType<typeof addAlbumToPool>
>;

/**
 * Add an album to the curated challenge pool.
 *
 * This is the single source of truth for pool addition logic. Both
 * `addCuratedChallenge` and `addExternalAlbumToPool` delegate here.
 *
 * Steps:
 *   1. Fetch album with eligibility-relevant fields
 *   2. Validate eligibility (cloudflareImageId, releaseDate, artists)
 *   3. Check for duplicates in the curated list
 *   4. Transaction: set gameStatus = APPROVED + create curatedChallenge
 *   5. Return the created entry with album and artists included
 *
 * @throws GraphQLError if album not found, ineligible, or already in pool
 */
export async function addAlbumToPool(
  prisma: PrismaClient,
  albumId: string,
  options?: { pinnedDate?: Date | null }
) {
  // 1. Fetch album with eligibility fields
  const album = await prisma.album.findUnique({
    where: { id: albumId },
    select: {
      id: true,
      title: true,
      cloudflareImageId: true,
      releaseDate: true,
      gameStatus: true,
      artists: { select: { artistId: true } },
    },
  });

  if (!album) {
    throw new GraphQLError('Album not found');
  }

  // 2. Validate eligibility
  const eligibility = validateEligibility(album, album.artists.length > 0);
  if (!eligibility.eligible) {
    throw new GraphQLError(
      eligibility.reason || 'Album is not eligible for the game pool'
    );
  }

  // 3. Check for duplicates
  const existing = await prisma.curatedChallenge.findFirst({
    where: { albumId },
  });

  if (existing) {
    throw new GraphQLError(
      `"${album.title}" is already in the curated challenge list`
    );
  }

  // 4. Transaction: set APPROVED + create curated entry
  const pinnedDate = options?.pinnedDate ?? null;

  const entry = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // Set gameStatus to APPROVED (idempotent if already APPROVED)
      await tx.album.update({
        where: { id: albumId },
        data: { gameStatus: 'APPROVED' },
      });

      return tx.curatedChallenge.create({
        data: {
          albumId,
          pinnedDate,
        },
        include: {
          album: {
            include: {
              artists: { include: { artist: true } },
            },
          },
        },
      });
    }
  );

  return entry;
}
