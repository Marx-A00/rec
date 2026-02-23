// @ts-nocheck - Schema migration broke GraphQL resolvers, needs complete rewrite
// src/lib/graphql/resolvers/mutations.ts
// Mutation resolvers for GraphQL API

import chalk from 'chalk';
import { GraphQLError } from 'graphql';
import { graphqlLogger } from '@/lib/logger';

import {
  MutationResolvers,
  CorrectionSource as GqlCorrectionSource,
} from '@/generated/graphql';
import { getMusicBrainzQueue, JOB_TYPES } from '@/lib/queue';
import {
  previewAlbumEnrichment,
  previewArtistEnrichment,
} from '@/lib/enrichment/preview-enrichment';
import type {
  CheckAlbumEnrichmentJobData,
  CheckArtistEnrichmentJobData,
  CheckTrackEnrichmentJobData,
  SpotifySyncNewReleasesJobData,
  SpotifySyncFeaturedPlaylistsJobData,
} from '@/lib/queue/jobs';
import { alertManager } from '@/lib/monitoring';
import {
  logActivity,
  OPERATIONS,
  SOURCES,
} from '@/lib/logging/activity-logger';
import { createLlamaLogger } from '@/lib/logging/llama-logger';
import { isAdmin } from '@/lib/permissions';
import { requireOwnerNotSelf } from '@/lib/graphql/resolvers/utils';

// Correction system imports
import { getCorrectionSearchService } from '@/lib/correction/search-service';
import { getCorrectionPreviewService } from '@/lib/correction/preview';
import { applyCorrectionService, StaleDataError } from '@/lib/correction/apply';
import { getQueuedDiscogsService } from '@/lib/discogs/queued-service';
import { mapMasterToCorrectionSearchResult } from '@/lib/discogs/mappers';
import { PRIORITY_TIERS } from '@/lib/queue/jobs';
import { getInitialQuality } from '@/lib/db';
import type {
  FieldSelections,
  MetadataSelections,
  ExternalIdSelections,
  CoverArtChoice,
} from '@/lib/correction/apply/types';

// Utility function to cast return values for GraphQL resolvers
// Field resolvers will populate missing computed fields
function asResolverResult<T>(data: any): T {
  return data as T;
}

// ============================================================================
// Correction System Helper Functions
// ============================================================================

/**
 * Transform GraphQL FieldSelectionsInput to service FieldSelections format.
 * Converts arrays of SelectionEntry to Maps.
 */
function transformSelectionsInput(input: {
  metadata?: {
    title?: boolean;
    releaseDate?: boolean;
    releaseType?: boolean;
    releaseCountry?: boolean;
    barcode?: boolean;
    label?: boolean;
  } | null;
  artists?: Array<{ key: string; selected: boolean }> | null;
  tracks?: Array<{ key: string; selected: boolean }> | null;
  externalIds?: {
    musicbrainzId?: boolean;
    spotifyId?: boolean;
    discogsId?: boolean;
  } | null;
  coverArt?: string | null;
}): FieldSelections {
  // Transform metadata (with defaults)
  const metadata: MetadataSelections = {
    title: input.metadata?.title ?? true,
    releaseDate: input.metadata?.releaseDate ?? true,
    releaseType: input.metadata?.releaseType ?? true,
    releaseCountry: input.metadata?.releaseCountry ?? true,
    barcode: input.metadata?.barcode ?? true,
    label: input.metadata?.label ?? true,
  };

  // Transform artists array to Map
  const artists = new Map<string, boolean>();
  if (input.artists) {
    for (const entry of input.artists) {
      artists.set(entry.key, entry.selected);
    }
  }

  // Transform tracks array to Map
  const tracks = new Map<string, boolean>();
  if (input.tracks) {
    for (const entry of input.tracks) {
      tracks.set(entry.key, entry.selected);
    }
  }

  // Transform external IDs (with defaults)
  const externalIds: ExternalIdSelections = {
    musicbrainzId: input.externalIds?.musicbrainzId ?? true,
    spotifyId: input.externalIds?.spotifyId ?? false,
    discogsId: input.externalIds?.discogsId ?? false,
  };

  // Transform cover art choice
  let coverArt: CoverArtChoice = 'use_source';
  if (input.coverArt) {
    const coverArtUpper = input.coverArt.toUpperCase();
    if (coverArtUpper === 'USE_SOURCE') coverArt = 'use_source';
    else if (coverArtUpper === 'KEEP_CURRENT') coverArt = 'keep_current';
    else if (coverArtUpper === 'CLEAR') coverArt = 'clear';
  }

  return {
    metadata,
    artists,
    tracks,
    externalIds,
    coverArt,
  };
}

// @ts-ignore - Temporarily suppress complex GraphQL resolver type issues
// TODO: Fix GraphQL resolver return types to match generated types

// ============================================================================
// Uncover Game Helper Functions
// ============================================================================

/**
 * Format guess result for GraphQL response.
 * Shared between submitGuess and skipGuess resolvers.
 */
interface GuessServiceResult {
  guess: {
    id: string;
    guessNumber: number;
    isCorrect: boolean;
    guessedAt: Date;
    guessedAlbumId: string | null;
    guessedAlbum: {
      id: string;
      title: string;
      cloudflareImageId: string | null;
      artistName: string;
    } | null;
  };
  session: {
    id: string;
    status: string;
    attemptCount: number;
    won: boolean;
    startedAt: Date;
    completedAt: Date | null;
    guesses: Array<{
      id: string;
      guessNumber: number;
      isCorrect: boolean;
      guessedAt: Date;
      guessedAlbumId: string | null;
    }>;
  };
  gameOver: boolean;
  correctAlbum: {
    id: string;
    title: string;
    cloudflareImageId: string | null;
    artistName: string;
  } | null;
}

function formatGuessResult(result: GuessServiceResult) {
  return {
    guess: {
      id: result.guess.id,
      guessNumber: result.guess.guessNumber,
      isSkipped: result.guess.guessedAlbumId === null,
      isCorrect: result.guess.isCorrect,
      guessedAt: result.guess.guessedAt,
      guessedAlbum: result.guess.guessedAlbum,
    },
    session: {
      id: result.session.id,
      status: result.session.status,
      attemptCount: result.session.attemptCount,
      won: result.session.won,
      startedAt: result.session.startedAt,
      completedAt: result.session.completedAt,
      guesses: result.session.guesses.map(guess => ({
        id: guess.id,
        guessNumber: guess.guessNumber,
        isSkipped: guess.guessedAlbumId === null,
        isCorrect: guess.isCorrect,
        guessedAt: guess.guessedAt,
        guessedAlbum: null, // Will be populated by field resolver
      })),
    },
    gameOver: result.gameOver,
    correctAlbum: result.correctAlbum,
  };
}

