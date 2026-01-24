/**
 * CorrectionPreviewService - Orchestrates complete correction preview generation.
 *
 * Main entry point for the correction preview system. Fetches current album,
 * fetches full MusicBrainz release data via queue, and generates all diffs.
 */

import type { Album, Track, Artist } from '@prisma/client';

import { PRIORITY_TIERS } from '@/lib/queue';
import { getQueuedMusicBrainzService } from '@/lib/musicbrainz/queue-service';
import { prisma } from '@/lib/prisma';

import { DiffEngine } from './diff-engine';
import type {
  CorrectionPreview,
  MBReleaseData,
  FieldDiff,
  ChangeType,
} from './types';
import type { ScoredSearchResult, CorrectionArtistCredit } from '../types';

/**
 * Album with tracks and artists for preview generation.
 */
type AlbumWithRelations = Album & {
  tracks: Track[];
  albumArtists: Array<{
    artist: Artist;
    position: number;
  }>;
};

/**
 * Service for generating correction previews.
 * Orchestrates fetching album data, MusicBrainz data, and diff generation.
 */
export class CorrectionPreviewService {
  private diffEngine: DiffEngine;
  private mbService = getQueuedMusicBrainzService();

  constructor() {
    this.diffEngine = new DiffEngine();
  }

  /**
   * Generate complete correction preview.
   *
   * @param albumId - Internal database ID of the album to correct
   * @param searchResult - Selected MusicBrainz search result
   * @returns Complete preview with all diffs and track comparisons
   */
  async generatePreview(
    albumId: string,
    searchResult: ScoredSearchResult
  ): Promise<CorrectionPreview> {
    // Fetch current album with tracks and artists
    const currentAlbumRaw = await this.fetchCurrentAlbum(albumId);
    if (!currentAlbumRaw) {
      throw new Error(`Album not found: ${albumId}`);
    }

    // Convert to expected format with artistCredit
    const currentAlbum = this.transformAlbumWithArtistCredit(currentAlbumRaw);

    // Fetch full MusicBrainz release data with tracks (high priority - admin action)
    const mbReleaseData = await this.fetchMBReleaseData(searchResult.id);

    // Generate field diffs
    const fieldDiffs = this.generateFieldDiffs(currentAlbum, mbReleaseData);

    // Convert database artist relations to CorrectionArtistCredit format
    const currentArtistCredits = this.convertToArtistCredits(
      currentAlbumRaw.albumArtists
    );

    // Generate artist credit diff
    const artistDiff = this.diffEngine.compareArtistCredits(
      currentArtistCredits,
      mbReleaseData?.artistCredit || []
    );

    // Generate track listing diffs
    const { trackDiffs, summary: trackSummary } =
      this.diffEngine.compareTracks(
        currentAlbum.tracks,
        mbReleaseData?.media || []
      );

    // Generate cover art comparison
    const coverArt = this.generateCoverArtDiff(
      currentAlbum,
      mbReleaseData,
      searchResult.id
    );

    // Generate summary statistics
    const summary = this.generateSummary(fieldDiffs, artistDiff, trackSummary);

    return {
      currentAlbum,
      sourceResult: searchResult,
      mbReleaseData,
      fieldDiffs,
      artistDiff,
      trackDiffs,
      trackSummary,
      coverArt,
      summary,
    };
  }

