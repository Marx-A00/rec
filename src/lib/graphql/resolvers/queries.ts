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

import { getSearchService } from '../search';

// TODO: Fix GraphQL resolver return types to match generated types
// Prisma returns partial objects; field resolvers populate computed/relational fields
export const queryResolvers: QueryResolvers = {
  // Health check query
  health: () => {
    return `GraphQL server running at ${new Date().toISOString()}`;
  },

  // System health monitoring
  systemHealth: async () => {
    try {
      const health = await healthChecker.checkHealth();
      return health as any;
    } catch (error) {
      throw new GraphQLError(`Failed to get system health: ${error}`);
    }
  },

  // Queue status monitoring
  queueStatus: async () => {
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
  queueMetrics: async (_, { timeRange }) => {
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
  jobHistory: async (_, { limit = 100, status }) => {
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
  activeJobs: async () => {
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
  failedJobs: async (_, { limit = 50 }) => {
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
      return { id: artist.id } as ResolversTypes['Artist'];
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
      return { id: album.id } as ResolversTypes['Album'];
    } catch (error) {
      throw new GraphQLError(`Failed to fetch album: ${error}`);
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
      if (!user) return null;
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
      // Fetch recent recommendations from all users
      const recommendations = await prisma.recommendation.findMany({
        take: limit + 1, // Fetch one extra to check if there's more
        skip: cursor ? 1 : 0, // Skip 1 to exclude the cursor itself
        cursor: cursor ? { id: cursor } : undefined,
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

      const hasMore = recommendations.length > limit;
      const items = hasMore ? recommendations.slice(0, limit) : recommendations;
      const nextCursor =
        hasMore && items.length > 0 ? items[items.length - 1].id : null;

      // Map to include computed fields that GraphQL expects
      const mappedItems = items.map(item => ({
        ...item,
        normalizedScore: item.score / 100, // GraphQL expects this field
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
  userFollowers: async (_, { userId, limit = 50, offset = 0 }, { prisma }) => {
    try {
      const followers = await prisma.user.findMany({
        where: {
          following: {
            some: {
              followedId: userId,
            },
          },
        },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
      return followers;
    } catch (error) {
      throw new GraphQLError(`Failed to fetch user followers: ${error}`);
    }
  },

  userFollowing: async (_, { userId, limit = 50, offset = 0 }, { prisma }) => {
    try {
      const following = await prisma.user.findMany({
        where: {
          followers: {
            some: {
              followerId: userId,
            },
          },
        },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
      return following;
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

      if (!user) {
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

      const recommendations = await prisma.recommendation.findMany({
        where: { userId: user.id },
        take: limit + 1, // Fetch one extra to determine if there are more pages
        skip: cursor ? 1 : 0, // Skip 1 to exclude the cursor itself
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: [
          orderBy,
          { id: 'desc' }, // Secondary sort by ID for stable pagination
        ],
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

      // Check if there are more items
      const hasMore = recommendations.length > limit;
      const items = hasMore ? recommendations.slice(0, limit) : recommendations;
      const nextCursor = hasMore ? items[items.length - 1].id : null;

      console.log(
        `Found ${items.length} recommendations for user ${user.id}, hasMore: ${hasMore}`
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

      const activities: any[] = [];
      const cursorDate = cursor ? new Date(cursor) : null;
      const cursorCondition = cursorDate
        ? { createdAt: { lt: cursorDate } }
        : {};

      // 1. Get follow activities
      if (!type || type === 'FOLLOW') {
        const followActivities = await prisma.userFollow.findMany({
          where: {
            followerId: { in: followedUserIds },
            ...cursorCondition,
          },
          include: {
            follower: true,
            followed: true,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });

        followActivities.forEach(follow => {
          activities.push({
            id: `follow-${follow.followerId}-${follow.followedId}`,
            type: 'FOLLOW',
            createdAt: follow.createdAt,
            actor: follow.follower,
            targetUser: follow.followed,
            album: null,
            recommendation: null,
            collection: null,
            metadata: null,
          });
        });
      }

      // 2. Get recommendations
      if (!type || type === 'RECOMMENDATION') {
        const recommendations = await prisma.recommendation.findMany({
          where: {
            userId: { in: followedUserIds },
            ...cursorCondition,
          },
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
          orderBy: { createdAt: 'desc' },
          take: limit,
        });

        recommendations.forEach(rec => {
          activities.push({
            id: `rec-${rec.id}`,
            type: 'RECOMMENDATION',
            createdAt: rec.createdAt,
            actor: rec.user,
            targetUser: null,
            album: rec.recommendedAlbum,
            recommendation: rec,
            collection: null,
            metadata: {
              score: rec.score,
              basisAlbum: rec.basisAlbum,
              collectionName: null,
              personalRating: null,
              position: null,
            },
          });
        });
      }

      // 3. Get collection adds
      if (!type || type === 'COLLECTION_ADD') {
        const collectionAdds = await prisma.collectionAlbum.findMany({
          where: {
            collection: {
              userId: { in: followedUserIds },
            },
            ...(cursorDate ? { addedAt: { lt: cursorDate } } : {}),
          },
          include: {
            collection: {
              include: {
                user: true,
              },
            },
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
          take: limit,
        });

        collectionAdds.forEach(ca => {
          activities.push({
            id: `collection-${ca.id}`,
            type: 'COLLECTION_ADD',
            createdAt: ca.addedAt,
            actor: ca.collection.user,
            targetUser: null,
            album: ca.album,
            recommendation: null,
            collection: ca.collection,
            metadata: {
              score: null,
              basisAlbum: null,
              collectionName: ca.collection.name,
              personalRating: ca.personalRating,
              position: ca.position,
            },
          });
        });
      }

      // Sort all activities by date
      activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Take only the requested limit
      const limitedActivities = activities.slice(0, limit);
      const hasMore = activities.length > limit;
      const nextCursor =
        hasMore && limitedActivities.length > 0
          ? limitedActivities[
              limitedActivities.length - 1
            ].createdAt.toISOString()
          : null;

      return {
        activities: limitedActivities,
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

      // Get recent recommendations from followed users
      const recommendations = await prisma.recommendation.findMany({
        where: {
          userId: { in: followedUserIds },
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

      console.log(
        `Found ${recommendations.length} recommendations from ${followedUserIds.length} followed users`
      );
      return recommendations;
    } catch (error) {
      console.error('Error fetching following activity:', error);
      return [];
    }
  },

  // Music Database queries
  databaseStats: async (_, __, { prisma }) => {
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
              { enrichmentStatus: { in: ['PENDING', 'FAILED'] } },
              { musicbrainzId: null },
            ],
          },
        }),
        prisma.artist.count({
          where: {
            OR: [
              { dataQuality: 'LOW' },
              { enrichmentStatus: { in: ['PENDING', 'FAILED'] } },
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

  searchAlbums: async (_, args, { prisma }) => {
    try {
      const {
        query,
        id,
        dataQuality,
        enrichmentStatus,
        needsEnrichment,
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
          { label: { contains: query, mode: 'insensitive' } },
          { barcode: { contains: query, mode: 'insensitive' } },
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
          { enrichmentStatus: { in: ['PENDING', 'FAILED'] } },
          { musicbrainzId: null }
        );
      }

      // Sorting
      const orderBy: any = {};
      if (sortBy === 'title') orderBy.title = sortOrder;
      else if (sortBy === 'releaseDate') orderBy.releaseDate = sortOrder;
      else if (sortBy === 'lastEnriched') orderBy.lastEnriched = sortOrder;
      else if (sortBy === 'dataQuality') orderBy.dataQuality = sortOrder;

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
          album.enrichmentStatus === 'PENDING' ||
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
          { enrichmentStatus: { in: ['PENDING', 'FAILED'] } }
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
          artist.enrichmentStatus === 'PENDING' ||
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
  enrichmentLogs: async (_, args, { prisma }) => {
    try {
      const where: Record<string, unknown> = {};

      if (args.entityType) where.entityType = args.entityType;
      if (args.entityId) where.entityId = args.entityId;
      if (args.status) where.status = args.status;
      if (args.sources && args.sources.length > 0) {
        where.sources = { hasSome: args.sources };
      }

      const logs = await prisma.enrichmentLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: args.skip || 0,
        take: args.limit || 50,
      });

      return logs;
    } catch (error) {
      throw new GraphQLError(`Failed to fetch enrichment logs: ${error}`);
    }
  },

  enrichmentStats: async (_, args, { prisma }) => {
    try {
      const where: Record<string, unknown> = {};

      if (args.entityType) where.entityType = args.entityType;
      if (args.timeRange) {
        where.createdAt = {
          gte: args.timeRange.from,
          lte: args.timeRange.to,
        };
      }

      const logs = await prisma.enrichmentLog.findMany({ where });

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
  // @ts-expect-error - Prisma return types don't match GraphQL types; field resolvers complete the objects
};
