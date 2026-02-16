import chalk from 'chalk';
import { GraphQLError } from 'graphql';

import { createCollectionAddActivity } from '@/lib/activities';
import { findOrCreateAlbum } from '@/lib/albums';
import { createLlamaLogger } from '@/lib/logging/llama-logger';
import { getMusicBrainzQueue, JOB_TYPES } from '@/lib/queue';
import type {
  CacheAlbumCoverArtJobData,
  CheckAlbumEnrichmentJobData,
  CheckArtistEnrichmentJobData,
} from '@/lib/queue/jobs';

import type {
  AddAlbumToCollectionOptions,
  AddAlbumToCollectionResult,
} from './types';

/**
 * Add an album to a collection with full transaction safety.
 *
 * Handles:
 * - Collection ownership verification
 * - Album resolution (existing or create via findOrCreateAlbum)
 * - Duplicate collection entry detection (returns existing instead of throwing)
 * - Activity creation inside transaction
 * - Post-transaction LlamaLog provenance chain
 * - Post-transaction enrichment queueing (only for newly created albums/artists)
 */
export async function addAlbumToCollection(
  options: AddAlbumToCollectionOptions
): Promise<AddAlbumToCollectionResult> {
  const {
    db,
    userId,
    collectionId,
    album,
    personalRating,
    personalNotes,
    position = 0,
    caller,
  } = options;

  const rootJobId = `collection-add-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  let albumCreated = false;
  const createdArtists: Array<{ id: string; name: string }> = [];

  const collectionAlbum = await db.$transaction(async tx => {
    // 1. Verify collection ownership
    const collection = await tx.collection.findFirst({
      where: { id: collectionId, userId },
    });
    if (!collection) {
      throw new GraphQLError('Collection not found or access denied');
    }

    // 2. Resolve album ID
    let finalAlbumId: string;

    if (album.type === 'existing') {
      const existingAlbum = await tx.album.findUnique({
        where: { id: album.albumId },
      });
      if (!existingAlbum) {
        throw new GraphQLError('Album not found');
      }
      finalAlbumId = album.albumId;
    } else {
      const { albumData } = album;
      const primaryArtistName = albumData.artists?.[0]?.artistName;
      const releaseDate = albumData.releaseDate
        ? new Date(albumData.releaseDate)
        : null;

      const result = await findOrCreateAlbum({
        db: tx,
        identity: {
          title: albumData.title,
          musicbrainzId: albumData.musicbrainzId ?? undefined,
          primaryArtistName: primaryArtistName ?? undefined,
          releaseYear: releaseDate?.getFullYear() ?? undefined,
        },
        fields: {
          releaseDate,
          releaseType: albumData.albumType || 'ALBUM',
          trackCount: albumData.totalTracks ?? undefined,
          coverArtUrl: albumData.coverImageUrl ?? undefined,
        },
        artists: (albumData.artists || [])
          .filter(a => a.artistName)
          .map((a, i) => ({
            name: a.artistName!,
            role: (a.role as 'PRIMARY' | 'FEATURED') || 'PRIMARY',
            position: i,
          })),
        enrichment: 'none',
        insideTransaction: true,
        caller,
      });

      finalAlbumId = result.album.id;
      albumCreated = result.created;

      // Track newly created artists for post-transaction enrichment
      if (result.created) {
        const albumArtists = await tx.albumArtist.findMany({
          where: { albumId: result.album.id },
          include: { artist: true },
        });
        for (const aa of albumArtists) {
          if (
            aa.artist.dataQuality === 'LOW' &&
            aa.artist.enrichmentStatus === 'PENDING'
          ) {
            createdArtists.push({ id: aa.artist.id, name: aa.artist.name });
          }
        }
      }
    }

    // 3. Check if album already in collection
    const existingEntry = await tx.collectionAlbum.findFirst({
      where: { collectionId, albumId: finalAlbumId },
      include: {
        album: {
          include: { artists: { include: { artist: true } } },
        },
      },
    });
    if (existingEntry) {
      return { ca: existingEntry, alreadyInCollection: true, collection };
    }

    // 4. Create collection album entry
    const ca = await tx.collectionAlbum.create({
      data: {
        collectionId,
        albumId: finalAlbumId,
        personalRating: personalRating ?? undefined,
        personalNotes: personalNotes,
        position,
      },
      include: {
        album: {
          include: { artists: { include: { artist: true } } },
        },
      },
    });

    // 5. Create activity record
    await createCollectionAddActivity({
      db: tx,
      userId,
      collectionAlbum: ca,
      collection,
    });

    return { ca, alreadyInCollection: false, collection };
  });

  const { ca, alreadyInCollection } = collectionAlbum;

  // ── Post-transaction side effects (non-blocking) ──

  // Log provenance chain
  const llamaLogger = createLlamaLogger(db);
  try {
    await llamaLogger.logEnrichment({
      entityType: 'ALBUM',
      entityId: ca.albumId,
      albumId: ca.albumId,
      operation: 'collection:album-added',
      category: 'USER_ACTION',
      sources: ['USER'],
      status: 'SUCCESS',
      fieldsEnriched: [],
      jobId: rootJobId,
      isRootJob: true,
      userId,
      metadata: {
        collectionId,
        collectionAlbumId: ca.id,
        albumCreated,
        artistsCreated: createdArtists.length,
      },
    });
  } catch (logError) {
    console.warn('[LlamaLogger] Failed to log collection add:', logError);
  }

  // Log artist:created for each new artist
  for (const artist of createdArtists) {
    try {
      await llamaLogger.logEnrichment({
        entityType: 'ARTIST',
        entityId: artist.id,
        artistId: artist.id,
        operation: 'artist:created',
        category: 'CREATED',
        sources: ['USER'],
        status: 'SUCCESS',
        fieldsEnriched: ['name'],
        jobId: `artist-created-${artist.id}`,
        parentJobId: rootJobId,
        rootJobId,
        isRootJob: false,
        userId,
        dataQualityAfter: 'LOW',
      });
    } catch (logError) {
      console.warn('[LlamaLogger] Failed to log artist creation:', logError);
    }
  }

  // Queue enrichment only for newly created albums/artists
  if (albumCreated) {
    try {
      const queue = getMusicBrainzQueue();

      const albumCheckData: CheckAlbumEnrichmentJobData = {
        albumId: ca.albumId,
        source: 'collection_add',
        priority: 'high',
        requestId: `collection-add-${ca.id}`,
        parentJobId: rootJobId,
      };
      await queue.addJob(JOB_TYPES.CHECK_ALBUM_ENRICHMENT, albumCheckData, {
        priority: 10,
        attempts: 3,
      });

      const cacheData: CacheAlbumCoverArtJobData = {
        albumId: ca.albumId,
        requestId: `cache-cover-${ca.id}`,
        parentJobId: rootJobId,
      };
      await queue.addJob(JOB_TYPES.CACHE_ALBUM_COVER_ART, cacheData, {
        priority: 5,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });

      for (const artist of createdArtists) {
        const artistCheckData: CheckArtistEnrichmentJobData = {
          artistId: artist.id,
          source: 'collection_add',
          priority: 'high',
          requestId: `collection-add-artist-${artist.id}`,
          parentJobId: rootJobId,
        };
        await queue.addJob(JOB_TYPES.CHECK_ARTIST_ENRICHMENT, artistCheckData, {
          priority: 10,
          attempts: 3,
        });
        console.log(
          chalk.magenta(
            `[TIER-3] Queued CHECK_ARTIST_ENRICHMENT for "${artist.name}" from ${caller}`
          )
        );
      }
    } catch (queueError) {
      console.warn('Failed to queue enrichment jobs:', queueError);
    }
  }

  return {
    collectionAlbum: ca,
    albumCreated,
    alreadyInCollection,
  };
}
