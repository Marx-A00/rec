// src/lib/queue/processors/deezer-processor.ts
// Deezer playlist import handler for BullMQ.
// Creates albums with source=DEEZER, proper deezerId fields,
// and LlamaLog audit trail tracing back to this job.

import chalk from 'chalk';

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
  console.log(
    chalk.blue(
      `[DEEZER-PROCESSOR] Starting import for playlist "${playlistLabel}" (jobId: ${jobId})`
    )
  );

  try {
    const { importDeezerPlaylistAlbums } = await import(
      '../../deezer/playlist-import'
    );

    const result = await importDeezerPlaylistAlbums(data.playlistId, {
      jobId,
      playlistName: data.playlistName,
      selectedDeezerIds: data.selectedDeezerIds,
    });

    console.log(
      chalk.blue(
        `[DEEZER-PROCESSOR] Import complete: ${result.processing.albumsProcessed} created, ${result.processing.duplicatesSkipped} dupes, ${result.processing.errors.length} errors`
      )
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
    console.error(
      chalk.red('[DEEZER-PROCESSOR] Playlist import failed:'),
      error
    );

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
