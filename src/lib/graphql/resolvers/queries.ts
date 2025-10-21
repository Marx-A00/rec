// Schema migration broke GraphQL resolvers, needs complete rewrite
// src/lib/graphql/resolvers/queries.ts
// Query resolvers for GraphQL API
// @ts-nocheck - Prisma types don't match GraphQL types; field resolvers complete objects at runtime

import { GraphQLError } from 'graphql';

import { QueryResolvers } from '@/generated/resolvers-types';
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
        `[GraphQL Resolver] Returning ${tracks.length} tracks to GraphQL response`
      );
      if (tracks.length > 0) {
        console.log(`[GraphQL Resolver] First track:`, {
          id: tracks[0].id,
          title: tracks[0].title,
          searchCoverArtUrl: (tracks[0] as any).searchCoverArtUrl,
          searchArtistName: (tracks[0] as any).searchArtistName,
        });
      }

      return {
        artists,
        albums,
        tracks,
        total: artists.length + albums.length + tracks.length,
        hasMore: false, // Simplified for now
      };
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
        dataQuality,
        enrichmentStatus,
        needsEnrichment,
        sortBy = 'title',
        sortOrder = 'asc',
        skip = 0,
        limit = 50,
      } = args;

      const where: any = {};

      // Search query
      if (query) {
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
    const requestId = `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(
      `🔍 [Search Request] ID: ${requestId} | Query: "${args.query}" | Limit: ${args.limit || 50}`
    );

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

      // If no query, return empty results (external API search requires query)
      if (!query) {
        return [];
      }

      // Check cache first for external API search results
      const cacheKey = `artist-search:${query.toLowerCase().trim()}`;
      const cached = await prisma.cacheData.findUnique({
        where: { key: cacheKey },
      });

      if (cached) {
        const now = new Date();
        if (cached.expires > now) {
          console.log(
            `✅ [Cache] Hit for artist search: "${query}" (expires: ${cached.expires.toISOString()})`
          );
          return cached.data as any[]; // Return cached results
        } else {
          // Delete expired cache entry
          console.log(
            `🗑️ [Cache] Expired entry found for "${query}", cleaning up...`
          );
          await prisma.cacheData
            .delete({ where: { key: cacheKey } })
            .catch(() => {
              // Ignore deletion errors
            });
        }
      }

      console.log(`❌ [Cache] Miss for artist search: "${query}"`);

      // Parallel API calls to MusicBrainz and Last.fm using Promise.allSettled
      const startTime = Date.now();
      const searchLimit = Math.min(limit, 25); // Limit API calls

      const searchPromises = [
        // MusicBrainz search
        (async () => {
          try {
            const { getQueuedMusicBrainzService } = await import(
              '../../musicbrainz/queue-service'
            );
            const mbService = getQueuedMusicBrainzService();
            const results = await mbService.searchArtists(query, searchLimit);
            console.log(
              `✅ [MusicBrainz] Found ${results.length} artists for "${query}"`
            );
            return { source: 'musicbrainz', results, error: null };
          } catch (error) {
            console.error(`❌ [MusicBrainz] Search failed:`, error);
            return { source: 'musicbrainz', results: [], error };
          }
        })(),
        // Last.fm search
        (async () => {
          try {
            const { getQueuedLastFmService } = await import(
              '../../lastfm/queue-service'
            );
            const lfmService = getQueuedLastFmService();
            const results = await lfmService.searchArtists(query);
            console.log(
              `✅ [Last.fm] Found ${results.length} artists for "${query}"`
            );
            return { source: 'lastfm', results, error: null };
          } catch (error) {
            console.error(`❌ [Last.fm] Search failed:`, error);
            return { source: 'lastfm', results: [], error };
          }
        })(),
      ];

      const settledResults = await Promise.allSettled(searchPromises);
      const duration = Date.now() - startTime;

      // Extract results from settled promises with detailed error tracking
      const mbResult =
        settledResults[0].status === 'fulfilled'
          ? settledResults[0].value
          : null;
      const lfmResult =
        settledResults[1].status === 'fulfilled'
          ? settledResults[1].value
          : null;

      const mbResults = mbResult?.results || [];
      const lfmResults = lfmResult?.results || [];

      // Log partial failures
      const mbFailed =
        settledResults[0].status === 'rejected' || mbResult?.error;
      const lfmFailed =
        settledResults[1].status === 'rejected' || lfmResult?.error;

      if (mbFailed || lfmFailed) {
        const failures = [];
        if (mbFailed) failures.push('MusicBrainz');
        if (lfmFailed) failures.push('Last.fm');
        console.warn(
          `⚠️ [Search] Partial failure - ${failures.join(', ')} API(s) failed`
        );
      }

      console.log(
        `🔍 [Search] Completed in ${duration}ms - MusicBrainz: ${mbResults.length}, Last.fm: ${lfmResults.length}, Success rate: ${
          (((mbFailed ? 0 : 1) + (lfmFailed ? 0 : 1)) / 2) * 100
        }%`
      );

      // If both APIs failed, return empty array
      if (mbFailed && lfmFailed) {
        console.error(`❌ [Search] Both APIs failed for query: "${query}"`);
        return [];
      }

      // Merge results with fuzzy matching
      const { findLastFmMatch } = await import('../../utils/fuzzy-match');
      const mergedResults = mbResults.map((mbArtist: any) => {
        // Try to find matching Last.fm data
        const lfmMatch = findLastFmMatch(mbArtist.name, lfmResults);

        if (lfmMatch) {
          console.log(
            `🔗 [Fuzzy Match] "${mbArtist.name}" → "${lfmMatch.match.name}" (confidence: ${lfmMatch.confidence}, score: ${lfmMatch.score})`
          );

          // Merge: Prioritize Last.fm image and add listener count
          return {
            ...mbArtist,
            imageUrl: lfmMatch.match.imageUrl || mbArtist.imageUrl,
            listeners: lfmMatch.match.listeners,
            lastFmMatch: {
              confidence: lfmMatch.confidence,
              score: lfmMatch.score,
            },
          };
        }

        // No Last.fm match found
        return mbArtist;
      });

      const matchCount = mergedResults.filter((r: any) => r.lastFmMatch).length;
      const matchRate =
        mbResults.length > 0
          ? ((matchCount / mbResults.length) * 100).toFixed(1)
          : '0';
      console.log(
        `✅ [Merge] Matched ${matchCount}/${mbResults.length} MusicBrainz artists with Last.fm data (${matchRate}%)`
      );

      // Cache merged results with metadata (reuse cacheKey from above)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      try {
        await prisma.cacheData.upsert({
          where: { key: cacheKey },
          create: {
            key: cacheKey,
            data: mergedResults as any,
            expires: expiresAt,
            metadata: {
              mbCount: mbResults.length,
              lfmCount: lfmResults.length,
              matchedCount: matchCount,
              searchDuration: duration,
              cachedAt: new Date().toISOString(),
            },
          },
          update: {
            data: mergedResults as any,
            expires: expiresAt,
            metadata: {
              mbCount: mbResults.length,
              lfmCount: lfmResults.length,
              matchedCount: matchCount,
              searchDuration: duration,
              cachedAt: new Date().toISOString(),
            },
          },
        });
        console.log(
          `💾 [Cache] Stored results for "${query}" (expires: ${expiresAt.toISOString()})`
        );
      } catch (cacheError) {
        console.error(`⚠️ [Cache] Failed to store results:`, cacheError);
        // Don't fail the request if caching fails
      }

      // Final summary log
      console.log(
        `📊 [Search Summary] Query: "${query}" | Total: ${mergedResults.length} | MB: ${mbResults.length} | LFM: ${lfmResults.length} | Matched: ${matchCount} (${matchRate}%) | Duration: ${duration}ms | Cached: ${!mbFailed && !lfmFailed}`
      );

      // Apply pagination (skip and limit)
      return mergedResults.slice(skip, skip + limit);
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
  // @ts-expect-error - Prisma return types don't match GraphQL types; field resolvers complete the objects
};
