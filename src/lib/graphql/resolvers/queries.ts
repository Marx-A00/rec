// Schema migration broke GraphQL resolvers, needs complete rewrite
// src/lib/graphql/resolvers/queries.ts
// Query resolvers for GraphQL API
// @ts-nocheck - Prisma types don't match GraphQL types; field resolvers complete objects at runtime

import { GraphQLError } from 'graphql';

import { QueryResolvers } from '@/generated/resolvers-types';
import { graphqlLogger } from '@/lib/logger';
import { getMusicBrainzQueue } from '@/lib/queue';
import {
  healthChecker,
  metricsCollector,
  alertManager,
} from '@/lib/monitoring';
import type { ResolversTypes } from '@/generated/resolvers-types';
import { JobStatus as GqlJobStatus } from '@/generated/resolvers-types';

// Correction system imports
import { isAdmin } from '@/lib/permissions';
import { getCorrectionSearchService } from '@/lib/correction/search-service';
import { getCorrectionPreviewService } from '@/lib/correction/preview';
import { getQueuedDiscogsService } from '@/lib/discogs/queued-service';
import { mapMasterToCorrectionSearchResult } from '@/lib/discogs/mappers';
import type {
  ScoredSearchResult,
  ScoringStrategy as ServiceScoringStrategy,
} from '@/lib/correction/scoring/types';
import type { GroupedSearchResult } from '@/lib/correction/types';
import {
  ScoringStrategy as GqlScoringStrategy,
  ConfidenceTier as GqlConfidenceTier,
  CorrectionSource as GqlCorrectionSource,
} from '@/generated/resolvers-types';

import { getSearchService } from '../search';

// ============================================================================
// Correction System Helper Functions
// ============================================================================

/**
 * Map GraphQL ScoringStrategy enum to service strategy type
 */
function mapGqlStrategyToService(
  strategy: GqlScoringStrategy | null | undefined
): ServiceScoringStrategy {
  if (!strategy) return 'normalized';
  switch (strategy) {
    case GqlScoringStrategy.Normalized:
      return 'normalized';
    case GqlScoringStrategy.Tiered:
      return 'tiered';
    case GqlScoringStrategy.Weighted:
      return 'weighted';
    default:
      return 'normalized';
  }
}

/**
 * Map service strategy type to GraphQL ScoringStrategy enum
 */
function mapServiceStrategyToGql(
  strategy: ServiceScoringStrategy
): GqlScoringStrategy {
  switch (strategy) {
    case 'normalized':
      return GqlScoringStrategy.Normalized;
    case 'tiered':
      return GqlScoringStrategy.Tiered;
    case 'weighted':
      return GqlScoringStrategy.Weighted;
    default:
      return GqlScoringStrategy.Normalized;
  }
}

/**
 * Map service confidence tier to GraphQL enum
 */
function mapConfidenceTierToGql(
  tier: string | undefined
): GqlConfidenceTier | null {
  if (!tier) return null;
  switch (tier.toLowerCase()) {
    case 'high':
      return GqlConfidenceTier.High;
    case 'medium':
      return GqlConfidenceTier.Medium;
    case 'low':
      return GqlConfidenceTier.Low;
    case 'none':
      return GqlConfidenceTier.None;
    default:
      return null;
  }
}

/**
 * Transform a scored search result to GraphQL format
 */
function transformScoredResult(result: ScoredSearchResult) {
  return {
    releaseGroupMbid: result.releaseGroupMbid,
    title: result.title,
    disambiguation: result.disambiguation ?? null,
    artistCredits: result.artistCredits.map(ac => ({
      mbid: ac.mbid,
      name: ac.name,
    })),
    primaryArtistName: result.primaryArtistName,
    firstReleaseDate: result.firstReleaseDate ?? null,
    primaryType: result.primaryType ?? null,
    secondaryTypes: result.secondaryTypes ?? [],
    mbScore: result.mbScore,
    coverArtUrl: result.coverArtUrl,
    source: result.source,
    normalizedScore: result.normalizedScore,
    displayScore:
      typeof result.displayScore === 'number' ? result.displayScore : 0,
    breakdown: {
      titleScore: result.breakdown.titleScore,
      artistScore: result.breakdown.artistScore,
      yearScore: result.breakdown.yearScore,
      mbScore: result.breakdown.mbScore ?? null,
      confidenceTier: mapConfidenceTierToGql(result.breakdown.confidenceTier),
    },
    isLowConfidence: result.isLowConfidence,
    scoringStrategy: mapServiceStrategyToGql(result.scoringStrategy),
  };
}

/**
 * Transform a grouped search result to GraphQL format
 */
function transformGroupedResult(group: GroupedSearchResult) {
  return {
    releaseGroupMbid: group.releaseGroupMbid,
    primaryResult: transformScoredResult(group.primaryResult),
    alternateVersions: group.alternateVersions.map(transformScoredResult),
    versionCount: group.versionCount,
    bestScore: group.bestScore,
  };
}

/**
 * Transform MusicBrainz release data to GraphQL format
 */
function transformMBReleaseData(mbData: {
  id: string;
  title: string;
  date?: string;
  country?: string;
  barcode?: string;
  media: Array<{
    position: number;
    format?: string;
    trackCount: number;
    tracks: Array<{
      position: number;
      recording: {
        id: string;
        title: string;
        length?: number;
        position?: number;
      };
    }>;
  }>;
  artistCredit: Array<{
    name: string;
    joinphrase?: string;
    artist: {
      id: string;
      name: string;
      sortName?: string;
      disambiguation?: string;
    };
  }>;
}) {
  return {
    id: mbData.id,
    title: mbData.title,
    date: mbData.date ?? null,
    country: mbData.country ?? null,
    barcode: mbData.barcode ?? null,
    media: mbData.media.map(medium => ({
      position: medium.position,
      format: medium.format ?? null,
      trackCount: medium.trackCount,
      tracks: medium.tracks.map(track => ({
        position: track.position,
        recording: {
          id: track.recording.id,
          title: track.recording.title,
          length: track.recording.length ?? null,
          position: track.position, // Use track position for recording position
        },
      })),
    })),
    artistCredit: mbData.artistCredit.map(ac => ({
      name: ac.name,
      joinphrase: ac.joinphrase ?? null,
      artist: {
        id: ac.artist.id,
        name: ac.artist.name,
        sortName: ac.artist.sortName ?? null,
        disambiguation: ac.artist.disambiguation ?? null,
      },
    })),
  };
}

