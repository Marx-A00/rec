// src/lib/artists/find-or-create.ts
// Unified artist find-or-create helper used by all 13 creation sites

import chalk from 'chalk';
import type { Artist } from '@prisma/client';

import { JOB_TYPES, PRIORITY_TIERS } from '@/lib/queue/jobs';
import type { CacheArtistImageJobData } from '@/lib/queue/jobs';
import { createLlamaLogger } from '@/lib/logging/llama-logger';
import { prisma as globalPrisma } from '@/lib/prisma';

import type {
  FindOrCreateArtistOptions,
  FindOrCreateArtistResult,
} from './types';

// ============================================================================
// Main function
// ============================================================================

/**
 * Find an existing artist or create a new one with unified dedup logic.
 *
 * Dedup order (first match wins):
 *   1. musicbrainzId (unique index)
 *   2. spotifyId (unique index)
 *   3. deezerId (unique index)
 *   4. discogsId (via findFirst)
 *   5. name (case-insensitive, via findFirst)
 *
 * After finding an existing artist, missing external IDs from the caller
 * are backfilled onto the record (unless `backfillExternalIds: false`).
 *
 * Side effects (enrichment queueing, LlamaLog) are only run when:
 *   - The artist was newly created
 *   - We are NOT inside a transaction (`insideTransaction: false`)
 *
 * For transactional paths, call `runPostCreateSideEffects()` after the
 * transaction commits.
 */
export async function findOrCreateArtist(
  options: FindOrCreateArtistOptions
): Promise<FindOrCreateArtistResult> {
  const {
    db,
    identity,
    fields = {},
    enrichment = 'queue-check',
    insideTransaction = false,
    backfillExternalIds = true,
    caller,
  } = options;

  // ------------------------------------------------------------------
  // 1. Dedup lookup: musicbrainzId → spotifyId → discogsId → name
  // ------------------------------------------------------------------
  let artist: Artist | null = null;
  let dedupMethod: FindOrCreateArtistResult['dedupMethod'] = null;

  if (identity.musicbrainzId) {
    artist = await db.artist.findUnique({
      where: { musicbrainzId: identity.musicbrainzId },
    });
    if (artist) dedupMethod = 'musicbrainzId';
  }

  if (!artist && identity.spotifyId) {
    artist = await db.artist.findUnique({
      where: { spotifyId: identity.spotifyId },
    });
    if (artist) dedupMethod = 'spotifyId';
  }

  if (!artist && identity.deezerId) {
    artist = await db.artist.findUnique({
      where: { deezerId: identity.deezerId },
    });
    if (artist) dedupMethod = 'deezerId';
  }

  if (!artist && identity.discogsId) {
    artist = await db.artist.findFirst({
      where: { discogsId: identity.discogsId },
    });
    if (artist) dedupMethod = 'discogsId';
  }

  if (!artist) {
    artist = await db.artist.findFirst({
      where: {
        name: { equals: identity.name, mode: 'insensitive' },
      },
    });
    if (artist) dedupMethod = 'name';
  }

  // ------------------------------------------------------------------
  // 2. Found existing → backfill missing external IDs
  // ------------------------------------------------------------------
  if (artist) {
    if (backfillExternalIds) {
      const updates: Record<string, string> = {};
      if (identity.musicbrainzId && !artist.musicbrainzId) {
        updates.musicbrainzId = identity.musicbrainzId;
      }
      if (identity.spotifyId && !artist.spotifyId) {
        updates.spotifyId = identity.spotifyId;
      }
      if (identity.deezerId && !artist.deezerId) {
        updates.deezerId = identity.deezerId;
      }
      if (identity.discogsId && !artist.discogsId) {
        updates.discogsId = identity.discogsId;
      }

      if (Object.keys(updates).length > 0) {
        artist = await db.artist.update({
          where: { id: artist.id },
          data: updates,
        });
        console.log(
          chalk.magenta(
            `[ARTIST-HELPER] BACKFILLED ${Object.keys(updates).join(', ')} on "${artist.name}" via ${caller}`
          )
        );
      }
    }

    console.log(
      chalk.magenta(
        `[ARTIST-HELPER] FOUND "${artist.name}" via ${caller} (dedup: ${dedupMethod})`
      )
    );
    return { artist, created: false, dedupMethod };
  }

  // ------------------------------------------------------------------
  // 3. Not found → create new artist
  // ------------------------------------------------------------------
  artist = await db.artist.create({
    data: {
      name: identity.name,
      musicbrainzId: identity.musicbrainzId ?? undefined,
      spotifyId: identity.spotifyId ?? undefined,
      deezerId: identity.deezerId ?? undefined,
      discogsId: identity.discogsId ?? undefined,
      imageUrl: fields.imageUrl ?? undefined,
      cloudflareImageId: fields.cloudflareImageId ?? undefined,
      source: fields.source, // undefined → Prisma uses schema default (MUSICBRAINZ)
      dataQuality: fields.dataQuality ?? 'LOW',
      enrichmentStatus: fields.enrichmentStatus ?? 'PENDING',
      lastEnriched: fields.lastEnriched ?? null,
      biography: fields.biography ?? undefined,
      genres: fields.genres ?? undefined,
      formedYear: fields.formedYear ?? undefined,
      countryCode: fields.countryCode ?? undefined,
      area: fields.area ?? undefined,
      artistType: fields.artistType ?? undefined,
      submittedBy: fields.submittedBy ?? undefined,
    },
  });

  console.log(
    chalk.magenta(
      `[ARTIST-HELPER] CREATED "${artist.name}" via ${caller} (enrichment: ${enrichment})`
    )
  );

  // ------------------------------------------------------------------
  // 4. Run side effects if not in a transaction
  // ------------------------------------------------------------------
  if (!insideTransaction && enrichment !== 'none') {
    await runPostCreateSideEffects(artist, options).catch(err =>
      console.warn(
        chalk.magenta(
          `[ARTIST-HELPER] Side effect error for "${artist!.name}" (${artist!.id}):`
        ),
        err
      )
    );
  }

  return { artist, created: true, dedupMethod: null };
}

