// src/lib/deezer/editorial-sync/mapper.ts
/**
 * Transforms Deezer editorial releases into database albums using the
 * shared findOrCreateAlbum helper.
 *
 * Handles:
 *   - Dedup via deezerId (unique index)
 *   - Creating new artist records when needed
 *   - Queueing enrichment for new albums
 *   - LlamaLog provenance tracking
 */

import type { Prisma } from '@prisma/client';

import { findOrCreateAlbum } from '@/lib/albums/find-or-create';
import { prisma } from '@/lib/prisma';

import type { DeezerEditorialRelease, DeezerEditorialSyncResult } from './types';

// ============================================================================
// Main processor
// ============================================================================

/**
 * Process an array of Deezer editorial releases into the database.
 *
 * Each release is processed independently — one failure doesn't block the rest.
 */
export async function processEditorialReleases(
  releases: DeezerEditorialRelease[],
  jobId?: string
): Promise<DeezerEditorialSyncResult> {
  const result: DeezerEditorialSyncResult = {
    success: false,
    albumsCreated: 0,
    albumsUpdated: 0,
    albumsSkipped: 0,
    artistsCreated: 0,
    errors: [],
    duration: 0,
  };

  const startTime = Date.now();

  for (const release of releases) {
    try {
      const releaseDate = release.release_date
        ? new Date(release.release_date)
        : undefined;
      const releaseYear = releaseDate?.getFullYear();

      // Metadata blob stored on the album record
      // jobId at top level is required for SyncJob.albums resolver lookup
      const albumMetadata: Record<string, unknown> = {
        jobId,
        syncSource: 'deezer_editorial',
        deezer: {
          release_id: release.id,
          artist_id: release.artist.id,
          synced_at: new Date().toISOString(),
        },
      };

      const { album, created, dedupMethod, artistsCreated } =
        await findOrCreateAlbum({
          db: prisma,
          identity: {
            title: release.title,
            deezerId: String(release.id),
            primaryArtistName: release.artist.name,
            releaseYear,
          },
          fields: {
            releaseDate,
            releaseType: release.type || 'album',
            coverArtUrl: release.cover_xl,
            source: 'DEEZER',
            sourceUrl: `https://www.deezer.com/album/${release.id}`,
            metadata: albumMetadata as Prisma.InputJsonValue as Record<
              string,
              unknown
            >,
          },
          artists: [
            {
              name: release.artist.name,
              deezerId: String(release.artist.id),
              role: 'PRIMARY' as const,
              position: 0,
            },
          ],
          enrichment: 'queue-check',
          queueCheckOptions: {
            source: 'deezer_editorial',
            priority: 'medium',
            requestId: `deezer_editorial_${jobId ?? Date.now()}`,
            parentJobId: jobId,
          },
          logging: {
            operation: 'deezer:sync-editorial-releases',
            category: 'CREATED',
            sources: ['DEEZER'],
            jobId: jobId ?? null,
          },
          caller: 'deezer-editorial-mapper',
        });

      // Tally results
      if (created) {
        result.albumsCreated++;
      } else if (dedupMethod) {
        result.albumsUpdated++;
      } else {
        result.albumsSkipped++;
      }

      result.artistsCreated += artistsCreated;

      // Suppress unused variable warning
      void album;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(
        `Failed to process "${release.title}": ${message}`
      );
    }
  }

  result.duration = Date.now() - startTime;
  result.success = result.errors.length === 0;

  return result;
}
