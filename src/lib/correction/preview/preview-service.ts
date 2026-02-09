/**
 * CorrectionPreviewService - Orchestrates complete correction preview generation.
 *
 * Main entry point for the correction preview system. Fetches current album,
 * fetches full MusicBrainz or Discogs release data via queue, and generates all diffs.
 */

import type { Album, Artist, Prisma, Track } from '@prisma/client';

import { getQueuedDiscogsService } from '@/lib/discogs/queued-service';
import { getQueuedMusicBrainzService } from '@/lib/musicbrainz/queue-service';
import { prisma } from '@/lib/prisma';
import { PRIORITY_TIERS } from '@/lib/queue';
import type { DiscogsMaster } from '@/types/discogs/master';

import type { CorrectionArtistCredit, ScoredSearchResult } from '../types';

import { DiffEngine } from './diff-engine';
import type {
  ChangeType,
  CorrectionPreview,
  CorrectionSource,
  FieldDiff,
  MBReleaseData,
} from './types';

/**
 * Raw MusicBrainz API release response structure.
 */
interface MBReleaseAPIResponse {
  id: string;
  title: string;
  date?: string;
  'release-date'?: string;
  country?: string;
  barcode?: string;
  media?: Array<{
    position: number;
    format?: string;
    'track-count': number;
    tracks?: Array<{
      id?: string;
      position: number;
      title?: string;
      recording?: {
        id: string;
        title: string;
        length?: number;
      };
      length?: number;
    }>;
  }>;
  'artist-credit'?: Array<{
    name: string;
    joinphrase?: string;
    artist: {
      id: string;
      name: string;
      'sort-name'?: string;
      disambiguation?: string;
    };
  }>;
}

/**
 * Album with tracks and artists for preview generation.
 */
type AlbumWithRelations = Prisma.AlbumGetPayload<{
  include: {
    tracks: true;
    artists: { include: { artist: true }; orderBy: { position: 'asc' } };
  };
}>;

