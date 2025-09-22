import { PrismaClient } from '@prisma/client';
import { QueuedMusicBrainzService, getQueuedMusicBrainzService } from '../musicbrainz/queue-service';
import type { UnifiedSearchResult, SearchContext, SearchFilters, SortBy } from '@/types/search';

export enum SearchSource {
  LOCAL = 'LOCAL',
  MUSICBRAINZ = 'MUSICBRAINZ',
  DISCOGS = 'DISCOGS',
}

export type SearchType = 'album' | 'artist' | 'track';

export interface SearchOptions {
  query: string;
  types?: SearchType[];
  limit?: number;
  sources?: SearchSource[];
  filters?: SearchFilters;
  context?: SearchContext;
  sortBy?: SortBy;
  deduplicateResults?: boolean;
  timeout?: number;
}

export interface SearchResult {
  source: SearchSource;
  results: UnifiedSearchResult[];
  error?: Error;
  timing: {
    startTime: number;
    endTime: number;
    duration: number;
  };
}

export interface OrchestratedSearchResult {
  query: string;
  totalResults: number;
  results: UnifiedSearchResult[];
  sources: {
    local?: SearchResult;
    musicbrainz?: SearchResult;
    discogs?: SearchResult;
  };
  deduplicationApplied: boolean;
  duplicatesRemoved: number;
  timing: {
    totalDuration: number;
    localDuration?: number;
    musicbrainzDuration?: number;
    discogsDuration?: number;
  };
}

export class SearchOrchestrator {
  private prisma: PrismaClient;
  private musicbrainzService: QueuedMusicBrainzService;

  constructor(prisma: PrismaClient, musicbrainzService?: QueuedMusicBrainzService) {
    this.prisma = prisma;
    this.musicbrainzService = musicbrainzService || getQueuedMusicBrainzService();
  }

