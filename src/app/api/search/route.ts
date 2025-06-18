import { NextRequest, NextResponse } from 'next/server';
import chalk from 'chalk';

import {
  searchQuerySchema,
  validateQueryParams,
  createErrorResponse,
  type SearchQuery,
} from '@/lib/validations/api';
import {
  SearchResponse,
  SearchResultItem,
  ApiErrorResponse,
} from '@/types/api';

const log = console.log;

// Initialize Discogs client - move this to a separate file in production
const { Client } = require('disconnect');
const db = new Client({
  userAgent: 'REC/1.0',
  consumerKey: process.env.CONSUMER_KEY,
  consumerSecret: process.env.CONSUMER_SECRET,
}).database();

// Default placeholder image for albums without images
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x400?text=No+Image';

export async function GET(request: NextRequest): Promise<NextResponse> {
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

  const { query, type, page, per_page } = validation.data as SearchQuery;

  try {
    log(
      chalk.yellow('Searching Discogs for: '),
      `"${query}" (type: ${type}, page: ${page}, per_page: ${per_page})`
    );

    // Search for content on Discogs with validated parameters
    const searchResults = await db.search({
      query,
      type: type === 'all' ? undefined : type,
      page,
      per_page,
    });

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
      };
      return NextResponse.json(emptyResponse);
    }

    // Process the results and categorize them
    const processedResults: SearchResultItem[] = searchResults.results.map(
      (result: any): SearchResultItem => {
        // Determine the type of result from resource_url or URI patterns
        let resultType: SearchResultItem['type'] = 'unknown';
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

        // Create a unified result object
        const unifiedResult: SearchResultItem = {
          id: result.id.toString(),
          type: resultType,
          title: title,
          subtitle: subtitle,
          artist: artist,
          releaseDate: result.year ? String(result.year) : '',
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
        };

        return unifiedResult;
      }
    );

    // Group results by type for easier handling
    const groupedResults = {
      albums: processedResults.filter(r => r.type === 'album'),
      artists: processedResults.filter(r => r.type === 'artist'),
      labels: processedResults.filter(r => r.type === 'label'),
      other: processedResults.filter(
        r => !['album', 'artist', 'label'].includes(r.type)
      ),
    };

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
      },
    };

    return NextResponse.json(searchResponse);
  } catch (error) {
    console.error('Error in search route:', error);
    const { response, status } = createErrorResponse(
      'Failed to search',
      500,
      error instanceof Error ? error.message : 'Unknown error',
      'SEARCH_FAILED'
    );
    return NextResponse.json(response as ApiErrorResponse, { status });
  }
}
