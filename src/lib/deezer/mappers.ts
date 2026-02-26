// src/lib/deezer/mappers.ts
// Deezer-native album processing pipeline.
// Creates Album/Artist records with ContentSource.DEEZER and proper deezerId fields.
// MusicBrainz enrichment is queued automatically via findOrCreateAlbum() side effects.

import chalk from 'chalk';

import { prisma } from '@/lib/prisma';

// ============================================================================
// Types
// ============================================================================

/** Input format for a single Deezer album to be processed */
export interface DeezerAlbumData {
  deezerId: string;
  title: string;
  artistName: string;
  artistDeezerId: string;
  coverUrl: string | null;
  releaseDate: string | null; // 'YYYY-MM-DD' or 'YYYY' or null
  albumType: string; // 'album', 'ep', 'single', etc.
  totalTracks: number;
}

/** Options passed from the BullMQ job processor */
export interface ProcessDeezerAlbumsOptions {
  jobId?: string;
  batchId?: string;
  playlistName?: string;
}

/** Result stats from processing a batch of Deezer albums */
export interface DeezerProcessingStats {
  albumsProcessed: number;
  artistsProcessed: number;
  duplicatesSkipped: number;
  errors: string[];
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse a Deezer release date string into a Date object.
 * Handles 'YYYY-MM-DD', 'YYYY', or null.
 */
function parseDeezerReleaseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;

  // Full date: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  // Year only: YYYY
  if (/^\d{4}$/.test(dateStr)) {
    return new Date(Number(dateStr), 0, 1); // Jan 1 of that year
  }

  return null;
}

/**
 * Extract release year from a date string.
 */
function extractReleaseYear(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})/);
  return match ? Number(match[1]) : null;
}

// ============================================================================
// Main processing function
// ============================================================================

/**
 * Process multiple Deezer albums into the database.
 *
 * For each album:
 *   1. Call findOrCreateAlbum() with deezerId, source=DEEZER
 *   2. Artist is created via the artists array param (with deezerId)
 *   3. Enrichment (MusicBrainz search) is queued automatically via side effects
 *   4. LlamaLog audit trail is created with correct operation and rootJobId
 *
 * NO fake spotifyId — deezerId is the primary external identifier.
 */
export async function processDeezerAlbums(
  albums: DeezerAlbumData[],
  options: ProcessDeezerAlbumsOptions = {}
): Promise<DeezerProcessingStats> {
  console.log(
    chalk.blue(`[DEEZER] Processing ${albums.length} Deezer albums...`)
  );

  const stats: DeezerProcessingStats = {
    albumsProcessed: 0,
    artistsProcessed: 0,
    duplicatesSkipped: 0,
    errors: [],
  };

  const { findOrCreateAlbum } = await import('@/lib/albums');

  for (const albumData of albums) {
    try {
      // Generate a unique per-album job ID for LlamaLog hierarchy
      const albumRootJobId = `deezer-import-album-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const releaseDate = parseDeezerReleaseDate(albumData.releaseDate);
      const releaseYear = extractReleaseYear(albumData.releaseDate);

      const { album, created, artistsCreated } = await findOrCreateAlbum({
        db: prisma,
        identity: {
          title: albumData.title,
          deezerId: albumData.deezerId,
          primaryArtistName: albumData.artistName,
          releaseYear: releaseYear ?? undefined,
        },
        fields: {
          releaseDate,
          releaseType: albumData.albumType || 'album',
          trackCount: albumData.totalTracks || undefined,
          coverArtUrl: albumData.coverUrl ?? undefined,
          source: 'DEEZER',
          sourceUrl: `https://www.deezer.com/album/${albumData.deezerId}`,
          metadata: {
            syncSource: 'deezer_playlists',
            batchId: options.batchId,
            importedAt: new Date().toISOString(),
          },
        },
        artists: [
          {
            name: albumData.artistName,
            deezerId: albumData.artistDeezerId,
            role: 'PRIMARY',
            position: 0,
          },
        ],
        enrichment: 'queue-check',
        queueCheckOptions: {
          source: 'deezer_import',
          priority: 'medium',
          requestId: `deezer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          parentJobId: albumRootJobId,
        },
        logging: {
          operation: 'album:created:deezer-import',
          category: 'CREATED',
          sources: ['DEEZER'],
          jobId: albumRootJobId,
          parentJobId: undefined,
          rootJobId: options.jobId ?? undefined,
          isRootJob: true,
          metadata: {
            syncSource: 'deezer_playlists',
            syncTimestamp: new Date().toISOString(),
            syncJobId: options.jobId,
            batchId: options.batchId,
            playlistName: options.playlistName,
            deezerAlbumId: albumData.deezerId,
            deezerArtistId: albumData.artistDeezerId,
          },
        },
        caller: 'processDeezerAlbums',
      });

      if (created) {
        stats.albumsProcessed++;
        stats.artistsProcessed += artistsCreated;
      } else {
        stats.duplicatesSkipped++;
      }
    } catch (error) {
      const errorMsg = `Failed to process "${albumData.title}": ${error instanceof Error ? error.message : String(error)}`;
      console.error(chalk.red(`[DEEZER] ${errorMsg}`));
      stats.errors.push(errorMsg);
    }
  }

  console.log(
    chalk.blue(
      `[DEEZER] Processing complete: ${stats.albumsProcessed} created, ${stats.duplicatesSkipped} dupes, ${stats.errors.length} errors`
    )
  );

  return stats;
}