  /**
   * Fetch current album from database with tracks and artists.
   */
  private async fetchCurrentAlbum(
    albumId: string
  ): Promise<AlbumWithRelations | null> {
    return prisma.album.findUnique({
      where: { id: albumId },
      include: {
        tracks: true,
        albumArtists: {
          include: { artist: true },
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  /**
   * Transform album with artist relations to include artistCredit field.
   */
  private transformAlbumWithArtistCredit(
    album: AlbumWithRelations
  ): Album & { tracks: Track[] } {
    // Extract just the album and tracks, dropping the artist relations
    // (we'll handle artist diff separately)
    const { albumArtists, ...albumData } = album;
    return albumData;
  }

  /**
   * Convert database artist relations to CorrectionArtistCredit format.
   */
  private convertToArtistCredits(
    albumArtists: Array<{ artist: Artist; position: number }>
  ): CorrectionArtistCredit[] {
    return albumArtists.map(({ artist }) => ({
      mbid: artist.musicbrainzId || '',
      name: artist.name,
    }));
  }

  /**
   * Fetch full MusicBrainz release data with tracks via queue.
   * Uses ADMIN priority tier for immediate processing.
   */
  private async fetchMBReleaseData(
    releaseMbid: string
  ): Promise<MBReleaseData | null> {
    try {
      const data = await this.mbService.getRelease(
        releaseMbid,
        ['artist-credits', 'media', 'recordings'], // Include tracks
        PRIORITY_TIERS.ADMIN
      );

      // Transform raw MusicBrainz data to MBReleaseData format
      return this.transformMBRelease(data);
    } catch (error) {
      console.error('Failed to fetch MusicBrainz release:', error);
      return null;
    }
  }

  /**
   * Transform raw MusicBrainz API response to MBReleaseData structure.
   */
  private transformMBRelease(mbData: any): MBReleaseData | null {
    if (!mbData) return null;

    return {
      id: mbData.id,
      title: mbData.title,
      date: mbData.date || mbData['release-date'],
      country: mbData.country,
      barcode: mbData.barcode,
      media:
        mbData.media?.map((medium: any) => ({
          position: medium.position,
          format: medium.format,
          trackCount: medium['track-count'],
          tracks:
            medium.tracks?.map((track: any) => ({
              position: track.position,
              title: track.title || track.recording?.title,
              length: track.length,
            })) || [],
        })) || [],
      artistCredit:
        mbData['artist-credit']?.map((ac: any) => ({
          name: ac.name,
          joinphrase: ac.joinphrase || '',
          artist: {
            id: ac.artist.id,
            name: ac.artist.name,
            sortName: ac.artist['sort-name'],
            disambiguation: ac.artist.disambiguation,
          },
        })) || [],
    };
  }

  /**
   * Generate field-by-field diffs for scalar fields.
   */
  private generateFieldDiffs(
    currentAlbum: Album,
    mbData: MBReleaseData | null
  ): FieldDiff[] {
    const diffs: FieldDiff[] = [];

    // Title
    diffs.push(
      this.diffEngine.compareText(
        'title',
        currentAlbum.title,
        mbData?.title || null
      )
    );

    // Release date
    diffs.push(
      this.diffEngine.compareDate(
        currentAlbum.releaseDate,
        mbData?.date || null
      )
    );

    // Country
    diffs.push(
      this.diffEngine.compareText(
        'country',
        currentAlbum.releaseCountry,
        mbData?.country || null
      )
    );

    // Barcode
    diffs.push(
      this.diffEngine.compareText(
        'barcode',
        currentAlbum.barcode,
        mbData?.barcode || null
      )
    );

    // MusicBrainz ID (external ID change)
    diffs.push(
      this.diffEngine.compareExternalId(
        'musicbrainzId',
        currentAlbum.musicbrainzId,
        mbData?.id || null
      )
    );

    return diffs;
  }

  /**
   * Generate cover art comparison.
   */
  private generateCoverArtDiff(
    currentAlbum: Album,
    mbData: MBReleaseData | null,
    sourceMbid: string
  ): {
    currentUrl: string | null;
    sourceUrl: string | null;
    changeType: ChangeType;
  } {
    const currentUrl = currentAlbum.coverArtUrl;
    // Cover Art Archive URL pattern: https://coverartarchive.org/release/{mbid}/front
    const sourceUrl = mbData
      ? `https://coverartarchive.org/release/${sourceMbid}/front`
      : null;

    const changeType = this.diffEngine.classifyChange(currentUrl, sourceUrl);

    return { currentUrl, sourceUrl, changeType };
  }

  /**
   * Generate summary statistics for all changes.
   */
  private generateSummary(
    fieldDiffs: FieldDiff[],
    artistDiff: { changeType: ChangeType },
    trackSummary: {
      modifiedCount: number;
      addedCount: number;
      removedCount: number;
    }
  ) {
    const totalFields =
      fieldDiffs.length + 1 + (trackSummary.modifiedCount || 0); // fields + artist + tracks
    const changedFields = [
      ...fieldDiffs.filter((d) => d.changeType !== 'UNCHANGED'),
      ...(artistDiff.changeType !== 'UNCHANGED' ? [artistDiff] : []),
    ].length;

    const addedFields = [
      ...fieldDiffs.filter((d) => d.changeType === 'ADDED'),
    ].length;

    const modifiedFields = [
      ...fieldDiffs.filter((d) => d.changeType === 'MODIFIED'),
    ].length;

    const removedFields = [
      ...fieldDiffs.filter((d) => d.changeType === 'REMOVED'),
    ].length;

    const conflictFields = [
      ...fieldDiffs.filter((d) => d.changeType === 'CONFLICT'),
    ].length;

    return {
      totalFields,
      changedFields,
      addedFields,
      modifiedFields,
      removedFields,
      conflictFields,
      trackChanges: {
        modified: trackSummary.modifiedCount,
        added: trackSummary.addedCount,
        removed: trackSummary.removedCount,
      },
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

const globalForPreview = global as unknown as {
  correctionPreviewServiceInstance?: CorrectionPreviewService;
};

/**
 * Get singleton CorrectionPreviewService instance.
 * Safe for Next.js HMR in development.
 */
export function getCorrectionPreviewService(): CorrectionPreviewService {
  if (!globalForPreview.correctionPreviewServiceInstance) {
    globalForPreview.correctionPreviewServiceInstance =
      new CorrectionPreviewService();
  }
  return globalForPreview.correctionPreviewServiceInstance;
}
