// src/lib/albums/find-or-create.ts
// Unified album find-or-create helper with 4-level dedup, backfill, and enrichment.
//
// Dedup order (first match wins):
//   1. musicbrainzId (unique index)
//   2. spotifyId (unique index)
//   3. deezerId (unique index)
//   4. title + primary artist + release year (±1 year fuzzy)
//   5. title + primary artist (no year)
//
// After finding an existing album, missing external IDs are backfilled.
// Side effects (enrichment queueing, LlamaLog) only run outside transactions.

import chalk from 'chalk';
import type { Album, Prisma, LlamaLogCategory } from '@prisma/client';

import { getInitialQuality } from '@/lib/db';
import { JOB_TYPES, PRIORITY_TIERS } from '@/lib/queue/jobs';
import type {
  CheckAlbumEnrichmentJobData,
  CacheAlbumCoverArtJobData,
} from '@/lib/queue/jobs';
import { createLlamaLogger } from '@/lib/logging/llama-logger';
import { prisma as globalPrisma } from '@/lib/prisma';

import type {
  FindOrCreateAlbumOptions,
  FindOrCreateAlbumResult,
  AlbumDedupMethod,
} from './types';

// ============================================================================
// Main function
// ============================================================================

/**
 * Find an existing album or create a new one with unified dedup logic.
 *
 * Dedup order (first match wins):
 *   1. musicbrainzId (unique index)
 *   2. spotifyId (unique index)
 *   3. deezerId (unique index)
 *   4. title + primary artist name + release year (±1 year)
 *   5. title + primary artist name (case-insensitive)
 *
 * After finding an existing album, missing external IDs from the caller
 * are backfilled onto the record (unless `backfillExternalIds: false`).
 *
 * Side effects (enrichment queueing, LlamaLog) are only run when:
 *   - The album was newly created
 *   - We are NOT inside a transaction (`insideTransaction: false`)
 *
 * For transactional paths, call `runPostCreateSideEffects()` after the
 * transaction commits.
 */
