// ===========================
// PHASE 3: Search Enhancement Utilities
// ===========================

import {
  UnifiedSearchResult,
  SearchFilters,
  SearchContext,
  SortBy,
  GroupBy,
  DeduplicationInfo,
  TrackSearchResult,
  SearchMetadata,
} from '@/types/search';

// ===========================
// Deduplication Utilities
// ===========================

export interface DeduplicationOptions {
  strategy: 'master-preferred' | 'artist-title' | 'none';
  preserveType?: 'master' | 'release' | 'auto';
  groupingMethod?: 'masterId' | 'artistTitle' | 'exactMatch';
}

/**
 * Smart deduplication preferring master releases over individual releases
 */
export function deduplicateResults(
  results: UnifiedSearchResult[],
  options: DeduplicationOptions = { strategy: 'master-preferred' }
): { results: UnifiedSearchResult[]; info: DeduplicationInfo } {
  const startTime = performance.now();
  const originalCount = results.length;
  let deduplicatedResults = [...results];

  const info: DeduplicationInfo = {
    strategy: options.strategy,
    totalBeforeDeduplication: originalCount,
    totalAfterDeduplication: originalCount,
    duplicatesRemoved: 0,
    masterPreferenceApplied: false,
    groupingMethod: options.groupingMethod || 'artistTitle',
  };

  if (options.strategy === 'none') {
    info.totalAfterDeduplication = originalCount;
    return { results: deduplicatedResults, info };
  }

  if (options.strategy === 'master-preferred') {
    // Group by master ID if available, then by artist-title combination
    const groups = new Map<string, UnifiedSearchResult[]>();

    for (const result of results) {
      if (result.type !== 'album') continue;

      // Try to extract master ID from Discogs URI
      let groupKey: string;
      const uri = result._discogs?.uri || result._discogs?.resource_url || '';

      if (uri.includes('/masters/')) {
        const masterId = uri.match(/\/masters\/(\d+)/)?.[1];
        groupKey = masterId
          ? `master:${masterId}`
          : `${result.artist}:${result.title}`;
        info.groupingMethod = 'masterId';
      } else {
        groupKey = `${result.artist}:${result.title}`;
        info.groupingMethod = 'artistTitle';
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(result);
    }

    // For each group, prefer master release or most recent
    const preferredResults: UnifiedSearchResult[] = [];
    let duplicatesFound = 0;

    for (const [groupKey, groupResults] of groups) {
      if (groupResults.length === 1) {
        preferredResults.push(groupResults[0]);
        continue;
      }

      duplicatesFound += groupResults.length - 1;

      // Sort by preference: master > release > most recent
      const sortedGroup = groupResults.sort((a, b) => {
        const aIsMaster =
          a._discogs?.uri?.includes('/masters/') ||
          a._discogs?.type === 'master';
        const bIsMaster =
          b._discogs?.uri?.includes('/masters/') ||
          b._discogs?.type === 'master';

        if (aIsMaster && !bIsMaster) return -1;
        if (!aIsMaster && bIsMaster) return 1;

        // If both are same type, prefer more recent
        const aYear = parseInt((a.releaseDate || '').toString()) || 0;
        const bYear = parseInt((b.releaseDate || '').toString()) || 0;
        return bYear - aYear;
      });

      const preferred = sortedGroup[0];
      const duplicateIds = sortedGroup.slice(1).map(r => r.id);

      // Add deduplication metadata
      preferred._deduplication = {
        isDuplicate: false,
        masterOf: duplicateIds,
        groupingKey: groupKey,
      };

      preferredResults.push(preferred);
      info.masterPreferenceApplied = true;
    }

    // Include non-album results without deduplication
    const nonAlbumResults = results.filter(r => r.type !== 'album');
    deduplicatedResults = [...preferredResults, ...nonAlbumResults];
    info.duplicatesRemoved = duplicatesFound;
  }

  if (options.strategy === 'artist-title') {
    // Simple artist-title deduplication
    const seen = new Set<string>();
    const filtered: UnifiedSearchResult[] = [];
    let duplicatesFound = 0;

    for (const result of results) {
      const key = `${(result.artist || '').toString()}:${(result.title || '').toString()}`.toLowerCase();

      if (seen.has(key)) {
        duplicatesFound++;
        continue;
      }

      seen.add(key);
      filtered.push(result);
    }

    deduplicatedResults = filtered;
    info.duplicatesRemoved = duplicatesFound;
  }

  info.totalAfterDeduplication = deduplicatedResults.length;

  return { results: deduplicatedResults, info };
}

// ===========================
// Filtering Utilities
// ===========================

/**
 * Apply advanced filters to search results
 */
export function applyFilters(
  results: UnifiedSearchResult[],
  filters: SearchFilters
): { results: UnifiedSearchResult[]; appliedCount: number } {
  let filtered = [...results];
  const originalCount = results.length;

  // Genre filtering
  if (filters.genre && filters.genre.length > 0) {
    filtered = filtered.filter(result =>
      result.genre.some(g =>
        filters.genre!.some(fg => g.toLowerCase().includes(fg.toLowerCase()))
      )
    );
  }

  // Year range filtering
  if (filters.year) {
    filtered = filtered.filter(result => {
      const year = parseInt(result.releaseDate || '');
      if (isNaN(year)) return true; // Keep results without year

      if (filters.year!.min && year < filters.year!.min) return false;
      if (filters.year!.max && year > filters.year!.max) return false;

      return true;
    });
  }

  // Decade filtering
  if (filters.decade && filters.decade.length > 0) {
    filtered = filtered.filter(result => {
      const year = parseInt(result.releaseDate || '');
      if (isNaN(year)) return true;

      const decade = Math.floor(year / 10) * 10;
      return filters.decade!.includes(decade.toString());
    });
  }

  // Label filtering
  if (filters.label && filters.label.length > 0) {
    filtered = filtered.filter(result =>
      filters.label!.some(label => (result.label || '').toLowerCase().includes(label.toLowerCase()))
    );
  }

  // Country filtering (if available in result)
  if (filters.country && filters.country.length > 0) {
    filtered = filtered.filter(
      result => result.country && filters.country!.includes(result.country)
    );
  }

  // Format filtering (if available in result)
  if (filters.format && filters.format.length > 0) {
    filtered = filtered.filter(
      result =>
        result.formats && result.formats.some(f => filters.format!.includes(f))
    );
  }

  return {
    results: filtered,
    appliedCount: originalCount - filtered.length,
  };
}

// ===========================
// Sorting Utilities
// ===========================

/**
 * Sort search results based on specified criteria
 */
export function sortResults(
  results: UnifiedSearchResult[],
  sortBy: SortBy,
  sortOrder: 'asc' | 'desc' = 'desc'
): UnifiedSearchResult[] {
  const sorted = [...results];

  const multiplier = sortOrder === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return (a.title || '').localeCompare(b.title || '') * multiplier;

      case 'artist':
        return (a.artist || '').localeCompare(b.artist || '') * multiplier;

      case 'year':
        const aYear = parseInt((a.releaseDate || '').toString()) || 0;
        const bYear = parseInt((b.releaseDate || '').toString()) || 0;
        return (aYear - bYear) * multiplier;

      case 'alphabetical':
        return (
          `${a.artist || ''} - ${a.title || ''}`.localeCompare(`${b.artist || ''} - ${b.title || ''}`) *
          multiplier
        );

      case 'popularity':
        // Use relevance score as popularity proxy
        const aScore = a.relevanceScore || 0;
        const bScore = b.relevanceScore || 0;
        return (aScore - bScore) * multiplier;

      case 'relevance':
      default:
        // Default Discogs relevance + our relevance score
        const aRelevance = a.relevanceScore || 0;
        const bRelevance = b.relevanceScore || 0;
        return (aRelevance - bRelevance) * multiplier;
    }
  });

  return sorted;
}

