/**
 * CorrectionSearchService
 *
 * Wraps MusicBrainz search with ADMIN priority for responsive admin UI.
 * Normalizes results into correction-specific format with Cover Art Archive URLs.
 */

import { getQueuedMusicBrainzService } from '@/lib/musicbrainz/queue-service';
import { PRIORITY_TIERS } from '@/lib/queue';
import {
  buildDualInputQuery,
  hasSearchableInput,
} from '@/lib/musicbrainz/query-builder';
import type { ReleaseGroupSearchResult } from '@/lib/musicbrainz/basic-service';

import type {
  CorrectionSearchOptions,
  CorrectionSearchResponse,
  CorrectionSearchResult,
  CorrectionArtistCredit,
} from './types';

/**
 * Service for searching MusicBrainz for album correction candidates.
 * Uses ADMIN priority tier for responsive admin UI experience.
 */
export class CorrectionSearchService {
  private mbService = getQueuedMusicBrainzService();

  /**
   * Search MusicBrainz for correction candidates.
   * Uses ADMIN priority tier for responsive admin UI.
   *
   * @param options - Search options including album title, artist name, and filters
   * @returns Correction search response with normalized results
   */
  async search(
    options: CorrectionSearchOptions
  ): Promise<CorrectionSearchResponse> {
    // Validate input - require at least album or artist
    if (!hasSearchableInput(options.albumTitle, options.artistName)) {
      return {
        results: [],
        hasMore: false,
        query: {
          albumTitle: options.albumTitle,
          artistName: options.artistName,
        },
      };
    }

    // Build Lucene query using existing query-builder
    let query = buildDualInputQuery(options.albumTitle, options.artistName);

    // Add year filter if provided
    if (options.yearFilter) {
      query += ` AND firstreleasedate:${options.yearFilter}*`;
    }

    const limit = options.limit ?? 10;
    const offset = options.offset ?? 0;

    // Execute search with ADMIN priority
    const results = await this.mbService.searchReleaseGroups(
      query,
      limit,
      offset,
      PRIORITY_TIERS.ADMIN
    );

    // Map to correction result format
    const correctionResults = results.map(rg => this.mapToResult(rg));

    return {
      results: correctionResults,
      hasMore: results.length === limit,
      query: {
        albumTitle: options.albumTitle,
        artistName: options.artistName,
        yearFilter: options.yearFilter,
      },
    };
  }

  /**
   * Map MusicBrainz release group to correction result format.
   *
   * @param rg - MusicBrainz release group search result
   * @returns Normalized correction search result with CAA URL
   */
  private mapToResult(rg: ReleaseGroupSearchResult): CorrectionSearchResult {
    // Extract artist credits
    // Note: ReleaseGroupSearchResult.artistCredit only has name and artist.id/name
    // No joinphrase is available from this API response
    const artistCredits: CorrectionArtistCredit[] = (rg.artistCredit || []).map(
      ac => ({
        mbid: ac.artist.id,
        name: ac.name,
      })
    );

    // Build primary artist name from credits (comma-separated)
    const primaryArtistName = artistCredits.map(ac => ac.name).join(', ');

    // Compute CAA URL (250px thumbnail)
    // Note: CAA may return 404 if no cover art exists - UI handles this gracefully
    // by falling back to placeholder image (see AlbumImage component pattern)
    const coverArtUrl = `https://coverartarchive.org/release-group/${rg.id}/front-250`;

    return {
      releaseGroupMbid: rg.id,
      title: rg.title,
      disambiguation: rg.disambiguation,
      artistCredits,
      primaryArtistName: primaryArtistName || 'Unknown Artist',
      firstReleaseDate: rg.firstReleaseDate,
      primaryType: rg.primaryType,
      secondaryTypes: rg.secondaryTypes,
      mbScore: rg.score,
      coverArtUrl,
      source: 'musicbrainz',
    };
  }
}

// ============================================================================
// Singleton Instance (HMR-safe)
// ============================================================================

const globalForCorrection = globalThis as unknown as {
  correctionSearchService: CorrectionSearchService | undefined;
};

/**
 * Get the singleton CorrectionSearchService instance.
 * HMR-safe: Uses globalThis to persist instance across hot reloads.
 */
export function getCorrectionSearchService(): CorrectionSearchService {
  if (!globalForCorrection.correctionSearchService) {
    globalForCorrection.correctionSearchService = new CorrectionSearchService();
  }
  return globalForCorrection.correctionSearchService;
}
