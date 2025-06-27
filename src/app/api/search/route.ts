import { NextRequest, NextResponse } from 'next/server';
import chalk from 'chalk';
import { Client } from 'disconnect';

import {
  searchQuerySchema,
  validateQueryParams,
  createErrorResponse,
  type SearchQuery,
} from '@/lib/validations/api';
import { ApiErrorResponse } from '@/types/api';
import {
  UnifiedSearchResult,
  SearchFilters,
  SearchContext,
  SortBy,
  GroupBy,
  SearchMetadata,
  GroupedSearchResults,
  TrackSearchResult,
  SearchResponse,
} from '@/types/search';
import {
  deduplicateResults,
  applyFilters,
  sortResults,
  groupResults,
  applyContextSettings,
  createSearchMetadata,
  searchTracksInReleases,
  DeduplicationOptions,
} from '@/lib/search-utils';

const log = console.log;

// Initialize Discogs client - move this to a separate file in production
const db = new Client({
  userAgent: 'REC/1.0',
  consumerKey: process.env.CONSUMER_KEY,
  consumerSecret: process.env.CONSUMER_SECRET,
}).database();

// Default placeholder image for albums without images
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x400?text=No+Image';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now();
  let discogsApiStartTime: number;

  // Validate query parameters
  const validation = validateQueryParams(
    searchQuerySchema as any,
    request.nextUrl.searchParams
  );

  if (!validation.success) {
    console.error('Invalid search query parameters:', validation.details);
    const { response, status } = createErrorResponse(
      validation.error,
      400,
      validation.details.join('; '),
      'INVALID_QUERY_PARAMS'
    );
    return NextResponse.json(response as ApiErrorResponse, { status });
  }

  // ===========================
  // PHASE 3: Extract Enhanced Parameters
  // ===========================
  const {
    query,
    type,
    page,
    per_page,
    entityTypes,
    filters,
    context,
    sortBy,
    sortOrder,
    deduplicate,
    groupBy,
    limit,
    includeMetadata,
    searchInTracks,
  } = validation.data as SearchQuery & {
    entityTypes: string[];
    filters: SearchFilters;
    context: SearchContext;
    sortBy: SortBy;
    sortOrder: 'asc' | 'desc';
    deduplicate: boolean;
    groupBy: GroupBy;
    limit?: number;
    includeMetadata: boolean;
    searchInTracks: boolean;
  };

  try {
    log(
      chalk.yellow('Enhanced Search for: '),
      `"${query}" (type: ${type}, context: ${context}, dedupe: ${deduplicate})`
    );

    // ===========================
    // PHASE 3: Enhanced Search Logic
    // ===========================

    // Performance tracking
    const performance_metrics = {
      totalExecutionTime: 0,
      discogsApiTime: 0,
      processingTime: 0,
      deduplicationTime: 0,
      filteringTime: 0,
      sortingTime: 0,
    };

    // Search for content on Discogs with validated parameters
    discogsApiStartTime = performance.now();

    const searchResults = await db.search({
      query,
      type: type === 'all' ? undefined : type,
      page,
      per_page,
    });

    performance_metrics.discogsApiTime =
      performance.now() - discogsApiStartTime;

    console.log(
      `Found ${searchResults.results?.length || 0} results on page ${page}`
    );

    if (!searchResults.results || searchResults.results.length === 0) {
      console.log('No results found');
      const emptyResponse: SearchResponse = {
        results: [],
        grouped: { albums: [], artists: [], labels: [], other: [] },
        total: 0,
        pagination: {
          page,
          per_page,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
        ...(includeMetadata && {
          metadata: createSearchMetadata(
            query,
            filters,
            context,
            sortBy,
            groupBy,
            entityTypes,
            performance_metrics,
            false
          ),
          performance: performance_metrics,
        }),
      };
      return NextResponse.json(emptyResponse);
    }

    // ===========================
    // PHASE 3: Enhanced Result Processing
    // ===========================

    const processingStartTime = performance.now();

    // Process the results and categorize them
    let processedResults: UnifiedSearchResult[] = searchResults.results.map(
      (result: any): UnifiedSearchResult => {
        // Determine the type of result from resource_url or URI patterns
        let resultType: UnifiedSearchResult['type'] = 'unknown';
        const url = result.resource_url || result.uri || '';

        if (url.includes('/releases/') || url.includes('/masters/')) {
          resultType = 'album';
        } else if (url.includes('/artists/')) {
          resultType = 'artist';
        } else if (url.includes('/labels/')) {
          resultType = 'label';
        } else if (result.type) {
          // Fallback to type field if it exists
          if (result.type === 'release' || result.type === 'master') {
            resultType = 'album';
          } else if (result.type === 'artist') {
            resultType = 'artist';
          } else if (result.type === 'label') {
            resultType = 'label';
          }
        }

        // Extract title and artist from the result
        let title = result.title;
        let artist = 'Unknown Artist';
        let subtitle = '';

        // Handle different result types
        if (resultType === 'album') {
          // Handle album results
          if (result.title && result.title.includes(' - ')) {
            const parts = result.title.split(' - ');
            artist = parts[0] || 'Unknown Artist';
            title = parts[1] || result.title;
          } else if (result.artist) {
            artist = result.artist;
          }
          subtitle = artist;
        } else if (resultType === 'artist') {
          // Handle artist results
          title = result.title;
          artist = result.title;
          subtitle = 'Artist';
        } else if (resultType === 'label') {
          // Handle label results
          title = result.title;
          subtitle = 'Label';
        }

        // Get the image URL from the result
        const imageUrl =
          result.cover_image || result.thumb || PLACEHOLDER_IMAGE;

        // ===========================
        // PHASE 3: Enhanced Result Fields
        // ===========================

        // Extract enhanced metadata
        const releaseYear = result.year ? String(result.year) : '';
        const decade = releaseYear
          ? Math.floor(parseInt(releaseYear) / 10) * 10
          : undefined;

        // Create a unified result object
        const unifiedResult: UnifiedSearchResult = {
          id: result.id.toString(),
          type: resultType,
          title: title,
          subtitle: subtitle,
          artist: artist,
          releaseDate: releaseYear,
          genre: result.genre || [],
          label: result.label?.[0] || '',
          image: {
            url: imageUrl,
            width: 400,
            height: 400,
            alt: title || 'Cover image',
          },
          // Additional data for albums
          ...(resultType === 'album' && {
            tracks: [],
            metadata: {
              totalDuration: 0,
              numberOfTracks: 0,
            },
          }),
          // Store original Discogs data for reference
          _discogs: {
            type: result.type,
            uri: result.uri,
            resource_url: result.resource_url,
          },

          // ===========================
          // PHASE 3: Enhanced fields
          // ===========================

          // Enhanced genre information
          primaryGenre: (result.genre && result.genre[0]) || undefined,
          subgenres: result.style || [],

          // Additional metadata
          country: result.country,
          formats: result.format || [],
          decade: decade?.toString(),

          // Relevance scoring (basic implementation)
          relevanceScore: 100, // Default relevance, could be enhanced

          // Performance tracking
          _performance: {
            retrievalTime: performance_metrics.discogsApiTime,
            processingTime: 0, // Will be set later
          },
        };

        return unifiedResult;
      }
    );

    performance_metrics.processingTime =
      performance.now() - processingStartTime;

    // ===========================
    // PHASE 3: Apply Entity Type Filtering
    // ===========================

    if (entityTypes.length > 0) {
      processedResults = processedResults.filter(result =>
        entityTypes.includes(result.type)
      );
    }

    // ===========================
    // PHASE 3: Apply Advanced Filtering
    // ===========================

    let filteringInfo = { appliedCount: 0 };
    const totalBeforeFiltering = processedResults.length;

    if (Object.keys(filters).length > 0) {
      const filteringStartTime = performance.now();

      const filterResult = applyFilters(processedResults, filters);
      processedResults = filterResult.results;
      filteringInfo = { appliedCount: filterResult.appliedCount };

      performance_metrics.filteringTime =
        performance.now() - filteringStartTime;
    }

    // ===========================
    // PHASE 3: Apply Deduplication
    // ===========================

    let deduplicationInfo;

    if (deduplicate) {
      const deduplicationStartTime = performance.now();

      const deduplicationOptions: DeduplicationOptions = {
        strategy: context === 'modal' ? 'master-preferred' : 'artist-title',
        groupingMethod: 'artistTitle',
      };

      const deduplicationResult = deduplicateResults(
        processedResults,
        deduplicationOptions
      );
      processedResults = deduplicationResult.results;
      deduplicationInfo = deduplicationResult.info;

      performance_metrics.deduplicationTime =
        performance.now() - deduplicationStartTime;
    }

    // ===========================
    // PHASE 3: Apply Context Settings
    // ===========================

    processedResults = applyContextSettings(processedResults, context);

    // ===========================
    // PHASE 3: Apply Sorting
    // ===========================

    const sortingStartTime = performance.now();
    processedResults = sortResults(processedResults, sortBy, sortOrder);
    performance_metrics.sortingTime = performance.now() - sortingStartTime;

    // ===========================
    // PHASE 3: Apply Result Limits
    // ===========================

    if (limit) {
      processedResults = processedResults.slice(0, limit);
    }

    // ===========================
    // PHASE 3: Track Search Implementation
    // ===========================

    let trackResults: TrackSearchResult[] = [];

    if (searchInTracks && processedResults.length > 0) {
      trackResults = await searchTracksInReleases(query, processedResults);
    }

    // ===========================
    // PHASE 3: Enhanced Grouping
    // ===========================

    const groupedResults: GroupedSearchResults = {
      albums: processedResults.filter(r => r.type === 'album'),
      artists: processedResults.filter(r => r.type === 'artist'),
      labels: processedResults.filter(r => r.type === 'label'),
      tracks:
        trackResults.length > 0
          ? processedResults.filter(r => r.trackResults?.length)
          : undefined,
      other: processedResults.filter(
        r => !['album', 'artist', 'label'].includes(r.type)
      ),
    };

    // Calculate final performance metrics
    performance_metrics.totalExecutionTime = performance.now() - startTime;

    // ===========================
    // PHASE 3: Enhanced Response
    // ===========================

    // Calculate pagination info
    const total = searchResults.pagination?.items || processedResults.length;
    const totalPages = Math.ceil(total / per_page);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const searchResponse: SearchResponse = {
      results: processedResults,
      grouped: groupedResults,
      total: processedResults.length,
      pagination: {
        page,
        per_page,
        total,
        totalPages,
        hasNext,
        hasPrev,
        // Phase 3 enhancements
        totalBeforeFiltering,
        totalBeforeDeduplication: deduplicationInfo?.totalBeforeDeduplication,
        resultCounts: {
          albums: groupedResults.albums.length,
          artists: groupedResults.artists.length,
          labels: groupedResults.labels.length,
          tracks: trackResults.length,
          other: groupedResults.other.length,
        },
      },

      // ===========================
      // PHASE 3: Enhanced response fields
      // ===========================

      ...(includeMetadata && {
        metadata: createSearchMetadata(
          query,
          filters,
          context,
          sortBy,
          groupBy,
          entityTypes,
          performance_metrics,
          deduplicate,
          deduplicationInfo?.duplicatesRemoved
        ),
      }),

      ...(deduplicationInfo && { deduplication: deduplicationInfo }),

      ...(Object.keys(filters).length > 0 && {
        filterResults: {
          totalBeforeFiltering,
          totalAfterFiltering: processedResults.length,
          appliedFilters: filters,
        },
      }),

      performance: performance_metrics,

      context: {
        searchContext: context,
        // Could add user context or recommendation context here
      },
    };

    return NextResponse.json(searchResponse);
  } catch (error) {
    console.error('Error in enhanced search route:', error);
    const { response, status } = createErrorResponse(
      'Failed to search',
      500,
      error instanceof Error ? error.message : 'Unknown error',
      'SEARCH_FAILED'
    );
    return NextResponse.json(response as ApiErrorResponse, { status });
  }
}
