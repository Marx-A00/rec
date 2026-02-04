/**
 * CorrectionSearchService
 *
 * Wraps MusicBrainz search with ADMIN priority for responsive admin UI.
 * Normalizes results into correction-specific format with Cover Art Archive URLs.
 * Provides scored, grouped, and deduplicated search via searchWithScoring().
 */

import { getQueuedMusicBrainzService } from '@/lib/musicbrainz/queue-service';
import { PRIORITY_TIERS } from '@/lib/queue';
import {
  buildDualInputQuery,
  hasSearchableInput,
} from '@/lib/musicbrainz/query-builder';
import type { ReleaseGroupSearchResult } from '@/lib/musicbrainz/basic-service';

import { getSearchScoringService } from './scoring';
import type { ScoredSearchResult } from './scoring/types';
import type {
  CorrectionSearchOptions,
  CorrectionSearchResponse,
  CorrectionSearchResult,
  CorrectionArtistCredit,
  ScoredSearchOptions,
  ScoredSearchResponse,
  GroupedSearchResult,
} from './types';

/**
 * Primary type priority for sorting groups
 * Lower number = higher priority (Albums first, then EPs, then Singles)
 */
const TYPE_PRIORITY: Record<string, number> = {
  Album: 1,
  EP: 2,
  Single: 3,
  Broadcast: 4,
  Other: 5,
};

/**
 * Get type priority for sorting (default to 5 for unknown types)
 */
function getTypePriority(primaryType?: string): number {
  if (!primaryType) return 5;
  return TYPE_PRIORITY[primaryType] ?? 5;
}

/**
 * Service for searching MusicBrainz for album correction candidates.
 * Uses ADMIN priority tier for responsive admin UI experience.
 */
export class CorrectionSearchService {
  private mbService = getQueuedMusicBrainzService();

  /**
   * Search MusicBrainz for correction candidates (raw, unscored).
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
   * Search MusicBrainz with scoring and grouping.
   * Returns deduplicated results grouped by release group MBID.
   *
   * @param options - Search options including scoring strategy and threshold
   * @returns Scored, grouped, and deduplicated search response
   */
  async searchWithScoring(
    options: ScoredSearchOptions
  ): Promise<ScoredSearchResponse> {
    const scoringService = getSearchScoringService();

    // Apply scoring options if provided
    const strategy = options.strategy ?? scoringService.getStrategy();
    const threshold =
      options.lowConfidenceThreshold ??
      scoringService.getLowConfidenceThreshold();

    // Execute raw search
    const rawResponse = await this.search({
      albumTitle: options.albumTitle,
      artistName: options.artistName,
      yearFilter: options.yearFilter,
      limit: options.limit,
      offset: options.offset,
    });

    // If no results, return empty response
    if (rawResponse.results.length === 0) {
      return {
        results: [],
        allResults: [],
        totalGroups: 0,
        hasMore: false,
        query: rawResponse.query,
        scoring: {
          strategy,
          threshold,
          lowConfidenceCount: 0,
        },
      };
    }

    // Apply scoring
    const albumQuery = options.albumTitle ?? '';
    const artistQuery = options.artistName;

    const scoredResults = scoringService.scoreResults(
      rawResponse.results,
      albumQuery,
      artistQuery,
      { strategy, lowConfidenceThreshold: threshold }
    );

    // Group results by release group MBID
    const groupedResults = this.groupByReleaseGroup(scoredResults);

    // Count low-confidence results
    const lowConfidenceCount = scoredResults.filter(
      r => r.isLowConfidence
    ).length;

    return {
      results: groupedResults,
      allResults: scoredResults,
      totalGroups: groupedResults.length,
      hasMore: rawResponse.hasMore,
      query: rawResponse.query,
      scoring: {
        strategy,
        threshold,
        lowConfidenceCount,
      },
    };
  }

  /**
   * Load more results starting from given offset.
   * Convenience method for pagination.
   *
   * @param options - Search options with offset for next page
   * @returns Scored search response for next page
   */
  async loadMore(options: ScoredSearchOptions): Promise<ScoredSearchResponse> {
    return this.searchWithScoring(options);
  }

