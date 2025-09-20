import { PrismaClient } from '@prisma/client';
import { QueuedMusicBrainzService } from '../musicbrainz/queue-service';
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
    this.musicbrainzService = musicbrainzService || new QueuedMusicBrainzService();
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

    try {
      const results: UnifiedSearchResult[] = [];

      if (types.includes('album')) {
        const releaseGroups = await this.musicbrainzService.searchReleaseGroups(query, limit);
        results.push(...releaseGroups.map(rg => this.mapMusicBrainzReleaseToUnifiedResult(rg)));
      }

      if (types.includes('artist')) {
        const artists = await this.musicbrainzService.searchArtists(query, limit);
        results.push(...artists.map(artist => this.mapMusicBrainzArtistToUnifiedResult(artist)));
      }

      if (types.includes('track')) {
        const recordings = await this.musicbrainzService.searchRecordings(query, limit);
        results.push(...recordings.map(rec => this.mapMusicBrainzRecordingToUnifiedResult(rec)));
      }

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
      // TODO: Implement Discogs search
      // Will need to extract logic from /api/albums/search/route.ts
      // For now, return empty results
      console.log('Discogs search not yet implemented', { query, types, limit });

      const endTime = Date.now();
      return {
        source: SearchSource.DISCOGS,
        results: [],
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime,
        },
      };
    } catch (error) {
      const endTime = Date.now();
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

    if (result._discogs?.uri) {
      keys.push(`discogs:${result._discogs.uri}`);
    }

    const normalizedArtist = result.artist.toLowerCase().trim();
    const normalizedTitle = result.title.toLowerCase().trim();
    keys.push(`${normalizedArtist}:${normalizedTitle}`);

    return keys;
  }

  private shouldReplaceResult(existing: UnifiedSearchResult, candidate: UnifiedSearchResult): boolean {
    if (candidate.image?.url && !existing.image?.url) {
      return true;
    }

    if (candidate.tracks?.length && !existing.tracks?.length) {
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
    return {
      id: release.id,
      type: 'album',
      title: release.title,
      subtitle: release.type || 'Album',
      artist: release['artist-credit']?.[0]?.artist?.name || 'Unknown Artist',
      releaseDate: release['first-release-date'] || '',
      genre: release.tags?.map((t: any) => t.name) || [],
      label: '',
      image: {
        url: '',
        width: 300,
        height: 300,
        alt: release.title,
      },
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
      releaseDate: recording['first-release-date'] || '',
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