/**
 * Service for generating correction previews.
 * Orchestrates fetching album data, MusicBrainz/Discogs data, and diff generation.
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
   * @param searchResult - Selected MusicBrainz/Discogs search result
   * @param releaseMbid - Specific release MBID or Discogs master ID
   * @param source - Data source ('musicbrainz' or 'discogs')
   * @returns Complete preview with all diffs and track comparisons
   */
  async generatePreview(
    albumId: string,
    searchResult: ScoredSearchResult,
    releaseMbid: string,
    source: CorrectionSource = 'musicbrainz'
  ): Promise<CorrectionPreview> {
    // Fetch current album with tracks and artists
    const currentAlbumRaw = await this.fetchCurrentAlbum(albumId);
    if (!currentAlbumRaw) {
      throw new Error(`Album not found: ${albumId}`);
    }

    // Convert to expected format with artistCredit
    const currentAlbum = this.transformAlbumWithArtistCredit(currentAlbumRaw);

    // Fetch source data based on correction source
    let mbReleaseData: MBReleaseData | null;
    if (source === 'discogs') {
      mbReleaseData = await this.fetchDiscogsReleaseData(releaseMbid);
    } else {
      // Fetch full MusicBrainz release data with tracks (high priority - admin action)
      mbReleaseData = await this.fetchMBReleaseData(releaseMbid);
    }

    // Generate field diffs (pass release group ID for external ID comparison)
    const fieldDiffs = this.generateFieldDiffs(
      currentAlbum,
      mbReleaseData,
      searchResult.releaseGroupMbid,
      source
    );

    // Convert database artist relations to CorrectionArtistCredit format
    const currentArtistCredits = this.convertToArtistCredits(
      currentAlbumRaw.artists
    );

    // Generate artist credit diff
    const artistDiff = this.diffEngine.compareArtistCredits(
      currentArtistCredits,
      mbReleaseData?.artistCredit || []
    );

    // Generate track listing diffs
    const { trackDiffs, summary: trackSummary } = this.diffEngine.compareTracks(
      currentAlbum.tracks,
      mbReleaseData?.media || []
    );

    // Generate cover art comparison
    const coverArt = this.generateCoverArtDiff(
      currentAlbum,
      mbReleaseData,
      searchResult
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
        artists: {
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
    const { artists: _artists, ...albumData } = album;
    return albumData;
  }

  /**
   * Convert database artist relations to CorrectionArtistCredit format.
   */
  private convertToArtistCredits(
    artists: Array<{ artist: Artist; position: number }>
  ): CorrectionArtistCredit[] {
    return artists.map(({ artist }) => ({
      mbid: artist.musicbrainzId || '',
      name: artist.name,
    }));
  }

  /**
   * Fetch full MusicBrainz release data with tracks via queue.
   * Uses ADMIN priority tier for immediate processing.
   *
   * Note: This accepts a release GROUP MBID (from search results), not a release MBID.
   * It fetches the release group to find the first release, then fetches that release
   * to get track information.
   */
  private async fetchMBReleaseData(
    releaseGroupMbid: string
  ): Promise<MBReleaseData | null> {
    try {
      // First, fetch the release group to get the list of releases
      const releaseGroup = (await this.mbService.getReleaseGroup(
        releaseGroupMbid,
        ['releases', 'artist-credits'],
        PRIORITY_TIERS.ADMIN
      )) as {
        id: string;
        title: string;
        releases?: Array<{
          id: string;
          title: string;
          date?: string;
          status?: string;
        }>;
        'artist-credit'?: Array<{
          name: string;
          joinphrase?: string;
          artist: {
            id: string;
            name: string;
            'sort-name'?: string;
            disambiguation?: string;
          };
        }>;
      } | null;

      if (!releaseGroup) {
        console.error('Release group not found:', releaseGroupMbid);
        return null;
      }

      // Find the best release (prefer official releases, then by date)
      const releases = releaseGroup.releases || [];
      if (releases.length === 0) {
        console.warn('Release group has no releases:', releaseGroupMbid);
        // Return basic data from release group without tracks
        return {
          id: releaseGroup.id,
          title: releaseGroup.title,
          date: undefined,
          country: undefined,
          barcode: undefined,
          media: [],
          artistCredit: (releaseGroup['artist-credit'] || []).map(ac => ({
            name: ac.name,
            joinphrase: ac.joinphrase || '',
            artist: {
              id: ac.artist.id,
              name: ac.artist.name,
              sortName: ac.artist['sort-name'],
              disambiguation: ac.artist.disambiguation,
            },
          })),
        };
      }

      // Sort releases: prefer official, then by date (oldest first for original release)
      const sortedReleases = [...releases].sort((a, b) => {
        // Prefer official releases
        if (a.status === 'Official' && b.status !== 'Official') return -1;
        if (b.status === 'Official' && a.status !== 'Official') return 1;
        // Then by date (oldest first)
        if (a.date && b.date) return a.date.localeCompare(b.date);
        if (a.date) return -1;
        if (b.date) return 1;
        return 0;
      });

      const bestRelease = sortedReleases[0];

      // Now fetch the full release data with tracks
      const data = (await this.mbService.getRelease(
        bestRelease.id,
        ['artist-credits', 'media', 'recordings'],
        PRIORITY_TIERS.ADMIN
      )) as MBReleaseAPIResponse;

      // Transform raw MusicBrainz data to MBReleaseData format
      return this.transformMBRelease(data);
    } catch (error) {
      console.error('Failed to fetch MusicBrainz release data:', error);
      return null;
    }
  }

  /**
   * Fetch Discogs master data and transform to MBReleaseData format.
   * Uses QueuedDiscogsService for rate-limited API access.
   */
  private async fetchDiscogsReleaseData(
    discogsMasterId: string
  ): Promise<MBReleaseData | null> {
    try {
      const discogsService = getQueuedDiscogsService();
      const master = await discogsService.getMaster(
        discogsMasterId,
        PRIORITY_TIERS.ADMIN
      );

      return this.transformDiscogsMaster(master);
    } catch (error) {
      console.error('Failed to fetch Discogs master data:', error);
      return null;
    }
  }

  /**
   * Transform Discogs master to MBReleaseData format for unified processing.
   */
  private transformDiscogsMaster(master: DiscogsMaster): MBReleaseData {
    return {
      id: master.id.toString(),
      title: master.title,
      // Year-only date with Jan 1 fallback per CONTEXT.md
      date: master.year ? master.year.toString() + '-01-01' : undefined,
      // Discogs masters don't have country or barcode
      country: undefined,
      barcode: undefined,
      // Map tracklist to media format
      media: this.mapDiscogsTracklist(master.tracklist || []),
      // Map artist credits
      artistCredit: (master.artists || []).map(a => ({
        name: a.name,
        joinphrase: a.join || '',
        artist: {
          id: a.id.toString(),
          name: a.name,
          sortName: undefined,
          disambiguation: undefined,
        },
      })),
    };
  }

  /**
   * Map Discogs tracklist to MBMedium[] format.
   * Handles Discogs position strings (1, 2, A1, B2, etc.)
   */
  private mapDiscogsTracklist(
    tracklist: DiscogsMaster['tracklist']
  ): MBReleaseData['media'] {
    if (!tracklist || tracklist.length === 0) {
      return [];
    }

    // Group tracks by disc (parse position strings)
    const discMap = new Map<
      number,
      Array<{
        position: string;
        title: string;
        duration: string;
        trackNum: number;
      }>
    >();

    tracklist.forEach((track, idx) => {
      const disc = this.parseDiscNumber(track.position);
      const trackNum = this.parseTrackNumber(track.position, idx);

      if (!discMap.has(disc)) {
        discMap.set(disc, []);
      }
      discMap.get(disc)!.push({
        position: track.position,
        title: track.title,
        duration: track.duration || '',
        trackNum,
      });
    });

    // Convert to MBMedium format
    return Array.from(discMap.entries()).map(([discNum, tracks]) => ({
      position: discNum,
      format: undefined,
      trackCount: tracks.length,
      tracks: tracks.map(track => ({
        position: track.trackNum,
        recording: {
          id: '', // Discogs tracks don't have IDs
          title: track.title,
          length: this.parseDuration(track.duration),
          position: track.trackNum,
        },
      })),
    }));
  }

  /**
   * Parse disc number from Discogs position string.
   * "1" or "2" = disc 1, "A1" = disc 1, "B1" = disc 2, etc.
   */
  private parseDiscNumber(position: string): number {
    if (!position) return 1;
    const match = position.match(/^([A-Z])?(\d+)/i);
    if (!match) return 1;

    if (match[1]) {
      // Letter prefix: A=1, B=2, C=3, etc.
      return match[1].toUpperCase().charCodeAt(0) - 64;
    }
    return 1;
  }

  /**
   * Parse track number from Discogs position string.
   */
  private parseTrackNumber(position: string, fallbackIdx: number): number {
    if (!position) return fallbackIdx + 1;
    const match = position.match(/(\d+)$/);
    return match ? parseInt(match[1], 10) : fallbackIdx + 1;
  }

  /**
   * Convert Discogs duration string (MM:SS) to milliseconds.
   */
  private parseDuration(duration: string): number | undefined {
    if (!duration) return undefined;
    const parts = duration.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10);
      const seconds = parseInt(parts[1], 10);
      if (!isNaN(minutes) && !isNaN(seconds)) {
        return (minutes * 60 + seconds) * 1000;
      }
    }
    return undefined;
  }

  /**
   * Transform raw MusicBrainz API response to MBReleaseData structure.
   */
  private transformMBRelease(
    mbData: MBReleaseAPIResponse
  ): MBReleaseData | null {
    if (!mbData) return null;

    return {
      id: mbData.id,
      title: mbData.title,
      date: mbData.date || mbData['release-date'],
      country: mbData.country,
      barcode: mbData.barcode,
      media:
        mbData.media?.map(medium => ({
          position: medium.position,
          format: medium.format,
          trackCount: medium['track-count'],
          tracks:
            medium.tracks?.map(track => ({
              position: track.position,
              recording: {
                id: track.recording?.id || track.id || '',
                title: track.title || track.recording?.title || '',
                length: track.length || track.recording?.length,
                position: track.position,
              },
            })) || [],
        })) || [],
      artistCredit:
        mbData['artist-credit']?.map(ac => ({
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
    mbData: MBReleaseData | null,
    releaseGroupMbid?: string,
    source: CorrectionSource = 'musicbrainz'
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

    // Country (only for MusicBrainz - Discogs masters don't have country)
    if (source === 'musicbrainz') {
      diffs.push(
        this.diffEngine.compareText(
          'country',
          currentAlbum.releaseCountry,
          mbData?.country || null
        )
      );
    }

    // Barcode (only for MusicBrainz - Discogs masters don't have barcode)
    if (source === 'musicbrainz') {
      diffs.push(
        this.diffEngine.compareText(
          'barcode',
          currentAlbum.barcode,
          mbData?.barcode || null
        )
      );
    }

    // External ID (conditional on source)
    if (source === 'musicbrainz') {
      diffs.push(
        this.diffEngine.compareExternalId(
          'musicbrainzId',
          currentAlbum.musicbrainzId,
          releaseGroupMbid || null
        )
      );
    } else if (source === 'discogs') {
      diffs.push(
        this.diffEngine.compareExternalId(
          'discogsId',
          currentAlbum.discogsId,
          releaseGroupMbid || null
        )
      );
    }

    return diffs;
  }

  /**
   * Generate cover art comparison.
   */
  private generateCoverArtDiff(
    currentAlbum: Album,
    mbData: MBReleaseData | null,
    searchResult: ScoredSearchResult
  ): {
    currentUrl: string | null;
    sourceUrl: string | null;
    changeType: ChangeType;
  } {
    const currentUrl = currentAlbum.coverArtUrl;
    const sourceUrl =
      mbData && searchResult.releaseGroupMbid
        ? (searchResult.coverArtUrl ??
          `https://coverartarchive.org/release-group/${searchResult.releaseGroupMbid}/front-250`)
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
      matching: number;
      modified: number;
      added: number;
      removed: number;
    }
  ) {
    const totalFields = fieldDiffs.length + 1 + (trackSummary.modified || 0); // fields + artist + tracks
    const changedFields = [
      ...fieldDiffs.filter(d => d.changeType !== 'UNCHANGED'),
      ...(artistDiff.changeType !== 'UNCHANGED' ? [artistDiff] : []),
    ].length;

    const addedFields = [...fieldDiffs.filter(d => d.changeType === 'ADDED')]
      .length;

    const modifiedFields = [
      ...fieldDiffs.filter(d => d.changeType === 'MODIFIED'),
    ].length;

    const conflictFields = [
      ...fieldDiffs.filter(d => d.changeType === 'CONFLICT'),
    ].length;

    const hasTrackChanges =
      trackSummary.modified > 0 ||
      trackSummary.added > 0 ||
      trackSummary.removed > 0;

    return {
      totalFields,
      changedFields,
      addedFields,
      modifiedFields,
      conflictFields,
      hasTrackChanges,
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