  async search(options: SearchOptions): Promise<OrchestratedSearchResult> {
    const startTime = Date.now();
    const {
      query,
      types = ['album', 'artist'],
      limit = 20,
      sources = [SearchSource.LOCAL, SearchSource.MUSICBRAINZ],
      deduplicateResults = true,
    } = options;

    const searchPromises: Promise<SearchResult>[] = [];

    if (sources.includes(SearchSource.LOCAL)) {
      searchPromises.push(this.searchLocal(query, types, limit));
    }

    if (sources.includes(SearchSource.MUSICBRAINZ)) {
      searchPromises.push(this.searchMusicBrainz(query, types, limit));
    }

    if (sources.includes(SearchSource.DISCOGS)) {
      searchPromises.push(this.searchDiscogs(query, types, limit));
    }

    const results = await Promise.allSettled(searchPromises);

    const sourceResults: OrchestratedSearchResult['sources'] = {};
    let allResults: UnifiedSearchResult[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const searchResult = result.value;
        allResults = [...allResults, ...searchResult.results];

        if (sources[index] === SearchSource.LOCAL) {
          sourceResults.local = searchResult;
        } else if (sources[index] === SearchSource.MUSICBRAINZ) {
          sourceResults.musicbrainz = searchResult;
        } else if (sources[index] === SearchSource.DISCOGS) {
          sourceResults.discogs = searchResult;
        }
      }
    });

    let finalResults = allResults;
    let duplicatesRemoved = 0;

    if (deduplicateResults && allResults.length > 0) {
      const dedupeResult = this.deduplicateResults(allResults);
      finalResults = dedupeResult.results;
      duplicatesRemoved = dedupeResult.duplicatesRemoved;
    }

    const endTime = Date.now();

    return {
      query,
      totalResults: finalResults.length,
      results: finalResults.slice(0, limit),
      sources: sourceResults,
      deduplicationApplied: deduplicateResults,
      duplicatesRemoved,
      timing: {
        totalDuration: endTime - startTime,
        localDuration: sourceResults.local?.timing.duration,
        musicbrainzDuration: sourceResults.musicbrainz?.timing.duration,
        discogsDuration: sourceResults.discogs?.timing.duration,
      },
    };
  }

  private async searchLocal(
    query: string,
    types: SearchType[],
    limit: number
  ): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      const results: UnifiedSearchResult[] = [];

      if (types.includes('album')) {
        // Use Prisma's regular query with case-insensitive search
        const albums = await this.prisma.album.findMany({
          where: {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              {
                artists: {
                  some: {
                    artist: {
                      name: { contains: query, mode: 'insensitive' }
                    }
                  }
                }
              }
            ]
          },
          include: {
            artists: {
              include: {
                artist: true
              }
            }
          },
          take: limit,
          orderBy: [
            { title: 'asc' }
          ]
        });

        results.push(...albums.map(album => this.mapAlbumToUnifiedResult(album)));
      }

      if (types.includes('artist')) {
        // Use Prisma's regular query for artists
        const artists = await this.prisma.artist.findMany({
          where: {
            name: { contains: query, mode: 'insensitive' }
          },
          take: limit,
          orderBy: [
            { name: 'asc' }
          ]
        });

        results.push(...artists.map(artist => this.mapArtistToUnifiedResult(artist)));
      }

      if (types.includes('track')) {
        // Use Prisma's regular query for tracks
        const tracks = await this.prisma.track.findMany({
          where: {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              {
                artists: {
                  some: {
                    artist: {
                      name: { contains: query, mode: 'insensitive' }
                    }
                  }
                }
              }
            ]
          },
          include: {
            album: {
              include: {
                artists: {
                  include: {
                    artist: true
                  }
                }
              }
            },
            artists: {
              include: {
                artist: true
              }
            }
          },
          take: limit,
          orderBy: [
            { title: 'asc' }
          ]
        });

        results.push(...tracks.map(track => this.mapTrackToUnifiedResult(track)));
      }

      const endTime = Date.now();

      return {
        source: SearchSource.LOCAL,
        results,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime,
        },
      };
    } catch (error) {
      const endTime = Date.now();
      return {
        source: SearchSource.LOCAL,
        results: [],
        error: error as Error,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime,
        },
      };
    }
  }

  private async searchMusicBrainz(
    query: string,
    types: SearchType[],
    limit: number
  ): Promise<SearchResult> {
    const startTime = Date.now();

    // TODO: Research better MusicBrainz search strategies:
    // 1. Use advanced Lucene query syntax for more precise results
    //    - Consider searching with: artist:(query) AND primarytype:album AND status:official
    //    - Use fuzzy search (~) for spelling variations
    //    - Implement weighted searches for different fields
    // 2. Make multiple API calls with different strategies and merge results:
    //    - First search for exact artist name matches
    //    - Then search for album titles
    //    - Finally do a general search
    // 3. Use MusicBrainz relationships to get better data:
    //    - Fetch artist first, then get their release groups
    //    - This would give us complete discographies
    // 4. Consider caching artist MBIDs locally after first search
    //    - Would allow direct lookups for known artists
    // 5. Look into using release-group type and status filters more effectively
    //    - Filter by status:official to exclude bootlegs
    //    - Properly handle various release types (album, single, EP, etc)
    // 6. Investigate using MusicBrainz's browse endpoints instead of search
    //    - browse/release-group?artist=<mbid> gives all releases for an artist

    try {
      const results: UnifiedSearchResult[] = [];

      // Execute searches in parallel for better performance
      const promises: Promise<any>[] = [];

      if (types.includes('album')) {
        promises.push(
          this.musicbrainzService.searchReleaseGroups(query, limit * 2) // Get extra to filter
            .then(releaseGroups => {
              // Sort by MusicBrainz score and filter by quality
              const sorted = releaseGroups
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .slice(0, limit);
              results.push(...sorted.map(rg => this.mapMusicBrainzReleaseToUnifiedResult(rg)));
            })
            .catch(err => {
              console.error('Error searching MusicBrainz albums:', err);
            })
        );
      }

      if (types.includes('artist')) {
        promises.push(
          this.musicbrainzService.searchArtists(query, limit)
            .then(artists => {
              results.push(...artists.map(artist => this.mapMusicBrainzArtistToUnifiedResult(artist)));
            })
            .catch(err => {
              console.error('Error searching MusicBrainz artists:', err);
            })
        );
      }

      if (types.includes('track')) {
        promises.push(
          this.musicbrainzService.searchRecordings(query, limit)
            .then(recordings => {
              results.push(...recordings.map(rec => this.mapMusicBrainzRecordingToUnifiedResult(rec)));
            })
            .catch(err => {
              console.error('Error searching MusicBrainz tracks:', err);
            })
        );
      }

      // Wait for all searches to complete
      await Promise.allSettled(promises);

      const endTime = Date.now();

      return {
        source: SearchSource.MUSICBRAINZ,
        results,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime,
        },
      };
    } catch (error) {
      const endTime = Date.now();
      console.error('MusicBrainz search error:', error);
      return {
        source: SearchSource.MUSICBRAINZ,
        results: [],
        error: error as Error,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime,
        },
      };
    }
  }

  private async searchDiscogs(
    query: string,
    types: SearchType[],
    limit: number
  ): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      // TODO: Move Discogs client initialization to a service class
      // For now, create client inline (same as old route.ts)
      const Discogs = require('disconnect').Client;
      const db = new Discogs({
        userAgent: 'RecProject/1.0',
        userToken: process.env.DISCOGS_TOKEN || 'QJRXBuUbvTQccgvYSRgKPPjJEPHAZoRJVkRQSRXW'
      }).database();

      const results: UnifiedSearchResult[] = [];

      // Search for albums on Discogs
      if (types.includes('album')) {
        const searchResults = await db.search({
          query,
          per_page: limit,
        });

        if (searchResults.results && searchResults.results.length > 0) {
          results.push(...searchResults.results.map((result: any) =>
            this.mapDiscogsToUnifiedResult(result)
          ));
        }
      }

      // TODO: Add artist and track search support for Discogs

      const endTime = Date.now();
      return {
        source: SearchSource.DISCOGS,
        results,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime,
        },
      };
    } catch (error) {
      const endTime = Date.now();
      console.error('Discogs search error:', error);
      return {
        source: SearchSource.DISCOGS,
        results: [],
        error: error as Error,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime,
        },
      };
    }
  }

  private mapDiscogsToUnifiedResult(result: any): UnifiedSearchResult {
    // Extract title and artist from the result
    let title = result.title;
    let artist = 'Unknown Artist';

    // Handle different Discogs result formats
    if (result.title.includes(' - ')) {
      const parts = result.title.split(' - ');
      artist = parts[0] || 'Unknown Artist';
      title = parts[1] || result.title;
    } else if (result.artist) {
      artist = result.artist;
    }

    return {
      id: result.id.toString(),
      type: 'album',
      title: title,
      subtitle: result.format?.join(', ') || 'Album',
      artist: artist,
      releaseDate: result.year || null,
      genre: result.genre || [],
      label: result.label?.[0] || '',
      image: {
        url: result.cover_image || result.thumb || '',
        width: 400,
        height: 400,
        alt: title,
      },
      _discogs: {
        type: result.type,
        uri: result.uri,
        resource_url: result.resource_url,
      },
    };
  }

  private deduplicateResults(results: UnifiedSearchResult[]): {
    results: UnifiedSearchResult[];
    duplicatesRemoved: number;
  } {
    const seen = new Map<string, UnifiedSearchResult>();
    const dedupedResults: UnifiedSearchResult[] = [];
    let duplicatesRemoved = 0;

    for (const result of results) {
      const keys = this.getDeduplicationKeys(result);

      let isDuplicate = false;
      for (const key of keys) {
        if (seen.has(key)) {
          duplicatesRemoved++;
          isDuplicate = true;

          const existing = seen.get(key)!;
          if (this.shouldReplaceResult(existing, result)) {
            const index = dedupedResults.indexOf(existing);
            if (index > -1) {
              dedupedResults[index] = result;
              seen.set(key, result);
            }
          }
          break;
        }
      }

      if (!isDuplicate) {
        dedupedResults.push(result);
        for (const key of keys) {
          seen.set(key, result);
        }
      }
    }

    return {
      results: dedupedResults,
      duplicatesRemoved,
    };
  }

  private getDeduplicationKeys(result: UnifiedSearchResult): string[] {
    const keys: string[] = [];

    // Priority 1: Check for exact ID matches (most reliable)
    // Check if the result has a MusicBrainz ID (either as main ID for MB results, or in metadata)
    if (result.id && result.type === 'album' && result.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
      // This is a MusicBrainz ID (UUID format)
      keys.push(`musicbrainz:${result.id}`);
    }
    if (result._discogs?.uri) {
      keys.push(`discogs:${result._discogs.uri}`);
    }

    // Priority 2: Fallback to artist-title matching
    const normalizedArtist = result.artist.toLowerCase().trim();
    const normalizedTitle = result.title.toLowerCase().trim();
    keys.push(`${normalizedArtist}:${normalizedTitle}`);

    return keys;
  }

  private shouldReplaceResult(existing: UnifiedSearchResult, candidate: UnifiedSearchResult): boolean {
    // Prefer local database results over external (they have richer data)
    if (existing.id.startsWith('cm') && !candidate.id.startsWith('cm')) {
      return false; // Keep local result
    }
    if (!existing.id.startsWith('cm') && candidate.id.startsWith('cm')) {
      return true; // Replace with local result
    }

    // Prefer results with images
    if (candidate.image?.url && !existing.image?.url) {
      return true;
    }

    // Prefer results with track listings
    if (candidate.tracks?.length && !existing.tracks?.length) {
      return true;
    }

    // Prefer results with better metadata
    if (candidate.releaseDate && !existing.releaseDate) {
      return true;
    }

    // Prefer higher relevance scores (if available)
    if ((candidate.relevanceScore || 0) > (existing.relevanceScore || 0)) {
      return true;
    }

    return false;
  }

  private mapAlbumToUnifiedResult(album: any): UnifiedSearchResult {
    const primaryArtist = album.artists?.[0]?.artist;

    return {
      id: album.id,
      type: 'album',
      title: album.title,
      subtitle: album.releaseType || 'Album',
      artist: primaryArtist?.name || 'Unknown Artist',
      releaseDate: album.releaseDate?.toISOString() || '',
      genre: album.genres || [],
      label: album.label || '',
      image: {
        url: album.coverArtUrl || '',
        width: 300,
        height: 300,
        alt: album.title,
      },
      _discogs: {
        uri: album.discogsId ? `/releases/${album.discogsId}` : undefined,
      },
    };
  }

  private mapArtistToUnifiedResult(artist: any): UnifiedSearchResult {
    return {
      id: artist.id,
      type: 'artist',
      title: artist.name,
      subtitle: artist.artistType || 'Artist',
      artist: artist.name,
      releaseDate: '',
      genre: artist.genres || [],
      label: '',
      image: {
        url: artist.imageUrl || '',
        width: 300,
        height: 300,
        alt: artist.name,
      },
      _discogs: {
        uri: artist.discogsId ? `/artists/${artist.discogsId}` : undefined,
      },
    };
  }

  private mapMusicBrainzReleaseToUnifiedResult(release: any): UnifiedSearchResult {
    // Build subtitle showing release type
    let subtitle = release.primaryType || 'Release';
    if (release.secondaryTypes && release.secondaryTypes.length > 0) {
      // Show the most relevant secondary type
      const secondaryType = release.secondaryTypes[0];
      subtitle = `${subtitle} • ${secondaryType}`;
    }

    return {
      id: release.id,
      type: 'album',
      title: release.title,
      subtitle,
      artist: release.artistCredit?.[0]?.artist?.name ||
              release['artist-credit']?.[0]?.artist?.name ||
              'Unknown Artist',
      releaseDate: release.firstReleaseDate || release['first-release-date'] || null,
      genre: release.tags?.map((t: any) => t.name) || [],
      label: '',
      image: {
        url: '',
        width: 300,
        height: 300,
        alt: release.title,
      },
      relevanceScore: release.score, // Pass through MusicBrainz's score
      _discogs: {},
    };
  }

  private mapMusicBrainzArtistToUnifiedResult(artist: any): UnifiedSearchResult {
    return {
      id: artist.id,
      type: 'artist',
      title: artist.name,
      subtitle: artist.type || 'Artist',
      artist: artist.name,
      releaseDate: '',
      genre: artist.tags?.map((t: any) => t.name) || [],
      label: '',
      image: {
        url: '',
        width: 300,
        height: 300,
        alt: artist.name,
      },
      _discogs: {},
    };
  }

  private mapMusicBrainzRecordingToUnifiedResult(recording: any): UnifiedSearchResult {
    return {
      id: recording.id,
      type: 'track',
      title: recording.title,
      subtitle: 'Recording',
      artist: recording['artist-credit']?.[0]?.artist?.name || 'Unknown Artist',
      releaseDate: recording['first-release-date'] || null, // Return null instead of empty string
      genre: recording.tags?.map((t: any) => t.name) || [],
      label: '',
      image: {
        url: '',
        width: 300,
        height: 300,
        alt: recording.title,
      },
      _discogs: {},
    };
  }

  private mapTrackToUnifiedResult(track: any): UnifiedSearchResult {
    const primaryArtist = track.artists?.[0]?.artist || track.album?.artists?.[0]?.artist;

    return {
      id: track.id,
      type: 'track',
      title: track.title,
      subtitle: `Track ${track.trackNumber}${track.album ? ` - ${track.album.title}` : ''}`,
      artist: primaryArtist?.name || 'Unknown Artist',
      releaseDate: track.album?.releaseDate?.toISOString() || '',
      genre: track.album?.genres || [],
      label: track.album?.label || '',
      image: {
        url: track.album?.coverArtUrl || '',
        width: 300,
        height: 300,
        alt: track.album?.title || track.title,
      },
      metadata: {
        totalDuration: track.durationMs || 0,
        numberOfTracks: 1,
      },
      _discogs: {
        uri: track.discogsReleaseId ? `/releases/${track.discogsReleaseId}` : undefined,
      },
    };
  }
}