  /**
   * Group results by release group MBID.
   * Prioritizes Albums > EPs > Singles, then by score.
   *
   * @param results - Scored search results
   * @returns Grouped and deduplicated results
   */
  private groupByReleaseGroup(
    results: ScoredSearchResult[]
  ): GroupedSearchResult[] {
    // Group by release group MBID
    const groups = new Map<string, ScoredSearchResult[]>();

    for (const result of results) {
      const mbid = result.releaseGroupMbid;
      const existing = groups.get(mbid);
      if (existing) {
        existing.push(result);
      } else {
        groups.set(mbid, [result]);
      }
    }

    // Convert to GroupedSearchResult array
    const groupedResults: GroupedSearchResult[] = [];

    for (const [mbid, versions] of groups) {
      // Sort versions: type priority, then score descending
      versions.sort((a, b) => {
        const typeDiff =
          getTypePriority(a.primaryType) - getTypePriority(b.primaryType);
        if (typeDiff !== 0) return typeDiff;
        return b.normalizedScore - a.normalizedScore;
      });

      // First version is primary, rest are alternates
      const primaryResult = versions[0];
      const alternateVersions = versions.slice(1);

      // Find best score among all versions
      const bestScore = Math.max(...versions.map(v => v.normalizedScore));

      groupedResults.push({
        releaseGroupMbid: mbid,
        primaryResult,
        alternateVersions,
        versionCount: versions.length,
        bestScore,
      });
    }

    // Sort groups by: type priority of primary result, then by best score
    groupedResults.sort((a, b) => {
      const typeDiff =
        getTypePriority(a.primaryResult.primaryType) -
        getTypePriority(b.primaryResult.primaryType);
      if (typeDiff !== 0) return typeDiff;
      return b.bestScore - a.bestScore;
    });

    return groupedResults;
  }

  /**
   * Fetch a release group directly by MBID and convert to ScoredSearchResult.
   * Use this instead of re-searching when you already know the MBID.
   *
   * @param releaseGroupMbid - The MusicBrainz release group ID
   * @returns ScoredSearchResult with placeholder scoring (since we're not searching)
   */
  async getByMbid(releaseGroupMbid: string): Promise<ScoredSearchResult> {
    // Fetch release group directly from MusicBrainz
    const rgData = await this.mbService.getReleaseGroup(
      releaseGroupMbid,
      ['artist-credits'], // Include artist credits
      PRIORITY_TIERS.ADMIN
    );

    if (!rgData) {
      throw new Error(`Release group not found: ${releaseGroupMbid}`);
    }

    // Transform to CorrectionSearchResult format
    const baseResult = this.mapLookupToResult(rgData);

    // Return as ScoredSearchResult with placeholder scoring
    // (scoring doesn't apply when fetching directly by MBID)
    return {
      ...baseResult,
      normalizedScore: 1.0, // Perfect match since user selected it
      displayScore: 100,
      breakdown: {
        titleScore: 1.0,
        artistScore: 1.0,
        yearScore: 1.0,
        confidenceTier: 'high',
      },
      isLowConfidence: false,
      scoringStrategy: 'normalized',
    };
  }

  /**
   * Map MusicBrainz release group lookup response to correction result format.
   * Used for direct MBID lookups (different structure than search results).
   *
   * @param rg - MusicBrainz release group lookup response
   * @returns Normalized correction search result with CAA URL
   */
  private mapLookupToResult(rg: {
    id: string;
    title: string;
    disambiguation?: string;
    'first-release-date'?: string;
    'primary-type'?: string;
    'secondary-types'?: string[];
    'artist-credit'?: Array<{
      name: string;
      artist: { id: string; name: string };
    }>;
  }): CorrectionSearchResult {
    // Extract artist credits from lookup format (uses 'artist-credit' not 'artistCredit')
    const artistCredits: CorrectionArtistCredit[] = (
      rg['artist-credit'] || []
    ).map(ac => ({
      mbid: ac.artist.id,
      name: ac.name,
    }));

    // Build primary artist name from credits (comma-separated)
    const primaryArtistName = artistCredits.map(ac => ac.name).join(', ');

    // Compute CAA URL (250px thumbnail)
    const coverArtUrl = `https://coverartarchive.org/release-group/${rg.id}/front-250`;

    return {
      releaseGroupMbid: rg.id,
      title: rg.title,
      disambiguation: rg.disambiguation,
      artistCredits,
      primaryArtistName: primaryArtistName || 'Unknown Artist',
      firstReleaseDate: rg['first-release-date'],
      primaryType: rg['primary-type'],
      secondaryTypes: rg['secondary-types'],
      mbScore: 100, // Not from search, so use max score
      coverArtUrl,
      source: 'musicbrainz',
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
