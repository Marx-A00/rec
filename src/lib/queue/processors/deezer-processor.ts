// src/lib/queue/processors/deezer-processor.ts
// Deezer playlist import handler for BullMQ.
// Creates albums with source=DEEZER, proper deezerId fields,
// and LlamaLog audit trail tracing back to this job.

import { queueLogger } from '@/lib/logger';

import type { DeezerImportPlaylistJobData } from '../jobs';

// ============================================================================
// Deezer Playlist Import Handler
// ============================================================================

/**
 * Import albums from a Deezer playlist into the database.
 * Used by the Uncover game admin UI to populate the album pool.
 *
 * Data flow:
 *   importDeezerPlaylistAlbums() → processDeezerAlbums() →
 *   findOrCreateAlbum(source: DEEZER, deezerId) →
 *   runPostCreateSideEffects() → CHECK_ALBUM_ENRICHMENT →
 *   MusicBrainz search → Album enriched with MBID
 *
 * LlamaLog entries trace back to this job via rootJobId.
 */
export async function handleDeezerImportPlaylist(
  data: DeezerImportPlaylistJobData,
  jobId?: string
): Promise<Record<string, unknown>> {
  const playlistLabel = data.playlistName || data.playlistId;
  queueLogger.info({ playlistId: data.playlistId, playlistName: playlistLabel, jobId }, 'Deezer playlist import started');

  try {
    const { importDeezerPlaylistAlbums } = await import(
      '../../deezer/playlist-import'
    );

    const result = await importDeezerPlaylistAlbums(data.playlistId, {
      jobId,
      playlistName: data.playlistName,
      selectedDeezerIds: data.selectedDeezerIds,
    });

    queueLogger.info(
      { albumsProcessed: result.processing.albumsProcessed, duplicatesSkipped: result.processing.duplicatesSkipped, errors: result.processing.errors.length },
      'Deezer playlist import complete'
    );

    return {
      success: result.success,
      playlistId: data.playlistId,
      playlistName: result.playlist.name,
      albumsProcessed: result.processing.albumsProcessed,
      artistsProcessed: result.processing.artistsProcessed,
      duplicatesSkipped: result.processing.duplicatesSkipped,
      errors: result.processing.errors,
      message: result.message,
    };
  } catch (error) {
    queueLogger.error({ playlistId: data.playlistId, error: error instanceof Error ? error.message : String(error) }, 'Deezer playlist import failed');

    const message = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      playlistId: data.playlistId,
      error: {
        type: 'DEEZER_API_ERROR',
        message,
        retryable: true,
      },
      albumsProcessed: 0,
      errors: [message],
    };
  }
}