export async function findOrCreateAlbum(
  options: FindOrCreateAlbumOptions
): Promise<FindOrCreateAlbumResult> {
  const {
    db,
    identity,
    fields = {},
    artists = [],
    enrichment = 'queue-check',
    insideTransaction = false,
    backfillExternalIds = true,
    caller,
  } = options;

  let album: Album | null = null;
  let dedupMethod: AlbumDedupMethod = null;

  // ------------------------------------------------------------------
  // 1. Dedup: musicbrainzId (unique index)
  // ------------------------------------------------------------------
  if (identity.musicbrainzId) {
    album = await db.album.findUnique({
      where: { musicbrainzId: identity.musicbrainzId },
    });
    if (album) dedupMethod = 'musicbrainzId';
  }

  // ------------------------------------------------------------------
  // 2. Dedup: spotifyId (unique index)
  // ------------------------------------------------------------------
  if (!album && identity.spotifyId) {
    album = await db.album.findUnique({
      where: { spotifyId: identity.spotifyId },
    });
    if (album) dedupMethod = 'spotifyId';
  }

  // ------------------------------------------------------------------
  // 3. Dedup: deezerId (unique index)
  // ------------------------------------------------------------------
  if (!album && identity.deezerId) {
    album = await db.album.findUnique({
      where: { deezerId: identity.deezerId },
    });
    if (album) dedupMethod = 'deezerId';
  }

  // ------------------------------------------------------------------
  // 4. Dedup: title + primary artist + release year (±1 year)
  // ------------------------------------------------------------------
  if (!album && identity.primaryArtistName && identity.releaseYear) {
    const yearStart = new Date(identity.releaseYear - 1, 0, 1);
    const yearEnd = new Date(identity.releaseYear + 2, 0, 1);

    album = await db.album.findFirst({
      where: {
        title: { equals: identity.title, mode: 'insensitive' },
        artists: {
          some: {
            artist: {
              name: { equals: identity.primaryArtistName, mode: 'insensitive' },
            },
          },
        },
        releaseDate: { gte: yearStart, lt: yearEnd },
      },
    });
    if (album) dedupMethod = 'title+artist+year';
  }

  // ------------------------------------------------------------------
  // 5. Dedup: title + primary artist (no year constraint)
  // ------------------------------------------------------------------
  if (!album && identity.primaryArtistName) {
    album = await db.album.findFirst({
      where: {
        title: { equals: identity.title, mode: 'insensitive' },
        artists: {
          some: {
            artist: {
              name: { equals: identity.primaryArtistName, mode: 'insensitive' },
            },
          },
        },
      },
    });
    if (album) dedupMethod = 'title+artist';
  }

  // ------------------------------------------------------------------
  // Found → backfill external IDs and return
  // ------------------------------------------------------------------
  if (album) {
    if (backfillExternalIds) {
      const updates: Record<string, string> = {};

      if (identity.musicbrainzId && !album.musicbrainzId) {
        updates.musicbrainzId = identity.musicbrainzId;
      }
      if (identity.spotifyId && !album.spotifyId) {
        updates.spotifyId = identity.spotifyId;
      }
      if (identity.deezerId && !album.deezerId) {
        updates.deezerId = identity.deezerId;
      }
      if (identity.discogsId && !album.discogsId) {
        updates.discogsId = identity.discogsId;
      }

      if (Object.keys(updates).length > 0) {
        album = await db.album.update({
          where: { id: album.id },
          data: updates,
        });
        console.log(
          chalk.cyan(
            `[ALBUM-HELPER] Backfilled ${Object.keys(updates).join(', ')} on "${album.title}" via ${caller}`
          )
        );
      }
    }

    console.log(
      chalk.cyan(
        `[ALBUM-HELPER] FOUND "${album.title}" via ${caller} (dedup: ${dedupMethod})`
      )
    );
    return { album, created: false, dedupMethod, artistsCreated: 0 };
  }

  // ------------------------------------------------------------------
  // 5. Not found → create new album
  // ------------------------------------------------------------------
  album = await db.album.create({
    data: {
      title: identity.title,
      musicbrainzId: identity.musicbrainzId ?? undefined,
      spotifyId: identity.spotifyId ?? undefined,
      deezerId: identity.deezerId ?? undefined,
      discogsId: identity.discogsId ?? undefined,
      releaseDate: fields.releaseDate ?? undefined,
      releaseType: fields.releaseType ?? undefined,
      releaseStatus: fields.releaseStatus ?? undefined,
      trackCount: fields.trackCount ?? undefined,
      coverArtUrl: fields.coverArtUrl ?? undefined,
      source: fields.source,
      sourceUrl: fields.sourceUrl ?? undefined,
      spotifyUrl: fields.spotifyUrl ?? undefined,
      secondaryTypes: fields.secondaryTypes ?? undefined,
      metadata: fields.metadata
        ? (fields.metadata as Prisma.InputJsonValue)
        : undefined,
      ...getInitialQuality({ musicbrainzId: identity.musicbrainzId }),
    },
  });

  console.log(
    chalk.cyan(
      `[ALBUM-HELPER] CREATED "${album.title}" via ${caller} (enrichment: ${enrichment})`
    )
  );

  // ------------------------------------------------------------------
  // 6. Create artist associations
  // ------------------------------------------------------------------
  let artistsCreatedCount = 0;
  if (artists.length > 0) {
    const { findOrCreateArtist } = await import('@/lib/artists');

    for (let i = 0; i < artists.length; i++) {
      const artistInput = artists[i];
      const { artist: dbArtist, created: artistWasCreated } =
        await findOrCreateArtist({
          db,
          identity: {
            name: artistInput.name,
            musicbrainzId: artistInput.musicbrainzId ?? undefined,
            spotifyId: artistInput.spotifyId ?? undefined,
            deezerId: artistInput.deezerId ?? undefined,
            discogsId: artistInput.discogsId ?? undefined,
          },
          fields: {
            source: fields.source ?? ('USER_SUBMITTED' as const),
            ...getInitialQuality({
              musicbrainzId: artistInput.musicbrainzId,
            }),
          },
          enrichment: 'none', // Artist enrichment handled separately
          insideTransaction,
          caller: `${caller}:album-artist`,
        });

      if (artistWasCreated) {
        artistsCreatedCount++;
      }

      // Upsert to handle potential duplicates
      const role = artistInput.role ?? 'PRIMARY';
      await db.albumArtist.upsert({
        where: {
          albumId_artistId_role: {
            albumId: album.id,
            artistId: dbArtist.id,
            role,
          },
        },
        create: {
          albumId: album.id,
          artistId: dbArtist.id,
          role,
          position: artistInput.position ?? i,
        },
        update: {},
      });
    }
  }

  // ------------------------------------------------------------------
  // 7. Run side effects if not in a transaction
  // ------------------------------------------------------------------
  if (!insideTransaction && enrichment !== 'none') {
    await runPostCreateSideEffects(album, options).catch(err =>
      console.warn(
        chalk.cyan(
          `[ALBUM-HELPER] Side effect error for "${album!.title}" (${album!.id}):`
        ),
        err
      )
    );
  }

  return {
    album,
    created: true,
    dedupMethod: null,
    artistsCreated: artistsCreatedCount,
  };
}