// TODO: Fix GraphQL resolver return types to match generated types
// Prisma returns partial objects; field resolvers populate computed/relational fields
export const queryResolvers: QueryResolvers = {
  // Health check query
  health: () => {
    return `GraphQL server running at ${new Date().toISOString()}`;
  },

  // System health monitoring
  systemHealth: async (_, __, { user }) => {
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    if (!isAdmin(user.role)) {
      throw new GraphQLError('Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    try {
      const health = await healthChecker.checkHealth();
      return health as any;
    } catch (error) {
      throw new GraphQLError(`Failed to get system health: ${error}`);
    }
  },

  // Queue status monitoring
  queueStatus: async (_, __, { user }) => {
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    if (!isAdmin(user.role)) {
      throw new GraphQLError('Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    try {
      const queue = getMusicBrainzQueue();
      const stats = await queue.getStats();
      const isPaused = await queue.getQueue().isPaused();
      const worker = queue.getWorker();

      return {
        name: 'musicbrainz',
        isPaused,
        stats,
        rateLimitInfo: {
          maxRequestsPerSecond: 1,
          currentWindowRequests: stats.active,
          windowResetTime: new Date(Date.now() + 1000),
        },
        workers: worker
          ? [
              {
                id: 'worker-1',
                isRunning: worker.isRunning(),
                isPaused: worker.isPaused(),
                activeJobCount: stats.active,
              },
            ]
          : [],
      };
    } catch (error) {
      throw new GraphQLError(`Failed to get queue status: ${error}`);
    }
  },

  // Queue metrics with time range
  queueMetrics: async (_, { timeRange }, { user }) => {
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    if (!isAdmin(user.role)) {
      throw new GraphQLError('Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    try {
      const metrics = metricsCollector.getCurrentMetrics();
      const history = metricsCollector.getMetricsHistory(100);
      const jobMetrics = metricsCollector.getJobMetrics(100);

      // Filter based on time range
      const now = Date.now();
      const ranges = {
        LAST_HOUR: 3600000,
        LAST_DAY: 86400000,
        LAST_WEEK: 604800000,
        LAST_MONTH: 2592000000,
      };
      const rangeMs = ranges[timeRange] || ranges.LAST_HOUR;

      const filteredJobs = jobMetrics.filter(
        j => j.endTime && j.endTime.getTime() > now - rangeMs
      );

      const jobsProcessed = filteredJobs.filter(j => j.success).length;
      const jobsFailed = filteredJobs.filter(j => !j.success).length;
      const totalJobs = jobsProcessed + jobsFailed;

      const avgProcessingTime =
        filteredJobs.length > 0
          ? filteredJobs.reduce((sum, j) => sum + (j.duration || 0), 0) /
            filteredJobs.length
          : 0;

      const successRate =
        totalJobs > 0 ? (jobsProcessed / totalJobs) * 100 : 100;
      const errorRate = totalJobs > 0 ? (jobsFailed / totalJobs) * 100 : 0;

      // Calculate throughput
      const jobsPerMinute = filteredJobs.filter(
        j => j.endTime && j.endTime.getTime() > now - 60000
      ).length;
      const jobsPerHour = filteredJobs.filter(
        j => j.endTime && j.endTime.getTime() > now - 3600000
      ).length;

      // Get top errors
      const errorMap = new Map<
        string,
        { count: number; lastOccurrence: Date }
      >();
      filteredJobs
        .filter(j => !j.success && j.error)
        .forEach(j => {
          const existing = errorMap.get(j.error!) || {
            count: 0,
            lastOccurrence: j.endTime!,
          };
          existing.count++;
          if (j.endTime! > existing.lastOccurrence) {
            existing.lastOccurrence = j.endTime!;
          }
          errorMap.set(j.error!, existing);
        });

      const topErrors = Array.from(errorMap.entries())
        .map(([error, data]) => ({ error, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        timeRange,
        jobsProcessed,
        jobsFailed,
        avgProcessingTime,
        successRate,
        errorRate,
        throughput: {
          jobsPerMinute,
          jobsPerHour,
          peakJobsPerMinute: Math.max(
            jobsPerMinute,
            ...history.map(h => h.queue.throughput.jobsPerMinute)
          ),
        },
        topErrors,
      };
    } catch (error) {
      throw new GraphQLError(`Failed to get queue metrics: ${error}`);
    }
  },

  // Job history with optional filtering
  jobHistory: async (_, { limit = 100, status }, { user }) => {
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    if (!isAdmin(user.role)) {
      throw new GraphQLError('Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    try {
      const queue = getMusicBrainzQueue().getQueue();

      let jobs = [];

      if (!status || status === 'COMPLETED') {
        const completed = await queue.getCompleted(0, limit);
        jobs.push(...completed.map(j => ({ ...j, status: 'COMPLETED' })));
      }

      if (!status || status === 'FAILED') {
        const failed = await queue.getFailed(0, limit);
        jobs.push(...failed.map(j => ({ ...j, status: 'FAILED' })));
      }

      if (!status || status === 'WAITING') {
        const waiting = await queue.getWaiting(0, limit);
        jobs.push(...waiting.map(j => ({ ...j, status: 'WAITING' })));
      }

      if (!status || status === 'ACTIVE') {
        const active = await queue.getActive(0, limit);
        jobs.push(...active.map(j => ({ ...j, status: 'ACTIVE' })));
      }

      if (!status || status === 'DELAYED') {
        const delayed = await queue.getDelayed(0, limit);
        jobs.push(...delayed.map(j => ({ ...j, status: 'DELAYED' })));
      }

      // Sort by timestamp and limit
      jobs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      jobs = jobs.slice(0, limit);

      const statusMap: Record<string, GqlJobStatus> = {
        WAITING: GqlJobStatus.Waiting,
        ACTIVE: GqlJobStatus.Active,
        COMPLETED: GqlJobStatus.Completed,
        FAILED: GqlJobStatus.Failed,
        DELAYED: GqlJobStatus.Delayed,
      };

      return jobs.map(job => ({
        id: String(job.id ?? ''),
        type: job.name,
        status:
          statusMap[(job.status || 'WAITING').toUpperCase()] ??
          GqlJobStatus.Waiting,
        data: job.data,
        result: job.returnvalue,
        error: job.failedReason,
        attempts: job.attemptsMade,
        startedAt: job.processedOn ? new Date(job.processedOn) : null,
        completedAt: job.finishedOn ? new Date(job.finishedOn) : null,
        duration:
          job.finishedOn && job.processedOn
            ? job.finishedOn - job.processedOn
            : null,
        priority: job.opts?.priority || 0,
      }));
    } catch (error) {
      throw new GraphQLError(`Failed to get job history: ${error}`);
    }
  },

  // Get currently active jobs
  activeJobs: async (_, __, { user }) => {
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    if (!isAdmin(user.role)) {
      throw new GraphQLError('Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    try {
      const queue = getMusicBrainzQueue().getQueue();
      const active = await queue.getActive();

      return active.map(job => ({
        id: String(job.id ?? ''),
        type: job.name,
        status: GqlJobStatus.Active,
        data: job.data,
        result: null,
        error: null,
        attempts: job.attemptsMade,
        startedAt: job.processedOn ? new Date(job.processedOn) : null,
        completedAt: null,
        duration: null,
        priority: job.opts?.priority || 0,
      }));
    } catch (error) {
      throw new GraphQLError(`Failed to get active jobs: ${error}`);
    }
  },

  // Get failed jobs
  failedJobs: async (_, { limit = 50 }, { user }) => {
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    if (!isAdmin(user.role)) {
      throw new GraphQLError('Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    try {
      const queue = getMusicBrainzQueue().getQueue();
      const failed = await queue.getFailed(0, limit);

      return failed.map(job => ({
        id: String(job.id ?? ''),
        type: job.name,
        status: GqlJobStatus.Failed,
        data: job.data,
        result: null,
        error: job.failedReason,
        attempts: job.attemptsMade,
        startedAt: job.processedOn ? new Date(job.processedOn) : null,
        completedAt: job.finishedOn ? new Date(job.finishedOn) : null,
        duration:
          job.finishedOn && job.processedOn
            ? job.finishedOn - job.processedOn
            : null,
        priority: job.opts?.priority || 0,
      }));
    } catch (error) {
      throw new GraphQLError(`Failed to get failed jobs: ${error}`);
    }
  },

  // Spotify trending data from cache
  spotifyTrending: async (_, __, { prisma }) => {
    try {
      // Get cached Spotify data
      const cached = await prisma.cacheData.findUnique({
        where: { key: 'spotify_trending' },
      });

      // If no cache or expired, trigger a sync
      if (!cached || cached.expires < new Date()) {
        // Return empty data with a flag to trigger client-side sync
        return {
          newReleases: [],
          featuredPlaylists: [],
          topCharts: [],
          popularArtists: [],
          needsSync: true,
          expires: null,
          lastUpdated: cached?.updatedAt || null,
        };
      }

      // Return cached data
      const data = cached.data as any;
      return {
        newReleases: data.newReleases || [],
        featuredPlaylists: data.featuredPlaylists || [],
        topCharts: data.topCharts || [],
        popularArtists: data.popularArtists || [],
        needsSync: false,
        expires: cached.expires,
        lastUpdated: cached.updatedAt,
      };
    } catch (error) {
      throw new GraphQLError(`Failed to fetch Spotify trending data: ${error}`);
    }
  },

  // Entity retrieval queries (placeholders)
  artist: async (_, { id }, { prisma, activityTracker }) => {
    try {
      // Track entity interaction for priority management
      await activityTracker.recordEntityInteraction(
        'view_artist',
        'artist',
        id,
        'query'
      );

      const artist = await prisma.artist.findUnique({ where: { id } });
      if (!artist) return null;
      return { id: artist.id } as ResolversTypes['Artist'];
    } catch (error) {
      throw new GraphQLError(`Failed to fetch artist: ${error}`);
    }
  },

  artistByMusicBrainzId: async (_, { musicbrainzId }, { prisma }) => {
    try {
      const artist = await prisma.artist.findFirst({
        where: { musicbrainzId },
      });
      if (!artist) return null;
      // Return full artist data - field resolvers will handle relationships
      return artist as ResolversTypes['Artist'];
    } catch (error) {
      throw new GraphQLError(
        `Failed to fetch artist by MusicBrainz ID: ${error}`
      );
    }
  },

  album: async (_, { id }, { prisma, activityTracker }) => {
    try {
      // Track entity interaction for priority management
      await activityTracker.recordEntityInteraction(
        'view_album',
        'album',
        id,
        'query'
      );

      const album = await prisma.album.findUnique({ where: { id } });
      if (!album) return null;
      // Return full album object - field resolvers will handle relationships (artists, tracks)
      // but scalar fields (title, genres, etc.) come directly from this object
      return album as ResolversTypes['Album'];
    } catch (error) {
      throw new GraphQLError(`Failed to fetch album: ${error}`);
    }
  },

  albumByMusicBrainzId: async (_, { musicbrainzId }, { prisma }) => {
    try {
      const album = await prisma.album.findFirst({
        where: { musicbrainzId },
      });
      if (!album) return null;
      // Return full album data - field resolvers will handle relationships
      return album as ResolversTypes['Album'];
    } catch (error) {
      throw new GraphQLError(
        `Failed to fetch album by MusicBrainz ID: ${error}`
      );
    }
  },

  track: async (_, { id }, { prisma }) => {
    try {
      const track = await prisma.track.findUnique({ where: { id } });
      if (!track) return null;
      return { id: track.id } as ResolversTypes['Track'];
    } catch (error) {
      throw new GraphQLError(`Failed to fetch track: ${error}`);
    }
  },

  albumTracks: async (_: any, { albumId }: any, { prisma }: any) => {
    try {
      const tracks = await prisma.track.findMany({
        where: { albumId },
        orderBy: [{ discNumber: 'asc' }, { trackNumber: 'asc' }],
      });
      return tracks;
    } catch (error) {
      throw new GraphQLError(`Failed to fetch album tracks: ${error}`);
    }
  },

  searchTracks: async (_: any, { query, limit = 20 }: any, { prisma }: any) => {
    try {
      const tracks = await prisma.track.findMany({
        where: {
          title: {
            contains: query,
            mode: 'insensitive',
          },
        },
        take: limit,
        orderBy: { title: 'asc' },
      });
      return tracks;
    } catch (error) {
      throw new GraphQLError(`Failed to search tracks: ${error}`);
    }
  },

  user: async (_, { id }, { prisma }) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user || user.deletedAt) return null;
      return { id: user.id } as ResolversTypes['User'];
    } catch (error) {
      throw new GraphQLError(`Failed to fetch user: ${error}`);
    }
  },

  collection: async (_, { id }, { prisma }) => {
    try {
      const collection = await prisma.collection.findUnique({ where: { id } });
      if (!collection) return null;
      return { id: collection.id } as ResolversTypes['Collection'];
    } catch (error) {
      throw new GraphQLError(`Failed to fetch collection: ${error}`);
    }
  },

  recommendation: async (_, { id }, { prisma }) => {
    try {
      const recommendation = await prisma.recommendation.findUnique({
        where: { id },
      });
      if (!recommendation) return null;
      return { id: recommendation.id } as ResolversTypes['Recommendation'];
    } catch (error) {
      throw new GraphQLError(`Failed to fetch recommendation: ${error}`);
    }
  },

  // Search & discovery with full-text search and scoring
  // @ts-expect-error - Return type mismatch, field resolvers handle it
  search: async (_, { input }, { prisma, activityTracker }) => {
    const { query, type = 'ALL', limit = 20, offset = 0 } = input;

    try {
      // Use SearchOrchestrator for multi-source search including Last.fm
      const { SearchOrchestrator, SearchSource } = await import(
        '../../search/SearchOrchestrator'
      );
      const orchestrator = new SearchOrchestrator(prisma);

      // Map GraphQL type to search types
      const searchTypes =
        type === 'ALL'
          ? ['artist', 'album', 'track']
          : type === 'ARTIST'
            ? ['artist']
            : type === 'ALBUM'
              ? ['album']
              : type === 'TRACK'
                ? ['track']
                : ['artist', 'album', 'track'];

      // Determine appropriate sources based on search type
      // Spotify only supports artist image search, not tracks or albums
      const sources =
        type === 'ARTIST'
          ? [SearchSource.LOCAL, SearchSource.MUSICBRAINZ, SearchSource.SPOTIFY]
          : [SearchSource.LOCAL, SearchSource.MUSICBRAINZ]; // Tracks and albums only need LOCAL + MB

      // Perform multi-source search
      const searchResults = await orchestrator.search({
        query,
        types: searchTypes as Array<'artist' | 'album' | 'track'>,
        limit: limit || 20,
        sources,
      });

      // DEBUG: Log what we received from SearchOrchestrator
      console.log(
        `\n🔍 [GraphQL] Received from SearchOrchestrator: ${searchResults.results.length} results`
      );
      console.log(
        `   Breakdown: ${searchResults.results.filter(r => r.type === 'track').length} tracks, ${searchResults.results.filter(r => r.type === 'album').length} albums, ${searchResults.results.filter(r => r.type === 'artist').length} artists`
      );

      // Track search activity with result count
      const searchType =
        type === 'ARTIST'
          ? 'artists'
          : type === 'ALBUM'
            ? 'albums'
            : type === 'TRACK'
              ? 'tracks'
              : 'albums'; // Default for 'ALL'
      await activityTracker.trackSearch(
        searchType as 'albums' | 'artists' | 'tracks',
        query,
        searchResults.totalResults
      );

      // Map search results back to entity objects
      // For tracks, include the full search result data (including cover art URL)
      // so that the frontend can display it without needing to resolve album relations
      console.log(
        `[GraphQL Resolver] searchResults.results.length: ${searchResults.results.length}`
      );
      console.log(
        `[GraphQL Resolver] Track results: ${searchResults.results.filter(r => r.type === 'track').length}`
      );
      if (searchResults.results.length > 0) {
        console.log(
          `[GraphQL Resolver] First 3 result types:`,
          searchResults.results
            .slice(0, 3)
            .map(r => ({ type: r.type, id: r.id, title: r.title }))
        );
      }

      const artists = searchResults.results
        .filter(r => r.type === 'artist')
        .map(r => ({ id: r.id }) as ResolversTypes['Artist']);
      const albums = searchResults.results
        .filter(r => r.type === 'album')
        .map(r => ({ id: r.id }) as ResolversTypes['Album']);
      const tracks = searchResults.results
        .filter(r => r.type === 'track')
        .map(r => {
          // Include search result metadata for external tracks (MusicBrainz, etc.)
          const track: any = {
            id: r.id,
            title: r.title,
            trackNumber: 0, // Default for search results
            durationMs: r.metadata?.totalDuration || null,
            // NEW: Populate schema fields for search metadata
            searchCoverArtUrl: r.image?.url || null,
            searchArtistName: r.artist || null,
          };
          return track as ResolversTypes['Track'];
        });

      console.log(
        `\n📤 [GraphQL Resolver] FINAL RETURN: ${tracks.length} tracks, ${albums.length} albums, ${artists.length} artists`
      );
      if (tracks.length > 0) {
        console.log(`   First track:`, {
          id: tracks[0].id,
          title: tracks[0].title,
        });
        console.log(`   Last track:`, {
          id: tracks[tracks.length - 1].id,
          title: tracks[tracks.length - 1].title,
        });
      }

      const returnValue = {
        artists,
        albums,
        tracks,
        total: artists.length + albums.length + tracks.length,
        hasMore: false, // Simplified for now
      };

      console.log(
        `   Return value tracks.length: ${returnValue.tracks.length}\n`
      );

      return returnValue;
    } catch (error) {
      throw new GraphQLError(`Search failed: ${error}`);
    }
  },

  // Recommendation queries (placeholders)
  albumRecommendations: async (_, { input }) => {
    // Placeholder - return empty array for now
    return [];
  },

  trackRecommendations: async (_, { trackId, limit = 10 }) => {
    // Placeholder - return empty array for now
    return [];
  },

  // Feed & trending
  recommendationFeed: async (_, { cursor, limit = 20 }, { prisma }) => {
    try {
      const { buildCursorPagination, extractCursorPage } = await import(
        '@/lib/db'
      );

      const recommendations = await prisma.recommendation.findMany({
        ...buildCursorPagination(cursor, limit),
        where: {
          user: { deletedAt: null },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          basisAlbum: {
            include: {
              artists: { include: { artist: true } },
            },
          },
          recommendedAlbum: {
            include: {
              artists: { include: { artist: true } },
            },
          },
        },
      });

      const { items, nextCursor, hasMore } = extractCursorPage(
        recommendations,
        limit
      );

      const mappedItems = items.map(item => ({
        ...item,
        normalizedScore: item.score / 100,
      }));

      return {
        recommendations: mappedItems,
        cursor: nextCursor,
        hasMore,
      };
    } catch (error) {
      console.error('Error fetching recommendation feed:', error);
      return {
        recommendations: [],
        cursor: null,
        hasMore: false,
      };
    }
  },

  trendingAlbums: async (_, { limit = 20 }, { prisma, activityTracker }) => {
    try {
      // Track browse activity for trending content
      await activityTracker.trackBrowse('trending', undefined, {
        contentType: 'albums',
        limit,
      });

      // Simple trending based on creation date for now
      const albums = await prisma.album.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      // Track entity interactions if albums returned
      if (albums.length > 0) {
        const albumIds = albums.map(album => album.id);
        await activityTracker.recordEntityInteraction(
          'browse_trending_albums',
          'album',
          albumIds,
          'query',
          { resultCount: albums.length }
        );
      }

      return albums;
    } catch (error) {
      throw new GraphQLError(`Failed to fetch trending albums: ${error}`);
    }
  },

  trendingArtists: async (_, { limit = 20 }, { prisma }) => {
    try {
      // Simple trending based on creation date for now
      const artists = await prisma.artist.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
      return artists;
    } catch (error) {
      throw new GraphQLError(`Failed to fetch trending artists: ${error}`);
    }
  },

  userSuggestions: async (_, { limit = 10 }) => {
    // Placeholder - return empty array for now
    return [];
  },

  // User social queries
  userFollowers: async (
    _,
    { userId, cursor, limit = 20, search, sort = 'recent' },
    { prisma, user }
  ) => {
    try {
      const where: Record<string, unknown> = {
        followedId: userId,
        follower: {
          deletedAt: null,
          ...(search && {
            username: { contains: search, mode: 'insensitive' },
          }),
        },
        ...(cursor && { id: { lt: cursor } }),
      };

      const follows = await prisma.userFollow.findMany({
        where,
        take: limit + 1,
        orderBy:
          sort === 'alphabetical'
            ? { follower: { username: 'asc' } }
            : { createdAt: 'desc' },
        include: { follower: true },
      });

      const hasMore = follows.length > limit;
      const edges = follows.slice(0, limit);
      const nextCursor = hasMore ? edges[edges.length - 1].id : null;

      // Batch check isFollowing for current user
      const followerIds = edges.map(f => f.followerId);
      const currentUserFollows = user
        ? await prisma.userFollow.findMany({
            where: {
              followerId: user.id,
              followedId: { in: followerIds },
            },
            select: { followedId: true },
          })
        : [];
      const isFollowingSet = new Set(
        currentUserFollows.map(f => f.followedId)
      );

      const users = edges.map(follow => ({
        ...follow.follower,
        followedAt: follow.createdAt,
        isFollowing: isFollowingSet.has(follow.followerId),
      }));

      const total = await prisma.userFollow.count({
        where: {
          followedId: userId,
          follower: { deletedAt: null },
        },
      });

      return { users, cursor: nextCursor, hasMore, total };
    } catch (error) {
      throw new GraphQLError(`Failed to fetch user followers: ${error}`);
    }
  },

  userFollowing: async (
    _,
    { userId, cursor, limit = 20, search, sort = 'recent' },
    { prisma, user }
  ) => {
    try {
      const where: Record<string, unknown> = {
        followerId: userId,
        followed: {
          deletedAt: null,
          ...(search && {
            username: { contains: search, mode: 'insensitive' },
          }),
        },
        ...(cursor && { id: { lt: cursor } }),
      };

      const follows = await prisma.userFollow.findMany({
        where,
        take: limit + 1,
        orderBy:
          sort === 'alphabetical'
            ? { followed: { username: 'asc' } }
            : { createdAt: 'desc' },
        include: { followed: true },
      });

      const hasMore = follows.length > limit;
      const edges = follows.slice(0, limit);
      const nextCursor = hasMore ? edges[edges.length - 1].id : null;

      // Batch check isFollowing for current user
      const followedIds = edges.map(f => f.followedId);
      const currentUserFollows = user
        ? await prisma.userFollow.findMany({
            where: {
              followerId: user.id,
              followedId: { in: followedIds },
            },
            select: { followedId: true },
          })
        : [];
      const isFollowingSet = new Set(
        currentUserFollows.map(f => f.followedId)
      );

      const users = edges.map(follow => ({
        ...follow.followed,
        followedAt: follow.createdAt,
        isFollowing: isFollowingSet.has(follow.followedId),
      }));

      const total = await prisma.userFollow.count({
        where: {
          followerId: userId,
          followed: { deletedAt: null },
        },
      });

      return { users, cursor: nextCursor, hasMore, total };
    } catch (error) {
      throw new GraphQLError(`Failed to fetch user following: ${error}`);
    }
  },

  mutualConnections: async (_, { userId }, { user, prisma }) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    try {
      // Get users that both the current user and target user follow
      const mutuals = await prisma.user.findMany({
        where: {
          deletedAt: null,
          AND: [
            {
              followers: {
                some: {
                  followerId: user.id,
                },
              },
            },
            {
              followers: {
                some: {
                  followerId: userId,
                },
              },
            },
          ],
        },
      });
      return mutuals;
    } catch (error) {
      throw new GraphQLError(`Failed to fetch mutual connections: ${error}`);
    }
  },

  isFollowing: async (_, { userId }, { user, prisma }) => {
    if (!user) {
      return false;
    }

    try {
      const follow = await prisma.userFollow.findUnique({
        where: {
          followerId_followedId: {
            followerId: user.id,
            followedId: userId,
          },
        },
      });
      return !!follow;
    } catch (error) {
      throw new GraphQLError(`Failed to check follow status: ${error}`);
    }
  },

  // User status queries
  onboardingStatus: async (_, __, { user, prisma }) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    try {
      const userData = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          profileUpdatedAt: true,
        },
      });

      return {
        isNewUser: !userData?.profileUpdatedAt,
        profileUpdatedAt: userData?.profileUpdatedAt,
        hasCompletedTour: !!userData?.profileUpdatedAt,
      };
    } catch (error) {
      throw new GraphQLError(`Failed to get onboarding status: ${error}`);
    }
  },

  userStats: async (_, { userId }, { prisma }) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          _count: {
            select: {
              followers: true,
              following: true,
              recommendations: true,
              collections: true,
            },
          },
          collections: {
            include: {
              _count: {
                select: {
                  albums: true,
                },
              },
            },
          },
          recommendations: true,
        },
      });

      if (!user || user.deletedAt) {
        throw new GraphQLError('User not found');
      }

      // Calculate total albums across all collections
      const totalAlbumsInCollections = user.collections.reduce(
        (sum, collection) => sum + collection._count.albums,
        0
      );

      // Calculate average recommendation score
      const avgScore =
        user.recommendations.length > 0
          ? user.recommendations.reduce((sum, rec) => sum + rec.score, 0) /
            user.recommendations.length
          : 0;

      return {
        userId,
        followersCount: user._count.followers,
        followingCount: user._count.following,
        recommendationsCount: user._count.recommendations,
        collectionsCount: user._count.collections,
        totalAlbumsInCollections,
        averageRecommendationScore: avgScore,
        topGenres: [], // Placeholder - would need to analyze user's albums/recommendations
        joinedAt: user.createdAt,
      };
    } catch (error) {
      throw new GraphQLError(`Failed to get user stats: ${error}`);
    }
  },

  // User-specific queries (placeholders - require authentication)
  myCollections: async (_, __, { user, prisma }) => {
    // Debug logging to check auth context
    console.log('=== myCollections resolver ===');
    console.log('User in GraphQL context:', user);
    console.log('User ID:', user?.id);
    console.log('User email:', user?.email);

    if (!user) {
      console.log('No user found in context, throwing auth error');
      throw new GraphQLError('Authentication required');
    }

    console.log(`Fetching collections for user: ${user.id}`);
    const collections = await prisma.collection.findMany({
      where: { userId: user.id },
      include: {
        albums: {
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
          },
          orderBy: { addedAt: 'desc' },
        },
      },
    });

    console.log(`Found ${collections.length} collections for user ${user.id}`);
    collections.forEach((col, idx) => {
      console.log(
        `  Collection ${idx + 1}: ${col.name} with ${col.albums?.length || 0} albums`
      );
    });

    return collections;
  },

  myCollectionAlbums: async (_, __, { user, prisma }) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    const collectionAlbums = await prisma.collectionAlbum.findMany({
      where: {
        collection: {
          userId: user.id,
        },
      },
      include: {
        album: {
          include: {
            artists: {
              include: {
                artist: true,
              },
              orderBy: { position: 'asc' },
            },
          },
        },
        collection: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });

    return collectionAlbums;
  },

  publicCollections: async (_, { limit = 20, offset = 0 }, { prisma }) => {
    try {
      const collections = await prisma.collection.findMany({
        where: { isPublic: true },
        skip: offset,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      });
      return collections;
    } catch (error) {
      throw new GraphQLError(`Failed to fetch public collections: ${error}`);
    }
  },

  userCollections: async (_, { userId }, { prisma }) => {
    try {
      const collections = await prisma.collection.findMany({
        where: {
          userId,
          OR: [
            { isPublic: true },
            // Note: In the future, we might want to add logic here
            // to show private collections if the requesting user
            // is the owner or has permission to view them
          ],
        },
        orderBy: { updatedAt: 'desc' },
      });
      return collections;
    } catch (error) {
      throw new GraphQLError(`Failed to fetch user collections: ${error}`);
    }
  },

  myRecommendations: async (
    _,
    { cursor, limit = 10, sort = 'SCORE_DESC' },
    { user, prisma }
  ) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    try {
      const orderBy =
        sort === 'SCORE_DESC'
          ? { score: 'desc' as const }
          : sort === 'SCORE_ASC'
            ? { score: 'asc' as const }
            : { createdAt: 'desc' as const };

      const { buildCursorPagination, extractCursorPage } = await import(
        '@/lib/db'
      );

      const recommendations = await prisma.recommendation.findMany({
        where: { userId: user.id },
        ...buildCursorPagination(cursor, limit),
        orderBy: [orderBy, { id: 'desc' }],
        include: {
          user: true,
          basisAlbum: {
            include: {
              artists: { include: { artist: true } },
            },
          },
          recommendedAlbum: {
            include: {
              artists: { include: { artist: true } },
            },
          },
        },
      });

      const { items, nextCursor, hasMore } = extractCursorPage(
        recommendations,
        limit
      );

      return {
        recommendations: items,
        cursor: nextCursor,
        hasMore,
      };
    } catch (error) {
      console.error('Error fetching user recommendations:', error);
      return {
        recommendations: [],
        cursor: null,
        hasMore: false,
      };
    }
  },

  getAlbumRecommendations: async (
    _,
    { albumId, filter = 'all', sort = 'newest', skip = 0, limit = 12 },
    { prisma }
  ) => {
    try {
      // Build where clause based on filter
      const where: Prisma.RecommendationWhereInput = {
        OR: [{ basisAlbumId: albumId }, { recommendedAlbumId: albumId }],
      };

      // Apply filter
      if (filter === 'basis') {
        where.OR = [{ basisAlbumId: albumId }];
      } else if (filter === 'recommended') {
        where.OR = [{ recommendedAlbumId: albumId }];
      }

      // Build orderBy clause based on sort
      let orderBy: Prisma.RecommendationOrderByWithRelationInput;
      switch (sort) {
        case 'oldest':
          orderBy = { createdAt: 'asc' };
          break;
        case 'highest_score':
          orderBy = { score: 'desc' };
          break;
        case 'lowest_score':
          orderBy = { score: 'asc' };
          break;
        case 'newest':
        default:
          orderBy = { createdAt: 'desc' };
          break;
      }

      // Get total count for pagination
      const total = await prisma.recommendation.count({ where });

      // Fetch recommendations
      const recommendations = await prisma.recommendation.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          user: true,
          basisAlbum: {
            include: {
              artists: {
                include: { artist: true },
                orderBy: { position: 'asc' },
                take: 1,
              },
            },
          },
          recommendedAlbum: {
            include: {
              artists: {
                include: { artist: true },
                orderBy: { position: 'asc' },
                take: 1,
              },
            },
          },
        },
      });

      // Transform recommendations to include albumRole and otherAlbum
      const transformedRecommendations = recommendations.map(rec => {
        const isBasis = rec.basisAlbumId === albumId;
        const otherAlbum = isBasis ? rec.recommendedAlbum : rec.basisAlbum;
        const primaryArtist = otherAlbum.artists[0]?.artist;

        return {
          id: rec.id,
          score: rec.score,
          createdAt: rec.createdAt,
          updatedAt: rec.updatedAt,
          userId: rec.userId,
          albumRole: isBasis ? 'basis' : 'recommended',
          otherAlbum: {
            id: otherAlbum.id,
            title: otherAlbum.title,
            artist: primaryArtist?.name || 'Unknown Artist',
            imageUrl: otherAlbum.coverArtUrl,
            cloudflareImageId: otherAlbum.cloudflareImageId,
            year: otherAlbum.releaseDate
              ? new Date(otherAlbum.releaseDate).getFullYear().toString()
              : null,
          },
          user: rec.user,
        };
      });

      // Calculate pagination
      const page = Math.floor(skip / limit) + 1;
      const hasMore = skip + limit < total;

      return {
        recommendations: transformedRecommendations,
        pagination: {
          page,
          perPage: limit,
          total,
          hasMore,
        },
      };
    } catch (error) {
      console.error('Error fetching album recommendations:', error);
      throw new GraphQLError(
        `Failed to fetch album recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },

  socialFeed: async (_, { type, cursor, limit = 20 }, { user, prisma }) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    try {
      // Get users that the current user follows
      const followedUsers = await prisma.userFollow.findMany({
        where: { followerId: user.id },
        select: { followedId: true },
      });

      const followedUserIds = followedUsers.map(f => f.followedId);

      if (followedUserIds.length === 0) {
        return {
          activities: [],
          cursor: null,
          hasMore: false,
        };
      }

      // Fetch privacy settings for all followed users
      const followedUserSettings = await prisma.userSettings.findMany({
        where: { userId: { in: followedUserIds } },
        select: {
          userId: true,
          showRecentActivity: true,
          showCollections: true,
          showListenLaterInFeed: true,
          showCollectionAddsInFeed: true,
        },
      });

      // Create a settings map with defaults for users without settings
      const settingsMap = new Map(followedUserSettings.map(s => [s.userId, s]));
      const getSettings = (userId: string) =>
        settingsMap.get(userId) || {
          showRecentActivity: true,
          showCollections: true,
          showListenLaterInFeed: true,
          showCollectionAddsInFeed: true,
        };

      // Build type filter for Activity table
      // Map GraphQL enum to database values
      const typeMap: Record<string, string> = {
        FOLLOW: 'follow',
        RECOMMENDATION: 'recommendation',
        COLLECTION_ADD: 'collection_add',
      };
      const dbType = type ? typeMap[type] : undefined;
      const typeFilter = dbType
        ? { type: dbType }
        : { type: { in: ['follow', 'recommendation', 'collection_add'] } };

      let cursorDate = cursor ? new Date(cursor) : null;

      // Privacy filters can remove items after fetching, so we need to
      // over-fetch and paginate through DB rows until we have enough
      // visible activities (or run out of data).
      const maxBatchSize = limit * 3;
      const maxPasses = 3;
      type ActivityRow = Awaited<
        ReturnType<typeof prisma.activity.findMany>
      >[number];
      const collected: ActivityRow[] = [];
      let exhausted = false;
      let activities: ActivityRow[] = [];

      for (let pass = 0; pass < maxPasses; pass++) {
        activities = await prisma.activity.findMany({
          where: {
            userId: { in: followedUserIds },
            ...typeFilter,
            deletedAt: null,
            ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
          },
          include: {
            user: true,
            targetUser: true,
            recommendation: {
              include: {
                basisAlbum: {
                  include: { artists: { include: { artist: true } } },
                },
                recommendedAlbum: {
                  include: { artists: { include: { artist: true } } },
                },
              },
            },
            collectionAlbum: {
              include: {
                collection: true,
                album: {
                  include: { artists: { include: { artist: true } } },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: maxBatchSize,
        });

        if (activities.length === 0) {
          exhausted = true;
          break;
        }

        // Apply privacy filters
        const visible = activities.filter(activity => {
          const settings = getSettings(activity.userId);
          if (!settings.showRecentActivity) return false;
          if (activity.type === 'collection_add' && activity.collectionAlbum) {
            if (!settings.showCollections) return false;
            const collection = activity.collectionAlbum.collection;
            if (!collection) return false;
            if (!collection.isPublic && collection.name !== 'My Collection')
              return false;
            const isListenLater = collection.name === 'Listen Later';
            if (isListenLater && !settings.showListenLaterInFeed) return false;
            if (!isListenLater && !settings.showCollectionAddsInFeed)
              return false;
          }
          return true;
        });

        collected.push(...visible);

        // We need limit + 1 to determine hasMore
        if (collected.length > limit) break;

        // If DB returned fewer than requested, there's no more data
        if (activities.length < maxBatchSize) {
          exhausted = true;
          break;
        }

        // Move cursor to continue fetching
        cursorDate = activities[activities.length - 1].createdAt;
      }

      const hasMore = !exhausted && collected.length > limit;
      const finalActivities = collected.slice(0, limit);
      const nextCursor =
        hasMore && finalActivities.length > 0
          ? finalActivities[finalActivities.length - 1].createdAt.toISOString()
          : null;

      // Transform to GraphQL response format
      const transformedActivities = finalActivities.map(activity => {
        const metadata = activity.metadata as Record<string, unknown> | null;

        // Map database type back to GraphQL enum
        const typeEnumMap: Record<string, string> = {
          follow: 'FOLLOW',
          recommendation: 'RECOMMENDATION',
          collection_add: 'COLLECTION_ADD',
        };

        return {
          id: activity.id,
          type: typeEnumMap[activity.type] || activity.type.toUpperCase(),
          createdAt: activity.createdAt,
          actor: activity.user,
          targetUser: activity.targetUser,
          album:
            activity.type === 'recommendation'
              ? activity.recommendation?.recommendedAlbum
              : activity.collectionAlbum?.album || null,
          recommendation: activity.recommendation,
          collection: activity.collectionAlbum?.collection || null,
          metadata: metadata
            ? {
                score: (metadata.score as number) || null,
                basisAlbum: activity.recommendation?.basisAlbum || null,
                collectionName: (metadata.collectionName as string) || null,
                personalRating: (metadata.personalRating as number) || null,
                position: null,
              }
            : null,
        };
      });

      return {
        activities: transformedActivities,
        cursor: nextCursor,
        hasMore,
      };
    } catch (error) {
      console.error('Error fetching social feed:', error);
      return {
        activities: [],
        cursor: null,
        hasMore: false,
      };
    }
  },

  mySettings: async (_, __, { user, prisma }) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    try {
      // Get or create user settings
      let settings = await prisma.userSettings.findUnique({
        where: { userId: user.id },
      });

      // If no settings exist, create default settings
      if (!settings) {
        settings = await prisma.userSettings.create({
          data: {
            userId: user.id,
            theme: 'dark',
            language: 'en',
            profileVisibility: 'public',
            showRecentActivity: true,
            showCollections: true,
            emailNotifications: true,
            recommendationAlerts: true,
            followAlerts: true,
            defaultCollectionView: 'grid',
            autoplayPreviews: false,
          },
        });
      }

      return settings;
    } catch (error) {
      console.error('Error fetching user settings:', error);
      throw new GraphQLError('Failed to fetch settings');
    }
  },

  followingActivity: async (_, { limit = 50 }, { user, prisma }) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    try {
      // Get users that the current user follows
      const followedUsers = await prisma.userFollow.findMany({
        where: { followerId: user.id },
        select: { followedId: true },
      });

      const followedUserIds = followedUsers.map(f => f.followedId);

      if (followedUserIds.length === 0) {
        console.log('User not following anyone, returning empty activity');
        return [];
      }

      // Get recent recommendations from followed users (exclude soft-deleted)
      const recommendations = await prisma.recommendation.findMany({
        where: {
          userId: { in: followedUserIds },
          user: { deletedAt: null },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          basisAlbum: {
            include: {
              artists: {
                include: {
                  artist: true,
                },
              },
            },
          },
          recommendedAlbum: {
            include: {
              artists: {
                include: {
                  artist: true,
                },
              },
            },
          },
        },
      });

      return recommendations;
    } catch (error) {
      console.error('Error fetching following activity:', error);
      return [];
    }
  },

  // Music Database queries
  databaseStats: async (_, __, { prisma, user }) => {
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    if (!isAdmin(user.role)) {
      throw new GraphQLError('Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    try {
      const [
        totalAlbums,
        totalArtists,
        totalTracks,
        albumsNeedingEnrichment,
        artistsNeedingEnrichment,
        recentlyEnrichedAlbums,
        recentlyEnrichedArtists,
        failedAlbums,
        failedArtists,
        albumQuality,
      ] = await Promise.all([
        prisma.album.count(),
        prisma.artist.count(),
        prisma.track.count(),
        prisma.album.count({
          where: {
            OR: [
              { dataQuality: 'LOW' },
              { enrichmentStatus: { in: ['UNENRICHED', 'QUEUED', 'FAILED'] } },
              { musicbrainzId: null },
            ],
          },
        }),
        prisma.artist.count({
          where: {
            OR: [
              { dataQuality: 'LOW' },
              { enrichmentStatus: { in: ['UNENRICHED', 'QUEUED', 'FAILED'] } },
              { musicbrainzId: null },
            ],
          },
        }),
        prisma.album.count({
          where: {
            lastEnriched: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }),
        prisma.artist.count({
          where: {
            lastEnriched: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.album.count({
          where: { enrichmentStatus: 'FAILED' },
        }),
        prisma.artist.count({
          where: { enrichmentStatus: 'FAILED' },
        }),
        prisma.album.groupBy({
          by: ['dataQuality'],
          _count: true,
        }),
      ]);

      // Calculate average data quality
      const qualityScores = { HIGH: 1, MEDIUM: 0.5, LOW: 0 };
      let totalQualityScore = 0;
      let totalWithQuality = 0;

      albumQuality.forEach(q => {
        if (q.dataQuality && qualityScores[q.dataQuality] !== undefined) {
          totalQualityScore += qualityScores[q.dataQuality] * q._count;
          totalWithQuality += q._count;
        }
      });

      const averageDataQuality =
        totalWithQuality > 0 ? totalQualityScore / totalWithQuality : 0;

      return {
        totalAlbums,
        totalArtists,
        totalTracks,
        albumsNeedingEnrichment,
        artistsNeedingEnrichment,
        recentlyEnriched: recentlyEnrichedAlbums + recentlyEnrichedArtists,
        failedEnrichments: failedAlbums + failedArtists,
        averageDataQuality,
      };
    } catch (error) {
      throw new GraphQLError(`Failed to get database stats: ${error}`);
    }
  },

  albumsByJobId: async (_, args, { prisma }) => {
    try {
      const { jobId } = args;

      const albums = await prisma.album.findMany({
        where: {
          metadata: {
            path: ['jobId'],
            equals: jobId,
          },
        },
        include: {
          artists: {
            include: {
              artist: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Transform to match GraphQL schema
      return albums.map(album => ({
        ...album,
        artists: album.artists.map(aa => ({
          artist: aa.artist,
          role: aa.role,
          position: aa.position,
        })),
        needsEnrichment:
          album.dataQuality === 'LOW' ||
          album.enrichmentStatus === 'UNENRICHED' ||
          album.enrichmentStatus === 'QUEUED' ||
          album.enrichmentStatus === 'FAILED' ||
          !album.musicbrainzId,
      }));
    } catch (error) {
      throw new GraphQLError(`Failed to fetch albums by job ID: ${error}`);
    }
  },

  searchAlbums: async (_, args, { prisma }) => {
    try {
      const {
        query,
        id,
        dataQuality,
        enrichmentStatus,
        needsEnrichment,
        source,
        sortBy = 'title',
        sortOrder = 'asc',
        skip = 0,
        limit = 50,
      } = args;

      const where: any = {};

      // Search by ID (explicit parameter - highest priority)
      if (id) {
        where.id = id;
      }
      // Search query (text search)
      else if (query) {
        where.OR = [
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
        ];
      }

      // Filters
      if (dataQuality && dataQuality !== 'all') {
        where.dataQuality = dataQuality;
      }
      if (enrichmentStatus && enrichmentStatus !== 'all') {
        where.enrichmentStatus = enrichmentStatus;
      }
      if (needsEnrichment) {
        where.OR = where.OR || [];
        where.OR.push(
          { dataQuality: 'LOW' },
          { enrichmentStatus: { in: ['UNENRICHED', 'QUEUED', 'FAILED'] } },
          { musicbrainzId: null }
        );
      }
      // Filter by source (e.g., SPOTIFY, MUSICBRAINZ)
      if (source && source !== 'all') {
        where.source = source;
      }

      // Sorting
      const orderBy: any = {};
      if (sortBy === 'title') orderBy.title = sortOrder;
      else if (sortBy === 'releaseDate') orderBy.releaseDate = sortOrder;
      else if (sortBy === 'lastEnriched') orderBy.lastEnriched = sortOrder;
      else if (sortBy === 'dataQuality') orderBy.dataQuality = sortOrder;
      else if (sortBy === 'createdAt') orderBy.createdAt = sortOrder;

      const albums = await prisma.album.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          artists: {
            include: {
              artist: true,
            },
          },
        },
      });

      // Transform to match GraphQL schema
      return albums.map(album => ({
        ...album,
        artists: album.artists.map(aa => ({
          artist: aa.artist,
          role: aa.role,
          position: aa.position,
        })),
        needsEnrichment:
          album.dataQuality === 'LOW' ||
          album.enrichmentStatus === 'UNENRICHED' ||
          album.enrichmentStatus === 'QUEUED' ||
          album.enrichmentStatus === 'FAILED' ||
          !album.musicbrainzId,
      }));
    } catch (error) {
      throw new GraphQLError(`Failed to search albums: ${error}`);
    }
  },

  searchArtists: async (_, args, { prisma }) => {
    try {
      const {
        query,
        id,
        dataQuality,
        enrichmentStatus,
        needsEnrichment,
        sortBy = 'name',
        sortOrder = 'asc',
        skip = 0,
        limit = 50,
      } = args;

      // Build where clause for local database search
      const where: any = {};

      // Direct ID search takes priority
      if (id) {
        where.id = id;
      }

      // Text search on name if query provided
      if (query) {
        where.name = {
          contains: query,
          mode: 'insensitive',
        };
      }

      // Filter by data quality
      if (dataQuality && dataQuality !== 'all') {
        where.dataQuality = dataQuality;
      }

      // Filter by enrichment status
      if (enrichmentStatus && enrichmentStatus !== 'all') {
        where.enrichmentStatus = enrichmentStatus;
      }

      // Filter by needs enrichment
      if (needsEnrichment) {
        where.OR = where.OR || [];
        where.OR.push(
          { imageUrl: null },
          { cloudflareImageId: null },
          { dataQuality: 'LOW' },
          { enrichmentStatus: { in: ['UNENRICHED', 'QUEUED', 'FAILED'] } }
        );
      }

      // Build orderBy clause
      const orderBy: any = {};
      if (sortBy === 'name') orderBy.name = sortOrder;
      else if (sortBy === 'createdAt') orderBy.createdAt = sortOrder;
      else if (sortBy === 'updatedAt') orderBy.updatedAt = sortOrder;
      else if (sortBy === 'lastEnriched') orderBy.lastEnriched = sortOrder;

      // Query local database
      const artists = await prisma.artist.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              albums: true,
              tracks: true,
            },
          },
        },
      });

      // Transform to match GraphQL schema with computed fields
      return artists.map(artist => ({
        ...artist,
        albumCount: artist._count.albums,
        trackCount: artist._count.tracks,
        needsEnrichment:
          !artist.imageUrl ||
          !artist.cloudflareImageId ||
          artist.dataQuality === 'LOW' ||
          artist.enrichmentStatus === 'UNENRICHED' ||
          artist.enrichmentStatus === 'QUEUED' ||
          artist.enrichmentStatus === 'FAILED',
      }));
    } catch (error) {
      console.error(
        `❌ [Search Error] Failed to search artists for "${args.query}":`,
        error
      );
      throw new GraphQLError(
        `Failed to search artists: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },

  searchTracks: async (_, args, { prisma }) => {
    try {
      const { query, skip = 0, limit = 50 } = args;

      const where: any = {};

      // Search query
      if (query) {
        where.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { isrc: { contains: query, mode: 'insensitive' } },
        ];
      }

      const tracks = await prisma.track.findMany({
        where,
        skip,
        take: limit,
        include: {
          album: true,
          trackArtists: {
            include: {
              artist: true,
            },
          },
        },
      });

      // Transform to match GraphQL schema
      return tracks.map(track => ({
        ...track,
        artists: track.trackArtists.map(ta => ({
          artist: ta.artist,
          role: ta.role,
        })),
      }));
    } catch (error) {
      throw new GraphQLError(`Failed to search tracks: ${error}`);
    }
  },

  // Enrichment log queries
  llamaLogs: async (_, args, { prisma, user }) => {
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    if (!isAdmin(user.role)) {
      throw new GraphQLError('Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    try {
      const {
        includeChildren = false,
        parentOnly = false,
        parentJobId,
        ...filterArgs
      } = args;

      // Build where clause for filters
      const where: Record<string, unknown> = {};
      if (filterArgs.entityType) where.entityType = filterArgs.entityType;
      if (filterArgs.entityId) {
        // Query by both entityId and typed ID fields (albumId/artistId/trackId)
        // This ensures we find logs regardless of which field was populated
        if (filterArgs.entityType === 'ALBUM') {
          where.OR = [
            { entityId: filterArgs.entityId },
            { albumId: filterArgs.entityId },
          ];
        } else if (filterArgs.entityType === 'ARTIST') {
          where.OR = [
            { entityId: filterArgs.entityId },
            { artistId: filterArgs.entityId },
          ];
        } else if (filterArgs.entityType === 'TRACK') {
          where.OR = [
            { entityId: filterArgs.entityId },
            { trackId: filterArgs.entityId },
          ];
        } else {
          // Fallback: query all ID fields
          where.OR = [
            { entityId: filterArgs.entityId },
            { albumId: filterArgs.entityId },
            { artistId: filterArgs.entityId },
            { trackId: filterArgs.entityId },
          ];
        }
      }
      if (filterArgs.status) where.status = filterArgs.status;
      if (filterArgs.category && filterArgs.category.length > 0) {
        where.category = { in: filterArgs.category };
      }
      if (filterArgs.sources && filterArgs.sources.length > 0) {
        where.sources = { hasSome: filterArgs.sources };
      }

      // Simple flat fetch (default behavior)
      if (!includeChildren) {
        // Add parentJobId filtering
        if (parentOnly) {
          where.parentJobId = null;
        } else if (parentJobId) {
          where.parentJobId = parentJobId;
        }

        const logs = await prisma.llamaLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: filterArgs.skip || 0,
          take: filterArgs.limit || 50,
        });
        return logs.map(log => ({ ...log, children: null }));
      }

      // Tree fetch: get root logs only (parentJobId is null)
      const parentLogs = await prisma.llamaLog.findMany({
        where: {
          ...where,
          parentJobId: null,
        },
        orderBy: { createdAt: 'desc' },
        skip: filterArgs.skip || 0,
        take: filterArgs.limit || 50,
      });

      // Collect all parent jobIds for batch child fetch
      const parentJobIds = parentLogs
        .map(log => log.jobId)
        .filter((id): id is string => Boolean(id));

      // If no parents have jobIds, return with empty children
      if (parentJobIds.length === 0) {
        return parentLogs.map(log => ({ ...log, children: [] }));
      }

      // Batch fetch all children in single query
      const childLogs = await prisma.llamaLog.findMany({
        where: {
          parentJobId: { in: parentJobIds },
        },
        orderBy: { createdAt: 'asc' },
      });

      // Build children map for O(n) lookup
      const childrenMap = new Map<string, typeof childLogs>();
      for (const child of childLogs) {
        if (!child.parentJobId) continue;
        const siblings = childrenMap.get(child.parentJobId) || [];
        siblings.push(child);
        childrenMap.set(child.parentJobId, siblings);
      }

      // Attach children to parents
      return parentLogs.map(parent => ({
        ...parent,
        children: parent.jobId
          ? (childrenMap.get(parent.jobId) || []).map(child => ({
              ...child,
              children: null, // Leaf nodes have no children (one level only)
            }))
          : [],
      }));
    } catch (error) {
      throw new GraphQLError(`Failed to fetch enrichment logs: ${error}`);
    }
  },

  // Provenance chain for entity lifecycle tracking
  llamaLogChain: async (
    _: unknown,
    args: {
      entityType: 'ALBUM' | 'ARTIST' | 'TRACK';
      entityId: string;
      categories?: string[];
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      cursor?: string;
    },
    { prisma, user }: Context
  ) => {
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    if (!isAdmin(user.role)) {
      throw new GraphQLError('Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    const {
      entityType,
      entityId,
      categories,
      startDate,
      endDate,
      limit = 20,
      cursor,
    } = args;

    // 1. Validate entity exists
    const entityTable = entityType.toLowerCase() as
      | 'album'
      | 'artist'
      | 'track';

    // Album has 'title', Artist has 'name', Track has 'title'
    const nameField = entityTable === 'artist' ? 'name' : 'title';

    const entity = await (
      prisma[entityTable] as typeof prisma.album
    ).findUnique({
      where: { id: entityId },
      select: { id: true, [nameField]: true },
    });

    if (!entity) {
      throw new GraphQLError(`${entityType} not found: ${entityId}`, {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // 2. Build where clause using typed ID field for index usage
    const typedIdField = `${entityTable}Id` as
      | 'albumId'
      | 'artistId'
      | 'trackId';

    // Use OR to match both typed ID field and generic entityId (for historical data)
    const baseWhere = {
      OR: [{ [typedIdField]: entityId }, { entityId: entityId, entityType }],
    };

    // Build date filter (merge gte/lte if both provided)
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    const where = {
      ...baseWhere,
      ...(categories &&
        categories.length > 0 && { category: { in: categories } }),
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
    };

    // 3. Fetch logs and count in parallel
    const { buildCursorPagination, extractCursorPage } = await import(
      '@/lib/db'
    );

    const [logs, totalCount] = await Promise.all([
      prisma.llamaLog.findMany({
        ...buildCursorPagination(cursor, limit),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        where,
      }),
      prisma.llamaLog.count({ where }),
    ]);

    const { items, nextCursor, hasMore } = extractCursorPage(logs, limit);

    return {
      logs: items.map(log => ({ ...log, children: null })),
      totalCount,
      cursor: nextCursor,
      hasMore,
    };
  },

  enrichmentStats: async (_, args, { prisma, user }) => {
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    if (!isAdmin(user.role)) {
      throw new GraphQLError('Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    try {
      const where: Record<string, unknown> = {};

      if (args.entityType) where.entityType = args.entityType;
      if (args.timeRange) {
        where.createdAt = {
          gte: args.timeRange.from,
          lte: args.timeRange.to,
        };
      }

      const logs = await prisma.llamaLog.findMany({ where });

      // Calculate source statistics
      const sourceMap = new Map<string, { total: number; success: number }>();

      logs.forEach(log => {
        log.sources.forEach(source => {
          const stats = sourceMap.get(source) || { total: 0, success: 0 };
          stats.total++;
          if (log.status === 'SUCCESS') stats.success++;
          sourceMap.set(source, stats);
        });
      });

      const sourceStats = Array.from(sourceMap.entries()).map(
        ([source, stats]) => ({
          source,
          attempts: stats.total,
          successRate: stats.total > 0 ? stats.success / stats.total : 0,
        })
      );

      const totalLogs = logs.length;
      const avgDurationMs =
        totalLogs > 0
          ? logs.reduce((sum, l) => sum + (l.durationMs || 0), 0) / totalLogs
          : 0;

      return {
        totalAttempts: totalLogs,
        successCount: logs.filter(l => l.status === 'SUCCESS').length,
        failedCount: logs.filter(l => l.status === 'FAILED').length,
        noDataCount: logs.filter(l => l.status === 'NO_DATA_AVAILABLE').length,
        skippedCount: logs.filter(l => l.status === 'SKIPPED').length,
        averageDurationMs: avgDurationMs,
        sourceStats,
      };
    } catch (error) {
      throw new GraphQLError(`Failed to calculate enrichment stats: ${error}`);
    }
  },

  // Top recommended albums - albums that appear most frequently in recommendations
  topRecommendedAlbums: async (_, { limit = 20 }, { prisma }) => {
    try {
      // Get all albums that appear in recommendations with their counts
      const albumStats = await prisma.$queryRaw<
        Array<{
          album_id: string;
          total_count: bigint;
          basis_count: bigint;
          target_count: bigint;
          avg_score: number;
        }>
      >`
        WITH album_recommendation_stats AS (
          SELECT 
            album_id,
            SUM(basis_count + target_count) as total_count,
            SUM(basis_count) as basis_count,
            SUM(target_count) as target_count,
            AVG(avg_score) as avg_score
          FROM (
            SELECT 
              basis_album_id as album_id,
              COUNT(*) as basis_count,
              0 as target_count,
              AVG(score) as avg_score
            FROM "Recommendation"
            GROUP BY basis_album_id
            
            UNION ALL
            
            SELECT 
              recommended_album_id as album_id,
              0 as basis_count,
              COUNT(*) as target_count,
              AVG(score) as avg_score
            FROM "Recommendation"
            GROUP BY recommended_album_id
          ) combined
          GROUP BY album_id
        )
        SELECT 
          album_id,
          total_count,
          basis_count,
          target_count,
          avg_score
        FROM album_recommendation_stats
        ORDER BY total_count DESC
        LIMIT ${limit}
      `;

      if (albumStats.length === 0) {
        return [];
      }

      // Fetch the actual album data
      const albumIds = albumStats.map(stat => stat.album_id);
      const albums = await prisma.album.findMany({
        where: { id: { in: albumIds } },
        include: {
          artists: {
            include: { artist: true },
            orderBy: { position: 'asc' },
          },
        },
      });

      // Create a map for quick lookup
      const albumMap = new Map(albums.map(album => [album.id, album]));

      // Combine stats with album data, maintaining the order
      return albumStats
        .map(stat => {
          const album = albumMap.get(stat.album_id);
          if (!album) return null;

          return {
            album,
            recommendationCount: Number(stat.total_count),
            asBasisCount: Number(stat.basis_count),
            asTargetCount: Number(stat.target_count),
            averageScore: stat.avg_score || 0,
          };
        })
        .filter(Boolean);
    } catch (error) {
      console.error('Error fetching top recommended albums:', error);
      throw new GraphQLError(
        `Failed to fetch top recommended albums: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },

  // Top recommended artists - artists whose albums appear most frequently in recommendations
  topRecommendedArtists: async (_, { limit = 20 }, { prisma }) => {
    try {
      // Get artists with the most albums appearing in recommendations
      const artistStats = await prisma.$queryRaw<
        Array<{
          artist_id: string;
          total_count: bigint;
          album_count: bigint;
          avg_score: number;
        }>
      >`
        WITH album_recommendations AS (
          SELECT basis_album_id as album_id, score FROM "Recommendation"
          UNION ALL
          SELECT recommended_album_id as album_id, score FROM "Recommendation"
        ),
        artist_album_stats AS (
          SELECT 
            aa.artist_id,
            COUNT(*) as total_count,
            COUNT(DISTINCT ar.album_id) as album_count,
            AVG(ar.score) as avg_score
          FROM album_recommendations ar
          JOIN album_artists aa ON ar.album_id = aa.album_id
          GROUP BY aa.artist_id
        )
        SELECT 
          artist_id,
          total_count,
          album_count,
          avg_score
        FROM artist_album_stats
        ORDER BY total_count DESC
        LIMIT ${limit}
      `;

      if (artistStats.length === 0) {
        return [];
      }

      // Fetch the actual artist data
      const artistIds = artistStats.map(stat => stat.artist_id);
      const artists = await prisma.artist.findMany({
        where: { id: { in: artistIds } },
      });

      // Create a map for quick lookup
      const artistMap = new Map(artists.map(artist => [artist.id, artist]));

      // Combine stats with artist data, maintaining the order
      return artistStats
        .map(stat => {
          const artist = artistMap.get(stat.artist_id);
          if (!artist) return null;

          return {
            artist,
            recommendationCount: Number(stat.total_count),
            albumsInRecommendations: Number(stat.album_count),
            averageScore: stat.avg_score || 0,
          };
        })
        .filter(Boolean);
    } catch (error) {
      console.error('Error fetching top recommended artists:', error);
      throw new GraphQLError(
        `Failed to fetch top recommended artists: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },

  artistRecommendations: async (
    _,
    { artistId, filter, sort = 'NEWEST', limit = 12, offset = 0 },
    { prisma, user }
  ) => {
    try {
      // 1. Get all albums by this artist from AlbumArtist junction table
      const artistAlbums = await prisma.albumArtist.findMany({
        where: { artistId },
        select: { albumId: true },
      });
      const albumIds = artistAlbums.map((a: { albumId: string }) => a.albumId);

      if (albumIds.length === 0) {
        return { recommendations: [], totalCount: 0, hasMore: false };
      }

      // 2. Build filter condition based on AlbumRole
      type WhereCondition = {
        basisAlbumId?: { in: string[] };
        recommendedAlbumId?: { in: string[] };
        OR?: Array<{
          basisAlbumId?: { in: string[] };
          recommendedAlbumId?: { in: string[] };
        }>;
      };

      let whereCondition: WhereCondition;
      if (filter === 'BASIS') {
        whereCondition = { basisAlbumId: { in: albumIds } };
      } else if (filter === 'RECOMMENDED') {
        whereCondition = { recommendedAlbumId: { in: albumIds } };
      } else {
        // ALL or undefined - either basis or recommended
        whereCondition = {
          OR: [
            { basisAlbumId: { in: albumIds } },
            { recommendedAlbumId: { in: albumIds } },
          ],
        };
      }

      // 3. Get total count for pagination
      const totalCount = await prisma.recommendation.count({
        where: whereCondition,
      });

      // 4. Map sort to Prisma orderBy
      const orderByMap: Record<
        string,
        { createdAt?: 'desc' | 'asc'; score?: 'desc' | 'asc' }
      > = {
        NEWEST: { createdAt: 'desc' },
        OLDEST: { createdAt: 'asc' },
        HIGHEST_SCORE: { score: 'desc' },
        LOWEST_SCORE: { score: 'asc' },
      };
      const orderBy = orderByMap[sort] || orderByMap.NEWEST;

      // 5. Fetch recommendations with related data
      const recommendations = await prisma.recommendation.findMany({
        where: whereCondition,
        orderBy,
        skip: offset,
        take: limit,
        include: {
          basisAlbum: {
            include: { artists: { include: { artist: true } } },
          },
          recommendedAlbum: {
            include: { artists: { include: { artist: true } } },
          },
          user: true,
        },
      });

      // 6. Transform to add albumRole and isOwnRecommendation
      const transformedRecs = recommendations.map(
        (rec: {
          id: string;
          score: number;
          createdAt: Date;
          userId: string;
          basisAlbumId: string;
          recommendedAlbumId: string;
          basisAlbum: unknown;
          recommendedAlbum: unknown;
          user: unknown;
        }) => {
          const basisInArtist = albumIds.includes(rec.basisAlbumId);
          const recommendedInArtist = albumIds.includes(rec.recommendedAlbumId);

          let albumRole: 'BASIS' | 'RECOMMENDED' | 'BOTH';
          if (basisInArtist && recommendedInArtist) {
            albumRole = 'BOTH';
          } else if (basisInArtist) {
            albumRole = 'BASIS';
          } else {
            albumRole = 'RECOMMENDED';
          }

          return {
            id: rec.id,
            score: rec.score,
            description: null, // Recommendation model doesn't have description
            createdAt: rec.createdAt,
            albumRole,
            basisAlbum: rec.basisAlbum,
            recommendedAlbum: rec.recommendedAlbum,
            user: rec.user,
            isOwnRecommendation: user?.id === rec.userId,
          };
        }
      );

      return {
        recommendations: transformedRecs,
        totalCount,
        hasMore: offset + recommendations.length < totalCount,
      };
    } catch (error) {
      console.error('Error fetching artist recommendations:', error);
      throw new GraphQLError(
        `Failed to fetch artist recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },

  // ============================================================================
  // Sync Job Queries
  // ============================================================================

  syncJobs: async (_, { input }, { prisma }) => {
    try {
      const {
        jobType,
        status,
        startedAfter,
        startedBefore,
        limit = 20,
        offset = 0,
      } = input || {};

      const where: Record<string, unknown> = {};

      if (jobType) {
        where.jobType = jobType;
      }
      if (status) {
        where.status = status;
      }
      if (startedAfter || startedBefore) {
        where.startedAt = {};
        if (startedAfter) {
          (where.startedAt as Record<string, unknown>).gte = new Date(
            startedAfter
          );
        }
        if (startedBefore) {
          (where.startedAt as Record<string, unknown>).lte = new Date(
            startedBefore
          );
        }
      }

      const [jobs, totalCount] = await Promise.all([
        prisma.syncJob.findMany({
          where,
          orderBy: { startedAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.syncJob.count({ where }),
      ]);

      return {
        jobs,
        totalCount,
        hasMore: offset + jobs.length < totalCount,
      };
    } catch (error) {
      console.error('Error fetching sync jobs:', error);
      throw new GraphQLError(
        `Failed to fetch sync jobs: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },

  syncJob: async (_, { id }, { prisma }) => {
    try {
      const syncJob = await prisma.syncJob.findUnique({
        where: { id },
      });

      return syncJob;
    } catch (error) {
      console.error('Error fetching sync job:', error);
      throw new GraphQLError(
        `Failed to fetch sync job: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },

  syncJobByJobId: async (_, { jobId }, { prisma }) => {
    try {
      const syncJob = await prisma.syncJob.findUnique({
        where: { jobId },
      });

      return syncJob;
    } catch (error) {
      console.error('Error fetching sync job by jobId:', error);
      throw new GraphQLError(
        `Failed to fetch sync job: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },
  // ============================================================================
  // Correction System Queries (Admin Only)
  // ============================================================================

  correctionSearch: async (_, { input }, { user, prisma }) => {
    // Authentication check
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Authorization check - admin only
    if (!isAdmin(user.role)) {
      throw new GraphQLError('Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    try {
      const {
        albumId,
        albumTitle,
        artistName,
        yearFilter,
        limit,
        offset,
        strategy,
        lowConfidenceThreshold,
        source,
        releaseGroupMbid,
        discogsId,
      } = input;

      // ================================================================
      // Direct ID lookup (bypasses text search)
      // ================================================================

      // MusicBrainz direct ID lookup
      if (releaseGroupMbid) {
        const searchService = getCorrectionSearchService();
        const result = await searchService.getByMbid(releaseGroupMbid);

        const transformedResult = {
          releaseGroupMbid: result.releaseGroupMbid,
          primaryResult: {
            ...result,
            breakdown: {
              titleScore: 1.0,
              artistScore: 1.0,
              yearScore: 1.0,
              mbScore: 100,
              confidenceTier: null,
            },
            scoringStrategy: GqlScoringStrategy.Normalized,
          },
          alternateVersions: [],
          versionCount: 1,
          bestScore: 1.0,
        };

        return {
          results: [transformedResult],
          totalGroups: 1,
          hasMore: false,
          query: {
            albumTitle: result.title,
            artistName: result.primaryArtistName,
            yearFilter: null,
          },
          scoring: {
            strategy: GqlScoringStrategy.Normalized,
            threshold: 0.5,
            lowConfidenceCount: 0,
          },
        };
      }

      // Discogs direct ID lookup
      if (discogsId) {
        const queuedDiscogsService = getQueuedDiscogsService();
        const master = await queuedDiscogsService.getMaster(discogsId);

        // Handle case where master lookup failed
        if (!master || !master.id) {
          throw new GraphQLError(
            `Discogs master ID "${discogsId}" not found or invalid`,
            { extensions: { code: 'NOT_FOUND' } }
          );
        }

        const result = mapMasterToCorrectionSearchResult(master);

        const transformedResult = {
          releaseGroupMbid: result.releaseGroupMbid,
          primaryResult: {
            ...result,
            normalizedScore: 1.0,
            displayScore: 100,
            breakdown: {
              titleScore: 1.0,
              artistScore: 1.0,
              yearScore: 1.0,
              mbScore: 100,
              confidenceTier: null,
            },
            isLowConfidence: false,
            scoringStrategy: GqlScoringStrategy.Normalized,
          },
          alternateVersions: [],
          versionCount: 1,
          bestScore: 1.0,
        };

        return {
          results: [transformedResult],
          totalGroups: 1,
          hasMore: false,
          query: {
            albumTitle: result.title,
            artistName: result.primaryArtistName,
            yearFilter: null,
          },
          scoring: {
            strategy: GqlScoringStrategy.Normalized,
            threshold: 0.5,
            lowConfidenceCount: 0,
          },
        };
      }

      // ================================================================
      // Text-based search (existing logic)
      // ================================================================

      // Get album data if title/artist not provided
      let searchAlbumTitle = albumTitle;
      let searchArtistName = artistName;

      if (!searchAlbumTitle || !searchArtistName) {
        const album = await prisma.album.findUnique({
          where: { id: albumId },
          include: {
            artists: {
              include: { artist: true },
              orderBy: { position: 'asc' },
            },
          },
        });

        if (!album) {
          throw new GraphQLError('Album not found: ' + albumId, {
            extensions: { code: 'NOT_FOUND' },
          });
        }

        searchAlbumTitle = searchAlbumTitle ?? album.title;
        searchArtistName = searchArtistName ?? album.artists[0]?.artist?.name;
      }
      // Route to Discogs via queue if source is DISCOGS
      if (source === GqlCorrectionSource.Discogs) {
        const queuedDiscogsService = getQueuedDiscogsService();
        const discogsResponse = await queuedDiscogsService.searchAlbums({
          albumId,
          albumTitle: searchAlbumTitle,
          artistName: searchArtistName,
          limit: limit ?? 10,
        });

        // Debug: log the response structure
        console.log('[correctionSearch] Discogs response:', {
          hasResponse: !!discogsResponse,
          hasResults: !!discogsResponse?.results,
          resultsCount: discogsResponse?.resultsCount,
          resultsLength: discogsResponse?.results?.length,
        });

        // Transform Discogs results to GraphQL format
        // Discogs does not have scoring, so wrap each result as a single-item group
        // Handle case where results might be undefined (job serialization issue)
        const discogsResults = discogsResponse?.results ?? [];
        const transformedResults = discogsResults.map(result => ({
          releaseGroupMbid: result.releaseGroupMbid,
          primaryResult: {
            ...result,
            normalizedScore: 1.0,
            displayScore: 100,
            breakdown: {
              titleScore: 1.0,
              artistScore: 1.0,
              yearScore: 1.0,
              mbScore: 100,
              confidenceTier: null,
            },
            isLowConfidence: false,
            scoringStrategy: GqlScoringStrategy.Normalized,
          },
          alternateVersions: [],
          versionCount: 1,
          bestScore: 1.0,
        }));

        return {
          results: transformedResults,
          totalGroups: transformedResults.length,
          hasMore: false, // Discogs search does not paginate in this implementation
          query: {
            albumTitle: searchAlbumTitle ?? null,
            artistName: searchArtistName ?? null,
            yearFilter: null,
          },
          scoring: {
            strategy: GqlScoringStrategy.Normalized,
            threshold: 0.5,
            lowConfidenceCount: 0,
          },
        };
      }

      // MusicBrainz path (default)

      // Map GraphQL strategy enum to service strategy
      const serviceStrategy = mapGqlStrategyToService(strategy);

      // Execute search with scoring
      const searchService = getCorrectionSearchService();
      const response = await searchService.searchWithScoring({
        albumTitle: searchAlbumTitle,
        artistName: searchArtistName,
        yearFilter: yearFilter ?? undefined,
        limit: limit ?? 10,
        offset: offset ?? 0,
        strategy: serviceStrategy,
        lowConfidenceThreshold: lowConfidenceThreshold ?? 0.5,
      });

      // Transform to GraphQL format
      const transformedResults = response.results.map(transformGroupedResult);

      return {
        results: transformedResults,
        totalGroups: response.totalGroups,
        hasMore: response.hasMore,
        query: {
          albumTitle: response.query.albumTitle ?? null,
          artistName: response.query.artistName ?? null,
          yearFilter: response.query.yearFilter ?? null,
        },
        scoring: {
          strategy: mapServiceStrategyToGql(response.scoring.strategy),
          threshold: response.scoring.threshold,
          lowConfidenceCount: response.scoring.lowConfidenceCount,
        },
      };
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      console.error('Error in correctionSearch:', error);
      throw new GraphQLError(
        'Correction search failed: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
        { extensions: { code: 'INTERNAL_SERVER_ERROR' } }
      );
    }
  },

  correctionPreview: async (_, { input }, { user, prisma }) => {
    // Authentication check
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Authorization check - admin only
    if (!isAdmin(user.role)) {
      throw new GraphQLError('Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    try {
      const { albumId, releaseGroupMbid, source } = input;
      const correctionSource = source?.toLowerCase() || 'musicbrainz';

      // Get album with tracks
      const album = await prisma.album.findUnique({
        where: { id: albumId },
        include: {
          tracks: {
            orderBy: [{ discNumber: 'asc' }, { trackNumber: 'asc' }],
          },
          artists: {
            include: { artist: true },
            orderBy: { position: 'asc' },
          },
        },
      });

      if (!album) {
        throw new GraphQLError('Album not found: ' + albumId, {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Fetch source result based on correction source
      let scoredResult: ScoredSearchResult;
      if (correctionSource === 'discogs') {
        // Discogs path: fetch master and map to search result format
        const discogsService = getQueuedDiscogsService();
        const master = await discogsService.getMaster(releaseGroupMbid);
        const correctionResult = mapMasterToCorrectionSearchResult(master);

        // Wrap as ScoredSearchResult with default scoring (Discogs has no scores)
        scoredResult = {
          ...correctionResult,
          normalizedScore: 1.0,
          displayScore: 100,
          breakdown: {
            titleScore: 1.0,
            artistScore: 1.0,
            yearScore: 1.0,
            mbScore: 100,
          },
          isLowConfidence: false,
          scoringStrategy: 'normalized' as const,
        };
      } else {
        // MusicBrainz path: fetch release group by MBID
        const searchService = getCorrectionSearchService();
        try {
          scoredResult = await searchService.getByMbid(releaseGroupMbid);
        } catch (error) {
          throw new GraphQLError(
            'Release group not found: ' + releaseGroupMbid,
            {
              extensions: { code: 'NOT_FOUND' },
            }
          );
        }
      }

      // Use the ID as the release ID for preview
      const releaseMbid = releaseGroupMbid;

      // Generate preview with source parameter
      const previewService = getCorrectionPreviewService();
      const preview = await previewService.generatePreview(
        albumId,
        scoredResult,
        releaseMbid,
        correctionSource as 'musicbrainz' | 'discogs'
      );

      // Transform to GraphQL format
      return {
        albumId: albumId,
        albumTitle: album.title,
        albumUpdatedAt: album.updatedAt,
        sourceResult: transformScoredResult(scoredResult),
        mbReleaseData: preview.mbReleaseData
          ? transformMBReleaseData(preview.mbReleaseData)
          : null,
        fieldDiffs: preview.fieldDiffs, // Passed as JSON
        artistDiff: {
          changeType: preview.artistDiff.changeType,
          current: preview.artistDiff.current || [],
          source: preview.artistDiff.source || [],
          currentDisplay:
            (preview.artistDiff.current || []).map(ac => ac.name).join(', ') ||
            'Unknown Artist',
          sourceDisplay:
            (preview.artistDiff.source || []).map(ac => ac.name).join(', ') ||
            'Unknown Artist',
        },
        trackDiffs: preview.trackDiffs || [],
        trackSummary: {
          totalCurrent: preview.trackSummary?.totalCurrent ?? 0,
          totalSource: preview.trackSummary?.totalSource ?? 0,
          matching: preview.trackSummary?.matching ?? 0,
          modified: preview.trackSummary?.modified ?? 0,
          added: preview.trackSummary?.added ?? 0,
          removed: preview.trackSummary?.removed ?? 0,
        },
        coverArt: {
          currentUrl: preview.coverArt.currentUrl,
          sourceUrl: preview.coverArt.sourceUrl,
          changeType: preview.coverArt.changeType,
        },
        summary: {
          totalFields: preview.summary.totalFields,
          changedFields: preview.summary.changedFields,
          addedFields: preview.summary.addedFields,
          modifiedFields: preview.summary.modifiedFields,
          conflictFields: preview.summary.conflictFields,
          hasTrackChanges: preview.summary.hasTrackChanges,
        },
      };
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      console.error('Error in correctionPreview:', error);
      throw new GraphQLError(
        'Correction preview failed: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
        { extensions: { code: 'INTERNAL_SERVER_ERROR' } }
      );
    }
  },

  // ============================================================================
  // Artist Correction System Queries (Admin Only)
  // ============================================================================

  artistCorrectionSearch: async (_, { query, limit, source }, { user }) => {
    // Authentication check
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Authorization check - admin only
    if (!isAdmin(user.role)) {
      throw new GraphQLError('Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    try {
      // Route to Discogs if source is DISCOGS
      if (source === GqlCorrectionSource.Discogs) {
        const queuedDiscogsService = getQueuedDiscogsService();
        const response = await queuedDiscogsService.searchArtists({
          artistName: query,
          limit: limit ?? 10,
        });

        return {
          results: response.results.map(result => ({
            artistMbid: result.artistMbid,
            name: result.name,
            sortName: result.sortName,
            disambiguation: result.disambiguation ?? null,
            type: result.type ?? null,
            country: result.country ?? null,
            area: result.area ?? null,
            beginDate: result.beginDate ?? null,
            endDate: result.endDate ?? null,
            ended: result.ended ?? null,
            gender: result.gender ?? null,
            mbScore: result.mbScore,
            topReleases: result.topReleases ?? null,
            source: result.source ?? 'discogs',
          })),
          hasMore: false, // Discogs search doesn't support pagination
          query,
        };
      }

      // MusicBrainz search (default)
      const { getArtistCorrectionSearchService } = await import(
        '@/lib/correction/artist/search-service'
      );
      const searchService = getArtistCorrectionSearchService();

      const response = await searchService.search({
        query,
        limit: limit ?? 10,
      });

      return {
        results: response.results.map(result => ({
          artistMbid: result.artistMbid,
          name: result.name,
          sortName: result.sortName,
          disambiguation: result.disambiguation ?? null,
          type: result.type ?? null,
          country: result.country ?? null,
          area: result.area ?? null,
          beginDate: result.beginDate ?? null,
          endDate: result.endDate ?? null,
          ended: result.ended ?? null,
          gender: result.gender ?? null,
          mbScore: result.mbScore,
          topReleases: result.topReleases ?? null,
          source: 'musicbrainz',
        })),
        hasMore: response.hasMore,
        query: response.query,
      };
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      console.error('Error in artistCorrectionSearch:', error);
      throw new GraphQLError(
        'Artist correction search failed: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
        { extensions: { code: 'INTERNAL_SERVER_ERROR' } }
      );
    }
  },

  artistCorrectionPreview: async (
    _,
    { artistId, sourceArtistId, source },
    { user }
  ) => {
    // Authentication check
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Authorization check - admin only
    if (!isAdmin(user.role)) {
      throw new GraphQLError('Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    try {
      const { getArtistCorrectionPreviewService } = await import(
        '@/lib/correction/artist/preview/preview-service'
      );
      const previewService = getArtistCorrectionPreviewService();

      // Convert GraphQL enum to lowercase string for service layer
      const sourceStr =
        source === GqlCorrectionSource.Discogs ? 'discogs' : 'musicbrainz';

      const preview = await previewService.generatePreview(
        artistId,
        sourceArtistId,
        sourceStr
      );

      return {
        currentArtist: preview.currentArtist,
        mbArtistData: preview.mbArtistData,
        fieldDiffs: preview.fieldDiffs.map(diff => ({
          field: diff.field,
          changeType: diff.changeType,
          current: diff.current,
          source: diff.source,
        })),
        albumCount: preview.albumCount,
        summary: {
          totalFields: preview.summary.totalFields,
          changedFields: preview.summary.changedFields,
          addedFields: preview.summary.addedFields,
          modifiedFields: preview.summary.modifiedFields,
        },
        source: source ?? GqlCorrectionSource.Musicbrainz,
      };
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      console.error('Error in artistCorrectionPreview:', error);
      throw new GraphQLError(
        'Artist correction preview failed: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
        { extensions: { code: 'INTERNAL_SERVER_ERROR' } }
      );
    }
  },

  // Game Pool queries
  albumsByGameStatus: async (
    _,
    { status, limit = 50, offset = 0 },
    { prisma }
  ) => {
    try {
      const albums = await prisma.album.findMany({
        where: {
          gameStatus: status,
        },
        include: {
          artists: {
            include: {
              artist: true,
            },
          },
        },
        orderBy: {
          title: 'asc',
        },
        take: limit,
        skip: offset,
      });

      return albums as ResolversTypes['Album'][];
    } catch (error) {
      graphqlLogger.error('Failed to fetch albums by game status:', {
        error,
        status,
      });
      throw new GraphQLError(`Failed to fetch albums by game status: ${error}`);
    }
  },

  searchGameAlbums: async (_, { query, limit = 10 }, { prisma }) => {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }

      const workerUrl = process.env.GAME_LOOKUP_WORKER_URL;
      if (!workerUrl) {
        throw new GraphQLError('GAME_LOOKUP_WORKER_URL is not configured');
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      try {
        const url = `${workerUrl}/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`;
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) {
          const body = await response.text().catch(() => '(no body)');
          graphqlLogger.error('Worker error response:', {
            status: response.status,
            body: body.slice(0, 500),
            query: query.trim(),
          });
          throw new Error(
            `Worker returned ${response.status}: ${body.slice(0, 200)}`
          );
        }

        const data = (await response.json()) as {
          results: Array<{
            id: number;
            title: string;
            artist_name: string;
            release_group_mbid?: string;
            listen_count?: number;
            release_type?: string;
          }>;
        };

        // Cross-reference worker results with local albums via MusicBrainz ID
        // so the game can match guesses against the correct album UUID
        const mbids = data.results
          .map(r => r.release_group_mbid)
          .filter((mbid): mbid is string => !!mbid);

        const localAlbumMap = new Map<string, string>();
        if (mbids.length > 0) {
          const localAlbums = await prisma.album.findMany({
            where: { musicbrainzId: { in: mbids } },
            select: { id: true, musicbrainzId: true },
          });
          for (const album of localAlbums) {
            if (album.musicbrainzId) {
              localAlbumMap.set(album.musicbrainzId, album.id);
            }
          }
        }

        return data.results.map(r => {
          const localId = r.release_group_mbid
            ? (localAlbumMap.get(r.release_group_mbid) ?? null)
            : null;
          return {
            id: r.id,
            title: r.title,
            artistName: r.artist_name,
            score: r.listen_count || 0,
            isLocalAlbum: localId !== null,
            localAlbumId: localId,
          };
        });
      } catch (err) {
        clearTimeout(timeout);
        if (err instanceof Error && err.name === 'AbortError') {
          throw new GraphQLError('Search timed out');
        }
        throw err;
      }
    } catch (error) {
      graphqlLogger.error('Failed to search game albums:', { error, query });
      throw new GraphQLError(`Failed to search game albums: ${error}`);
    }
  },

  gamePoolStats: async (_, __, { prisma }) => {
    try {
      const [eligible, excluded, neutral, totalWithCoverArt] =
        await Promise.all([
          prisma.album.count({
            where: { gameStatus: 'APPROVED' },
          }),
          prisma.album.count({
            where: { gameStatus: 'EXCLUDED' },
          }),
          prisma.album.count({
            where: { gameStatus: 'NONE' },
          }),
          prisma.album.count({
            where: {
              cloudflareImageId: { not: null },
            },
          }),
        ]);

      return {
        eligibleCount: eligible,
        excludedCount: excluded,
        neutralCount: neutral,
        totalWithCoverArt,
      };
    } catch (error) {
      graphqlLogger.error('Failed to fetch game pool stats:', { error });
      throw new GraphQLError(`Failed to fetch game pool stats: ${error}`);
    }
  },

  suggestedGameAlbums: async (
    _,
    {
      limit = 50,
      offset = 0,
      syncSource,
      search,
    }: {
      limit?: number;
      offset?: number;
      syncSource?: string;
      search?: string;
    },
    { prisma }
  ) => {
    try {
      // Build where clause with optional filters
      const where: Record<string, unknown> = {
        gameStatus: 'NONE',
        cloudflareImageId: { not: null },
        releaseDate: { not: null },
        artists: {
          some: {},
        },
      };

      // Filter by sync source via JSON metadata field
      if (syncSource) {
        where.metadata = {
          path: ['syncSource'],
          equals: syncSource,
        };
      }

      // Text search on album title or artist name
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          {
            artists: {
              some: {
                artist: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
            },
          },
        ];
      }

      const [albums, totalCount] = await Promise.all([
        prisma.album.findMany({
          where,
          include: {
            artists: {
              include: {
                artist: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: limit,
          skip: offset,
        }),
        prisma.album.count({ where }),
      ]);

      return {
        albums: albums as ResolversTypes['Album'][],
        totalCount,
      };
    } catch (error) {
      graphqlLogger.error('Failed to fetch suggested game albums:', { error });
      throw new GraphQLError(`Failed to fetch suggested game albums: ${error}`);
    }
  },

  // Deezer Playlist Import queries
  previewDeezerPlaylist: async (
    _: unknown,
    { playlistId }: { playlistId: string },
    { user }: GraphQLContext
  ) => {
    // Admin only
    if (!user?.role || !['ADMIN', 'OWNER'].includes(user.role)) {
      throw new GraphQLError('Admin access required');
    }

    try {
      const { previewDeezerPlaylistAlbums, extractDeezerPlaylistId } =
        await import('@/lib/deezer/playlist-import');

      // Extract ID from URL or raw ID
      const resolvedId = extractDeezerPlaylistId(playlistId);
      if (!resolvedId) {
        throw new GraphQLError(
          'Invalid Deezer playlist ID or URL. Expected a numeric ID like "867825522" or a full Deezer URL.'
        );
      }

      const result = await previewDeezerPlaylistAlbums(resolvedId);

      return {
        playlistId: result.playlist.playlistId,
        name: result.playlist.name,
        description: result.playlist.description,
        creator: result.playlist.creator,
        image: result.playlist.image,
        trackCount: result.playlist.trackCount,
        deezerUrl: result.playlist.deezerUrl,
        albums: result.albums.map(album => ({
          deezerId: album.deezerId,
          title: album.title,
          artist: album.artist,
          year: album.year,
          coverUrl: album.coverUrl,
          totalTracks: album.totalTracks,
          albumType: album.albumType,
        })),
        stats: result.stats,
      };
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      graphqlLogger.error('Failed to preview Deezer playlist:', { error });
      throw new GraphQLError(
        `Failed to preview playlist: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },

  // Daily Challenge queries
  dailyChallenge: async (
    _,
    { date }: { date?: Date | string },
    { prisma, user }
  ) => {
    try {
      const { getLatestChallenge, getChallengeByDate } = await import(
        '@/lib/daily-challenge/challenge-service'
      );

      // If a date is provided, look up that specific challenge (archive mode).
      // Otherwise, return the most recent challenge (live game).
      const challenge = date
        ? await getChallengeByDate(new Date(date))
        : await getLatestChallenge();

      if (!challenge) {
        throw new GraphQLError(
          date
            ? 'No challenge found for this date'
            : 'No challenge available yet'
        );
      }

      // Fetch user's session if authenticated
      let mySession = null;
      if (user?.id) {
        const session = await prisma.uncoverSession.findUnique({
          where: {
            challengeId_userId: {
              challengeId: challenge.id,
              userId: user.id,
            },
          },
        });

        if (session) {
          mySession = {
            id: session.id,
            status: session.status,
            attemptCount: session.attemptCount,
            won: session.won,
            startedAt: session.startedAt,
            completedAt: session.completedAt,
          };
        }
      }

      // Parse textRegions from JSON (Prisma returns Json type)
      const rawRegions = challenge.textRegions;
      const textRegions = Array.isArray(rawRegions)
        ? (rawRegions as Array<{ x: number; y: number; w: number; h: number }>)
        : null;

      // Return challenge info WITHOUT the album (that's the answer!)
      return {
        id: challenge.id,
        date: challenge.date,
        maxAttempts: challenge.maxAttempts,
        totalPlays: challenge.totalPlays,
        totalWins: challenge.totalWins,
        avgAttempts: challenge.avgAttempts,
        textRegions,
        mySession,
        imageUrl: challenge.album.cloudflareImageId
          ? (() => {
              const { getImageUrl } = require('@/lib/cloudflare-images');
              return getImageUrl(challenge.album.cloudflareImageId);
            })()
          : null,
        cloudflareImageId: challenge.album.cloudflareImageId,
      };
    } catch (error) {
      graphqlLogger.error('Failed to fetch daily challenge:', { error, date });
      throw new GraphQLError(`Failed to fetch daily challenge: ${error}`);
    }
  },

  curatedChallenges: async (
    _,
    {
      limit,
      offset,
      status,
    }: { limit?: number; offset?: number; status?: string },
    { prisma, user }
  ) => {
    try {
      // Admin check
      if (!user?.role || !['ADMIN', 'OWNER'].includes(user.role)) {
        throw new GraphQLError('Admin access required');
      }

      const limitValue = limit ?? 50;
      const offsetValue = offset ?? 0;
      const filterStatus = status ?? 'ALL';

      // Get all used album IDs upfront (needed for filtering + usedDate computation)
      const allUsedChallenges = await prisma.uncoverChallenge.findMany({
        select: { albumId: true, date: true },
      });
      const usedAlbumIdSet = new Set(allUsedChallenges.map(uc => uc.albumId));
      const usedDateMap = new Map(
        allUsedChallenges.map(uc => [uc.albumId, uc.date])
      );

      // Build where clause based on status filter
      const where =
        filterStatus === 'REMAINING'
          ? { albumId: { notIn: [...usedAlbumIdSet] } }
          : filterStatus === 'USED'
            ? { albumId: { in: [...usedAlbumIdSet] } }
            : undefined;

      const curated = await prisma.curatedChallenge.findMany({
        where,
        take: limitValue,
        skip: offsetValue,
        orderBy: { createdAt: 'asc' },
        include: {
          album: {
            include: {
              artists: {
                include: { artist: true },
              },
            },
          },
        },
      });

      const result = curated.map(c => ({
        ...c,
        usedDate: usedDateMap.get(c.albumId) ?? null,
      }));

      // For USED filter, sort by usedDate desc (most recently used first)
      if (filterStatus === 'USED') {
        result.sort((a, b) => {
          const dateA = a.usedDate ? new Date(a.usedDate).getTime() : 0;
          const dateB = b.usedDate ? new Date(b.usedDate).getTime() : 0;
          return dateB - dateA;
        });
      }

      return result;
    } catch (error) {
      graphqlLogger.error('Failed to fetch curated challenges:', { error });
      throw new GraphQLError(`Failed to fetch curated challenges: ${error}`);
    }
  },

  curatedChallengeCount: async (_, __, { prisma, user }) => {
    try {
      // Admin check
      if (!user?.role || !['ADMIN', 'OWNER'].includes(user.role)) {
        throw new GraphQLError('Admin access required');
      }

      return prisma.curatedChallenge.count();
    } catch (error) {
      graphqlLogger.error('Failed to count curated challenges:', { error });
      throw new GraphQLError(`Failed to count curated challenges: ${error}`);
    }
  },

  uncoverPoolStatus: async (_, __, { prisma, user }) => {
    try {
      if (!user?.role || !['ADMIN', 'OWNER'].includes(user.role)) {
        throw new GraphQLError('Admin access required');
      }

      const totalCurated = await prisma.curatedChallenge.count();

      // Count how many curated albums have already been used in challenges
      const usedAlbumIds = await prisma.uncoverChallenge.findMany({
        select: { albumId: true },
      });
      const usedSet = new Set(usedAlbumIds.map(c => c.albumId));

      const curatedAlbumIds = await prisma.curatedChallenge.findMany({
        select: { albumId: true },
      });
      const totalUsed = curatedAlbumIds.filter(c =>
        usedSet.has(c.albumId)
      ).length;

      const config = await prisma.appConfig.findUnique({
        where: { id: 'default' },
        select: {
          uncoverSelectionMode: true,
          uncoverPoolExhaustedMode: true,
        },
      });

      return {
        totalCurated,
        totalUsed,
        remaining: totalCurated - totalUsed,
        selectionMode: config?.uncoverSelectionMode ?? 'RANDOM',
        poolExhaustedMode: config?.uncoverPoolExhaustedMode ?? 'AUTO_RESET',
      };
    } catch (error) {
      graphqlLogger.error('Failed to fetch pool status:', { error });
      throw new GraphQLError(`Failed to fetch pool status: ${error}`);
    }
  },

  uncoverSettings: async (_, __, { prisma, user }) => {
    try {
      if (!user?.role || !['ADMIN', 'OWNER'].includes(user.role)) {
        throw new GraphQLError('Admin access required');
      }

      const config = await prisma.appConfig.findUnique({
        where: { id: 'default' },
        select: {
          uncoverSelectionMode: true,
          uncoverPoolExhaustedMode: true,
        },
      });

      return {
        selectionMode: config?.uncoverSelectionMode ?? 'RANDOM',
        poolExhaustedMode: config?.uncoverPoolExhaustedMode ?? 'AUTO_RESET',
      };
    } catch (error) {
      graphqlLogger.error('Failed to fetch uncover settings:', { error });
      throw new GraphQLError(`Failed to fetch uncover settings: ${error}`);
    }
  },

  challengeHistory: async (
    _,
    { limit, offset }: { limit?: number; offset?: number },
    { prisma, user }
  ) => {
    try {
      if (!user?.role || !['ADMIN', 'OWNER'].includes(user.role)) {
        throw new GraphQLError('Admin access required');
      }

      const today = new Date();
      today.setUTCHours(23, 59, 59, 999);

      const challenges = await prisma.uncoverChallenge.findMany({
        where: {
          date: { lte: today },
        },
        take: limit ?? 50,
        skip: offset ?? 0,
        orderBy: { date: 'desc' },
        include: {
          album: {
            include: {
              artists: {
                include: { artist: true },
              },
            },
          },
        },
      });

      return challenges.map(c => ({
        id: c.id,
        date: c.date,
        albumTitle: c.album.title,
        artistName:
          c.album.artists.map(a => a.artist.name).join(', ') || 'Unknown',
        coverUrl: c.album.coverUrl,
        cloudflareImageId: c.album.cloudflareImageId,
        totalPlays: c.totalPlays,
        totalWins: c.totalWins,
        avgAttempts: c.avgAttempts,
        textRegionCount: Array.isArray(c.textRegions)
          ? c.textRegions.length
          : null,
        textRegions: Array.isArray(c.textRegions)
          ? (c.textRegions as Array<{
              x: number;
              y: number;
              w: number;
              h: number;
              text?: string;
            }>)
          : null,
      }));
    } catch (error) {
      graphqlLogger.error('Failed to fetch challenge history:', { error });
      throw new GraphQLError(`Failed to fetch challenge history: ${error}`);
    }
  },

  myUncoverStats: async (_parent, _args, context) => {
    // Require authentication
    if (!context.user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    try {
      // Dynamic import to avoid circular dependencies (follows existing pattern)
      const { getPlayerStats } = await import('@/lib/uncover/stats-service');

      const stats = await getPlayerStats(context.user.id, context.prisma);

      // Note: getPlayerStats already returns totalAttempts in PlayerStats type
      // Fetch lastPlayedDate from database
      const dbStats = await context.prisma.uncoverPlayerStats.findUnique({
        where: { userId: context.user.id },
      });

      return {
        id: context.user.id,
        gamesPlayed: stats.gamesPlayed,
        gamesWon: stats.gamesWon,
        totalAttempts: stats.totalAttempts,
        currentStreak: stats.currentStreak,
        maxStreak: stats.maxStreak,
        lastPlayedDate: dbStats?.lastPlayedDate ?? null,
        winDistribution: stats.winDistribution,
        winRate: stats.winRate,
      };
    } catch (error) {
      graphqlLogger.error('Failed to fetch player stats:', {
        error,
        userId: context.user.id,
      });
      throw new GraphQLError(`Failed to fetch player stats: ${error}`);
    }
  },
  myArchiveStats: async (_parent, _args, context) => {
    // Require authentication
    if (!context.user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    try {
      // Dynamic import to avoid circular dependencies
      const { getArchiveStats } = await import(
        '@/lib/uncover/archive-stats-service'
      );

      const stats = await getArchiveStats(context.user.id, context.prisma);

      // Return null if no games played
      if (stats.gamesPlayed === 0) {
        return null;
      }

      return {
        id: context.user.id,
        gamesPlayed: stats.gamesPlayed,
        gamesWon: stats.gamesWon,
        totalAttempts: stats.totalAttempts,
        winDistribution: stats.winDistribution,
        winRate: stats.winRate,
      };
    } catch (error) {
      graphqlLogger.error('Failed to fetch archive stats:', {
        error,
        userId: context.user.id,
      });
      throw new GraphQLError(`Failed to fetch archive stats: ${error}`);
    }
  },

  myUncoverSessions: async (
    _parent,
    { fromDate, toDate }: { fromDate?: Date; toDate?: Date },
    context
  ) => {
    // Require authentication
    if (!context.user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    try {
      // Query sessions with optional date filters
      const where: any = {
        userId: context.user.id,
        completedAt: { not: null }, // Only completed sessions
      };

      // Apply date filters if provided (relation filter requires `is` wrapper)
      // Note: Prisma field is `date`, GraphQL exposes it as `challengeDate`
      if (fromDate || toDate) {
        where.challenge = {
          is: {
            date: {
              ...(fromDate && { gte: new Date(fromDate) }),
              ...(toDate && { lte: new Date(toDate) }),
            },
          },
        };
      }

      const sessions = await context.prisma.uncoverSession.findMany({
        where,
        include: {
          challenge: {
            select: {
              date: true,
            },
          },
        },
        orderBy: {
          challenge: {
            date: 'desc',
          },
        },
      });

      return sessions.map(session => ({
        id: session.id,
        challengeDate: session.challenge.date,
        won: session.won,
        attemptCount: session.attemptCount,
        completedAt: session.completedAt,
      }));
    } catch (error) {
      graphqlLogger.error('Failed to fetch session history:', {
        error,
        userId: context.user.id,
      });
      throw new GraphQLError(`Failed to fetch session history: ${error}`);
    }
  },
  uncoverChallengeDates: async (
    _parent,
    { fromDate, toDate }: { fromDate?: Date; toDate?: Date },
    { prisma }
  ) => {
    try {
      const where: Record<string, unknown> = {};
      if (fromDate || toDate) {
        where.date = {
          ...(fromDate && { gte: new Date(fromDate) }),
          ...(toDate && { lte: new Date(toDate) }),
        };
      }

      // Only return challenges up to today (don't expose future challenges)
      const now = new Date();
      now.setUTCHours(23, 59, 59, 999);
      where.date = { ...(where.date as object), lte: now };

      const challenges = await prisma.uncoverChallenge.findMany({
        where,
        select: { date: true },
        orderBy: { date: 'asc' },
      });

      return challenges.map(c => c.date);
    } catch (error) {
      graphqlLogger.error('Failed to fetch challenge dates:', { error });
      throw new GraphQLError(`Failed to fetch challenge dates: ${error}`);
    }
  },

  firstUncoverChallengeDate: async (_parent, _args, { prisma }) => {
    try {
      const challenge = await prisma.uncoverChallenge.findFirst({
        select: { date: true },
        orderBy: { date: 'asc' },
      });
      return challenge?.date ?? null;
    } catch (error) {
      graphqlLogger.error('Failed to fetch first challenge date:', { error });
      throw new GraphQLError(`Failed to fetch first challenge date: ${error}`);
    }
  },

  uncoverGameStats: async (_, __, { prisma, user }) => {
    try {
      if (!user?.role || !['ADMIN', 'OWNER'].includes(user.role)) {
        throw new GraphQLError('Admin access required');
      }

      // Run multiple aggregation queries in parallel
      const [
        totalChallenges,
        uniquePlayersResult,
        sessionAggregates,
        winDistributionData,
        topPlayersData,
        recentSessionsData,
        challengesByPlays,
      ] = await Promise.all([
        // Total challenges that have had at least one play
        prisma.uncoverChallenge.count({
          where: { totalPlays: { gt: 0 } },
        }),

        // Total unique players
        prisma.uncoverSession.findMany({
          where: { userId: { not: null } },
          select: { userId: true },
          distinct: ['userId'],
        }),

        // Aggregate session stats (completed only)
        prisma.uncoverSession.aggregate({
          where: {
            status: { in: ['WON', 'LOST'] },
            userId: { not: null },
          },
          _count: { id: true },
          _sum: { attemptCount: true },
          _avg: { attemptCount: true },
        }),

        // Global win distribution from player stats
        prisma.uncoverPlayerStats.findMany({
          select: { winDistribution: true },
        }),

        // Top 10 players by games won
        prisma.uncoverPlayerStats.findMany({
          take: 10,
          orderBy: [{ gamesWon: 'desc' }, { gamesPlayed: 'asc' }],
          where: { gamesPlayed: { gt: 0 } },
          include: {
            user: {
              select: { id: true, username: true, image: true },
            },
          },
        }),

        // Recent 20 completed sessions
        prisma.uncoverSession.findMany({
          take: 20,
          where: {
            status: { in: ['WON', 'LOST'] },
            userId: { not: null },
          },
          orderBy: { completedAt: 'desc' },
          include: {
            user: {
              select: { id: true, username: true, image: true },
            },
            challenge: {
              include: {
                album: {
                  include: {
                    artists: {
                      include: { artist: true },
                    },
                  },
                },
              },
            },
          },
        }),

        // All challenges with plays for most-played / hardest / easiest
        prisma.uncoverChallenge.findMany({
          where: { totalPlays: { gte: 3 } },
          orderBy: { totalPlays: 'desc' },
          include: {
            album: {
              include: {
                artists: {
                  include: { artist: true },
                },
              },
            },
          },
        }),
      ]);

      const totalPlays = sessionAggregates._count.id;
      const totalWins = await prisma.uncoverSession.count({
        where: {
          status: 'WON',
          userId: { not: null },
        },
      });

      // Sum up global win distribution across all players
      const globalWinDist = [0, 0, 0, 0, 0, 0];
      for (const p of winDistributionData) {
        if (Array.isArray(p.winDistribution)) {
          for (let i = 0; i < Math.min(p.winDistribution.length, 6); i++) {
            globalWinDist[i] += p.winDistribution[i];
          }
        }
      }

      // Map challenge to stat entry helper
      const mapChallenge = (c: (typeof challengesByPlays)[0]) => ({
        challengeId: c.id,
        date: c.date,
        albumTitle: c.album.title,
        artistName:
          c.album.artists.map(a => a.artist.name).join(', ') || 'Unknown',
        coverUrl: c.album.coverUrl,
        cloudflareImageId: c.album.cloudflareImageId,
        totalPlays: c.totalPlays,
        totalWins: c.totalWins,
        winRate: c.totalPlays > 0 ? c.totalWins / c.totalPlays : 0,
        avgAttempts: c.avgAttempts,
      });

      // Most played = first in list (already sorted by totalPlays desc)
      const mostPlayed =
        challengesByPlays.length > 0
          ? mapChallenge(challengesByPlays[0])
          : null;

      // Hardest = lowest win rate (min 3 plays)
      const sortedByWinRate = [...challengesByPlays].sort((a, b) => {
        const rateA = a.totalPlays > 0 ? a.totalWins / a.totalPlays : 0;
        const rateB = b.totalPlays > 0 ? b.totalWins / b.totalPlays : 0;
        return rateA - rateB;
      });
      const hardest =
        sortedByWinRate.length > 0 ? mapChallenge(sortedByWinRate[0]) : null;

      // Easiest = highest win rate (min 3 plays)
      const easiest =
        sortedByWinRate.length > 0
          ? mapChallenge(sortedByWinRate[sortedByWinRate.length - 1])
          : null;

      return {
        totalChallenges,
        totalUniquePlayers: uniquePlayersResult.length,
        totalPlays,
        totalWins,
        overallWinRate: totalPlays > 0 ? totalWins / totalPlays : 0,
        overallAvgAttempts: sessionAggregates._avg.attemptCount ?? null,
        avgPlaysPerChallenge:
          totalChallenges > 0 ? totalPlays / totalChallenges : null,
        globalWinDistribution: globalWinDist,
        topPlayers: topPlayersData.map(p => ({
          userId: p.user.id,
          username: p.user.username,
          image: p.user.image,
          gamesPlayed: p.gamesPlayed,
          gamesWon: p.gamesWon,
          winRate: p.gamesPlayed > 0 ? p.gamesWon / p.gamesPlayed : 0,
          currentStreak: p.currentStreak,
          maxStreak: p.maxStreak,
        })),
        recentSessions: recentSessionsData.map(s => ({
          sessionId: s.id,
          userId: s.user?.id ?? '',
          username: s.user?.username ?? null,
          image: s.user?.image ?? null,
          challengeDate: s.challenge.date,
          albumTitle: s.challenge.album.title,
          artistName:
            s.challenge.album.artists.map(a => a.artist.name).join(', ') ||
            'Unknown',
          won: s.won,
          attemptCount: s.attemptCount,
          completedAt: s.completedAt,
        })),
        mostPlayedChallenge: mostPlayed,
        hardestChallenge: hardest,
        easiestChallenge: easiest,
      };
    } catch (error) {
      graphqlLogger.error('Failed to fetch uncover game stats:', { error });
      throw new GraphQLError(`Failed to fetch uncover game stats: ${error}`);
    }
  },

  // ---------------------------------------------------------------
  // Client-side game model queries (Wordle-style)
  // ---------------------------------------------------------------

  dailyPuzzle: async (_, __, { prisma, user }) => {
    if (!user?.id) {
      throw new GraphQLError('Authentication required');
    }

    try {
      const { getLatestChallenge } = await import(
        '@/lib/daily-challenge/challenge-service'
      );
      const { getImageUrl } = await import('@/lib/cloudflare-images');

      const challenge = await getLatestChallenge();
      if (!challenge) return null;

      // Build artist name from the album's artist credits
      const artistName =
        challenge.album.artists.map(a => a.artist.name).join(', ') ||
        'Unknown Artist';

      // Check for existing completed session
      let existingResult = null;
      const session = await prisma.uncoverSession.findUnique({
        where: {
          challengeId_userId: {
            challengeId: challenge.id,
            userId: user.id,
          },
        },
        include: {
          guesses: {
            orderBy: { guessNumber: 'asc' },
            include: {
              guessedAlbum: {
                select: {
                  id: true,
                  title: true,
                  artists: {
                    select: { artist: { select: { name: true } } },
                  },
                },
              },
            },
          },
        },
      });

      if (session && session.status !== 'IN_PROGRESS') {
        existingResult = {
          won: session.won,
          attemptCount: session.attemptCount,
          completedAt: session.completedAt,
          guesses: session.guesses.map(g => ({
            guessNumber: g.guessNumber,
            albumId: g.guessedAlbumId,
            albumTitle: g.guessedAlbum?.title ?? g.guessedText ?? null,
            artistName:
              g.guessedAlbum?.artists.map(a => a.artist.name).join(', ') ??
              null,
            isCorrect: g.isCorrect,
            isSkipped: !g.guessedText && g.guessedAlbumId === null,
          })),
        };
      }

      return {
        challengeId: challenge.id,
        date: challenge.date,
        maxAttempts: challenge.maxAttempts,
        imageUrl: challenge.album.cloudflareImageId
          ? getImageUrl(challenge.album.cloudflareImageId)
          : null,
        cloudflareImageId: challenge.album.cloudflareImageId,
        textRegions: Array.isArray(challenge.textRegions)
          ? challenge.textRegions
          : null,
        correctAlbumId: challenge.album.id,
        correctAlbumTitle: challenge.album.title,
        correctAlbumArtist: artistName,
        correctAlbumCloudflareImageId: challenge.album.cloudflareImageId,
        existingResult,
      };
    } catch (error) {
      graphqlLogger.error('Failed to fetch daily puzzle:', { error });
      throw new GraphQLError(`Failed to fetch daily puzzle: ${error}`);
    }
  },

  archivePuzzle: async (_, { date }, { prisma, user }) => {
    if (!user?.id) {
      throw new GraphQLError('Authentication required');
    }

    if (!date) {
      throw new GraphQLError('Date is required for archive puzzles');
    }

    try {
      const { getChallengeByDate } = await import(
        '@/lib/daily-challenge/challenge-service'
      );
      const { getImageUrl } = await import('@/lib/cloudflare-images');

      const challenge = await getChallengeByDate(new Date(date));
      if (!challenge) return null;

      const artistName =
        challenge.album.artists.map(a => a.artist.name).join(', ') ||
        'Unknown Artist';

      // Check for existing completed session
      let existingResult = null;
      const session = await prisma.uncoverSession.findUnique({
        where: {
          challengeId_userId: {
            challengeId: challenge.id,
            userId: user.id,
          },
        },
        include: {
          guesses: {
            orderBy: { guessNumber: 'asc' },
            include: {
              guessedAlbum: {
                select: {
                  id: true,
                  title: true,
                  artists: {
                    select: { artist: { select: { name: true } } },
                  },
                },
              },
            },
          },
        },
      });

      if (session && session.status !== 'IN_PROGRESS') {
        existingResult = {
          won: session.won,
          attemptCount: session.attemptCount,
          completedAt: session.completedAt,
          guesses: session.guesses.map(g => ({
            guessNumber: g.guessNumber,
            albumId: g.guessedAlbumId,
            albumTitle: g.guessedAlbum?.title ?? g.guessedText ?? null,
            artistName:
              g.guessedAlbum?.artists.map(a => a.artist.name).join(', ') ??
              null,
            isCorrect: g.isCorrect,
            isSkipped: !g.guessedText && g.guessedAlbumId === null,
          })),
        };
      }

      return {
        challengeId: challenge.id,
        date: challenge.date,
        maxAttempts: challenge.maxAttempts,
        imageUrl: challenge.album.cloudflareImageId
          ? getImageUrl(challenge.album.cloudflareImageId)
          : null,
        cloudflareImageId: challenge.album.cloudflareImageId,
        textRegions: Array.isArray(challenge.textRegions)
          ? challenge.textRegions
          : null,
        correctAlbumId: challenge.album.id,
        correctAlbumTitle: challenge.album.title,
        correctAlbumArtist: artistName,
        correctAlbumCloudflareImageId: challenge.album.cloudflareImageId,
        existingResult,
      };
    } catch (error) {
      graphqlLogger.error('Failed to fetch archive puzzle:', { error, date });
      throw new GraphQLError(`Failed to fetch archive puzzle: ${error}`);
    }
  },

  // =============================================
  // Discovery queries
  // =============================================

  trendingUsers: async (_, { limit = 20, timeframe = '7d' }, { prisma, user }) => {
    try {
      const timeframeDays = timeframe === '30d' ? 30 : 7;
      const now = new Date();
      const startDate = new Date(now.getTime() - timeframeDays * 24 * 60 * 60 * 1000);
      const midDate = new Date(now.getTime() - (timeframeDays / 2) * 24 * 60 * 60 * 1000);

      const usersWithActivity = await prisma.user.findMany({
        where: {
          deletedAt: null,
          ...(user && { id: { not: user.id } }),
          OR: [
            { followers: { some: { createdAt: { gte: startDate } } } },
            { recommendations: { some: { createdAt: { gte: startDate } } } },
          ],
        },
        include: {
          _count: {
            select: {
              followers: true,
              following: true,
              recommendations: true,
            },
          },
          followers: {
            where: { createdAt: { gte: startDate } },
            select: { createdAt: true },
          },
          recommendations: {
            where: { createdAt: { gte: startDate } },
            select: {
              createdAt: true,
              basisAlbumArtist: true,
              recommendedAlbumArtist: true,
              score: true,
            },
            take: 20,
          },
        },
        take: limit * 3,
      });

      const scored = [];

      for (const u of usersWithActivity) {
        const recentFollowers = u.followers.length;
        const firstHalf = u.followers.filter(
          f => f.createdAt >= startDate && f.createdAt <= midDate
        ).length;
        const secondHalf = u.followers.filter(f => f.createdAt > midDate).length;

        const followerGrowthRate =
          firstHalf > 0
            ? (secondHalf / Math.max(firstHalf, 1)) * 100
            : secondHalf > 0
              ? 200
              : 0;

        const recentRecs = u.recommendations.length;
        const avgScore =
          recentRecs > 0
            ? u.recommendations.reduce((sum, r) => sum + r.score, 0) / recentRecs
            : 0;

        const recentActivityScore = recentRecs * 10 + avgScore * 2;

        // Extract top artist names from recommendations
        const artistCounts = new Map();
        u.recommendations.forEach(rec => {
          if (rec.basisAlbumArtist) {
            artistCounts.set(rec.basisAlbumArtist, (artistCounts.get(rec.basisAlbumArtist) || 0) + 1);
          }
          if (rec.recommendedAlbumArtist) {
            artistCounts.set(rec.recommendedAlbumArtist, (artistCounts.get(rec.recommendedAlbumArtist) || 0) + 1);
          }
        });
        const topGenres = Array.from(artistCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([artist]) => artist);

        const baseScore = Math.log(Math.max(u._count.followers, 1)) * 10;
        const growthBonus = followerGrowthRate * 2;
        const qualityBonus = avgScore * 5;
        const trendingScore = baseScore + growthBonus + recentActivityScore + qualityBonus;

        if (trendingScore > 20 || recentFollowers > 0 || recentRecs > 0) {
          scored.push({
            id: u.id,
            username: u.username,
            email: u.email,
            image: u.image,
            bio: u.bio,
            followersCount: u._count.followers,
            followingCount: u._count.following,
            recommendationsCount: u._count.recommendations,
            followerGrowthRate: Math.round(followerGrowthRate),
            recentActivityScore: Math.round(recentActivityScore),
            trendingScore: Math.round(trendingScore),
            recentActivity: {
              newFollowers: recentFollowers,
              newRecommendations: recentRecs,
              timeframe,
            },
            topGenres,
          });
        }
      }

      scored.sort((a, b) => b.trendingScore - a.trendingScore);
      const topUsers = scored.slice(0, limit);

      return { users: topUsers, total: topUsers.length, timeframe };
    } catch (error) {
      console.error('Error fetching trending users:', error);
      return { users: [], total: 0, timeframe };
    }
  },

  newUsers: async (_, { limit = 20, maxDays = 30 }, { prisma, user }) => {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxDays);

      const rawUsers = await prisma.user.findMany({
        where: {
          deletedAt: null,
          ...(user && { id: { not: user.id } }),
          OR: [
            { recommendations: { some: { createdAt: { gte: cutoffDate } } } },
            { followers: { some: { createdAt: { gte: cutoffDate } } } },
            { following: { some: { createdAt: { gte: cutoffDate } } } },
          ],
        },
        include: {
          _count: {
            select: { followers: true, following: true, recommendations: true },
          },
          recommendations: {
            select: { createdAt: true },
            orderBy: { createdAt: 'asc' },
            take: 1,
          },
          followers: {
            select: { createdAt: true },
            orderBy: { createdAt: 'asc' },
            take: 1,
          },
          following: {
            select: { createdAt: true },
            orderBy: { createdAt: 'asc' },
            take: 1,
          },
        },
        orderBy: [
          { recommendations: { _count: 'desc' } },
          { followers: { _count: 'desc' } },
        ],
        take: limit * 2,
      });

      const processed = [];

      for (const u of rawUsers) {
        const activityDates = [
          ...(u.recommendations.length > 0 ? [u.recommendations[0].createdAt] : []),
          ...(u.followers.length > 0 ? [u.followers[0].createdAt] : []),
          ...(u.following.length > 0 ? [u.following[0].createdAt] : []),
        ].filter(Boolean);

        if (activityDates.length === 0) continue;

        const earliestActivity = new Date(Math.min(...activityDates.map(d => d.getTime())));
        const daysSinceJoined = Math.floor(
          (Date.now() - earliestActivity.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceJoined > maxDays) continue;

        let activityLevel = 'new';
        if (u._count.recommendations > 0 || u._count.followers > 2) {
          activityLevel = 'getting_started';
        }
        if (u._count.recommendations > 3 && u._count.followers > 5) {
          activityLevel = 'active';
        }

        processed.push({
          id: u.id,
          username: u.username,
          email: u.email,
          image: u.image,
          bio: u.bio,
          followersCount: u._count.followers,
          followingCount: u._count.following,
          recommendationsCount: u._count.recommendations,
          joinedAt: earliestActivity,
          daysSinceJoined,
          hasRecommendations: u._count.recommendations > 0,
          hasFollowers: u._count.followers > 0,
          activityLevel,
        });
      }

      const activityOrder = { active: 3, getting_started: 2, new: 1 };
      processed.sort((a, b) => {
        const diff = (activityOrder[b.activityLevel] || 0) - (activityOrder[a.activityLevel] || 0);
        if (diff !== 0) return diff;
        return a.daysSinceJoined - b.daysSinceJoined;
      });

      const result = processed.slice(0, limit);
      return { users: result, total: result.length };
    } catch (error) {
      console.error('Error fetching new users:', error);
      return { users: [], total: 0 };
    }
  },

  browseNewUsers: async (_, { limit = 15 }, { prisma }) => {
    try {
      return await prisma.user.findMany({
        where: {
          deletedAt: null,
          recommendationsCount: { gt: 0 },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (error) {
      console.error('Error fetching browse new users:', error);
      return [];
    }
  },

  // @ts-expect-error - Prisma return types don't match GraphQL types; field resolvers complete the objects
};
