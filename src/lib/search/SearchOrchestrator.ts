import { PrismaClient } from '@prisma/client';
import chalk from 'chalk';

import type {
  UnifiedSearchResult,
  SearchContext,
  SearchFilters,
  SortBy,
} from '@/types/search';

import {
  QueuedMusicBrainzService,
  getQueuedMusicBrainzService,
} from '../musicbrainz/queue-service';
import { searchSpotifyArtists } from '../spotify/search';
import { calculateStringSimilarity } from '../utils/string-similarity';

export enum SearchSource {
  LOCAL = 'LOCAL',
  MUSICBRAINZ = 'MUSICBRAINZ',
  DISCOGS = 'DISCOGS',
  SPOTIFY = 'SPOTIFY',
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
  // Controls whether to resolve external images (expensive) for artists
  resolveArtistImages?: boolean;
  // Cap how many artists we attempt image resolution for (if enabled)
  artistImageLimit?: number;
  // Max number of artist results to return (independent of album/track limits)
  artistMaxResults?: number;
  // Minimum MB score required to consider an artist (0-100)
  minMusicBrainzArtistScore?: number;
  // Fuzzy match similarity threshold between query and artist name (0-1, using fuzzysort)
  artistSimilarityThreshold?: number;
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
    spotify?: SearchResult;
  };
  deduplicationApplied: boolean;
  duplicatesRemoved: number;
  timing: {
    totalDuration: number;
    localDuration?: number;
    musicbrainzDuration?: number;
    discogsDuration?: number;
    lastfmDuration?: number;
  };
}

export class SearchOrchestrator {
  private prisma: PrismaClient;
  private musicbrainzService: QueuedMusicBrainzService;

  constructor(
    prisma: PrismaClient,
    musicbrainzService?: QueuedMusicBrainzService
  ) {
    this.prisma = prisma;
    this.musicbrainzService =
      musicbrainzService || getQueuedMusicBrainzService();
  }