// ============================================================================
// Post-create side effects (enrichment + logging)
// ============================================================================

/**
 * Run deferred side effects after an album is created.
 *
 * Call this AFTER a transaction commits when using `insideTransaction: true`.
 * It handles:
 *   - Enrichment queueing (CHECK_ALBUM_ENRICHMENT + CACHE_ALBUM_COVER_ART)
 *   - LlamaLog creation logging
 *
 * Errors are caught and logged as warnings — they never throw.
 *
 * WHY THIS EXISTS:
 * Prisma doesn't support `onCommit` callbacks for interactive transactions.
 * If we queued BullMQ jobs inside a $transaction, a rollback would leave
 * orphaned jobs for non-existent albums. So transactional callers set
 * `enrichment: 'none'` + `insideTransaction: true`, collect newly created
 * albums, and call this function after commit.
 */
export async function runPostCreateSideEffects(
  album: Album,
  options: Pick<
    FindOrCreateAlbumOptions,
    'enrichment' | 'queueCheckOptions' | 'logging' | 'caller'
  >
): Promise<void> {
  const {
    enrichment = 'queue-check',
    queueCheckOptions,
    logging,
    caller,
  } = options;

  try {
    // ------------------------------------------------------------------
    // Enrichment: queue-check strategy
    // ------------------------------------------------------------------
    if (enrichment === 'queue-check' && queueCheckOptions) {
      const { getMusicBrainzQueue } = await import('@/lib/queue');
      const queue = getMusicBrainzQueue();

      // Queue enrichment check
      const enrichmentData: CheckAlbumEnrichmentJobData = {
        albumId: album.id,
        source: queueCheckOptions.source,
        priority: queueCheckOptions.priority ?? 'medium',
        requestId: queueCheckOptions.requestId,
        parentJobId: queueCheckOptions.parentJobId,
      };

      await queue.addJob(JOB_TYPES.CHECK_ALBUM_ENRICHMENT, enrichmentData, {
        priority: PRIORITY_TIERS.ENRICHMENT,
        attempts: 3,
      });

      console.log(
        chalk.cyan(
          `[ALBUM-HELPER] Queued CHECK_ALBUM_ENRICHMENT for "${album.title}" via ${caller}`
        )
      );

      // Queue cover art caching
      if (album.coverArtUrl) {
        const cacheData: CacheAlbumCoverArtJobData = {
          albumId: album.id,
          requestId: queueCheckOptions.requestId,
          parentJobId: queueCheckOptions.parentJobId,
        };

        await queue.addJob(JOB_TYPES.CACHE_ALBUM_COVER_ART, cacheData, {
          priority: PRIORITY_TIERS.ENRICHMENT,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        });

        console.log(
          chalk.cyan(
            `[ALBUM-HELPER] Queued CACHE_ALBUM_COVER_ART for "${album.title}" via ${caller}`
          )
        );
      }
    }

    // ------------------------------------------------------------------
    // LlamaLog logging
    // ------------------------------------------------------------------
    if (logging) {
      const llamaLogger = createLlamaLogger(globalPrisma);
      await llamaLogger.logEnrichment({
        entityType: 'ALBUM',
        entityId: album.id,
        albumId: album.id,
        operation: logging.operation,
        category: (logging.category ?? 'CREATED') as LlamaLogCategory,
        sources: logging.sources ?? [],
        status: 'SUCCESS',
        fieldsEnriched: Object.entries({
          title: album.title,
          musicbrainzId: album.musicbrainzId,
          spotifyId: album.spotifyId,
          deezerId: album.deezerId,
          discogsId: album.discogsId,
          coverArtUrl: album.coverArtUrl,
          releaseDate: album.releaseDate,
          releaseType: album.releaseType,
          trackCount: album.trackCount,
        })
          .filter(([, v]) => v != null)
          .map(([k]) => k),
        dataQualityAfter: album.dataQuality,
        jobId: logging.jobId ?? undefined,
        parentJobId: logging.parentJobId ?? null,
        rootJobId: logging.rootJobId ?? null,
        isRootJob: logging.isRootJob ?? !logging.parentJobId,
        userId: logging.userId ?? null,
        metadata: logging.metadata,
      });
    }
  } catch (error) {
    console.warn(
      chalk.cyan(`[ALBUM-HELPER] Side effect error for album ${album.id}:`),
      error
    );
  }
}