// ============================================================================
// Post-create side effects (enrichment + logging)
// ============================================================================

/**
 * Run deferred side effects after an artist is created.
 *
 * Call this AFTER a transaction commits when using `insideTransaction: true`.
 * It handles:
 *   - Enrichment queueing (queue-check or inline-fetch)
 *   - LlamaLog creation logging
 *
 * Errors are caught and logged as warnings — they never throw.
 *
 * WHY THIS EXISTS:
 * Prisma doesn't support `onCommit` callbacks for interactive transactions.
 * If we queued BullMQ jobs or called external APIs inside a $transaction,
 * a rollback would leave orphaned jobs for non-existent artists. So
 * transactional callers set `enrichment: 'none'` + `insideTransaction: true`,
 * collect newly created artists, and call this function after commit.
 *
 * If Prisma ever adds native onCommit support, this could be inlined.
 * See: https://github.com/prisma/prisma/issues/11920
 */
export async function runPostCreateSideEffects(
  artist: Artist,
  options: Pick<
    FindOrCreateArtistOptions,
    | 'enrichment'
    | 'queueCheckOptions'
    | 'inlineFetchOptions'
    | 'logging'
    | 'caller'
  >
): Promise<void> {
  const {
    enrichment = 'queue-check',
    queueCheckOptions,
    inlineFetchOptions,
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

      await queue.addJob(
        JOB_TYPES.CHECK_ARTIST_ENRICHMENT,
        {
          artistId: artist.id,
          source: queueCheckOptions.source,
          priority: queueCheckOptions.priority ?? 'medium',
          requestId: queueCheckOptions.requestId,
          parentJobId: queueCheckOptions.parentJobId,
        },
        {
          priority:
            queueCheckOptions.queuePriority ?? PRIORITY_TIERS.ENRICHMENT,
          attempts: 3,
        }
      );

      console.log(
        chalk.magenta(
          `[ARTIST-HELPER] Queued CHECK_ARTIST_ENRICHMENT for "${artist.name}" via ${caller}`
        )
      );
    }

    // ------------------------------------------------------------------
    // Enrichment: inline-fetch strategy
    // ------------------------------------------------------------------
    if (enrichment === 'inline-fetch') {
      const { tryFetchSpotifyArtistImage } = await import(
        '@/lib/spotify/artist-image-helper'
      );
      const imageResult = await tryFetchSpotifyArtistImage(artist.name);

      if (imageResult) {
        // Update artist with fetched image + spotifyId
        await globalPrisma.artist.update({
          where: { id: artist.id },
          data: {
            imageUrl: imageResult.imageUrl,
            spotifyId: artist.spotifyId || imageResult.spotifyId,
          },
        });

        console.log(
          chalk.magenta(
            `[ARTIST-HELPER] Set image for "${artist.name}" from Spotify via ${caller}`
          )
        );

        // Queue Cloudflare caching
        const { getMusicBrainzQueue } = await import('@/lib/queue');
        const queue = getMusicBrainzQueue();
        const cacheJobData: CacheArtistImageJobData = {
          artistId: artist.id,
          requestId: inlineFetchOptions?.requestId,
          parentJobId: inlineFetchOptions?.parentJobId,
        };

        await queue.addJob(JOB_TYPES.CACHE_ARTIST_IMAGE, cacheJobData, {
          priority: PRIORITY_TIERS.ENRICHMENT,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        });
      }
    }

    // ------------------------------------------------------------------
    // LlamaLog logging
    // ------------------------------------------------------------------
    if (logging) {
      const llamaLogger = createLlamaLogger(globalPrisma);
      await llamaLogger.logEnrichment({
        entityType: 'ARTIST',
        entityId: artist.id,
        artistId: artist.id,
        operation: logging.operation,
        category: logging.category ?? 'CREATED',
        sources: logging.sources,
        status: 'SUCCESS',
        fieldsEnriched: Object.entries({
          name: artist.name,
          musicbrainzId: artist.musicbrainzId,
          spotifyId: artist.spotifyId,
          deezerId: artist.deezerId,
          discogsId: artist.discogsId,
          imageUrl: artist.imageUrl,
          countryCode: artist.countryCode,
          area: artist.area,
        })
          .filter(([, v]) => v != null)
          .map(([k]) => k),
        dataQualityAfter: artist.dataQuality,
        parentJobId: logging.parentJobId ?? null,
        rootJobId: logging.rootJobId ?? null,
        isRootJob: logging.isRootJob ?? !logging.parentJobId,
        userId: logging.userId ?? null,
        metadata: logging.metadata,
      });
    }
  } catch (error) {
    console.warn(
      chalk.magenta(
        `[ARTIST-HELPER] Side effect error for artist ${artist.id}:`
      ),
      error
    );
  }
}