  async search(options: SearchOptions): Promise<OrchestratedSearchResult> {
    const startTime = Date.now();
    const {
      query,
      types = ['album', 'artist'],
      limit = 20,
      sources = [
        SearchSource.LOCAL,
        SearchSource.MUSICBRAINZ,
        SearchSource.SPOTIFY,
      ],
      deduplicateResults = true,
      resolveArtistImages = false,
    } = options;

    // Prettified search start log with background
    const border = chalk.bgCyan.black('═'.repeat(60));
    console.log('\n' + border);
    console.log(chalk.bgCyan.black.bold('  🔍 SEARCH ORCHESTRATOR START  '));
    console.log(border);
    console.log(chalk.cyan('  Query:   ') + chalk.white(`"${query}"`));
    console.log(chalk.cyan('  Types:   ') + chalk.white(types.join(', ')));
    console.log(chalk.cyan('  Sources: ') + chalk.white(sources.join(', ')));
    console.log(chalk.cyan('  Limit:   ') + chalk.white(limit));
    console.log(border + '\n');

    const artistImageLimit = options.artistImageLimit ?? Math.min(limit, 12);
    const artistMaxResults = options.artistMaxResults ?? Math.min(limit, 5);
    const minArtistScore = options.minMusicBrainzArtistScore ?? 80;
    // Lowered from 0.82 to 0.75 for fuzzysort - handles typos and variations better
    const nameSimThreshold = options.artistSimilarityThreshold ?? 0.75;

    const searchPromises: Promise<SearchResult>[] = [];

    if (sources.includes(SearchSource.LOCAL)) {
      searchPromises.push(this.searchLocal(query, types, limit));
    }

    if (sources.includes(SearchSource.MUSICBRAINZ)) {
      searchPromises.push(
        this.searchMusicBrainz(query, types, limit, {
          resolveArtistImages,
          artistImageLimit,
        })
      );
    }

    if (sources.includes(SearchSource.DISCOGS)) {
      searchPromises.push(this.searchDiscogs(query, types, limit));
    }

    if (sources.includes(SearchSource.SPOTIFY)) {
      searchPromises.push(this.searchSpotify(query, types, limit));
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
        } else if (sources[index] === SearchSource.SPOTIFY) {
          sourceResults.spotify = searchResult;
        }
      }
    });

    let finalResults = allResults;
    let duplicatesRemoved = 0;

    // Prettified results summary
    const resultsBorder = chalk.cyan('─'.repeat(60));
    console.log('\n' + resultsBorder);
    console.log(chalk.bold.cyan('📦 RESULTS BEFORE DEDUPLICATION'));
    console.log(resultsBorder);
    console.log(chalk.cyan('  Total:       ') + chalk.white(allResults.length));
    console.log(
      chalk.cyan('  Local:       ') +
        chalk.white(sourceResults.local?.results.length || 0)
    );
    console.log(
      chalk.cyan('  MusicBrainz: ') +
        chalk.white(sourceResults.musicbrainz?.results.length || 0)
    );
    console.log(
      chalk.cyan('  Spotify:     ') +
        chalk.white(sourceResults.spotify?.results.length || 0)
    );
    console.log(resultsBorder + '\n');

    if (deduplicateResults && allResults.length > 0) {
      const dedupeResult = this.deduplicateResults(allResults);
      finalResults = dedupeResult.results;
      duplicatesRemoved = dedupeResult.duplicatesRemoved;

      console.log(resultsBorder);
      console.log(chalk.bold.cyan('🔗 RESULTS AFTER DEDUPLICATION'));
      console.log(resultsBorder);
      console.log(
        chalk.cyan('  Final:    ') + chalk.white(finalResults.length)
      );
      console.log(chalk.cyan('  Removed:  ') + chalk.yellow(duplicatesRemoved));
      console.log(resultsBorder + '\n');
    }

    const endTime = Date.now();

    const slicedResults = finalResults.slice(0, limit);
    console.log(
      `\n🎯 [SearchOrchestrator] RETURNING RESULTS: ${slicedResults.length} of ${finalResults.length} (limit: ${limit})`
    );
    console.log(
      `   Track breakdown: ${slicedResults.filter(r => r.type === 'track').length} tracks, ${slicedResults.filter(r => r.type === 'album').length} albums, ${slicedResults.filter(r => r.type === 'artist').length} artists\n`
    );

    return {
      query,
      totalResults: finalResults.length,
      results: slicedResults,
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
                      name: { contains: query, mode: 'insensitive' },
                    },
                  },
                },
              },
            ],
          },
          include: {
            artists: {
              include: {
                artist: true,
              },
            },
          },
          take: limit,
          orderBy: [{ title: 'asc' }],
        });

        results.push(
          ...albums.map(album => this.mapAlbumToUnifiedResult(album))
        );
      }

      if (types.includes('artist')) {
        // Use Prisma's regular query for artists
        const artists = await this.prisma.artist.findMany({
          where: {
            name: { contains: query, mode: 'insensitive' },
          },
          take: limit,
          orderBy: [{ name: 'asc' }],
        });

        results.push(
          ...artists.map(artist => this.mapArtistToUnifiedResult(artist))
        );
      }

      if (types.includes('track')) {
        // Use Prisma's regular query for tracks
        // Note: Prisma automatically includes all scalar fields (musicbrainzId, isrc, etc.)
        const tracks = await this.prisma.track.findMany({
          where: {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
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
            album: {
              include: {
                artists: {
                  include: {
                    artist: true,
                  },
                },
              },
            },
            artists: {
              include: {
                artist: true,
              },
            },
          },
          take: limit,
          orderBy: [{ title: 'asc' }],
        });

        console.log(
          `[SearchOrchestrator] Local track search: Found ${tracks.length} tracks for "${query}"`
        );
        if (tracks.length > 0) {
          console.log(
            `[SearchOrchestrator] Sample track data:`,
            JSON.stringify(
              {
                id: tracks[0].id,
                musicbrainzId: tracks[0].musicbrainzId,
                isrc: tracks[0].isrc,
                title: tracks[0].title,
              },
              null,
              2
            )
          );
        }

        results.push(
          ...tracks.map(track => this.mapTrackToUnifiedResult(track))
        );
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
    limit: number,
    opts?: {
      resolveArtistImages?: boolean;
      artistImageLimit?: number;
      minArtistScore?: number;
      nameSimThreshold?: number;
      artistMaxResults?: number;
    }
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

      // Only search albums when explicitly requested
      if (types.includes('album')) {
        promises.push(
          this.musicbrainzService
            .searchReleaseGroups(query, limit * 2) // Get extra to filter
            .then(releaseGroups => {
              // Sort by MusicBrainz score and filter by quality
              const sorted = releaseGroups
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .slice(0, limit);
              results.push(
                ...sorted.map(rg =>
                  this.mapMusicBrainzReleaseToUnifiedResult(rg)
                )
              );
            })
            .catch(err => {
              console.error('Error searching MusicBrainz albums:', err);
            })
        );
      }

      if (types.includes('artist')) {
        // Calculate expected final results count to avoid over-fetching
        const artistMaxResults = opts?.artistMaxResults ?? Math.min(limit, 5);
        // Request 2x what we need to account for filtering, but cap it
        const artistSearchLimit = Math.min(artistMaxResults * 2, 10);

        promises.push(
          this.musicbrainzService
            .searchArtists(query, artistSearchLimit)
            .then(async artists => {
              const resolveImages = opts?.resolveArtistImages === true;
              const imageCap = Math.max(
                0,
                Math.min(artists.length, opts?.artistImageLimit ?? limit)
              );

              // Filter artists by MB score and name similarity
              const filtered = this.filterArtistResults(query, artists, {
                minScore: opts?.minArtistScore ?? 80,
                nameThreshold: opts?.nameSimThreshold ?? 0.82,
                limit: artistMaxResults,
              });

              if (resolveImages && imageCap > 0) {
                const withImages = filtered.slice(
                  0,
                  Math.min(imageCap, filtered.length)
                );
                const withoutImages = filtered.slice(withImages.length);

                const artistResultsWithImages = await Promise.all(
                  withImages.map(artist =>
                    this.mapMusicBrainzArtistToUnifiedResult(artist, true)
                  )
                );
                const artistResultsWithoutImages = withoutImages.map(artist =>
                  this.mapMusicBrainzArtistToUnifiedResultSync(artist)
                );

                results.push(
                  ...artistResultsWithImages,
                  ...artistResultsWithoutImages
                );
              } else {
                // Fast path: no external lookups, no queue churn
                const fastResults = filtered.map(artist =>
                  this.mapMusicBrainzArtistToUnifiedResultSync(artist)
                );
                results.push(...fastResults);
              }
            })
            .catch(err => {
              console.error('Error searching MusicBrainz artists:', err);
            })
        );
      }

      if (types.includes('track')) {
        promises.push(
          this.musicbrainzService
            .searchRecordings(query, limit)
            .then(recordings => {
              console.log(
                `[SearchOrchestrator] MusicBrainz found ${recordings.length} recordings for "${query}"`
              );
              if (recordings.length > 0) {
                console.log(
                  `[SearchOrchestrator] First recording:`,
                  JSON.stringify(
                    {
                      id: recordings[0].id,
                      title: recordings[0].title,
                      releases: recordings[0].releases,
                      isrcs: recordings[0].isrcs,
                    },
                    null,
                    2
                  )
                );
              }

              const mapped = recordings.map(rec =>
                this.mapMusicBrainzRecordingToUnifiedResult(rec)
              );

              if (mapped.length > 0) {
                console.log(
                  `[SearchOrchestrator] First mapped result:`,
                  JSON.stringify(
                    {
                      id: mapped[0].id,
                      title: mapped[0].title,
                      imageUrl: mapped[0].image?.url,
                      _musicbrainz: (mapped[0] as any)._musicbrainz,
                    },
                    null,
                    2
                  )
                );
              }

              results.push(...mapped);
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
        userToken:
          process.env.DISCOGS_TOKEN ||
          'QJRXBuUbvTQccgvYSRgKPPjJEPHAZoRJVkRQSRXW',
      }).database();

      const results: UnifiedSearchResult[] = [];

      // Search for albums on Discogs
      if (types.includes('album')) {
        const searchResults = await db.search({
          query,
          per_page: limit,
        });

        if (searchResults.results && searchResults.results.length > 0) {
          results.push(
            ...searchResults.results.map((result: any) =>
              this.mapDiscogsToUnifiedResult(result)
            )
          );
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

  private async searchSpotify(
    query: string,
    types: SearchType[],
    limit: number
  ): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      const results: UnifiedSearchResult[] = [];

      // Spotify only supports artist search currently
      if (types.includes('artist')) {
        const spotifyBorder = chalk.magenta('─'.repeat(60));
        console.log('\n' + spotifyBorder);
        console.log(chalk.bold.magenta('🎵 SEARCHING SPOTIFY'));
        console.log(spotifyBorder);
        console.log(chalk.magenta('  Query: ') + chalk.white(`"${query}"`));
        console.log(spotifyBorder + '\n');

        const artists = await searchSpotifyArtists(query);

        console.log(spotifyBorder);
        console.log(chalk.bold.green('✅ SPOTIFY RESULTS'));
        console.log(spotifyBorder);
        console.log(
          chalk.green('  Artists found: ') + chalk.white(artists.length)
        );
        console.log(spotifyBorder + '\n');

        results.push(
          ...artists.map(artist => this.mapSpotifyArtistToUnifiedResult(artist))
        );
      }

      const endTime = Date.now();

      return {
        source: SearchSource.SPOTIFY,
        results,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime,
        },
      };
    } catch (error) {
      const endTime = Date.now();
      console.error('Spotify search error:', error);
      return {
        source: SearchSource.SPOTIFY,
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

  private mapSpotifyArtistToUnifiedResult(artist: any): UnifiedSearchResult {
    return {
      id: `spotify:${artist.spotifyId}`,
      type: 'artist',
      title: artist.name,
      subtitle: 'Artist',
      artist: artist.name,
      releaseDate: '',
      genre: artist.genres || [],
      label: '',
      image: {
        url: artist.imageUrl || '',
        width: 640,
        height: 640,
        alt: artist.name,
      },
      relevanceScore: artist.popularity ? artist.popularity / 100 : 0,
      _discogs: {},
      _spotify: {
        spotifyId: artist.spotifyId,
        popularity: artist.popularity,
        genres: artist.genres,
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

    console.log(
      `[Deduplication] Starting with ${results.length} results (${results.filter(r => r.type === 'track').length} tracks)`
    );

    for (const result of results) {
      const keys = this.getDeduplicationKeys(result);

      if (result.type === 'track' && dedupedResults.length < 3) {
        console.log(`[Deduplication] Track "${result.title}" keys:`, keys);
      }

      let isDuplicate = false;
      for (const key of keys) {
        if (seen.has(key)) {
          duplicatesRemoved++;
          isDuplicate = true;

          if (result.type === 'track') {
            console.log(
              `[Deduplication] ❌ Track "${result.title}" is duplicate (matched key: ${key})`
            );
          }

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

    console.log(
      `[Deduplication] Result: ${dedupedResults.length} unique (removed ${duplicatesRemoved} duplicates)`
    );
    console.log(
      `[Deduplication] Final track count: ${dedupedResults.filter(r => r.type === 'track').length}`
    );

    return {
      results: dedupedResults,
      duplicatesRemoved,
    };
  }

  private getDeduplicationKeys(result: UnifiedSearchResult): string[] {
    const keys: string[] = [];

    // Priority 1: Check for exact ID matches (most reliable)
    // Check if the result has a MusicBrainz ID (either as main ID for MB results, or in metadata)
    if (
      result.id &&
      result.type === 'album' &&
      result.id.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      )
    ) {
      // This is a MusicBrainz ID (UUID format)
      keys.push(`musicbrainz:${result.id}`);
    }
    if (result._discogs?.uri) {
      keys.push(`discogs:${result._discogs.uri}`);
    }

    // For track results, prioritize MusicBrainz Recording ID and ISRC
    if (result.type === 'track') {
      const mbData = (result as any)._musicbrainz;

      // Priority 1: MusicBrainz Recording ID (from either result.id or metadata)
      const recordingId = mbData?.recordingId || result.id;
      if (
        recordingId &&
        recordingId.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
        )
      ) {
        keys.push(`mbid-recording:${recordingId}`);
      }

      // Priority 2: ISRC (International Standard Recording Code)
      if (mbData?.isrc) {
        keys.push(`isrc:${mbData.isrc}`);
      }
    }

    // For artist results, add Spotify matching
    if (result.type === 'artist') {
      const normalizedName = result.artist.toLowerCase().trim();
      keys.push(`artist:${normalizedName}`);

      // If Spotify result has Spotify ID, use it for matching
      if (result._spotify?.spotifyId) {
        keys.push(`spotify:${result._spotify.spotifyId}`);
      }
    }

    // Priority 3: Fallback to artist-title matching
    const normalizedArtist = result.artist.toLowerCase().trim();
    const normalizedTitle = result.title.toLowerCase().trim();
    keys.push(`${normalizedArtist}:${normalizedTitle}`);

    return keys;
  }

  private shouldReplaceResult(
    existing: UnifiedSearchResult,
    candidate: UnifiedSearchResult
  ): boolean {
    // Prefer local database results over external (they have richer data)
    if (existing.id.startsWith('cm') && !candidate.id.startsWith('cm')) {
      return false; // Keep local result
    }
    if (!existing.id.startsWith('cm') && candidate.id.startsWith('cm')) {
      return true; // Replace with local result
    }

    // Prefer Spotify images over no images (they're high quality artist photos)
    if (
      candidate.image?.url &&
      candidate.id.startsWith('spotify:') &&
      !existing.image?.url
    ) {
      return true;
    }

    // When both have images, keep MusicBrainz/Local over Spotify (more complete data)
    if (existing.image?.url && candidate.id.startsWith('spotify:')) {
      return false;
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

  /**
   * Wikimedia image resolution helpers (copied from unified-artist-service.ts)
   */
  private extractWikidataQid(mbArtist: any): string | undefined {
    const rels = mbArtist?.relations || [];
    for (const rel of rels) {
      if (rel.type === 'wikidata' && rel.url?.resource) {
        const match = rel.url.resource.match(/\/wiki\/(Q\d+)/);
        if (match) return match[1];
      }
    }
    return undefined;
  }

  private async fetchWikidataP18Filename(
    qid: string
  ): Promise<string | undefined> {
    try {
      const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=claims&format=json&origin=*`;
      const res = await fetch(url);
      if (!res.ok) return undefined;
      const data = await res.json();
      const entity = data?.entities?.[qid];
      const p18 = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      if (typeof p18 === 'string' && p18.length > 0) return p18; // filename
      return undefined;
    } catch {
      return undefined;
    }
  }

  private buildWikimediaThumbUrl(
    filename: string,
    width: number = 600
  ): string {
    const encoded = encodeURIComponent(filename);
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}?width=${width}`;
  }

  private async resolveArtistImageFromWikidata(
    mbArtist: any
  ): Promise<string | undefined> {
    try {
      const qid = this.extractWikidataQid(mbArtist);
      if (!qid) return undefined;

      const filename = await this.fetchWikidataP18Filename(qid);
      if (!filename) return undefined;

      const url = this.buildWikimediaThumbUrl(filename, 600);
      return url;
    } catch (error) {
      console.warn('Wikidata image resolution failed:', error);
      return undefined;
    }
  }

  private mapMusicBrainzReleaseToUnifiedResult(
    release: any
  ): UnifiedSearchResult {
    // Build subtitle showing release type
    let subtitle = release.primaryType || 'Release';
    if (release.secondaryTypes && release.secondaryTypes.length > 0) {
      // Show the most relevant secondary type
      const secondaryType = release.secondaryTypes[0];
      subtitle = `${subtitle} • ${secondaryType}`;
    }

    // Use Cover Art Archive direct URLs - browser will fetch in parallel
    // Falls back to placeholder image via AlbumImage component error handling
    // Use release-group endpoint which works with MusicBrainz release group IDs
    const coverArtUrl = `https://coverartarchive.org/release-group/${release.id}/front-250`;

    // Purple borders for cover art URL generation (distinct from other logs)
    const border = chalk.magenta('─'.repeat(60));
    console.log(border);
    console.log(
      `${chalk.magenta('🎨 [SEARCH LAYER]')} ${chalk.white('Cover Art URL')} ${chalk.magenta('•')} ${chalk.cyan(`"${release.title}"`)} ${chalk.gray('→')} ${chalk.blue(coverArtUrl)}`
    );
    console.log(border);

    return {
      id: release.id,
      type: 'album',
      title: release.title,
      subtitle,
      artist:
        release.artistCredit?.[0]?.artist?.name ||
        release['artist-credit']?.[0]?.artist?.name ||
        'Unknown Artist',
      releaseDate:
        release.firstReleaseDate || release['first-release-date'] || null,
      genre: release.tags?.map((t: any) => t.name) || [],
      label: '',
      source: 'musicbrainz', // Mark as external MusicBrainz result
      primaryType: release.primaryType || undefined, // Include primary type
      secondaryTypes: release.secondaryTypes || [], // Include secondary types
      image: {
        url: coverArtUrl,
        width: 250,
        height: 250,
        alt: release.title,
      },
      cover_image: coverArtUrl, // For backwards compatibility
      relevanceScore: release.score, // Pass through MusicBrainz's score
      _discogs: {},
    };
  }

  private async mapMusicBrainzArtistToUnifiedResult(
    artist: any,
    resolveImage: boolean = false
  ): Promise<UnifiedSearchResult> {
    // Try to get Wikimedia image: search results don't include relations,
    // so fetch full artist with url-rels to extract Wikidata QID
    let wikimediaImage: string | undefined;
    if (resolveImage) {
      try {
        const fullArtist = await this.musicbrainzService.getArtist(artist.id, [
          'url-rels',
        ]);
        wikimediaImage = await this.resolveArtistImageFromWikidata(fullArtist);
      } catch {
        try {
          wikimediaImage = await this.resolveArtistImageFromWikidata(artist);
        } catch {}
      }
    }

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
        url: wikimediaImage || '', // Use Wikimedia or empty (fallback)
        width: 600,
        height: 600,
        alt: artist.name,
      },
      _discogs: {},
    };
  }

  private mapMusicBrainzArtistToUnifiedResultSync(
    artist: any
  ): UnifiedSearchResult {
    return {
      id: artist.id,
      type: 'artist',
      title: artist.name,
      subtitle: artist.type || 'Artist',
      artist: artist.name,
      releaseDate: '',
      genre: Array.isArray(artist.tags)
        ? artist.tags.map((t: any) => t.name)
        : [],
      label: '',
      image: {
        url: '',
        width: 600,
        height: 600,
        alt: artist.name,
      },
      relevanceScore: artist.score,
      _discogs: {},
    };
  }

  private filterArtistResults(
    query: string,
    artists: Array<{
      id: string;
      name: string;
      score?: number;
      type?: string;
      tags?: any[];
    }>,
    opts: { minScore: number; nameThreshold: number; limit: number }
  ) {
    // Use fuzzy matching for better search results with typo tolerance
    const decorated = artists.map(a => {
      const sim = calculateStringSimilarity(query, a.name || '');
      const mbScore = typeof a.score === 'number' ? a.score : 0;
      // Combined score emphasizing MB score, with a boost from name similarity
      const combined = (mbScore / 100) * 0.8 + sim * 0.2;
      return { base: a, sim, mbScore, combined };
    });

    const filtered = decorated
      .filter(d => d.mbScore >= opts.minScore || d.sim >= opts.nameThreshold)
      .sort((a, b) => b.combined - a.combined)
      .slice(0, Math.max(1, opts.limit))
      .map(d => d.base);

    // If everything was filtered out (rare), keep the top 1 by MB score to avoid empty UI
    if (filtered.length === 0 && artists.length > 0) {
      return artists.slice(0, Math.max(1, Math.min(1, opts.limit)));
    }

    return filtered;
  }

  private mapMusicBrainzRecordingToUnifiedResult(
    recording: any
  ): UnifiedSearchResult {
    // Support both raw MB keys ('artist-credit') and our normalized service ('artistCredit')
    const ac = recording.artistCredit || recording['artist-credit'] || [];
    const primaryArtist = ac?.[0]?.artist;
    const primaryArtistId = primaryArtist?.id;
    const primaryArtistName = primaryArtist?.name || ac?.[0]?.name;

    // Support both 'firstReleaseDate' and 'first-release-date'
    const firstRelease =
      recording.firstReleaseDate || recording['first-release-date'] || null;

    // Generate Cover Art Archive URL from first release MBID
    const firstReleaseMbid = recording.releases?.[0]?.id;
    const coverArtUrl = firstReleaseMbid
      ? `https://coverartarchive.org/release/${firstReleaseMbid}/front-250`
      : '';

    // Extract first ISRC if available
    const isrc =
      recording.isrcs && recording.isrcs.length > 0
        ? recording.isrcs[0]
        : undefined;

    // Generate subtitle from release info if available
    const firstReleaseTitle = recording.releases?.[0]?.title;
    const subtitle = firstReleaseTitle
      ? `from ${firstReleaseTitle}`
      : 'Recording';

    return {
      id: recording.id,
      type: 'track',
      title: recording.title,
      subtitle,
      artist: primaryArtistName || 'Unknown Artist',
      releaseDate: firstRelease, // Return null instead of empty string
      genre: recording.tags?.map((t: any) => t.name) || [],
      label: '',
      image: {
        url: coverArtUrl,
        width: 250,
        height: 250,
        alt: recording.title,
      },
      relevanceScore: recording.score, // include MB score for filtering downstream
      _discogs: {},
      // Include MusicBrainz metadata for deduplication
      _musicbrainz: {
        recordingId: recording.id,
        isrc,
        releases: recording.releases || [], // Preserve releases array for GraphQL resolver
      },
      // Non-schema field used internally by GraphQL resolver to attach artist id
      ...(primaryArtistId
        ? ({ primaryArtistMbId: primaryArtistId } as any)
        : {}),
    };
  }

  private mapTrackToUnifiedResult(track: any): UnifiedSearchResult {
    const primaryArtist =
      track.artists?.[0]?.artist || track.album?.artists?.[0]?.artist;

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
        uri: track.discogsReleaseId
          ? `/releases/${track.discogsReleaseId}`
          : undefined,
      },
      // Include MusicBrainz metadata for deduplication
      ...(track.musicbrainzId || track.isrc
        ? {
            _musicbrainz: {
              recordingId: track.musicbrainzId,
              isrc: track.isrc,
            },
          }
        : {}),
    };
  }
}
