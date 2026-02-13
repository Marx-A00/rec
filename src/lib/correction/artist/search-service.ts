/**
 * ArtistCorrectionSearchService
 *
 * Searches MusicBrainz for artist correction candidates.
 * Uses ADMIN priority tier for responsive admin UI experience.
 * Includes top releases for each artist to help disambiguate common names.
 */

import { getQueuedMusicBrainzService } from '@/lib/musicbrainz/queue-service';
import { PRIORITY_TIERS } from '@/lib/queue';
import type { ArtistSearchResult as MBArtistSearchResult } from '@/lib/musicbrainz/basic-service';

import type {
  ArtistSearchResult,
  ArtistCorrectionSearchOptions,
  ArtistCorrectionSearchResponse,
  ArtistTopRelease,
} from './types';

/**
 * Service for searching MusicBrainz for artist correction candidates.
 * Uses ADMIN priority tier for responsive admin UI experience.
 */
export class ArtistCorrectionSearchService {
  private mbService = getQueuedMusicBrainzService();

  /**
   * Search MusicBrainz for artist correction candidates.
   * For each result, fetches top 3 release groups for disambiguation.
   *
   * @param options - Search options including query, limit, and offset
   * @returns Artist search response with scored results and top releases
   */
  async search(
    options: ArtistCorrectionSearchOptions
  ): Promise<ArtistCorrectionSearchResponse> {
    const { query, limit = 10, offset = 0 } = options;

    // Validate input
    if (!query || query.trim().length === 0) {
      return {
        results: [],
        hasMore: false,
        query: '',
      };
    }

    // Execute search with ADMIN priority
    const artists = await this.mbService.searchArtists(
      query.trim(),
      limit,
      offset,
      PRIORITY_TIERS.ADMIN
    );

    // For each artist, fetch top 3 releases for context/disambiguation
    const resultsWithReleases = await Promise.all(
      artists.map(async artist => {
        const baseResult = this.mapToArtistResult(artist);

        // Try to fetch top releases for disambiguation
        try {
          const topReleases = await this.fetchTopReleases(artist.id);
          return {
            ...baseResult,
            topReleases,
          };
        } catch (error) {
          // If release fetch fails, return artist without releases
          console.warn(
            `[ArtistCorrectionSearchService] Failed to fetch releases for artist ${artist.id}:`,
            error instanceof Error ? error.message : 'Unknown error'
          );
          return baseResult;
        }
      })
    );

    return {
      results: resultsWithReleases,
      hasMore: artists.length === limit,
      query: query.trim(),
    };
  }

  /**
   * Search with simpler interface (for convenience).
   * Wraps the options-based search method.
   *
   * @param query - Artist name to search for
   * @param limit - Maximum results (default 10)
   * @returns Array of artist search results
   */
  async searchByName(
    query: string,
    limit: number = 10
  ): Promise<ArtistSearchResult[]> {
    const response = await this.search({ query, limit });
    return response.results;
  }

  /**
   * Fetch top 3 release groups for an artist.
   * Used for disambiguation when multiple artists share the same name.
   *
   * @param artistMbid - MusicBrainz artist ID
   * @returns Array of top releases (up to 3)
   */
  private async fetchTopReleases(
    artistMbid: string
  ): Promise<ArtistTopRelease[]> {
    // Use browseReleaseGroupsByArtist with ADMIN priority
    // Limit to 3 for UI display
    const response = await this.mbService.browseReleaseGroupsByArtist(
      artistMbid,
      3,
      0,
      PRIORITY_TIERS.ADMIN
    );

    // Extract release groups from response
    const releaseGroups = response?.['release-groups'] || [];

    return releaseGroups
      .slice(0, 3)
      .map(
        (rg: {
          title?: string;
          'first-release-date'?: string;
          'primary-type'?: string;
        }) => ({
          title: rg.title || 'Unknown Title',
          year: rg['first-release-date']?.substring(0, 4),
          type: rg['primary-type'],
        })
      );
  }

  /**
   * Map MusicBrainz artist search result to our ArtistSearchResult format.
   *
   * @param artist - MusicBrainz artist search result
   * @returns Normalized artist search result
   */
  private mapToArtistResult(artist: MBArtistSearchResult): ArtistSearchResult {
    return {
      artistMbid: artist.id,
      name: artist.name,
      sortName: artist.sortName,
      disambiguation: artist.disambiguation,
      type: artist.type,
      country: artist.country,
      // Note: basic-service ArtistSearchResult doesn't include area, only lifeSpan
      // Area would need to be fetched from full artist lookup (not search)
      area: undefined,
      beginDate: artist.lifeSpan?.begin,
      endDate: artist.lifeSpan?.end,
      ended: artist.lifeSpan?.ended,
      // Note: gender is not included in basic artist search results
      // Would need full artist lookup to get gender
      gender: undefined,
      mbScore: artist.score,
      topReleases: undefined, // Will be populated separately
    };
  }
}

// ============================================================================
// Singleton Instance (HMR-safe)
// ============================================================================

const globalForArtistCorrection = globalThis as unknown as {
  artistCorrectionSearchService: ArtistCorrectionSearchService | undefined;
};

/**
 * Get the singleton ArtistCorrectionSearchService instance.
 * HMR-safe: Uses globalThis to persist instance across hot reloads.
 */
export function getArtistCorrectionSearchService(): ArtistCorrectionSearchService {
  if (!globalForArtistCorrection.artistCorrectionSearchService) {
    globalForArtistCorrection.artistCorrectionSearchService =
      new ArtistCorrectionSearchService();
  }
  return globalForArtistCorrection.artistCorrectionSearchService;
}
