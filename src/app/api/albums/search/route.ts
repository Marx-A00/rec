import { NextResponse } from 'next/server';
import { SearchOrchestrator, SearchSource, SearchType } from '@/lib/search/SearchOrchestrator';
import { prisma } from '@/lib/prisma';
import type { SearchResponse, GroupedSearchResults } from '@/types/search';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const sources = searchParams.get('sources')?.split(',') || ['local'];
  const types = searchParams.get('types')?.split(',') as SearchType[] || ['album', 'artist'];
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  if (!query) {
    console.log('Missing query parameter');
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  try {
    console.log(`Searching for: "${query}" in sources: ${sources.join(', ')}`);

    // Create SearchOrchestrator instance
    const orchestrator = new SearchOrchestrator(prisma);

    // Map source strings to SearchSource enum
    const searchSources: SearchSource[] = sources.map(source => {
      switch (source.toLowerCase()) {
        case 'musicbrainz':
          return SearchSource.MUSICBRAINZ;
        case 'discogs':
          return SearchSource.DISCOGS;
        case 'local':
        default:
          return SearchSource.LOCAL;
      }
    });

    // Perform orchestrated search
    const searchResult = await orchestrator.search({
      query,
      types,
      sources: searchSources,
      limit,
      deduplicateResults: true,
    });

    // Group results by type for compatibility with existing UI
    const grouped: GroupedSearchResults = {
      albums: searchResult.results.filter(r => r.type === 'album'),
      artists: searchResult.results.filter(r => r.type === 'artist'),
      labels: [],
      tracks: searchResult.results.filter(r => r.type === 'track'),
      other: searchResult.results.filter(r => !['album', 'artist', 'track'].includes(r.type)),
    };

    // Format response to match existing SearchResponse interface
    const response: SearchResponse = {
      results: searchResult.results,
      grouped,
      total: searchResult.totalResults,
      metadata: {
        query,
        executionTime: searchResult.timing.totalDuration,
        totalResults: searchResult.totalResults,
        deduplicationApplied: searchResult.deduplicationApplied,
        duplicatesRemoved: searchResult.duplicatesRemoved,
        filtersApplied: {},
        context: 'global',
        sortBy: 'relevance',
        groupBy: 'none',
        entityTypes: types,
        timestamp: new Date().toISOString(),
        performance: {
          processingTime: searchResult.timing.totalDuration,
          deduplicationTime: 0,
        },
      },
      deduplication: {
        strategy: 'artist-title',
        totalBeforeDeduplication: searchResult.totalResults + searchResult.duplicatesRemoved,
        totalAfterDeduplication: searchResult.totalResults,
        duplicatesRemoved: searchResult.duplicatesRemoved,
        masterPreferenceApplied: false,
        groupingMethod: 'artistTitle',
      },
      performance: {
        totalExecutionTime: searchResult.timing.totalDuration,
        processingTime: searchResult.timing.localDuration || 0,
      },
    };

    // For backward compatibility with existing UI that expects { albums: [...] }
    if (sources.length === 1 && sources[0] === 'discogs') {
      // Legacy format for Discogs-only search
      return NextResponse.json({
        albums: grouped.albums.map(album => ({
          id: album.id,
          title: album.title,
          artist: album.artist,
          releaseDate: album.releaseDate,
          genre: album.genre,
          label: album.label,
          image: album.image,
          tracks: album.tracks || [],
          metadata: album.metadata || {
            totalDuration: 0,
            numberOfTracks: 0,
          },
        }))
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error searching:', error);
    return NextResponse.json(
      {
        error: 'Failed to search',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}