// src/lib/graphql/search.ts
// Full-text search implementation for GraphQL API

import { PrismaClient } from '@prisma/client';

export interface SearchResult {
  type: 'artist' | 'album' | 'track';
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  score: number;
}

export interface SearchOptions {
  query: string;
  types?: Array<'artist' | 'album' | 'track'>;
  limit?: number;
  offset?: number;
}

export class SearchService {
  constructor(private prisma: PrismaClient) {}

  async search(options: SearchOptions): Promise<{
    results: SearchResult[];
    total: number;
    hasMore: boolean;
  }> {
    const {
      query,
      types = ['artist', 'album', 'track'],
      limit = 20,
      offset = 0,
    } = options;

    // Sanitize query for PostgreSQL text search
    const searchQuery = this.sanitizeQuery(query);

    const results: SearchResult[] = [];

    // Search artists
    if (types.includes('artist')) {
      const artists = await this.searchArtists(searchQuery, limit);
      results.push(...artists);
    }

    // Search albums
    if (types.includes('album')) {
      const albums = await this.searchAlbums(searchQuery, limit);
      results.push(...albums);
    }

    // Search tracks
    if (types.includes('track')) {
      const tracks = await this.searchTracks(searchQuery, limit);
      results.push(...tracks);
    }

    // Sort by score and apply pagination
    const sortedResults = results
      .sort((a, b) => b.score - a.score)
      .slice(offset, offset + limit);

    return {
      results: sortedResults,
      total: results.length,
      hasMore: results.length > offset + limit,
    };
  }

  private async searchArtists(
    query: string,
    limit: number
  ): Promise<SearchResult[]> {
    // Use ILIKE for case-insensitive pattern matching
    const artists = await this.prisma.artist.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { biography: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
    });

    return artists.map((artist, index) => ({
      type: 'artist' as const,
      id: artist.id,
      title: artist.name,
      subtitle: artist.area || artist.countryCode || undefined,
      imageUrl: artist.imageUrl || undefined,
      // Score based on match position and length
      score: this.calculateScore(query, artist.name) + (limit - index) * 0.1,
    }));
  }

  private async searchAlbums(
    query: string,
    limit: number
  ): Promise<SearchResult[]> {
    const albums = await this.prisma.album.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { label: { contains: query, mode: 'insensitive' } },
          {
            artists: {
              some: {
                artist: {
                  name: { contains: query, mode: 'insensitive' },
                },
              },
            },
          },
        ],
      },
      include: {
        artists: {
          include: { artist: true },
          take: 1,
        },
      },
      take: limit * 3, // Get more results to properly score and filter
    });

    return albums
      .map((album, index) => {
        const artistName = album.artists[0]?.artist.name || '';

        // Calculate scores for title, artist, and label
        const titleScore = this.calculateScore(query, album.title);
        const artistScore = this.calculateScore(query, artistName) * 1.5; // Artist matches are more important
        const labelScore = album.label
          ? this.calculateScore(query, album.label) * 0.5
          : 0;

        // Use the best match score
        const bestScore = Math.max(titleScore, artistScore, labelScore);

        return {
          type: 'album' as const,
          id: album.id,
          title: album.title,
          subtitle: artistName,
          imageUrl: album.coverArtUrl || undefined,
          score: bestScore + (limit - index) * 0.01,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async searchTracks(
    query: string,
    limit: number
  ): Promise<SearchResult[]> {
    const tracks = await this.prisma.track.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { isrc: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        album: true,
        artists: {
          include: { artist: true },
          take: 1,
        },
      },
      take: limit,
    });

    return tracks.map((track, index) => ({
      type: 'track' as const,
      id: track.id,
      title: track.title,
      subtitle: `${track.artists[0]?.artist.name || 'Unknown'} • ${track.album?.title || 'Unknown Album'}`,
      imageUrl: track.album?.coverArtUrl || undefined,
      score: this.calculateScore(query, track.title) + (limit - index) * 0.1,
    }));
  }

  private sanitizeQuery(query: string): string {
    // Remove special characters that could break PostgreSQL queries
    return query
      .trim()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  private calculateScore(query: string, target: string): number {
    const normalizedQuery = query.toLowerCase();
    const normalizedTarget = target.toLowerCase();

    // Exact match gets highest score
    if (normalizedTarget === normalizedQuery) return 10;

    // Starting with query gets high score
    if (normalizedTarget.startsWith(normalizedQuery)) return 8;

    // Contains query gets medium score
    if (normalizedTarget.includes(normalizedQuery)) return 5;

    // Partial word matches get lower score
    const queryWords = normalizedQuery.split(' ');
    const targetWords = normalizedTarget.split(' ');
    let wordMatchScore = 0;

    for (const qWord of queryWords) {
      for (const tWord of targetWords) {
        if (tWord.includes(qWord)) {
          wordMatchScore += 2;
        }
      }
    }

    return wordMatchScore;
  }

  // Advanced search with filters
  async advancedSearch(options: {
    query: string;
    type?: 'artist' | 'album' | 'track';
    artistId?: string;
    albumId?: string;
    yearFrom?: number;
    yearTo?: number;
    limit?: number;
    offset?: number;
  }): Promise<{
    results: SearchResult[];
    total: number;
    facets: {
      types: Array<{ type: string; count: number }>;
      years: Array<{ year: number; count: number }>;
    };
  }> {
    const {
      query,
      type,
      artistId,
      albumId,
      yearFrom,
      yearTo,
      limit = 20,
      offset = 0,
    } = options;

    // Build dynamic where clause
    const where: any = {
      OR: [],
    };

    if (type === 'album' || !type) {
      const albumWhere: any = {
        title: { contains: query, mode: 'insensitive' },
      };

      if (artistId) {
        albumWhere.artists = {
          some: { artistId },
        };
      }

      if (yearFrom || yearTo) {
        albumWhere.releaseDate = {};
        if (yearFrom) albumWhere.releaseDate.gte = new Date(yearFrom, 0, 1);
        if (yearTo) albumWhere.releaseDate.lte = new Date(yearTo, 11, 31);
      }

      where.OR.push(albumWhere);
    }

    // Execute search and get results
    const results = await this.search({
      query,
      types: type ? [type] : undefined,
      limit,
      offset,
    });

    // Calculate facets (simplified for now)
    const facets = {
      types: [
        { type: 'artist', count: 0 },
        { type: 'album', count: 0 },
        { type: 'track', count: 0 },
      ],
      years: [],
    };

    return {
      ...results,
      facets,
    };
  }
}

// Create singleton instance
let searchService: SearchService | null = null;

export function getSearchService(prisma: PrismaClient): SearchService {
  if (!searchService) {
    searchService = new SearchService(prisma);
  }
  return searchService;
}