export const mutationResolvers: MutationResolvers = {
  // Queue Management mutations
  pauseQueue: async (_, __, { user }) => {
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
      await queue.pause();
      return true;
    } catch (error) {
      throw new GraphQLError(`Failed to pause queue: ${error}`);
    }
  },

  resumeQueue: async (_, __, { user }) => {
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
      await queue.resume();
      return true;
    } catch (error) {
      throw new GraphQLError(`Failed to resume queue: ${error}`);
    }
  },

  retryJob: async (_, { jobId }, { user }) => {
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
      const job = await queue.getJob(jobId);

      if (!job) {
        throw new GraphQLError(`Job ${jobId} not found`);
      }

      await job.retry();
      return true;
    } catch (error) {
      throw new GraphQLError(`Failed to retry job: ${error}`);
    }
  },

  retryAllFailed: async (_, __, { user }) => {
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
      const failed = await queue.getFailed();

      let retriedCount = 0;
      for (const job of failed) {
        try {
          await job.retry();
          retriedCount++;
        } catch (error) {
          console.error(`Failed to retry job ${job.id}:`, error);
        }
      }

      return retriedCount;
    } catch (error) {
      throw new GraphQLError(`Failed to retry failed jobs: ${error}`);
    }
  },

  cleanQueue: async (_, { olderThan }, { user }) => {
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
      await queue.cleanup(olderThan || 86400000); // Default 24 hours
      return true;
    } catch (error) {
      throw new GraphQLError(`Failed to clean queue: ${error}`);
    }
  },

  clearFailedJobs: async (_, __, { user }) => {
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
      await queue.clean(0, 1000, 'failed');
      return true;
    } catch (error) {
      throw new GraphQLError(`Failed to clear failed jobs: ${error}`);
    }
  },

  // Spotify Sync mutation
  triggerSpotifySync: async (_, { type }, { user }) => {
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
      const results = {
        success: true,
        jobId: null as string | null,
        message: '',
        stats: {
          albumsQueued: 0,
          albumsCreated: 0,
          albumsUpdated: 0,
          enrichmentJobsQueued: 0,
        },
      };

      // Queue the appropriate job(s) based on type
      if (type === 'NEW_RELEASES' || type === 'BOTH') {
        // Parse pagination setting (Task 11)
        const pages = process.env.SPOTIFY_NEW_RELEASES_PAGES
          ? parseInt(process.env.SPOTIFY_NEW_RELEASES_PAGES)
          : 3; // Default to 3 pages

        // Parse follower filter (Task 11)
        const minFollowers = process.env.SPOTIFY_NEW_RELEASES_MIN_FOLLOWERS
          ? parseInt(process.env.SPOTIFY_NEW_RELEASES_MIN_FOLLOWERS)
          : 100000; // Default to 100k+ followers

        const jobData: SpotifySyncNewReleasesJobData = {
          limit: parseInt(process.env.SPOTIFY_NEW_RELEASES_LIMIT || '50'),
          country: process.env.SPOTIFY_COUNTRY || 'US',
          priority: 'high',
          source: 'graphql',
          requestId: `manual_new_releases_${Date.now()}`,
          // Pagination and follower filtering (Task 11)
          pages,
          minFollowers,
        };

        const job = await queue.addJob(
          JOB_TYPES.SPOTIFY_SYNC_NEW_RELEASES,
          jobData,
          {
            priority: 1, // High priority for manual triggers
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
          }
        );

        results.jobId = job.id;
        results.message = `Queued Spotify new releases sync (Job ID: ${job.id}, ${pages} pages, ${minFollowers.toLocaleString()}+ followers)`;
        console.log(`📀 Triggered Spotify new releases sync: Job ${job.id}`);
      }

      if (type === 'FEATURED_PLAYLISTS' || type === 'BOTH') {
        const jobData: SpotifySyncFeaturedPlaylistsJobData = {
          limit: 10,
          country: process.env.SPOTIFY_COUNTRY || 'US',
          extractAlbums: true,
          priority: 'high',
          source: 'manual_trigger',
          requestId: `manual_playlists_${Date.now()}`,
        };

        const job = await queue.addJob(
          JOB_TYPES.SPOTIFY_SYNC_FEATURED_PLAYLISTS,
          jobData,
          {
            priority: 1,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
          }
        );

        if (type === 'FEATURED_PLAYLISTS') {
          results.jobId = job.id;
          results.message = `Queued Spotify featured playlists sync (Job ID: ${job.id})`;
        } else {
          results.message = `Queued both Spotify sync jobs`;
        }
        console.log(
          `🎧 Triggered Spotify featured playlists sync: Job ${job.id}`
        );
      }

      return results;
    } catch (error) {
      throw new GraphQLError(`Failed to trigger Spotify sync: ${error}`);
    }
  },

  // Sync Job Management - Rollback functionality
  rollbackSyncJob: async (
    _,
    { syncJobId, dryRun = true },
    { prisma, user }
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
    try {
      // 1. Find the sync job
      const syncJob = await prisma.syncJob.findUnique({
        where: { id: syncJobId },
      });

      if (!syncJob) {
        throw new GraphQLError(`SyncJob not found: ${syncJobId}`);
      }

      // 2. Find all albums created by this job (via metadata.jobId matching BullMQ job ID)
      const albumsToDelete = await prisma.album.findMany({
        where: {
          metadata: {
            path: ['jobId'],
            equals: syncJob.jobId, // Match BullMQ job ID stored in album metadata
          },
        },
        select: {
          id: true,
          title: true,
          artists: {
            select: {
              artistId: true,
            },
          },
        },
      });

      const albumIds = albumsToDelete.map(a => a.id);
      const artistIdsFromAlbums = [
        ...new Set(
          albumsToDelete.flatMap(a => a.artists.map(aa => aa.artistId))
        ),
      ];

      console.log(
        `🔍 Rollback ${dryRun ? '(DRY RUN)' : ''}: Found ${albumIds.length} albums from SyncJob ${syncJobId}`
      );

      // 3. Find artists that would become orphaned (no other albums)
      const artistsToDelete: string[] = [];

      for (const artistId of artistIdsFromAlbums) {
        const otherAlbumsCount = await prisma.albumArtist.count({
          where: {
            artistId,
            albumId: { notIn: albumIds },
          },
        });

        if (otherAlbumsCount === 0) {
          artistsToDelete.push(artistId);
        }
      }

      console.log(
        `🔍 Rollback ${dryRun ? '(DRY RUN)' : ''}: ${artistsToDelete.length} artists would become orphaned`
      );

      // 4. If dry run, return what would be deleted
      if (dryRun) {
        return {
          success: true,
          syncJobId,
          albumsDeleted: albumIds.length,
          artistsDeleted: artistsToDelete.length,
          message: `DRY RUN: Would delete ${albumIds.length} albums and ${artistsToDelete.length} orphaned artists from job "${syncJob.jobId}"`,
          dryRun: true,
        };
      }

      // 5. Actually delete (albums first due to foreign keys, then orphaned artists)
      // Delete albums (this will cascade to AlbumArtist, CollectionAlbum, Recommendations, Tracks, etc.)
      const deleteAlbumsResult = await prisma.album.deleteMany({
        where: { id: { in: albumIds } },
      });

      console.log(`🗑️  Deleted ${deleteAlbumsResult.count} albums`);

      // Delete orphaned artists
      const deleteArtistsResult = await prisma.artist.deleteMany({
        where: { id: { in: artistsToDelete } },
      });

      console.log(`🗑️  Deleted ${deleteArtistsResult.count} orphaned artists`);

      // 6. Update SyncJob status to CANCELLED to indicate rollback
      await prisma.syncJob.update({
        where: { id: syncJobId },
        data: {
          status: 'CANCELLED',
          metadata: {
            ...((syncJob.metadata as object) || {}),
            rolledBackAt: new Date().toISOString(),
            albumsDeleted: deleteAlbumsResult.count,
            artistsDeleted: deleteArtistsResult.count,
          },
        },
      });

      return {
        success: true,
        syncJobId,
        albumsDeleted: deleteAlbumsResult.count,
        artistsDeleted: deleteArtistsResult.count,
        message: `Successfully rolled back SyncJob "${syncJob.jobId}": deleted ${deleteAlbumsResult.count} albums and ${deleteArtistsResult.count} orphaned artists`,
        dryRun: false,
      };
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      throw new GraphQLError(`Failed to rollback sync job: ${error}`);
    }
  },

  // Alert configuration
  updateAlertThresholds: async (_, { input }, { user }) => {
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
      const thresholds: any = {};

      if (input.queueDepth !== undefined) {
        thresholds.queueDepth = input.queueDepth;
      }
      if (input.errorRatePercent !== undefined) {
        thresholds.errorRatePercent = input.errorRatePercent;
      }
      if (input.avgProcessingTimeMs !== undefined) {
        thresholds.avgProcessingTimeMs = input.avgProcessingTimeMs;
      }
      if (input.memoryUsageMB !== undefined) {
        thresholds.memoryUsageMB = input.memoryUsageMB;
      }

      alertManager.updateThresholds(thresholds);

      const updatedThresholds = alertManager.getThresholds();

      return {
        queueDepth: updatedThresholds.queueDepth,
        errorRatePercent: updatedThresholds.errorRatePercent,
        avgProcessingTimeMs: updatedThresholds.avgProcessingTimeMs,
        memoryUsageMB: updatedThresholds.memoryUsageMB,
      };
    } catch (error) {
      throw new GraphQLError(`Failed to update alert thresholds: ${error}`);
    }
  },

  // Album management
  // Track management mutations
  createTrack: async (
    _: any,
    { input }: any,
    {
      user,
      prisma,
      activityTracker,
      priorityManager,
      sessionId,
      requestId,
    }: any
  ) => {
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    try {
      // Validate that the album exists
      const album = await prisma.album.findUnique({
        where: { id: input.albumId },
      });

      if (!album) {
        throw new GraphQLError('Album not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Create the track
      const track = await prisma.track.create({
        data: {
          title: input.title,
          albumId: input.albumId,
          trackNumber: input.trackNumber,
          discNumber: input.discNumber || 1,
          durationMs: input.durationMs,
          explicit: input.explicit || false,
          previewUrl: input.previewUrl,
          isrc: input.isrc,
          musicbrainzId: input.musicbrainzId,
          // Set initial enrichment data
          dataQuality: input.musicbrainzId ? 'MEDIUM' : 'LOW',
          enrichmentStatus: input.musicbrainzId ? 'COMPLETED' : 'PENDING',
          lastEnriched: input.musicbrainzId ? new Date() : null,
        },
      });

      // Handle artist associations
      const { findOrCreateArtist } = await import('@/lib/artists');

      for (const artistInput of input.artists) {
        let artistId = artistInput.artistId;

        if (!artistId && artistInput.artistName) {
          const { artist } = await findOrCreateArtist({
            db: prisma,
            identity: { name: artistInput.artistName },
            fields: {
              source: 'USER_SUBMITTED' as const,
              ...getInitialQuality(),
            },
            enrichment: 'queue-check',
            queueCheckOptions: {
              source: 'manual',
              priority: 'high',
              requestId: `track-artist-${artistInput.artistName}`,
            },
            caller: 'createTrack',
          });
          artistId = artist.id;
        }

        if (artistId) {
          await prisma.trackArtist.create({
            data: {
              trackId: track.id,
              artistId: artistId,
              role: artistInput.role || 'primary',
            },
          });
        }
      }

      // Queue enrichment check for the new track
      try {
        const queue = getMusicBrainzQueue();

        // Track collection action for priority management
        await activityTracker.trackCollectionAction('add_track', track.id);

        // Get smart job options based on user activity
        const jobOptions = await priorityManager.getJobOptions(
          'manual',
          track.id,
          'track',
          user?.id,
          sessionId
        );

        const trackCheckData: CheckTrackEnrichmentJobData = {
          trackId: track.id,
          source: 'manual',
          priority: 'high',
          requestId: requestId,
        };

        await queue.addJob(
          JOB_TYPES.CHECK_TRACK_ENRICHMENT,
          trackCheckData,
          jobOptions
        );
      } catch (queueError) {
        console.warn(
          'Failed to queue enrichment check for new track:',
          queueError
        );
      }

      return track;
    } catch (error) {
      console.error('Error creating track:', error);
      throw new GraphQLError('Failed to create track', {
        extensions: { code: 'INTERNAL_ERROR' },
      });
    }
  },

  updateTrack: async (_: any, { id, input }: any, { user, prisma }: any) => {
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    try {
      // Check that track exists
      const existingTrack = await prisma.track.findUnique({
        where: { id },
      });

      if (!existingTrack) {
        throw new GraphQLError('Track not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Update the track
      const updatedTrack = await prisma.track.update({
        where: { id },
        data: {
          title: input.title,
          trackNumber: input.trackNumber,
          discNumber: input.discNumber,
          durationMs: input.durationMs,
          explicit: input.explicit,
          previewUrl: input.previewUrl,
          isrc: input.isrc,
          musicbrainzId: input.musicbrainzId,
          // Update enrichment status if MusicBrainz ID was added
          dataQuality: input.musicbrainzId
            ? 'MEDIUM'
            : existingTrack.dataQuality,
          enrichmentStatus: input.musicbrainzId
            ? 'COMPLETED'
            : existingTrack.enrichmentStatus,
          lastEnriched: input.musicbrainzId
            ? new Date()
            : existingTrack.lastEnriched,
        },
      });

      return updatedTrack;
    } catch (error) {
      console.error('Error updating track:', error);
      throw new GraphQLError('Failed to update track', {
        extensions: { code: 'INTERNAL_ERROR' },
      });
    }
  },

  deleteTrack: async (_: any, { id }: any, { user, prisma }: any) => {
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    try {
      // Check that track exists
      const existingTrack = await prisma.track.findUnique({
        where: { id },
      });

      if (!existingTrack) {
        throw new GraphQLError('Track not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Delete the track (CASCADE will handle TrackArtist relationships)
      await prisma.track.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      console.error('Error deleting track:', error);
      throw new GraphQLError('Failed to delete track', {
        extensions: { code: 'INTERNAL_ERROR' },
      });
    }
  },

  addAlbum: async (
    _,
    { input },
    { user, prisma, activityTracker, priorityManager, sessionId, requestId }
  ) => {
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    try {
      // Check if album already exists by MusicBrainz ID (if provided)
      if (input.musicbrainzId) {
        const existingAlbum = await prisma.album.findFirst({
          where: { musicbrainzId: input.musicbrainzId },
          include: {
            artists: {
              include: { artist: true },
            },
          },
        });

        if (existingAlbum) {
          console.log(
            `🔄 Album already exists by MBID: "${existingAlbum.title}" (${existingAlbum.id})`
          );
          return existingAlbum;
        }
      }

      // Also check for existing album by title + primary artist (prevent duplicates)
      const primaryArtistName = input.artists?.[0]?.artistName;
      if (primaryArtistName) {
        const existingByTitleArtist = await prisma.album.findFirst({
          where: {
            title: {
              equals: input.title,
              mode: 'insensitive',
            },
            artists: {
              some: {
                role: 'PRIMARY',
                artist: {
                  name: {
                    equals: primaryArtistName,
                    mode: 'insensitive',
                  },
                },
              },
            },
          },
          include: {
            artists: {
              include: { artist: true },
            },
          },
        });

        if (existingByTitleArtist) {
          console.log(
            `🔄 Album already exists by title+artist: "${existingByTitleArtist.title}" by ${primaryArtistName} (${existingByTitleArtist.id})`
          );
          return existingByTitleArtist;
        }
      }

      // Parse release date if provided
      const releaseDate = input.releaseDate
        ? new Date(input.releaseDate)
        : null;

      // Create the album
      const album = await prisma.album.create({
        data: {
          title: input.title,
          releaseDate,
          releaseType: input.albumType || 'ALBUM',
          trackCount: input.totalTracks,
          coverArtUrl: input.coverImageUrl,
          musicbrainzId: input.musicbrainzId,
          // Note: Spotify/Apple/Discogs IDs would need schema updates to store
          ...getInitialQuality({ musicbrainzId: input.musicbrainzId }),
        },
      });

      // Handle artist associations using shared helper
      const { findOrCreateArtist } = await import('@/lib/artists');

      for (const artistInput of input.artists) {
        if (!artistInput.artistName) continue;

        const { artist } = await findOrCreateArtist({
          db: prisma,
          identity: { name: artistInput.artistName },
          fields: {
            source: 'USER_SUBMITTED' as const,
            ...getInitialQuality(),
          },
          enrichment: 'queue-check',
          queueCheckOptions: {
            source: 'manual',
            priority: 'high',
            requestId: `album-artist-${artistInput.artistName}`,
          },
          caller: 'addAlbum',
        });

        // Create or update the album-artist relationship (upsert to handle duplicates)
        const role = artistInput.role || 'PRIMARY';
        await prisma.albumArtist.upsert({
          where: {
            albumId_artistId_role: {
              albumId: album.id,
              artistId: artist.id,
              role: role,
            },
          },
          update: {},
          create: {
            albumId: album.id,
            artistId: artist.id,
            role: role,
          },
        });
      }

      // Queue enrichment check in background (non-blocking for faster response)
      setImmediate(async () => {
        try {
          const queue = getMusicBrainzQueue();

          // Track collection action for priority management
          await activityTracker.trackCollectionAction('add_album', album.id);

          // Get smart job options based on user activity
          const jobOptions = await priorityManager.getJobOptions(
            'manual', // Source for manually added albums
            album.id,
            'album',
            user?.id,
            sessionId
          );

          const albumCheckData: CheckAlbumEnrichmentJobData = {
            albumId: album.id,
            source: 'manual',
            priority: 'high', // Manual additions get high priority
            requestId: requestId,
          };

          await queue.addJob(
            JOB_TYPES.CHECK_ALBUM_ENRICHMENT,
            albumCheckData,
            jobOptions
          );

          // Log priority decision for debugging
          priorityManager.logPriorityDecision(
            'manual',
            album.id,
            jobOptions.priority / 10, // Convert back to 1-10 scale
            {
              actionImportance: 8,
              userActivity: 0,
              entityRelevance: 0,
              systemLoad: 0,
            },
            jobOptions.delay
          );
        } catch (queueError) {
          console.warn(
            'Failed to queue enrichment check for new album:',
            queueError
          );
        }
      });

      // Return the album with its relationships
      return (await prisma.album.findUnique({
        where: { id: album.id },
        include: {
          artists: {
            include: {
              artist: true,
            },
          },
          tracks: true,
        },
      })) as any;
    } catch (error) {
      console.error('Error creating album:', error);
      throw new GraphQLError('Failed to create album', {
        extensions: { code: 'INTERNAL_ERROR' },
      });
    }
  },

  addArtist: async (
    _,
    { input },
    { user, prisma, activityTracker, priorityManager, sessionId, requestId }
  ) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    try {
      const { findOrCreateArtist } = await import('@/lib/artists');

      const artistJobId = `artist-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const { artist, created } = await findOrCreateArtist({
        db: prisma,
        identity: {
          name: input.name,
          musicbrainzId: input.musicbrainzId,
        },
        fields: {
          imageUrl: input.imageUrl,
          countryCode: input.countryCode,
          source: 'USER_SUBMITTED' as const,
          ...getInitialQuality({ musicbrainzId: input.musicbrainzId }),
        },
        enrichment: 'queue-check',
        queueCheckOptions: {
          source: 'manual_add',
          priority: 'high',
          requestId: `manual-artist-add-${input.name}`,
          parentJobId: artistJobId,
        },
        logging: {
          operation: 'artist:created',
          sources: input.musicbrainzId ? ['MUSICBRAINZ'] : ['USER'],
          isRootJob: true,
          userId: user.id,
        },
        caller: 'addArtist',
      });

      // Track activity for priority management (only on creation)
      if (created) {
        setImmediate(async () => {
          try {
            await activityTracker.recordEntityInteraction(
              'add_artist',
              'artist',
              artist.id,
              'mutation',
              { source: 'manual_add' }
            );
          } catch (err) {
            console.warn('Failed to track artist activity:', err);
          }
        });
      }

      return artist as any;
    } catch (error) {
      console.error('Error creating artist:', error);
      throw new GraphQLError('Failed to create artist', {
        extensions: { code: 'INTERNAL_ERROR' },
      });
    }
  },

  deleteArtist: async (_: unknown, { id }: { id: string }, context: any) => {
    const { user, prisma } = context;

    // Check authentication
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Check authorization - admin only
    if (!isAdmin(user.role)) {
      throw new GraphQLError('Unauthorized: Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    try {
      // Check if artist exists
      const artist = await prisma.artist.findUnique({
        where: { id },
      });

      if (!artist) {
        throw new GraphQLError('Artist not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Use Prisma transaction to handle cascade deletion
      await prisma.$transaction(async tx => {
        // Delete related records in order
        // 1. Album-artist relationships
        await tx.albumArtist.deleteMany({
          where: { artistId: id },
        });

        // 2. Track-artist relationships
        await tx.trackArtist.deleteMany({
          where: { artistId: id },
        });

        // 3. Enrichment logs
        await tx.llamaLog.deleteMany({
          where: { artistId: id },
        });

        // 4. Finally, delete the artist
        await tx.artist.delete({
          where: { id },
        });
      });

      return {
        success: true,
        message: `Artist deleted successfully`,
        deletedId: id,
      };
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      console.error('Error deleting artist:', error);
      throw new GraphQLError(`Failed to delete artist: ${error}`, {
        extensions: { code: 'INTERNAL_ERROR' },
      });
    }
  },

  // Collection management mutations (placeholders)
  createCollection: async (
    _,
    { name, description, isPublic = false },
    { user, prisma }
  ) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    try {
      const collection = await prisma.collection.create({
        data: {
          name,
          description,
          isPublic,
          userId: user.id,
        },
      });
      return collection;
    } catch (error) {
      throw new GraphQLError(`Failed to create collection: ${error}`);
    }
  },

  updateCollection: async (
    _,
    { id, name, description, isPublic },
    { user, prisma }
  ) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    try {
      // Verify collection ownership
      const existingCollection = await prisma.collection.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

      if (!existingCollection) {
        throw new GraphQLError('Collection not found or access denied');
      }

      const collection = await prisma.collection.update({
        where: { id },
        data: {
          ...(name && { name: name.trim() }),
          ...(description !== undefined && {
            description: description?.trim(),
          }),
          ...(isPublic !== undefined && { isPublic }),
        },
      });

      return collection;
    } catch (error) {
      throw new GraphQLError(`Failed to update collection: ${error}`);
    }
  },

  deleteCollection: async (_, { id }, { user, prisma }) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    try {
      // Verify collection ownership
      const existingCollection = await prisma.collection.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

      if (!existingCollection) {
        throw new GraphQLError('Collection not found or access denied');
      }

      await prisma.collection.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      throw new GraphQLError(`Failed to delete collection: ${error}`);
    }
  },

  addAlbumToCollection: async (
    _,
    { collectionId, input },
    { user, prisma }
  ) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    try {
      const { addAlbumToCollection: addAlbumToCollectionHelper } = await import(
        '@/lib/collections'
      );
      const result = await addAlbumToCollectionHelper({
        db: prisma,
        userId: user.id,
        collectionId,
        album: { type: 'existing', albumId: input.albumId },
        personalRating: input.personalRating,
        personalNotes: input.personalNotes,
        position: input.position || 0,
        caller: 'addAlbumToCollection',
      });
      return result.collectionAlbum;
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      throw new GraphQLError(`Failed to add album to collection: ${error}`);
    }
  },

  /**
   * Add album to collection with optional inline album/artist creation.
   * This is the preferred mutation for collection adds - it handles:
   * 1. Creating album if albumData provided (with proper artist find-or-create)
   * 2. Using existing album if albumId provided
   * 3. Proper LlamaLog provenance chain (all child jobs link to root)
   * 4. Atomic transaction for album + collection add
   */
  addAlbumToCollectionWithCreate: async (_, { input }, { user, prisma }) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    const {
      collectionId,
      position,
      personalRating,
      personalNotes,
      albumId,
      albumData,
    } = input;

    // Validate: must have exactly one of albumId or albumData
    if ((!albumId && !albumData) || (albumId && albumData)) {
      throw new GraphQLError(
        'Must provide exactly one of albumId or albumData'
      );
    }

    try {
      const { addAlbumToCollection: addAlbumToCollectionHelper } = await import(
        '@/lib/collections'
      );
      const result = await addAlbumToCollectionHelper({
        db: prisma,
        userId: user.id,
        collectionId,
        album: albumData
          ? { type: 'create', albumData }
          : { type: 'existing', albumId: albumId! },
        personalRating,
        personalNotes,
        position: position || 0,
        caller: 'addAlbumToCollectionWithCreate',
      });
      return result.collectionAlbum;
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      throw new GraphQLError(`Failed to add album to collection: ${error}`);
    }
  },

  removeAlbumFromCollection: async (
    _,
    { collectionId, albumId },
    { user, prisma }
  ) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    try {
      // Remove album and soft-delete activity in a transaction
      await prisma.$transaction(async tx => {
        // Verify collection ownership
        const collection = await tx.collection.findFirst({
          where: {
            id: collectionId,
            userId: user.id,
          },
        });

        if (!collection) {
          throw new GraphQLError('Collection not found or access denied');
        }

        // Find the collection album to get its ID for activity soft-delete
        const collectionAlbum = await tx.collectionAlbum.findFirst({
          where: { collectionId, albumId },
        });

        if (collectionAlbum) {
          // Soft-delete the Activity first
          await tx.activity.updateMany({
            where: { collectionAlbumId: collectionAlbum.id, deletedAt: null },
            data: { deletedAt: new Date() },
          });
        }

        // Delete the collection album
        await tx.collectionAlbum.deleteMany({
          where: {
            collectionId,
            albumId,
          },
        });
      });

      return true;
    } catch (error) {
      throw new GraphQLError(
        `Failed to remove album from collection: ${error}`
      );
    }
  },

  updateCollectionAlbum: async (_, { id, input }, { user, prisma }) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    try {
      // Verify ownership through collection
      const existingCollectionAlbum = await prisma.collectionAlbum.findUnique({
        where: { id },
        include: { collection: true },
      });

      if (
        !existingCollectionAlbum ||
        existingCollectionAlbum.collection.userId !== user.id
      ) {
        throw new GraphQLError('Collection album not found or access denied');
      }

      const updatedCollectionAlbum = await prisma.collectionAlbum.update({
        where: { id },
        data: {
          personalRating: input.personalRating ?? undefined,
          personalNotes: input.personalNotes,
          position: input.position,
        },
      });
      return updatedCollectionAlbum;
    } catch (error) {
      throw new GraphQLError(`Failed to update collection album: ${error}`);
    }
  },

  reorderCollectionAlbums: async (
    _,
    { collectionId, albumIds },
    { user, prisma }
  ) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    try {
      // Verify collection ownership
      const collection = await prisma.collection.findFirst({
        where: {
          id: collectionId,
          userId: user.id,
        },
      });

      if (!collection) {
        throw new GraphQLError('Collection not found or access denied');
      }

      // Update positions in a transaction
      const updates = albumIds.map((albumId, index) =>
        prisma.collectionAlbum.updateMany({
          where: {
            collectionId,
            albumId,
          },
          data: {
            position: index,
          },
        })
      );

      await prisma.$transaction(updates);

      // Return the reordered collection albums
      const collectionAlbums = await prisma.collectionAlbum.findMany({
        where: { collectionId },
        orderBy: { position: 'asc' },
      });

      return collectionAlbums;
    } catch (error) {
      throw new GraphQLError(`Failed to reorder collection albums: ${error}`);
    }
  },

  /**
   * Create a recommendation with optional inline album/artist creation.
   * Supports two modes:
   * 1. Legacy: Pass basisAlbumId + recommendedAlbumId + score (existing albums)
   * 2. New: Pass input with optional album creation data
   */
  createRecommendation: async (
    _,
    { basisAlbumId, recommendedAlbumId, score, input },
    { user, prisma }
  ) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    // Determine which mode we're in and extract parameters
    let finalBasisAlbumId: string;
    let finalRecommendedAlbumId: string;
    let finalScore: number;

    // Track created entities for conditional post-commit enrichment
    const createdArtists: Array<{ id: string; name: string }> = [];
    let basisAlbumCreated = false;
    let recommendedAlbumCreated = false;
    const { findOrCreateAlbum: findOrCreateAlbumHelper } = await import(
      '@/lib/albums'
    );

    // Generate root job ID for provenance chain
    const rootJobId = `recommendation-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const llamaLogger = createLlamaLogger(prisma);

    if (input) {
      // New mode: use input object
      finalScore = input.score;

      // Validate: each album needs exactly one of ID or data
      const hasBasisId = !!input.basisAlbumId;
      const hasBasisData = !!input.basisAlbumData;
      const hasRecId = !!input.recommendedAlbumId;
      const hasRecData = !!input.recommendedAlbumData;

      if ((!hasBasisId && !hasBasisData) || (hasBasisId && hasBasisData)) {
        throw new GraphQLError(
          'Must provide exactly one of basisAlbumId or basisAlbumData'
        );
      }
      if ((!hasRecId && !hasRecData) || (hasRecId && hasRecData)) {
        throw new GraphQLError(
          'Must provide exactly one of recommendedAlbumId or recommendedAlbumData'
        );
      }
    } else {
      // Legacy mode: use individual params
      if (!basisAlbumId || !recommendedAlbumId || score === undefined) {
        throw new GraphQLError(
          'Must provide basisAlbumId, recommendedAlbumId, and score'
        );
      }
      finalBasisAlbumId = basisAlbumId;
      finalRecommendedAlbumId = recommendedAlbumId;
      finalScore = score;
    }

    try {
      const recommendation = await prisma.$transaction(async tx => {
        // Helper to resolve album data through shared find-or-create
        const resolveAlbumData = async (albumData: {
          title: string;
          releaseDate?: string | null;
          albumType?: string | null;
          totalTracks?: number | null;
          coverImageUrl?: string | null;
          musicbrainzId?: string | null;
          artists?: Array<{
            artistId?: string | null;
            artistName?: string | null;
            role?: string | null;
          }> | null;
        }): Promise<{ albumId: string; created: boolean }> => {
          const primaryArtistName = albumData.artists?.[0]?.artistName;
          const releaseDate = albumData.releaseDate
            ? new Date(albumData.releaseDate)
            : null;

          const { album, created } = await findOrCreateAlbumHelper({
            db: tx,
            identity: {
              title: albumData.title,
              musicbrainzId: albumData.musicbrainzId ?? undefined,
              primaryArtistName: primaryArtistName ?? undefined,
              releaseYear: releaseDate?.getFullYear() ?? undefined,
            },
            fields: {
              releaseDate,
              releaseType: albumData.albumType || 'ALBUM',
              trackCount: albumData.totalTracks ?? undefined,
              coverArtUrl: albumData.coverImageUrl ?? undefined,
            },
            artists: (albumData.artists || [])
              .filter(a => a.artistName)
              .map((a, i) => ({
                name: a.artistName!,
                role: (a.role as 'PRIMARY' | 'FEATURED') || 'PRIMARY',
                position: i,
              })),
            enrichment: 'none',
            insideTransaction: true,
            caller: 'createRecommendation',
          });

          // Track created artists for post-transaction enrichment
          if (created) {
            const albumArtists = await tx.albumArtist.findMany({
              where: { albumId: album.id },
              include: { artist: true },
            });
            for (const aa of albumArtists) {
              if (
                aa.artist.dataQuality === 'LOW' &&
                aa.artist.enrichmentStatus === 'PENDING'
              ) {
                createdArtists.push({ id: aa.artist.id, name: aa.artist.name });
              }
            }
          }

          return { albumId: album.id, created };
        };

        // Resolve album IDs (find or create as needed)
        if (input) {
          if (input.basisAlbumId) {
            finalBasisAlbumId = input.basisAlbumId;
          } else if (input.basisAlbumData) {
            const result = await resolveAlbumData(input.basisAlbumData);
            finalBasisAlbumId = result.albumId;
            basisAlbumCreated = result.created;
          }

          if (input.recommendedAlbumId) {
            finalRecommendedAlbumId = input.recommendedAlbumId;
          } else if (input.recommendedAlbumData) {
            const result = await resolveAlbumData(input.recommendedAlbumData);
            finalRecommendedAlbumId = result.albumId;
            recommendedAlbumCreated = result.created;
          }
        }

        // Prevent recommending the same album to itself
        if (finalBasisAlbumId === finalRecommendedAlbumId) {
          throw new GraphQLError(
            'Cannot recommend an album to itself. Please choose a different album.'
          );
        }

        // Create the recommendation
        const rec = await tx.recommendation.create({
          data: {
            userId: user.id,
            basisAlbumId: finalBasisAlbumId!,
            recommendedAlbumId: finalRecommendedAlbumId!,
            score: finalScore,
          },
          include: {
            basisAlbum: {
              include: { artists: { include: { artist: true } } },
            },
            recommendedAlbum: {
              include: { artists: { include: { artist: true } } },
            },
          },
        });

        // Create Activity record
        const { createRecommendationActivity } = await import(
          '@/lib/activities'
        );
        await createRecommendationActivity({
          db: tx,
          userId: user.id,
          recommendation: rec,
        });

        // Count update handled automatically by DB trigger (recommendations_count_trigger)

        return rec;
      });

      // Log recommendation creation to LlamaLog (root job for provenance chain)
      try {
        await llamaLogger.logEnrichment({
          entityType: 'ALBUM',
          entityId: finalRecommendedAlbumId!,
          albumId: finalRecommendedAlbumId!,
          operation: 'recommendation:created',
          category: 'USER_ACTION',
          sources: ['USER'],
          status: 'SUCCESS',
          fieldsEnriched: [],
          jobId: rootJobId,
          isRootJob: true,
          userId: user.id,
          metadata: {
            recommendationId: recommendation.id,
            basisAlbumId: finalBasisAlbumId!,
            recommendedAlbumId: finalRecommendedAlbumId!,
            score: finalScore,
            artistsCreated: createdArtists.length,
          },
        });
      } catch (logError) {
        console.warn(
          '[LlamaLogger] Failed to log recommendation creation:',
          logError
        );
      }

      // Log artist:created for each new artist (child of root job)
      for (const artist of createdArtists) {
        try {
          await llamaLogger.logEnrichment({
            entityType: 'ARTIST',
            entityId: artist.id,
            artistId: artist.id,
            operation: 'artist:created',
            category: 'CREATED',
            sources: ['USER'],
            status: 'SUCCESS',
            fieldsEnriched: ['name'],
            jobId: `artist-created-${artist.id}`,
            parentJobId: rootJobId,
            rootJobId: rootJobId,
            isRootJob: false,
            userId: user.id,
            dataQualityAfter: 'LOW',
          });
        } catch (logError) {
          console.warn(
            '[LlamaLogger] Failed to log artist creation:',
            logError
          );
        }
      }

      // Queue enrichment checks in background (non-blocking for faster response)
      setImmediate(async () => {
        try {
          const queue = getMusicBrainzQueue();

          // Only queue enrichment for newly created albums (existing albums are already enriched)
          const albumEnrichmentJobs: Promise<unknown>[] = [];

          if (basisAlbumCreated) {
            albumEnrichmentJobs.push(
              queue.addJob(
                JOB_TYPES.CHECK_ALBUM_ENRICHMENT,
                {
                  albumId: finalBasisAlbumId!,
                  source: 'recommendation_create',
                  priority: 'high',
                  requestId: `recommendation-basis-${recommendation.id}`,
                  parentJobId: rootJobId,
                } satisfies CheckAlbumEnrichmentJobData,
                { priority: 8, attempts: 3 }
              )
            );
          }

          if (recommendedAlbumCreated) {
            albumEnrichmentJobs.push(
              queue.addJob(
                JOB_TYPES.CHECK_ALBUM_ENRICHMENT,
                {
                  albumId: finalRecommendedAlbumId!,
                  source: 'recommendation_create',
                  priority: 'high',
                  requestId: `recommendation-target-${recommendation.id}`,
                  parentJobId: rootJobId,
                } satisfies CheckAlbumEnrichmentJobData,
                { priority: 8, attempts: 3 }
              )
            );
          }

          if (albumEnrichmentJobs.length > 0) {
            await Promise.all(albumEnrichmentJobs);
          }

          // Queue artist enrichment for each created artist
          for (const artist of createdArtists) {
            const artistCheckData: CheckArtistEnrichmentJobData = {
              artistId: artist.id,
              source: 'recommendation_create',
              priority: 'high',
              requestId: `recommendation-artist-${artist.id}`,
              parentJobId: rootJobId,
            };

            await queue.addJob(
              JOB_TYPES.CHECK_ARTIST_ENRICHMENT,
              artistCheckData,
              {
                priority: 10,
                attempts: 3,
              }
            );
            console.log(
              chalk.magenta(
                `[TIER-3] Queued CHECK_ARTIST_ENRICHMENT for "${artist.name}" from createRecommendation mutation`
              )
            );
          }
        } catch (queueError) {
          console.warn(
            'Failed to queue enrichment checks for recommendation creation:',
            queueError
          );
        }
      });

      return recommendation;
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      throw new GraphQLError(`Failed to create recommendation: ${error}`);
    }
  },

  updateRecommendation: async (_, { id, score }, { user, prisma }) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    try {
      // Update recommendation and activity in a transaction
      const updatedRecommendation = await prisma.$transaction(async tx => {
        const recommendation = await tx.recommendation.findFirst({
          where: {
            id,
            userId: user.id,
          },
        });

        if (!recommendation) {
          throw new GraphQLError('Recommendation not found or access denied');
        }

        const rec = await tx.recommendation.update({
          where: { id },
          data: { score },
        });

        // Update Activity metadata score field
        const activity = await tx.activity.findFirst({
          where: { recommendationId: id, deletedAt: null },
        });
        if (activity && activity.metadata) {
          await tx.activity.update({
            where: { id: activity.id },
            data: {
              metadata: { ...(activity.metadata as object), score },
            },
          });
        }

        return rec;
      });

      return updatedRecommendation;
    } catch (error) {
      throw new GraphQLError(`Failed to update recommendation: ${error}`);
    }
  },

  deleteRecommendation: async (_, { id }, { user, prisma }) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    try {
      // Delete recommendation, soft-delete activity, and update count in a transaction
      await prisma.$transaction(async tx => {
        const recommendation = await tx.recommendation.findFirst({
          where: {
            id,
            userId: user.id,
          },
        });

        if (!recommendation) {
          throw new GraphQLError('Recommendation not found or access denied');
        }

        // Soft-delete the Activity first (before deleting recommendation due to FK)
        await tx.activity.updateMany({
          where: { recommendationId: id, deletedAt: null },
          data: { deletedAt: new Date() },
        });

        // Delete the recommendation
        await tx.recommendation.delete({
          where: { id },
        });

        // Count update handled automatically by DB trigger (recommendations_count_trigger)
      });

      return true;
    } catch (error) {
      throw new GraphQLError(`Failed to delete recommendation: ${error}`);
    }
  },

  // Social features mutations (placeholders)
  followUser: async (_, { userId }, { user, prisma }) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    if (user.id === userId) {
      throw new GraphQLError('Cannot follow yourself');
    }

    try {
      // Create the follow relationship, activity record, and update counts in a transaction
      const userFollow = await prisma.$transaction(async tx => {
        // Create the follow relationship
        const follow = await tx.userFollow.create({
          data: {
            followerId: user.id,
            followedId: userId,
          },
        });

        // Create Activity record for the follow
        const { createFollowActivity } = await import('@/lib/activities');
        await createFollowActivity({
          db: tx,
          userId: user.id,
          targetUserId: userId,
          followCreatedAt: follow.createdAt,
        });

        // Count updates handled automatically by DB triggers (user_follow_count_trigger)

        return follow;
      });

      return userFollow;
    } catch (error) {
      throw new GraphQLError(`Failed to follow user: ${error}`);
    }
  },

  unfollowUser: async (_, { userId }, { user, prisma }) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    try {
      // Delete the follow relationship, soft-delete activity, and update counts in a transaction
      await prisma.$transaction(async tx => {
        // Delete the follow relationship
        const result = await tx.userFollow.deleteMany({
          where: {
            followerId: user.id,
            followedId: userId,
          },
        });

        // Only process if a follow relationship was actually deleted
        if (result.count > 0) {
          // Soft-delete the follow activity
          await tx.activity.updateMany({
            where: {
              userId: user.id,
              targetUserId: userId,
              type: 'follow',
              deletedAt: null,
            },
            data: { deletedAt: new Date() },
          });

          // Count updates handled automatically by DB triggers (user_follow_count_trigger)
        }
      });

      return true;
    } catch (error) {
      throw new GraphQLError(`Failed to unfollow user: ${error}`);
    }
  },

  dismissUserSuggestion: async (_, { userId }, { user, prisma }) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    try {
      // Stub implementation - returns true
      // In the future, could track dismissed suggestions
      return true;
    } catch (error) {
      throw new GraphQLError(`Failed to dismiss user suggestion: ${error}`);
    }
  },

  // Profile management mutations (placeholders)
  updateProfile: async (_, { username, bio }, { user, prisma }) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          username,
          bio,
          profileUpdatedAt: new Date(),
        },
      });
      return updatedUser;
    } catch (error) {
      throw new GraphQLError(`Failed to update profile: ${error}`);
    }
  },

  updateOnboardingStatus: async (_, { hasCompletedTour }, { user, prisma }) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          profileUpdatedAt: hasCompletedTour ? new Date() : null,
        },
      });

      return {
        isNewUser: !updatedUser.profileUpdatedAt,
        profileUpdatedAt: updatedUser.profileUpdatedAt,
        hasCompletedTour: !!updatedUser.profileUpdatedAt,
      };
    } catch (error) {
      throw new GraphQLError(`Failed to update onboarding status: ${error}`);
    }
  },

  resetOnboardingStatus: async (_, __, { user, prisma }) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          profileUpdatedAt: null,
        },
      });

      return {
        isNewUser: true,
        profileUpdatedAt: null,
        hasCompletedTour: false,
      };
    } catch (error) {
      throw new GraphQLError(`Failed to reset onboarding status: ${error}`);
    }
  },

  // Music Database Enrichment mutations
  triggerAlbumEnrichment: async (
    _: any,
    { id, priority = 'MEDIUM', force = false }: any,
    { prisma }: any
  ) => {
    try {
      const album = await prisma.album.findUnique({
        where: { id },
      });

      if (!album) {
        throw new GraphQLError('Album not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // If force=true, reset status to PENDING first so enrichment check passes
      if (force) {
        await prisma.album.update({
          where: { id },
          data: {
            enrichmentStatus: 'PENDING',
            lastEnriched: null,
          },
        });
      }

      const queue = getMusicBrainzQueue();
      const jobData: CheckAlbumEnrichmentJobData = {
        albumId: id,
        source: 'admin_manual',
        priority: priority.toLowerCase() as 'high' | 'normal' | 'low',
        force,
        requestId: `admin_enrichment_${Date.now()}`,
      };

      const job = await queue.addJob(
        JOB_TYPES.CHECK_ALBUM_ENRICHMENT,
        jobData,
        {
          priority: priority === 'HIGH' ? 1 : priority === 'MEDIUM' ? 5 : 10,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }
      );

      // Don't set to IN_PROGRESS here - let the job do it after checking if enrichment is needed
      // Otherwise shouldEnrichAlbum will see IN_PROGRESS and skip enrichment

      return {
        success: true,
        jobId: job.id,
        message: force
          ? `Album force re-enrichment job ${job.id} queued with ${priority} priority`
          : `Album enrichment job ${job.id} queued with ${priority} priority`,
      };
    } catch (error) {
      throw new GraphQLError(`Failed to trigger album enrichment: ${error}`);
    }
  },

  triggerArtistEnrichment: async (
    _: any,
    { id, priority = 'MEDIUM', force = false }: any,
    { prisma }: any
  ) => {
    try {
      const artist = await prisma.artist.findUnique({
        where: { id },
      });

      if (!artist) {
        throw new GraphQLError('Artist not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // If force=true, reset status to PENDING first so enrichment check passes
      if (force) {
        await prisma.artist.update({
          where: { id },
          data: {
            enrichmentStatus: 'PENDING',
            lastEnriched: null,
          },
        });
      }

      const queue = getMusicBrainzQueue();
      const jobData: CheckArtistEnrichmentJobData = {
        artistId: id,
        source: 'admin_manual',
        priority: priority.toLowerCase() as 'high' | 'normal' | 'low',
        force,
        requestId: `admin_enrichment_${Date.now()}`,
      };

      const job = await queue.addJob(
        JOB_TYPES.CHECK_ARTIST_ENRICHMENT,
        jobData,
        {
          priority: priority === 'HIGH' ? 1 : priority === 'MEDIUM' ? 5 : 10,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }
      );

      // Don't set to IN_PROGRESS here - let the job do it after checking if enrichment is needed
      // Otherwise shouldEnrichArtist will see IN_PROGRESS and skip enrichment

      return {
        success: true,
        jobId: job.id,
        message: force
          ? `Artist force re-enrichment job ${job.id} queued with ${priority} priority`
          : `Artist enrichment job ${job.id} queued with ${priority} priority`,
      };
    } catch (error) {
      throw new GraphQLError(`Failed to trigger artist enrichment: ${error}`);
    }
  },

  // Preview Enrichment mutations (dry-run without persisting to album/artist)
  previewAlbumEnrichment: async (
    _: unknown,
    { id }: { id: string },
    { user }
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
    try {
      const result = await previewAlbumEnrichment(id);
      return result;
    } catch (error) {
      throw new GraphQLError(`Failed to preview album enrichment: ${error}`);
    }
  },

  previewArtistEnrichment: async (
    _: unknown,
    { id }: { id: string },
    { user }
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
    try {
      const result = await previewArtistEnrichment(id);
      return result;
    } catch (error) {
      throw new GraphQLError(`Failed to preview artist enrichment: ${error}`);
    }
  },

  batchEnrichment: async (
    _: any,
    { ids, type, priority = 'MEDIUM' }: any,
    { prisma }: any
  ) => {
    try {
      const queue = getMusicBrainzQueue();
      const jobs = [];

      for (const id of ids) {
        if (type === 'ALBUM') {
          const album = await prisma.album.findUnique({
            where: { id },
          });

          if (album) {
            const jobData: CheckAlbumEnrichmentJobData = {
              albumId: id,
              source: 'admin_batch',
              priority: priority.toLowerCase() as 'high' | 'normal' | 'low',
              requestId: `admin_batch_${Date.now()}`,
            };

            const job = await queue.addJob(
              JOB_TYPES.CHECK_ALBUM_ENRICHMENT,
              jobData,
              {
                priority:
                  priority === 'HIGH' ? 1 : priority === 'MEDIUM' ? 5 : 10,
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
              }
            );

            // Don't set to IN_PROGRESS here - let the job do it after checking if enrichment is needed

            jobs.push(job);
          }
        } else if (type === 'ARTIST') {
          const artist = await prisma.artist.findUnique({
            where: { id },
          });

          if (artist) {
            const jobData: CheckArtistEnrichmentJobData = {
              artistId: id,
              source: 'admin_batch',
              priority: priority.toLowerCase() as 'high' | 'normal' | 'low',
              requestId: `admin_batch_${Date.now()}`,
            };

            const job = await queue.addJob(
              JOB_TYPES.CHECK_ARTIST_ENRICHMENT,
              jobData,
              {
                priority:
                  priority === 'HIGH' ? 1 : priority === 'MEDIUM' ? 5 : 10,
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
              }
            );

            // Don't set to IN_PROGRESS here - let the job do it after checking if enrichment is needed

            jobs.push(job);
          }
        }
      }

      return {
        success: true,
        jobsQueued: jobs.length,
        message: `Queued ${jobs.length} ${type.toLowerCase()} enrichment jobs`,
      };
    } catch (error) {
      throw new GraphQLError(`Failed to trigger batch enrichment: ${error}`);
    }
  },

  // User Settings mutations
  updateDashboardLayout: async (_, { layout }, context) => {
    console.log('=== updateDashboardLayout mutation called ===');
    console.log('Full context:', context);
    console.log('Context keys:', Object.keys(context));
    console.log('Context user:', context.user);
    console.log('Context prisma:', context.prisma);
    console.log('Layout received:', layout);

    const { user, prisma } = context;

    if (!user) {
      console.error('No user in context!');
      throw new GraphQLError('Authentication required');
    }
    if (!prisma) {
      console.error('No prisma client in context!');
      throw new GraphQLError('Database connection error');
    }

    try {
      console.log(`Upserting settings for user ${user.id}`);
      const settings = await prisma.userSettings.upsert({
        where: { userId: user.id },
        update: {
          dashboardLayout: layout,
          updatedAt: new Date(),
        },
        create: {
          userId: user.id,
          dashboardLayout: layout,
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

      console.log(`Updated dashboard layout for user ${user.id}`);
      return settings;
    } catch (error) {
      console.error('Failed to update dashboard layout:', error);
      throw new GraphQLError(`Failed to update dashboard layout: ${error}`);
    }
  },

  updateUserSettings: async (_, args, context) => {
    const { user, prisma } = context;

    if (!user) {
      throw new GraphQLError('Authentication required');
    }
    if (!prisma) {
      throw new GraphQLError('Database connection error');
    }

    const {
      theme,
      language,
      profileVisibility,
      showRecentActivity,
      showCollections,
      showListenLaterInFeed,
      showCollectionAddsInFeed,
      showOnboardingTour,
    } = args;

    try {
      const updateData: Record<string, string | boolean> = {};
      if (theme !== undefined) updateData.theme = theme;
      if (language !== undefined) updateData.language = language;
      if (profileVisibility !== undefined)
        updateData.profileVisibility = profileVisibility;
      if (showRecentActivity !== undefined)
        updateData.showRecentActivity = showRecentActivity;
      if (showCollections !== undefined)
        updateData.showCollections = showCollections;
      if (showListenLaterInFeed !== undefined)
        updateData.showListenLaterInFeed = showListenLaterInFeed;
      if (showCollectionAddsInFeed !== undefined)
        updateData.showCollectionAddsInFeed = showCollectionAddsInFeed;
      if (showOnboardingTour !== undefined)
        updateData.showOnboardingTour = showOnboardingTour;

      const settings = await prisma.userSettings.upsert({
        where: { userId: user.id },
        update: updateData,
        create: {
          userId: user.id,
          theme: theme || 'dark',
          language: language || 'en',
          profileVisibility: profileVisibility || 'public',
          showRecentActivity: showRecentActivity ?? true,
          showCollections: showCollections ?? true,
          showListenLaterInFeed: showListenLaterInFeed ?? true,
          showCollectionAddsInFeed: showCollectionAddsInFeed ?? true,
          showOnboardingTour: showOnboardingTour ?? true,
          emailNotifications: true,
          recommendationAlerts: true,
          followAlerts: true,
          defaultCollectionView: 'grid',
          autoplayPreviews: false,
        },
      });

      return settings;
    } catch (error) {
      throw new GraphQLError(`Failed to update settings: ${error}`);
    }
  },

  // Admin mutations
  updateUserRole: async (
    _: unknown,
    { userId, role }: { userId: string; role: string },
    context: any
  ) => {
    const { user, prisma } = context;

    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    if (!prisma) {
      throw new GraphQLError('Database connection error');
    }

    // Check if user is admin or owner
    if (user.role !== 'ADMIN' && user.role !== 'OWNER') {
      throw new GraphQLError('Unauthorized: Admin access required');
    }

    try {
      // Prevent non-owners from changing owner roles
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!targetUser) {
        throw new GraphQLError('User not found');
      }

      // Only owners can assign/remove OWNER role
      if (
        (role === 'OWNER' || targetUser.role === 'OWNER') &&
        user.role !== 'OWNER'
      ) {
        throw new GraphQLError(
          'Unauthorized: Only owners can manage owner roles'
        );
      }

      // Prevent users from changing their own role
      if (userId === user.id) {
        throw new GraphQLError('Cannot change your own role');
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role },
      });

      return {
        success: true,
        user: updatedUser,
        message: `User role updated to ${role}`,
      };
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw new GraphQLError(`Failed to update user role: ${error}`);
    }
  },

  adminUpdateUserShowTour: async (
    _: unknown,
    {
      userId,
      showOnboardingTour,
    }: { userId: string; showOnboardingTour: boolean },
    context: any
  ) => {
    const { user, prisma } = context;

    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    if (!prisma) {
      throw new GraphQLError('Database connection error');
    }

    // Check if user is admin or owner
    if (!isAdmin(user.role)) {
      throw new GraphQLError('Unauthorized: Admin access required');
    }

    try {
      // Check if target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!targetUser) {
        throw new GraphQLError('User not found');
      }

      // Upsert user settings with the new showOnboardingTour value
      const settings = await prisma.userSettings.upsert({
        where: { userId },
        update: { showOnboardingTour },
        create: {
          userId,
          showOnboardingTour,
          theme: 'dark',
          language: 'en',
          profileVisibility: 'public',
          showRecentActivity: true,
          showCollections: true,
          showListenLaterInFeed: true,
          showCollectionAddsInFeed: true,
          emailNotifications: true,
          recommendationAlerts: true,
          followAlerts: true,
          defaultCollectionView: 'grid',
          autoplayPreviews: false,
        },
      });

      console.log(
        `Admin ${user.id} updated showOnboardingTour for user ${userId} to ${showOnboardingTour}`
      );

      return {
        success: true,
        userId,
        showOnboardingTour: settings.showOnboardingTour,
        message: `showOnboardingTour updated to ${showOnboardingTour}`,
      };
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw new GraphQLError(`Failed to update user settings: ${error}`);
    }
  },

  deleteAlbum: async (_: unknown, { id }: { id: string }, context: any) => {
    const { user, prisma } = context;

    // Check authentication
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Check authorization - admin only
    if (!isAdmin(user.role)) {
      throw new GraphQLError('Unauthorized: Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    try {
      // Check if album exists
      const album = await prisma.album.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              collectionAlbums: true,
              basisRecommendations: true,
              targetRecommendations: true,
              tracks: true,
            },
          },
        },
      });

      if (!album) {
        throw new GraphQLError('Album not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Use Prisma transaction to handle cascade deletion
      await prisma.$transaction(async tx => {
        // Delete related records in order
        // 1. CollectionAlbum entries
        await tx.collectionAlbum.deleteMany({
          where: { albumId: id },
        });

        // 2. Recommendations (both as basis and target)
        await tx.recommendation.deleteMany({
          where: {
            OR: [{ basisAlbumId: id }, { recommendedAlbumId: id }],
          },
        });

        // 3. Track artists (via tracks)
        const tracks = await tx.track.findMany({
          where: { albumId: id },
          select: { id: true },
        });
        const trackIds = tracks.map(t => t.id);

        if (trackIds.length > 0) {
          await tx.trackArtist.deleteMany({
            where: { trackId: { in: trackIds } },
          });
        }

        // 4. Tracks
        await tx.track.deleteMany({
          where: { albumId: id },
        });

        // 5. AlbumArtist entries
        await tx.albumArtist.deleteMany({
          where: { albumId: id },
        });

        // 6. LlamaLog entries
        await tx.llamaLog.deleteMany({
          where: { albumId: id },
        });

        // 7. Finally, delete the album itself
        await tx.album.delete({
          where: { id },
        });
      });

      return {
        success: true,
        message: `Album deleted successfully`,
        deletedId: id,
      };
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      console.error('Error deleting album:', error);
      throw new GraphQLError(`Failed to delete album: ${error}`, {
        extensions: { code: 'INTERNAL_ERROR' },
      });
    }
  },

  // Reset enrichment status mutations
  resetAlbumEnrichment: async (_, { id }, { prisma }) => {
    try {
      const album = await prisma.album.update({
        where: { id },
        data: {
          enrichmentStatus: null,
          lastEnriched: null,
        },
      });

      return album;
    } catch (error) {
      throw new GraphQLError(`Failed to reset album enrichment: ${error}`);
    }
  },

  resetArtistEnrichment: async (_, { id }, { prisma }) => {
    try {
      const artist = await prisma.artist.update({
        where: { id },
        data: {
          enrichmentStatus: null,
          lastEnriched: null,
        },
      });

      return artist;
    } catch (error) {
      throw new GraphQLError(`Failed to reset artist enrichment: ${error}`);
    }
  },

  // Update data quality mutations
  updateAlbumDataQuality: async (_, { id, dataQuality }, { prisma, user }) => {
    try {
      // Get the old data quality before updating
      const oldAlbum = await prisma.album.findUnique({
        where: { id },
        select: { dataQuality: true },
      });

      const album = await prisma.album.update({
        where: { id },
        data: {
          dataQuality,
        },
      });

      // Log the manual data quality update
      await logActivity({
        prisma,
        entityType: 'ALBUM',
        entityId: id,
        operation: OPERATIONS.MANUAL_DATA_QUALITY_UPDATE,
        sources: [SOURCES.USER],
        fieldsChanged: ['dataQuality'],
        userId: user?.id,
        dataQualityBefore: oldAlbum?.dataQuality ?? null,
        dataQualityAfter: dataQuality,
      });

      return album;
    } catch (error) {
      throw new GraphQLError(`Failed to update album data quality: ${error}`);
    }
  },

  updateArtistDataQuality: async (_, { id, dataQuality }, { prisma, user }) => {
    try {
      // Get the old data quality before updating
      const oldArtist = await prisma.artist.findUnique({
        where: { id },
        select: { dataQuality: true },
      });

      const artist = await prisma.artist.update({
        where: { id },
        data: {
          dataQuality,
        },
      });

      // Log the manual data quality update
      await logActivity({
        prisma,
        entityType: 'ARTIST',
        entityId: id,
        operation: OPERATIONS.MANUAL_DATA_QUALITY_UPDATE,
        sources: [SOURCES.USER],
        fieldsChanged: ['dataQuality'],
        userId: user?.id,
        dataQualityBefore: oldArtist?.dataQuality ?? null,
        dataQualityAfter: dataQuality,
      });

      return artist;
    } catch (error) {
      throw new GraphQLError(`Failed to update artist data quality: ${error}`);
    }
  },

  // ============================================================================
  // Correction System Mutations (Admin Only)
  // ============================================================================

  correctionApply: async (_, { input }, { user, prisma }) => {
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
        releaseGroupMbid,
        selections,
        expectedUpdatedAt,
        source,
      } = input;
      const normalizedSource = (source?.toLowerCase() ?? 'musicbrainz') as
        | 'musicbrainz'
        | 'discogs';

      // Get album with tracks for preview generation
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
        return {
          success: false,
          code: 'ALBUM_NOT_FOUND',
          message: 'Album not found: ' + albumId,
        };
      }

      // Fetch release group directly by MBID (no need to re-search)
      // Fetch release data based on source
      let scoredResult;
      try {
        if (normalizedSource === 'discogs') {
          // Fetch Discogs master and map to CorrectionSearchResult
          const discogsService = getQueuedDiscogsService();
          const master = await discogsService.getMaster(
            releaseGroupMbid,
            PRIORITY_TIERS.ADMIN
          );
          const baseResult = mapMasterToCorrectionSearchResult(master);
          // Wrap with default scoring (same as correctionPreview resolver)
          scoredResult = {
            ...baseResult,
            normalizedScore: 1.0,
            displayScore: 100,
            isLowConfidence: false,
            scoringStrategy: 'normalized' as const,
            breakdown: {
              titleScore: 100,
              artistScore: 100,
              yearScore: 100,
              mbScore: 0,
              confidenceTier: 'high' as const,
            },
          };
        } else {
          // MusicBrainz path (existing)
          const searchService = getCorrectionSearchService();
          scoredResult = await searchService.getByMbid(releaseGroupMbid);
        }
      } catch (error) {
        return {
          success: false,
          code: 'NOT_FOUND',
          message: `Release not found: ${releaseGroupMbid}`,
        };
      }

      // Generate preview (needed by apply service)
      const previewService = getCorrectionPreviewService();
      const preview = await previewService.generatePreview(
        albumId,
        scoredResult,
        releaseGroupMbid,
        normalizedSource
      );

      // Transform GraphQL selections to service FieldSelections format
      const serviceSelections = transformSelectionsInput(selections);

      // Apply correction
      const result = await applyCorrectionService.applyCorrection({
        albumId,
        preview,
        selections: serviceSelections,
        expectedUpdatedAt: new Date(expectedUpdatedAt),
        adminUserId: user.id,
        source: normalizedSource,
      });

      if (result.success) {
        return {
          success: true,
          album: result.album,
          changes: {
            metadata: result.changes.metadata,
            artists: {
              added: result.changes.artists.added,
              removed: result.changes.artists.removed,
            },
            tracks: {
              added: result.changes.tracks.added,
              modified: result.changes.tracks.modified,
              removed: result.changes.tracks.removed,
            },
            externalIds: result.changes.externalIds,
            coverArt: result.changes.coverArt,
            dataQualityBefore: result.changes.dataQualityBefore,
            dataQualityAfter: result.changes.dataQualityAfter,
          },
        };
      } else {
        // Map error codes
        const errorCode =
          result.error?.code === 'STALE_DATA'
            ? 'STALE_DATA'
            : result.error?.code;
        return {
          success: false,
          code: errorCode,
          message: result.error?.message,
          context: null,
        };
      }
    } catch (error) {
      if (error instanceof StaleDataError) {
        return {
          success: false,
          code: 'STALE_DATA',
          message: error.message,
        };
      }
      if (error instanceof GraphQLError) throw error;
      console.error('Error in correctionApply:', error);
      throw new GraphQLError(
        'Correction apply failed: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
        { extensions: { code: 'INTERNAL_SERVER_ERROR' } }
      );
    }
  },

  manualCorrectionApply: async (_, { input }, { user, prisma }) => {
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
      // Fetch album with current artists for optimistic lock check
      const album = await prisma.album.findUnique({
        where: { id: input.albumId },
        include: {
          artists: {
            include: { artist: true },
            orderBy: { position: 'asc' },
          },
        },
      });

      if (!album) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Album not found',
          },
        };
      }

      // Optimistic lock check
      if (album.updatedAt.toISOString() !== input.expectedUpdatedAt) {
        return {
          success: false,
          error: {
            code: 'STALE_DATA',
            message:
              'Album was modified by another user. Please refresh and try again.',
          },
        };
      }

      // Parse release date if provided (YYYY, YYYY-MM, or YYYY-MM-DD)
      let releaseDate: Date | null = null;
      if (input.releaseDate) {
        try {
          // For Date field, we need to parse the partial date string
          // Database stores it as DATE, so we need a Date object
          const dateParts = input.releaseDate.split('-');
          if (dateParts.length === 1) {
            // YYYY -> January 1st of that year
            releaseDate = new Date(`${dateParts[0]}-01-01`);
          } else if (dateParts.length === 2) {
            // YYYY-MM -> 1st of that month
            releaseDate = new Date(`${dateParts[0]}-${dateParts[1]}-01`);
          } else {
            // YYYY-MM-DD -> exact date
            releaseDate = new Date(input.releaseDate);
          }
        } catch (err) {
          return {
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: `Invalid release date format: ${input.releaseDate}`,
            },
          };
        }
      }

      // Use transaction to ensure atomicity
      const updated = await prisma.$transaction(async tx => {
        // 1. Update album basic fields
        const updatedAlbum = await tx.album.update({
          where: { id: input.albumId },
          data: {
            title: input.title,
            releaseDate,
            releaseType: input.releaseType,
            musicbrainzId: input.musicbrainzId,
            spotifyId: input.spotifyId,
            discogsId: input.discogsId,
            dataQuality: 'HIGH', // Manual admin corrections are HIGH quality
          },
        });

        // 2. Update artists via AlbumArtist join table
        // Pattern: delete all existing associations, then create new ones

        // Delete all existing artist associations for this album
        await tx.albumArtist.deleteMany({
          where: { albumId: input.albumId },
        });

        // Upsert each artist and create association using shared helper
        const { findOrCreateArtist: findOrCreateArtistFn } = await import(
          '@/lib/artists'
        );
        const newlyCreatedArtistIds: string[] = [];

        for (let i = 0; i < input.artists.length; i++) {
          const artistName = input.artists[i];

          const { artist, created } = await findOrCreateArtistFn({
            db: tx,
            identity: { name: artistName },
            fields: {
              source: 'USER_SUBMITTED' as const, // Fix: was 'MANUAL' (invalid enum)
              ...getInitialQuality(),
            },
            enrichment: 'none',
            insideTransaction: true,
            caller: 'manualCorrectionApply',
          });

          if (created) {
            newlyCreatedArtistIds.push(artist.id);
          }

          // Create album-artist association
          await tx.albumArtist.create({
            data: {
              albumId: input.albumId,
              artistId: artist.id,
              role: 'primary',
              position: i,
            },
          });
        }

        // Return album with updated artists
        return tx.album.findUnique({
          where: { id: input.albumId },
          include: {
            artists: {
              include: { artist: true },
              orderBy: { position: 'asc' },
            },
          },
        });
      });

      // Log enrichment with source: 'manual_correction'
      await prisma.llamaLog.create({
        data: {
          entityType: 'ALBUM',
          entityId: input.albumId,
          operation: 'manual_correction',
          sources: ['manual'],
          status: 'SUCCESS',
          fieldsEnriched: [
            'title',
            'artists',
            input.releaseDate ? 'releaseDate' : null,
            input.releaseType ? 'releaseType' : null,
            input.musicbrainzId ? 'musicbrainzId' : null,
            input.spotifyId ? 'spotifyId' : null,
            input.discogsId ? 'discogsId' : null,
          ].filter((f): f is string => f !== null),
          dataQualityBefore: album.dataQuality,
          dataQualityAfter: 'HIGH',
          retryCount: 0,
          apiCallCount: 0,
          userId: user.id,
          triggeredBy: 'admin_manual_edit',
        },
      });

      // Fix: Queue enrichment for newly created artists (was missing entirely)
      if (newlyCreatedArtistIds.length > 0) {
        setImmediate(async () => {
          try {
            const queue = getMusicBrainzQueue();
            for (const artistId of newlyCreatedArtistIds) {
              const checkData: CheckArtistEnrichmentJobData = {
                artistId,
                source: 'manual',
                priority: 'medium',
                requestId: `correction-artist-${artistId}`,
              };
              await queue.addJob(JOB_TYPES.CHECK_ARTIST_ENRICHMENT, checkData, {
                priority: PRIORITY_TIERS.ENRICHMENT,
                attempts: 3,
              });
            }
            console.log(
              chalk.magenta(
                `[ARTIST-HELPER] Queued enrichment for ${newlyCreatedArtistIds.length} new artist(s) from manualCorrectionApply`
              )
            );
          } catch (err) {
            console.warn(
              'Failed to queue artist enrichment after manual correction:',
              err
            );
          }
        });
      }

      return {
        success: true,
        album: {
          ...updated,
          artists: updated?.artists.map(aa => aa.artist) ?? [],
        },
      };
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      console.error('Error in manualCorrectionApply:', error);
      throw new GraphQLError(
        'Manual correction failed: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
        { extensions: { code: 'INTERNAL_SERVER_ERROR' } }
      );
    }
  },

  // ============================================================================
  // Artist Correction System Mutations (Admin Only)
  // ============================================================================

  artistCorrectionApply: async (_, { input }, { user }) => {
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
      // Import services
      const { getArtistCorrectionPreviewService } = await import(
        '@/lib/correction/artist/preview/preview-service'
      );
      const { getArtistCorrectionApplyService, StaleDataError } = await import(
        '@/lib/correction/artist/apply'
      );

      // Convert GraphQL enum to lowercase string for service layer
      const sourceStr =
        input.source === GqlCorrectionSource.Discogs
          ? 'discogs'
          : 'musicbrainz';

      // Generate preview first (same pattern as album correction)
      const previewService = getArtistCorrectionPreviewService();
      const preview = await previewService.generatePreview(
        input.artistId,
        input.sourceArtistId,
        sourceStr
      );

      // Apply correction
      const applyService = getArtistCorrectionApplyService();
      const result = await applyService.applyCorrection({
        artistId: input.artistId,
        preview,
        selections: {
          metadata: {
            name: input.selections.metadata?.name ?? false,
            disambiguation: input.selections.metadata?.disambiguation ?? false,
            countryCode: input.selections.metadata?.countryCode ?? false,
            artistType: input.selections.metadata?.artistType ?? false,
            area: input.selections.metadata?.area ?? false,
            beginDate: input.selections.metadata?.beginDate ?? false,
            endDate: input.selections.metadata?.endDate ?? false,
            gender: input.selections.metadata?.gender ?? false,
          },
          externalIds: {
            musicbrainzId: input.selections.externalIds?.musicbrainzId ?? false,
            discogsId: input.selections.externalIds?.discogsId ?? false,
            ipi: input.selections.externalIds?.ipi ?? false,
            isni: input.selections.externalIds?.isni ?? false,
          },
        },
        expectedUpdatedAt: new Date(input.expectedUpdatedAt),
        adminUserId: user.id,
      });

      if (result.success) {
        return {
          success: true,
          artist: result.artist,
          changes: result.changes,
          affectedAlbumCount: result.affectedAlbumCount,
          code: null,
          message: null,
        };
      } else {
        // Map error codes
        const errorCode =
          result.error.code === 'STALE_DATA'
            ? 'STALE_DATA'
            : result.error.code === 'ARTIST_NOT_FOUND'
              ? 'ALBUM_NOT_FOUND' // Reuse existing error code enum
              : 'TRANSACTION_FAILED';

        return {
          success: false,
          artist: null,
          changes: null,
          affectedAlbumCount: null,
          code: errorCode,
          message: result.error.message,
        };
      }
    } catch (error) {
      // Handle StaleDataError separately
      const { StaleDataError } = await import('@/lib/correction/artist/apply');
      if (error instanceof StaleDataError) {
        return {
          success: false,
          artist: null,
          changes: null,
          affectedAlbumCount: null,
          code: 'STALE_DATA',
          message: error.message,
        };
      }

      if (error instanceof GraphQLError) throw error;
      console.error('Error in artistCorrectionApply:', error);
      throw new GraphQLError(
        'Artist correction apply failed: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
        { extensions: { code: 'INTERNAL_SERVER_ERROR' } }
      );
    }
  },
  // Game Pool Management
  updateAlbumGameStatus: async (_, { input }, { prisma, user }) => {
    try {
      // Check admin permission
      if (!user?.id) {
        return {
          success: false,
          album: null,
          error: 'Authentication required',
        };
      }

      const { UserRole } = await import('@prisma/client');
      if (!isAdmin(user.role as UserRole)) {
        return {
          success: false,
          album: null,
          error: 'Admin permission required',
        };
      }

      // Fetch album with artist count
      const album = await prisma.album.findUnique({
        where: { id: input.albumId },
        include: {
          _count: {
            select: { artists: true },
          },
        },
      });

      if (!album) {
        return {
          success: false,
          album: null,
          error: 'Album not found',
        };
      }

      // Validate eligibility if status is ELIGIBLE
      if (input.gameStatus === 'ELIGIBLE') {
        const { validateEligibility } = await import(
          '@/lib/game-pool/eligibility'
        );
        const eligibility = validateEligibility(
          album,
          album._count.artists > 0
        );

        if (!eligibility.eligible) {
          return {
            success: false,
            album: null,
            error: eligibility.reason || 'Album not eligible',
          };
        }
      }

      // Update status
      const updatedAlbum = await prisma.album.update({
        where: { id: input.albumId },
        data: {
          gameStatus: input.gameStatus,
        },
      });

      // Log to LlamaLog with USER_ACTION category
      const llamaLogger = createLlamaLogger(prisma);
      await llamaLogger.logEnrichment({
        entityType: 'ALBUM',
        entityId: updatedAlbum.id,
        albumId: updatedAlbum.id,
        operation: 'game-pool:status-update',
        category: 'USER_ACTION',
        sources: ['ADMIN'],
        status: 'SUCCESS',
        reason: input.reason || `Status changed to ${input.gameStatus}`,
        fieldsEnriched: ['gameStatus'],
        userId: user?.id,
      });

      return {
        success: true,
        album: updatedAlbum,
        error: null,
      };
    } catch (error) {
      graphqlLogger.error('Failed to update album game status:', {
        error,
        input,
      });
      return {
        success: false,
        album: null,
        error: `Failed to update game status: ${error}`,
      };
    }
  },
  // Daily Challenge mutations (Admin)
  addCuratedChallenge: async (
    _,
    { albumId, pinnedDate }: { albumId: string; pinnedDate?: Date | string },
    { prisma, user }
  ) => {
    try {
      // Admin check
      if (!user?.role || !['ADMIN', 'OWNER'].includes(user.role)) {
        throw new GraphQLError('Admin access required');
      }

      const { toUTCMidnight } = await import(
        '@/lib/daily-challenge/date-utils'
      );

      // Verify album exists and is eligible
      const album = await prisma.album.findUnique({
        where: { id: albumId },
        select: { id: true, gameStatus: true, cloudflareImageId: true },
      });

      if (!album) {
        throw new GraphQLError('Album not found');
      }

      if (album.gameStatus !== 'ELIGIBLE') {
        throw new GraphQLError(
          'Album must be marked as ELIGIBLE for game pool before adding to curated list'
        );
      }

      if (!album.cloudflareImageId) {
        throw new GraphQLError(
          'Album must have cover art (cloudflareImageId) to be added to curated list'
        );
      }

      // Check if album already in curated list
      const existing = await prisma.curatedChallenge.findFirst({
        where: { albumId },
      });

      if (existing) {
        throw new GraphQLError(
          'Album is already in the curated challenge list'
        );
      }

      // Get next sequence number
      const maxSeq = await prisma.curatedChallenge.aggregate({
        _max: { sequence: true },
      });
      const nextSequence = (maxSeq._max.sequence ?? -1) + 1;

      // Create curated challenge entry
      const pinnedDateValue = pinnedDate
        ? toUTCMidnight(new Date(pinnedDate))
        : null;

      const entry = await prisma.curatedChallenge.create({
        data: {
          albumId,
          sequence: nextSequence,
          pinnedDate: pinnedDateValue,
        },
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

      graphqlLogger.info('Added album to curated challenge list:', {
        albumId,
        sequence: nextSequence,
      });
      return entry;
    } catch (error) {
      graphqlLogger.error('Failed to add curated challenge:', {
        error,
        albumId,
      });
      throw new GraphQLError(`Failed to add curated challenge: ${error}`);
    }
  },

  removeCuratedChallenge: async (
    _,
    { id }: { id: string },
    { prisma, user }
  ) => {
    try {
      // Admin check
      if (!user?.role || !['ADMIN', 'OWNER'].includes(user.role)) {
        throw new GraphQLError('Admin access required');
      }

      const entry = await prisma.curatedChallenge.findUnique({
        where: { id },
      });

      if (!entry) {
        throw new GraphQLError('Curated challenge entry not found');
      }

      // Delete the entry
      await prisma.curatedChallenge.delete({
        where: { id },
      });

      // Resequence remaining entries to maintain contiguous sequence
      const remaining = await prisma.curatedChallenge.findMany({
        orderBy: { sequence: 'asc' },
        select: { id: true },
      });

      // Update sequences to be contiguous (0, 1, 2, ...)
      for (let i = 0; i < remaining.length; i++) {
        await prisma.curatedChallenge.update({
          where: { id: remaining[i].id },
          data: { sequence: i },
        });
      }

      graphqlLogger.info('Removed album from curated challenge list:', { id });
      return true;
    } catch (error) {
      graphqlLogger.error('Failed to remove curated challenge:', { error, id });
      throw new GraphQLError(`Failed to remove curated challenge: ${error}`);
    }
  },

  pinCuratedChallenge: async (
    _,
    { id, date }: { id: string; date: Date | string },
    { prisma, user }
  ) => {
    try {
      // Admin check
      if (!user?.role || !['ADMIN', 'OWNER'].includes(user.role)) {
        throw new GraphQLError('Admin access required');
      }

      const { toUTCMidnight } = await import(
        '@/lib/daily-challenge/date-utils'
      );
      const pinnedDate = toUTCMidnight(new Date(date));

      // Check if another entry is pinned to this date
      const existingPin = await prisma.curatedChallenge.findFirst({
        where: {
          pinnedDate,
          id: { not: id },
        },
      });

      if (existingPin) {
        throw new GraphQLError('Another album is already pinned to this date');
      }

      const entry = await prisma.curatedChallenge.update({
        where: { id },
        data: { pinnedDate },
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

      graphqlLogger.info('Pinned curated challenge to date:', {
        id,
        date: pinnedDate,
      });
      return entry;
    } catch (error) {
      graphqlLogger.error('Failed to pin curated challenge:', {
        error,
        id,
        date,
      });
      throw new GraphQLError(`Failed to pin curated challenge: ${error}`);
    }
  },

  unpinCuratedChallenge: async (
    _,
    { id }: { id: string },
    { prisma, user }
  ) => {
    try {
      // Admin check
      if (!user?.role || !['ADMIN', 'OWNER'].includes(user.role)) {
        throw new GraphQLError('Admin access required');
      }

      const entry = await prisma.curatedChallenge.update({
        where: { id },
        data: { pinnedDate: null },
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

      graphqlLogger.info('Unpinned curated challenge:', { id });
      return entry;
    } catch (error) {
      graphqlLogger.error('Failed to unpin curated challenge:', { error, id });
      throw new GraphQLError(`Failed to unpin curated challenge: ${error}`);
    }
  },

  // ========================================================================
  // Uncover Game Mutations
  // ========================================================================

  /**
   * Start a new session for today's challenge.
   * Returns existing session if already started (no replay).
   */
  startUncoverSession: async (_, {}, { prisma, user }) => {
    try {
      // AUTH-01: Authentication required
      if (!user?.id) {
        throw new GraphQLError('Authentication required to play');
      }

      // Dynamic import to avoid circular dependencies
      const { startSession } = await import('@/lib/uncover/game-service');

      const result = await startSession(user.id, prisma);

      graphqlLogger.info('Started/retrieved uncover session:', {
        sessionId: result.session.id,
        challengeId: result.challenge.id,
        isNew: result.isNew,
      });

      return {
        session: {
          id: result.session.id,
          status: result.session.status,
          attemptCount: result.session.attemptCount,
          won: result.session.won,
          startedAt: result.session.startedAt,
          completedAt: result.session.completedAt,
          guesses: result.session.guesses.map(guess => ({
            id: guess.id,
            guessNumber: guess.guessNumber,
            isSkipped: guess.guessedAlbumId === null,
            isCorrect: guess.isCorrect,
            guessedAt: guess.guessedAt,
            guessedAlbum: null, // Will be populated by field resolver
          })),
        },
        challengeId: result.challenge.id,
        imageUrl: result.challenge.album.cloudflareImageId
          ? `https://imagedelivery.net/${process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH}/${result.challenge.album.cloudflareImageId}/public`
          : '/album-placeholder.png',
        cloudflareImageId: result.challenge.album.cloudflareImageId,
      };
    } catch (error) {
      graphqlLogger.error('Failed to start uncover session:', { error });
      if (error instanceof GraphQLError) throw error;

      // Friendly user-facing message for no curated albums, but log the real error above
      if (error instanceof Error && error.name === 'NoCuratedAlbumsError') {
        throw new GraphQLError(
          "Today's challenge isn't ready yet. Check back soon!",
          {
            extensions: {
              code: 'NO_CHALLENGE_AVAILABLE',
              reason: error.message,
            },
          }
        );
      }

      throw new GraphQLError(`Failed to start session: ${error}`);
    }
  },

  /**
   * Submit a guess for the current session.
   */
  submitGuess: async (
    _,
    {
      sessionId,
      albumId,
      mode,
    }: { sessionId: string; albumId: string; mode?: string },
    { prisma, user }
  ) => {
    try {
      // AUTH-01: Authentication required
      if (!user?.id) {
        throw new GraphQLError('Authentication required to submit guess');
      }

      // Dynamic import to avoid circular dependencies
      const { submitGuess } = await import('@/lib/uncover/game-service');

      const result = await submitGuess(
        sessionId,
        albumId,
        user.id,
        prisma,
        mode || 'daily'
      );

      graphqlLogger.info('Submitted guess:', {
        sessionId,
        albumId,
        isCorrect: result.guess.isCorrect,
        gameOver: result.gameOver,
      });

      return formatGuessResult(result);
    } catch (error) {
      graphqlLogger.error('Failed to submit guess:', {
        error,
        sessionId,
        albumId,
      });
      throw error instanceof GraphQLError
        ? error
        : new GraphQLError(`Failed to submit guess: ${error}`);
    }
  },

  /**
   * Skip current guess (counts as wrong).
   */
  skipGuess: async (
    _,
    { sessionId, mode }: { sessionId: string; mode?: string },
    { prisma, user }
  ) => {
    try {
      // AUTH-01: Authentication required
      if (!user?.id) {
        throw new GraphQLError('Authentication required to skip guess');
      }

      // Dynamic import to avoid circular dependencies
      const { skipGuess } = await import('@/lib/uncover/game-service');

      const result = await skipGuess(
        sessionId,
        user.id,
        prisma,
        mode || 'daily'
      );

      graphqlLogger.info('Skipped guess:', {
        sessionId,
        gameOver: result.gameOver,
      });

      return formatGuessResult(result);
    } catch (error) {
      graphqlLogger.error('Failed to skip guess:', { error, sessionId });
      throw error instanceof GraphQLError
        ? error
        : new GraphQLError(`Failed to skip guess: ${error}`);
    }
  },

  /**
   * Start an archive session for a specific date (not today).
   */
  startArchiveSession: async (
    _,
    { date }: { date: Date | string },
    { prisma, user }
  ) => {
    try {
      // AUTH-01: Authentication required
      if (!user?.id) {
        throw new GraphQLError('Authentication required to play archive');
      }

      // Dynamic imports
      const { startArchiveSession } = await import(
        '@/lib/uncover/game-service'
      );
      const { toUTCMidnight, GAME_EPOCH } = await import(
        '@/lib/daily-challenge/date-utils'
      );

      // Parse and normalize date
      const targetDate = toUTCMidnight(new Date(date));
      const today = toUTCMidnight(new Date());

      // Validate date range: must be >= GAME_EPOCH and < today
      if (targetDate < GAME_EPOCH) {
        throw new GraphQLError('Archive date must be on or after game epoch');
      }
      if (targetDate >= today) {
        throw new GraphQLError(
          'Archive date must be in the past (not today or future)'
        );
      }

      const result = await startArchiveSession(user.id, targetDate, prisma);

      graphqlLogger.info('Started/retrieved archive session:', {
        sessionId: result.session.id,
        challengeId: result.challenge.id,
        challengeDate: targetDate.toISOString(),
        isNew: result.isNew,
      });

      return {
        session: {
          id: result.session.id,
          status: result.session.status,
          attemptCount: result.session.attemptCount,
          won: result.session.won,
          startedAt: result.session.startedAt,
          completedAt: result.session.completedAt,
          guesses: result.session.guesses.map(guess => ({
            id: guess.id,
            guessNumber: guess.guessNumber,
            isSkipped: guess.guessedAlbumId === null,
            isCorrect: guess.isCorrect,
            guessedAt: guess.guessedAt,
            guessedAlbum: null, // Will be populated by field resolver
          })),
        },
        challengeId: result.challenge.id,
        imageUrl: result.challenge.album.cloudflareImageId
          ? process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH
            ? 'https://imagedelivery.net/' +
              process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH +
              '/' +
              result.challenge.album.cloudflareImageId +
              '/public'
            : '/album-placeholder.png'
          : '/album-placeholder.png',
        cloudflareImageId: result.challenge.album.cloudflareImageId,
      };
    } catch (error) {
      graphqlLogger.error('Failed to start archive session:', {
        error,
        date,
      });
      throw error instanceof GraphQLError
        ? error
        : new GraphQLError('Failed to start archive session: ' + String(error));
    }
  },

  /**
   * Reset today's daily session (admin only).
   * Deletes session + cascaded guesses so admin can replay.
   */
  resetDailySession: async (_, {}, { prisma, user }) => {
    try {
      if (!user?.id) {
        throw new GraphQLError('Authentication required');
      }

      if (!user.role || !['ADMIN', 'OWNER'].includes(user.role)) {
        throw new GraphQLError('Admin access required');
      }

      const { getOrCreateDailyChallenge } = await import(
        '@/lib/daily-challenge/challenge-service'
      );

      const challenge = await getOrCreateDailyChallenge();

      const existing = await prisma.uncoverSession.findUnique({
        where: {
          challengeId_userId: {
            challengeId: challenge.id,
            userId: user.id,
          },
        },
      });

      if (!existing) {
        return true; // Nothing to reset
      }

      // Delete guesses first (cascade may not be set up in Prisma)
      await prisma.uncoverGuess.deleteMany({
        where: { sessionId: existing.id },
      });

      // Delete session
      await prisma.uncoverSession.delete({
        where: { id: existing.id },
      });

      // Roll back challenge counters if session was completed
      if (existing.status === 'WON' || existing.status === 'LOST') {
        const decrements: Record<string, { decrement: number }> = {
          totalPlays: { decrement: 1 },
        };
        if (existing.won) {
          decrements.totalWins = { decrement: 1 };
        }
        await prisma.uncoverChallenge.update({
          where: { id: challenge.id },
          data: decrements,
        });
      }

      // Nuke player stats row — it'll rebuild on next completed game
      await prisma.uncoverPlayerStats.deleteMany({
        where: { userId: user.id },
      });

      graphqlLogger.info('Admin reset daily session:', {
        userId: user.id,
        challengeId: challenge.id,
        sessionId: existing.id,
      });

      return true;
    } catch (error) {
      graphqlLogger.error('Failed to reset daily session:', { error });
      throw error instanceof GraphQLError
        ? error
        : new GraphQLError('Failed to reset daily session: ' + String(error));
    }
  },

  // =========================================================================
  // User Deletion (Owner only)
  // =========================================================================

  softDeleteUser: async (
    _: unknown,
    { userId }: { userId: string },
    context: any
  ) => {
    const targetUser = await requireOwnerNotSelf(context, userId);
    const { prisma } = context;

    if (targetUser.deletedAt) {
      throw new GraphQLError('User is already soft-deleted', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          deletedBy: context.user.id,
        },
      });

      console.log(
        `[ADMIN] Owner ${context.user.id} soft-deleted user ${userId} (${targetUser.username || targetUser.email})`
      );

      return {
        success: true,
        message: `User ${targetUser.username || targetUser.email || userId} has been soft-deleted`,
        deletedId: userId,
      };
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      console.error('Error soft-deleting user:', error);
      throw new GraphQLError(`Failed to soft-delete user: ${error}`, {
        extensions: { code: 'INTERNAL_ERROR' },
      });
    }
  },

  hardDeleteUser: async (
    _: unknown,
    { userId }: { userId: string },
    context: any
  ) => {
    const targetUser = await requireOwnerNotSelf(context, userId);
    const { prisma } = context;

    try {
      const result = await prisma.$transaction(async (tx: any) => {
        // 1. Delete activities where user is the actor
        const deletedActorActivities = await tx.activity.deleteMany({
          where: { userId },
        });

        // 2. Delete activities where user is the target
        const deletedTargetActivities = await tx.activity.deleteMany({
          where: { targetUserId: userId },
        });

        // 3. Delete user activity tracking entries
        const deletedUserActivities = await tx.userActivity.deleteMany({
          where: { userId },
        });

        // 4. Delete recommendations created by this user
        const deletedRecommendations = await tx.recommendation.deleteMany({
          where: { userId },
        });

        // 5. Find user's collections, then delete their collection albums
        const collections = await tx.collection.findMany({
          where: { userId },
          select: { id: true },
        });
        const collectionIds = collections.map((c: { id: string }) => c.id);

        let deletedCollectionAlbums = { count: 0 };
        if (collectionIds.length > 0) {
          deletedCollectionAlbums = await tx.collectionAlbum.deleteMany({
            where: { collectionId: { in: collectionIds } },
          });
        }

        // 6. Delete collections
        const deletedCollections = await tx.collection.deleteMany({
          where: { userId },
        });

        // 7. Delete follow relationships (both directions)
        const deletedFollowers = await tx.userFollow.deleteMany({
          where: { OR: [{ followerId: userId }, { followedId: userId }] },
        });

        // 8. Delete user settings
        await tx.userSettings.deleteMany({
          where: { userId },
        });

        // 9. Nullify llama log entries (matches onDelete: SetNull)
        await tx.llamaLog.updateMany({
          where: { userId },
          data: { userId: null },
        });

        // 10. Delete sessions
        await tx.session.deleteMany({
          where: { userId },
        });

        // 11. Delete OAuth accounts
        await tx.account.deleteMany({
          where: { userId },
        });

        // 12. Delete the user
        await tx.user.delete({
          where: { id: userId },
        });

        return {
          activities:
            deletedActorActivities.count + deletedTargetActivities.count,
          userActivities: deletedUserActivities.count,
          recommendations: deletedRecommendations.count,
          collectionAlbums: deletedCollectionAlbums.count,
          collections: deletedCollections.count,
          follows: deletedFollowers.count,
        };
      });

      console.log(
        `[ADMIN] Owner ${context.user.id} HARD-DELETED user ${userId} (${targetUser.username || targetUser.email}). ` +
          `Removed: ${result.collections} collections, ${result.recommendations} recommendations, ` +
          `${result.follows} follows, ${result.activities} activities`
      );

      return {
        success: true,
        message:
          `User ${targetUser.username || targetUser.email || userId} permanently deleted. ` +
          `Removed ${result.collections} collections, ${result.recommendations} recommendations, ${result.follows} follows.`,
        deletedId: userId,
      };
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      console.error('Error hard-deleting user:', error);
      throw new GraphQLError(`Failed to hard-delete user: ${error}`, {
        extensions: { code: 'INTERNAL_ERROR' },
      });
    }
  },

  restoreUser: async (
    _: unknown,
    { userId }: { userId: string },
    context: any
  ) => {
    const targetUser = await requireOwnerNotSelf(context, userId);
    const { prisma } = context;

    if (!targetUser.deletedAt) {
      throw new GraphQLError('User is not soft-deleted', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    try {
      const restoredUser = await prisma.user.update({
        where: { id: userId },
        data: {
          deletedAt: null,
          deletedBy: null,
        },
      });

      console.log(
        `[ADMIN] Owner ${context.user.id} restored user ${userId} (${targetUser.username || targetUser.email})`
      );

      return {
        success: true,
        message: `User ${targetUser.username || targetUser.email || userId} has been restored`,
        user: restoredUser,
      };
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      console.error('Error restoring user:', error);
      throw new GraphQLError(`Failed to restore user: ${error}`, {
        extensions: { code: 'INTERNAL_ERROR' },
      });
    }
  },
};