// ===========================
// Grouping Utilities
// ===========================

/**
 * Group search results based on specified criteria
 */
export function groupResults(
  results: UnifiedSearchResult[],
  groupBy: GroupBy
): Record<string, UnifiedSearchResult[]> {
  if (groupBy === 'none') {
    return { all: results };
  }

  const groups: Record<string, UnifiedSearchResult[]> = {};

  for (const result of results) {
    let groupKey: string;

    switch (groupBy) {
      case 'type':
        groupKey = result.type;
        break;

      case 'artist':
        groupKey = result.artist || 'Unknown Artist';
        break;

      case 'label':
        groupKey = result.label || 'Unknown Label';
        break;

      case 'year':
        const year = parseInt(result.releaseDate || '');
        groupKey = isNaN(year) ? 'Unknown Year' : year.toString();
        break;

      case 'genre':
        groupKey = result.primaryGenre || result.genre[0] || 'Unknown Genre';
        break;

      default:
        groupKey = 'other';
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(result);
  }

  return groups;
}

// ===========================
// Track Search Utilities
// ===========================

/**
 * Extract track information from release data (Discogs workaround)
 */
export async function searchTracksInReleases(
  query: string,
  releases: UnifiedSearchResult[]
): Promise<TrackSearchResult[]> {
  const trackResults: TrackSearchResult[] = [];
  const searchTerms = query.toLowerCase().split(' ');

  for (const release of releases) {
    if (release.type !== 'album' || !release.tracks) continue;

    for (const track of release.tracks) {
      const trackTitle = track.title.toLowerCase();

      // Check if query matches track title
      const matches = searchTerms.every(
        term =>
          trackTitle.includes(term) ||
          release.artist.toLowerCase().includes(term)
      );

      if (matches) {
        trackResults.push({
          id: `${release.id}-${track.trackNumber || track.title}`,
          title: track.title,
          artist: release.artist,
          duration: track.duration?.toString(),
          position: track.trackNumber?.toString(),
          releaseId: release.id,
          releaseTitle: release.title || '',
          releaseYear: release.releaseDate || '',
          releaseImage: release.image
            ? { url: String(release.image), width: 300, height: 300, alt: String(release.title || '') }
            : undefined,
        });
      }
    }
  }

  return trackResults;
}

// ===========================
// Context-Specific Utilities
// ===========================

/**
 * Apply context-specific modifications to results
 */
export function applyContextSettings(
  results: UnifiedSearchResult[],
  context: SearchContext
): UnifiedSearchResult[] {
  let contextResults = [...results];

  switch (context) {
    case 'modal':
      // Modal context: prefer albums, limit results
      contextResults = contextResults
        .filter(r => r.type === 'album')
        .slice(0, 5);
      break;

    case 'recommendations':
      // Recommendations context: apply weighting
      contextResults = contextResults.map(result => ({
        ...result,
        weight: result.type === 'album' ? 5 : result.type === 'artist' ? 3 : 1,
      }));
      break;

    case 'compact':
      // Compact context: minimal results
      contextResults = contextResults.slice(0, 6);
      break;

    case 'users':
      // Users context: filter for user-type results
      contextResults = contextResults.filter(r => r.type === 'user');
      break;

    case 'global':
    case 'collection':
    case 'sidebar':
    case 'inline':
    default:
      // No specific modifications for these contexts
      break;
  }

  return contextResults;
}

// ===========================
// Performance Utilities
// ===========================

/**
 * Create search metadata for performance tracking
 */
export function createSearchMetadata(
  query: string,
  filters: SearchFilters,
  context: SearchContext,
  sortBy: SortBy,
  groupBy: GroupBy,
  entityTypes: string[],
  performance: Record<string, number>,
  deduplicationApplied: boolean,
  duplicatesRemoved?: number
): SearchMetadata {
  return {
    query,
    executionTime: performance.totalExecutionTime || 0,
    totalResults: performance.totalResults || 0,
    deduplicationApplied,
    duplicatesRemoved,
    filtersApplied: filters,
    context,
    sortBy,
    groupBy,
    entityTypes,
    timestamp: new Date().toISOString(),
    performance: {
      discogsApiTime: performance.discogsApiTime,
      processingTime: performance.processingTime || 0,
      deduplicationTime: performance.deduplicationTime,
      filteringTime: performance.filteringTime,
    },
  };
}
