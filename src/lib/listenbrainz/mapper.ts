// src/lib/listenbrainz/mapper.ts
/**
 * Transforms ListenBrainz fresh releases into database albums using the
 * shared findOrCreateAlbum helper.
 *
 * Handles:
 *   - Dedup via MBID (musicbrainzId unique index)
 *   - Backfilling MBIDs onto existing albums found by title+artist match
 *   - Creating new artist records when needed
 *   - Queueing enrichment + cover art caching for new albums
 *   - LlamaLog provenance tracking
 */

import type { Prisma } from '@prisma/client';

import { findOrCreateAlbum } from '@/lib/albums/find-or-create';
import { prisma } from '@/lib/prisma';

import type { ListenBrainzFreshRelease, ListenBrainzSyncResult } from './types';

// ============================================================================
// Main processor
// ============================================================================

interface ProcessReleasesMetadata {
  jobId?: string;
  syncJobId?: string;
}

/**
 * Process an array of ListenBrainz releases into the database.
 *
 * Each release is processed independently — one failure doesn't block the rest.
 */
export async function processListenBrainzReleases(
  releases: ListenBrainzFreshRelease[],
  source: 'scheduled' | 'manual' | 'graphql',
  metadata: ProcessReleasesMetadata
): Promise<ListenBrainzSyncResult> {
  const result: ListenBrainzSyncResult = {
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
      // Build Cover Art Archive URL if available
      const coverArtUrl =
        release.caa_id && release.caa_release_mbid
          ? `https://coverartarchive.org/release/${release.caa_release_mbid}/${release.caa_id}-500.jpg`
          : undefined;

      // Parse release date
      const releaseDate = release.release_date
        ? new Date(release.release_date)
        : undefined;

      // Map primary type
      const releaseType = mapReleaseType(release.release_group_primary_type);

      // Metadata blob stored on the album record
      // jobId at top level is required for SyncJob.albums resolver lookup
      const albumMetadata: Record<string, unknown> = {
        jobId: metadata.jobId,
        syncSource: 'listenbrainz',
        listenbrainz: {
          release_mbid: release.release_mbid,
          release_group_mbid: release.release_group_mbid,
          artist_mbids: release.artist_mbids,
          listen_count: release.listen_count,
          tags: release.release_tags,
          synced_at: new Date().toISOString(),
        },
      };

      const { album, created, dedupMethod, artistsCreated } =
        await findOrCreateAlbum({
          db: prisma,
          identity: {
            title: release.release_name,
            musicbrainzId: release.release_mbid,
            primaryArtistName: release.artist_credit_name,
            releaseYear: releaseDate?.getFullYear(),
          },
          fields: {
            releaseDate,
            releaseType,
            coverArtUrl,
            source: 'LISTENBRAINZ',
            sourceUrl: `https://musicbrainz.org/release-group/${release.release_group_mbid}`,
            metadata: albumMetadata as Prisma.InputJsonValue as Record<
              string,
              unknown
            >,
          },
          artists: release.artist_mbids.map((mbid, i) => ({
            name:
              i === 0 ? release.artist_credit_name : release.artist_credit_name,
            musicbrainzId: mbid,
            role: 'PRIMARY' as const,
            position: i,
          })),
          enrichment: 'queue-check',
          queueCheckOptions: {
            source: 'admin_manual',
            priority: 'medium',
            requestId: `listenbrainz_${metadata.jobId ?? Date.now()}`,
            parentJobId: metadata.jobId,
          },
          logging: {
            operation: 'listenbrainz:sync-fresh-releases',
            category: 'CREATED', // findOrCreateAlbum only runs logging on creation
            sources: ['LISTENBRAINZ'],
            jobId: metadata.jobId ?? null,
          },
          caller: 'listenbrainz-mapper',
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

      // Suppress unused variable warning — album is used for side-effect logging
      void album;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(
        `Failed to process "${release.release_name}": ${message}`
      );
    }
  }

  result.duration = Date.now() - startTime;
  result.success = result.errors.length === 0;

  return result;
}

// ============================================================================
// Helpers
// ============================================================================

function mapReleaseType(lbType: string | null): string | undefined {
  if (!lbType) return undefined;

  const mapping: Record<string, string> = {
    Album: 'Album',
    EP: 'EP',
    Single: 'Single',
  };

  return mapping[lbType];
}
