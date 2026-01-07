// @ts-nocheck - Schema migration broke GraphQL resolvers, needs complete rewrite
// src/lib/graphql/resolvers/mutations.ts
// Mutation resolvers for GraphQL API

import { GraphQLError } from 'graphql';

import { MutationResolvers } from '@/generated/graphql';
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
  CacheAlbumCoverArtJobData,
} from '@/lib/queue/jobs';
import { alertManager } from '@/lib/monitoring';
import {
  logActivity,
  OPERATIONS,
  SOURCES,
} from '@/lib/logging/activity-logger';
import { isAdmin } from '@/lib/permissions';

// Utility function to cast return values for GraphQL resolvers
// Field resolvers will populate missing computed fields
function asResolverResult<T>(data: any): T {
  return data as T;
}

// @ts-ignore - Temporarily suppress complex GraphQL resolver type issues
// TODO: Fix GraphQL resolver return types to match generated types
export const mutationResolvers: MutationResolvers = {
  // Queue Management mutations
  pauseQueue: async () => {
    try {
      const queue = getMusicBrainzQueue();
      await queue.pause();
      return true;
    } catch (error) {
      throw new GraphQLError(`Failed to pause queue: ${error}`);
    }
  },

  resumeQueue: async () => {
    try {
      const queue = getMusicBrainzQueue();
      await queue.resume();
      return true;
    } catch (error) {
      throw new GraphQLError(`Failed to resume queue: ${error}`);
    }
  },

  retryJob: async (_, { jobId }) => {
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

  retryAllFailed: async () => {
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

  cleanQueue: async (_, { olderThan }) => {
    try {
      const queue = getMusicBrainzQueue();
      await queue.cleanup(olderThan || 86400000); // Default 24 hours
      return true;
    } catch (error) {
      throw new GraphQLError(`Failed to clean queue: ${error}`);
    }
  },

  clearFailedJobs: async () => {
    try {
      const queue = getMusicBrainzQueue().getQueue();
      await queue.clean(0, 1000, 'failed');
      return true;
    } catch (error) {
      throw new GraphQLError(`Failed to clear failed jobs: ${error}`);
    }
  },

  // Spotify Sync mutation
  triggerSpotifySync: async (_, { type }) => {
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
  rollbackSyncJob: async (_, { syncJobId, dryRun = true }, { prisma }) => {
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
  updateAlertThresholds: async (_, { input }) => {
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
      for (const artistInput of input.artists) {
        let artistId = artistInput.artistId;

        // If no artistId provided, try to find existing artist by name first
        if (!artistId && artistInput.artistName) {
          const existingArtist = await prisma.artist.findFirst({
            where: {
              name: {
                equals: artistInput.artistName,
                mode: 'insensitive',
              },
            },
          });

          if (existingArtist) {
            artistId = existingArtist.id;
            console.log(
              `🔄 Reusing existing artist: "${existingArtist.name}" (${existingArtist.id})`
            );
          } else {
            // Create new artist
            const newArtist = await prisma.artist.create({
              data: {
                name: artistInput.artistName,
                dataQuality: 'LOW',
                enrichmentStatus: 'PENDING',
              },
            });
            artistId = newArtist.id;
            console.log(
              `✨ Created new artist: "${newArtist.name}" (${newArtist.id})`
            );
          }
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
          // Set initial enrichment data - always PENDING so tracks get fetched
          dataQuality: input.musicbrainzId ? 'MEDIUM' : 'LOW',
          enrichmentStatus: 'PENDING',
          lastEnriched: null,
        },
      });

      // Handle artist associations (consistent with addToListenLater)
      for (const artistInput of input.artists) {
        let artistId: string | undefined;

        // Always search/create by name (don't trust artistId from external sources)
        // artistInput.artistId may be a MusicBrainz ID or empty string for external albums
        if (artistInput.artistName) {
          // Search for existing artist by name (case-insensitive)
          const existingArtist = await prisma.artist.findFirst({
            where: {
              name: {
                equals: artistInput.artistName,
                mode: 'insensitive',
              },
            },
          });

          if (existingArtist) {
            // Use existing artist
            artistId = existingArtist.id;
            console.log(
              `🔄 Reusing existing artist: "${existingArtist.name}" (${existingArtist.id})`
            );
          } else {
            // Create new artist only if none exists
            const newArtist = await prisma.artist.create({
              data: {
                name: artistInput.artistName,
                dataQuality: 'LOW',
                enrichmentStatus: 'PENDING',
              },
            });
            artistId = newArtist.id;
            console.log(
              `✨ Created new artist: "${newArtist.name}" (${newArtist.id})`
            );

            // Log the artist creation
            await logActivity({
              prisma,
              entityType: 'ARTIST',
              entityId: newArtist.id,
              operation: OPERATIONS.MANUAL_ADD,
              sources: [SOURCES.ADMIN, SOURCES.MUSICBRAINZ],
              fieldsChanged: ['name'],
              userId: user.id,
              dataQualityAfter: newArtist.dataQuality,
            });
          }

          // Create or update the album-artist relationship (upsert to handle duplicates)
          const role = artistInput.role || 'PRIMARY';
          await prisma.albumArtist.upsert({
            where: {
              albumId_artistId_role: {
                albumId: album.id,
                artistId: artistId,
                role: role,
              },
            },
            update: {}, // No update needed, just ensure it exists
            create: {
              albumId: album.id,
              artistId: artistId,
              role: role,
            },
          });
        }
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

      // Log the manual album creation
      const fieldsCreated = ['title'];
      if (input.releaseDate) fieldsCreated.push('releaseDate');
      if (input.albumType) fieldsCreated.push('releaseType');
      if (input.totalTracks) fieldsCreated.push('trackCount');
      if (input.coverImageUrl) fieldsCreated.push('coverArtUrl');
      if (input.musicbrainzId) fieldsCreated.push('musicbrainzId');
      if (input.artists?.length) fieldsCreated.push('artists');

      await logActivity({
        prisma,
        entityType: 'ALBUM',
        entityId: album.id,
        operation: OPERATIONS.MANUAL_ADD,
        sources: [SOURCES.ADMIN, SOURCES.MUSICBRAINZ],
        fieldsChanged: fieldsCreated,
        userId: user.id,
        dataQualityAfter: album.dataQuality,
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
      // Check if artist already exists by MusicBrainz ID
      if (input.musicbrainzId) {
        const existing = await prisma.artist.findFirst({
          where: { musicbrainzId: input.musicbrainzId },
        });

        if (existing) {
          console.log(
            `🔄 Artist already exists: "${existing.name}" (${existing.id})`
          );
          return existing as any;
        }
      }

      // Check if artist already exists by name (case-insensitive)
      const existingByName = await prisma.artist.findFirst({
        where: {
          name: {
            equals: input.name,
            mode: 'insensitive',
          },
        },
      });

      if (existingByName) {
        console.log(
          `🔄 Artist already exists by name: "${existingByName.name}" (${existingByName.id})`
        );
        return existingByName as any;
      }

      // Create the artist
      const artist = await prisma.artist.create({
        data: {
          name: input.name,
          musicbrainzId: input.musicbrainzId,
          imageUrl: input.imageUrl,
          countryCode: input.countryCode,
          dataQuality: input.musicbrainzId ? 'MEDIUM' : 'LOW',
          enrichmentStatus: 'PENDING',
          lastEnriched: null,
        },
      });

      console.log(`✨ Created new artist: "${artist.name}" (${artist.id})`);

      // Queue enrichment check in background (non-blocking for faster response)
      setImmediate(async () => {
        try {
          const queue = getMusicBrainzQueue();

          // Track manual artist creation for priority management
          await activityTracker.recordEntityInteraction(
            'add_artist',
            'artist',
            artist.id,
            'mutation',
            { source: 'manual_add' }
          );

          // Get smart job options based on user activity
          const jobOptions = await priorityManager.getJobOptions(
            'manual',
            artist.id,
            'artist',
            requestId
          );

          // Queue artist enrichment check
          const checkData: CheckArtistEnrichmentJobData = {
            artistId: artist.id,
            source: 'manual_add',
            priority: 'high',
            requestId: `manual-artist-add-${artist.id}`,
          };

          await queue.addJob(
            JOB_TYPES.CHECK_ARTIST_ENRICHMENT,
            checkData,
            jobOptions
          );

          // Log priority decision for debugging
          priorityManager.logPriorityDecision(
            'manual',
            artist.id,
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
            'Failed to queue enrichment check for new artist:',
            queueError
          );
        }
      });

      // Log the manual artist creation
      const fieldsCreated = ['name'];
      if (input.musicbrainzId) fieldsCreated.push('musicbrainzId');
      if (input.imageUrl) fieldsCreated.push('imageUrl');
      if (input.countryCode) fieldsCreated.push('countryCode');

      await logActivity({
        prisma,
        entityType: 'ARTIST',
        entityId: artist.id,
        operation: OPERATIONS.MANUAL_ADD,
        sources: [SOURCES.ADMIN, SOURCES.MUSICBRAINZ],
        fieldsChanged: fieldsCreated,
        userId: user.id,
        dataQualityAfter: artist.dataQuality,
      });

      // Return the artist
      return (await prisma.artist.findUnique({
        where: { id: artist.id },
      })) as any;
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
        await tx.enrichmentLog.deleteMany({
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

      // Perform immediate database operation
      const collectionAlbum = await prisma.collectionAlbum.create({
        data: {
          collectionId,
          albumId: input.albumId,
          personalRating: input.personalRating ?? undefined,
          personalNotes: input.personalNotes,
          position: input.position || 0,
        },
      });

      // Queue lightweight enrichment check (non-blocking)
      try {
        const queue = getMusicBrainzQueue();

        // Queue album enrichment check
        const albumCheckData: CheckAlbumEnrichmentJobData = {
          albumId: input.albumId,
          source: 'collection_add',
          priority: 'high',
          requestId: `collection-add-${collectionAlbum.id}`,
        };

        await queue.addJob(JOB_TYPES.CHECK_ALBUM_ENRICHMENT, albumCheckData, {
          priority: 10, // High priority for user actions
          attempts: 3,
        });

        // Queue cover art caching (non-blocking)
        const cacheData: CacheAlbumCoverArtJobData = {
          albumId: input.albumId,
          requestId: `cache-cover-${collectionAlbum.id}`,
        };

        await queue.addJob(JOB_TYPES.CACHE_ALBUM_COVER_ART, cacheData, {
          priority: 5, // Medium priority
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        });
      } catch (queueError) {
        // Log queue errors but don't fail the user operation
        console.warn(
          'Failed to queue enrichment check for album collection add:',
          queueError
        );
      }

      return collectionAlbum;
    } catch (error) {
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

      await prisma.collectionAlbum.deleteMany({
        where: {
          collectionId,
          albumId,
        },
      });
      return true;
    } catch (error) {
      throw new GraphQLError(
        `Failed to remove album from collection: ${error}`
      );
    }
  },

  // Listen Later (name-based, no schema change)
  ensureListenLaterCollection: async (_, __, { user, prisma }) => {
    if (!user) throw new GraphQLError('Authentication required');
    const name = 'Listen Later';
    const existing = await prisma.collection.findFirst({
      where: { userId: user.id, name },
    });
    if (existing) return existing as any;
    const created = await prisma.collection.create({
      data: { userId: user.id, name, isPublic: false },
    });
    return created as any;
  },

  addToListenLater: async (_, { albumId, albumData }, { user, prisma }) => {
    if (!user) throw new GraphQLError('Authentication required');

    let dbAlbumId: string;

    // First try to find by internal ID
    let album = await prisma.album.findUnique({
      where: { id: albumId },
      include: {
        artists: {
          include: { artist: true },
        },
      },
    });

    if (album) {
      // Album exists by internal ID
      dbAlbumId = album.id;
    } else {
      // Try to find by MusicBrainz ID
      album = await prisma.album.findFirst({
        where: { musicbrainzId: albumId },
        include: {
          artists: {
            include: { artist: true },
          },
        },
      });

      if (album) {
        // Album exists by MusicBrainz ID
        dbAlbumId = album.id;
      } else {
        // Album doesn't exist - create it with full data if provided
        if (albumData) {
          // Parse release date if provided
          const releaseDate = albumData.releaseDate
            ? new Date(albumData.releaseDate)
            : null;

          // Create the album with full data
          album = await prisma.album.create({
            data: {
              title: albumData.title,
              releaseDate,
              releaseType: albumData.albumType || 'ALBUM',
              trackCount: albumData.totalTracks,
              coverArtUrl: albumData.coverImageUrl,
              musicbrainzId: albumData.musicbrainzId || albumId,
              dataQuality: albumData.musicbrainzId ? 'MEDIUM' : 'LOW',
              enrichmentStatus: 'PENDING',
              lastEnriched: null,
            },
          });

          // Handle artist associations
          if (albumData.artists && albumData.artists.length > 0) {
            for (const artistInput of albumData.artists) {
              let artistId: string | undefined;

              // Always try to find/create artist by name (required field)
              if (artistInput.artistName) {
                const existingArtist = await prisma.artist.findFirst({
                  where: {
                    name: {
                      equals: artistInput.artistName,
                      mode: 'insensitive',
                    },
                  },
                });

                if (existingArtist) {
                  artistId = existingArtist.id;
                } else {
                  // Create new artist
                  const newArtist = await prisma.artist.create({
                    data: {
                      name: artistInput.artistName,
                      dataQuality: 'LOW',
                      enrichmentStatus: 'PENDING',
                    },
                  });
                  artistId = newArtist.id;
                }

                // Create or update the album-artist relationship (upsert to handle duplicates)
                const role = artistInput.role || 'PRIMARY';
                await prisma.albumArtist.upsert({
                  where: {
                    albumId_artistId_role: {
                      albumId: album.id,
                      artistId: artistId,
                      role: role,
                    },
                  },
                  update: {}, // No update needed, just ensure it exists
                  create: {
                    albumId: album.id,
                    artistId: artistId,
                    role: role,
                  },
                });
              }
            }
          }
        } else {
          // No album data provided - create stub album (fallback behavior)
          album = await prisma.album.create({
            data: {
              musicbrainzId: albumId,
              title: 'Loading...',
              enrichmentStatus: 'PENDING',
            },
          });
        }
        dbAlbumId = album.id;
      }
    }

    const name = 'Listen Later';
    let collection = await prisma.collection.findFirst({
      where: { userId: user.id, name },
    });
    if (!collection) {
      collection = await prisma.collection.create({
        data: { userId: user.id, name, isPublic: false },
      });
    }

    // Upsert-like behavior: ignore if already exists
    try {
      const ca = await prisma.collectionAlbum.create({
        data: { collectionId: collection.id, albumId: dbAlbumId },
      });

      // Queue enrichment for the newly added album
      try {
        const queue = getMusicBrainzQueue();
        const albumCheckData: CheckAlbumEnrichmentJobData = {
          albumId: dbAlbumId,
          source: 'listen_later_add',
          priority: 'high',
          requestId: `listen-later-${ca.id}`,
        };
        await queue.addJob(JOB_TYPES.CHECK_ALBUM_ENRICHMENT, albumCheckData, {
          priority: 10,
          attempts: 3,
        });
      } catch (queueError) {
        console.warn(
          'Failed to queue enrichment for Listen Later album:',
          queueError
        );
      }

      return ca as any;
    } catch (e: any) {
      // Unique violation => already in list, fetch and return
      const existing = await prisma.collectionAlbum.findFirst({
        where: { collectionId: collection.id, albumId: dbAlbumId },
      });
      if (existing) return existing as any;
      throw new GraphQLError('Failed to add to Listen Later');
    }
  },

  removeFromListenLater: async (_, { albumId }, { user, prisma }) => {
    if (!user) throw new GraphQLError('Authentication required');
    const name = 'Listen Later';
    const collection = await prisma.collection.findFirst({
      where: { userId: user.id, name },
    });
    if (!collection) return true;
    await prisma.collectionAlbum.deleteMany({
      where: { collectionId: collection.id, albumId },
    });
    return true;
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

  // Recommendation system mutations (placeholders)
  createRecommendation: async (
    _,
    { basisAlbumId, recommendedAlbumId, score },
    { user, prisma }
  ) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    try {
      // Perform immediate database operation and increment user's recommendations count
      const recommendation = await prisma.$transaction(async tx => {
        // Create the recommendation
        const rec = await tx.recommendation.create({
          data: {
            userId: user.id,
            basisAlbumId,
            recommendedAlbumId,
            score,
          },
        });

        // Increment the user's recommendations count
        await tx.user.update({
          where: { id: user.id },
          data: { recommendationsCount: { increment: 1 } },
        });

        return rec;
      });

      // Queue enrichment checks in background (non-blocking for faster response)
      setImmediate(async () => {
        try {
          const queue = getMusicBrainzQueue();

          // Queue enrichment checks for both albums
          const basisAlbumCheckData: CheckAlbumEnrichmentJobData = {
            albumId: basisAlbumId,
            source: 'recommendation_create',
            priority: 'high',
            requestId: `recommendation-basis-${recommendation.id}`,
          };

          const recommendedAlbumCheckData: CheckAlbumEnrichmentJobData = {
            albumId: recommendedAlbumId,
            source: 'recommendation_create',
            priority: 'high',
            requestId: `recommendation-target-${recommendation.id}`,
          };

          await Promise.all([
            queue.addJob(
              JOB_TYPES.CHECK_ALBUM_ENRICHMENT,
              basisAlbumCheckData,
              {
                priority: 8, // High priority for recommendation creation
                attempts: 3,
              }
            ),
            queue.addJob(
              JOB_TYPES.CHECK_ALBUM_ENRICHMENT,
              recommendedAlbumCheckData,
              {
                priority: 8, // High priority for recommendation creation
                attempts: 3,
              }
            ),
          ]);
        } catch (queueError) {
          // Log queue errors but don't fail the user operation
          console.warn(
            'Failed to queue enrichment checks for recommendation creation:',
            queueError
          );
        }
      });

      return recommendation;
    } catch (error) {
      throw new GraphQLError(`Failed to create recommendation: ${error}`);
    }
  },

  updateRecommendation: async (_, { id, score }, { user, prisma }) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    try {
      const recommendation = await prisma.recommendation.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

      if (!recommendation) {
        throw new GraphQLError('Recommendation not found or access denied');
      }

      const updatedRecommendation = await prisma.recommendation.update({
        where: { id },
        data: { score },
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
      // Delete recommendation and update count in a transaction
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

        // Delete the recommendation
        await tx.recommendation.delete({
          where: { id },
        });

        // Decrement the user's recommendations count
        await tx.user.update({
          where: { id: user.id },
          data: { recommendationsCount: { decrement: 1 } },
        });
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
      // Create the follow relationship and update counts in a transaction
      const userFollow = await prisma.$transaction(async tx => {
        // Create the follow relationship
        const follow = await tx.userFollow.create({
          data: {
            followerId: user.id,
            followedId: userId,
          },
        });

        // Increment the followed user's followers count
        await tx.user.update({
          where: { id: userId },
          data: { followersCount: { increment: 1 } },
        });

        // Increment the current user's following count
        await tx.user.update({
          where: { id: user.id },
          data: { followingCount: { increment: 1 } },
        });

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
      // Delete the follow relationship and update counts in a transaction
      await prisma.$transaction(async tx => {
        // Delete the follow relationship
        const result = await tx.userFollow.deleteMany({
          where: {
            followerId: user.id,
            followedId: userId,
          },
        });

        // Only decrement counts if a follow relationship was actually deleted
        if (result.count > 0) {
          // Decrement the followed user's followers count
          await tx.user.update({
            where: { id: userId },
            data: { followersCount: { decrement: 1 } },
          });

          // Decrement the current user's following count
          await tx.user.update({
            where: { id: user.id },
            data: { followingCount: { decrement: 1 } },
          });
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
  updateProfile: async (_, { name, bio }, { user, prisma }) => {
    if (!user) {
      throw new GraphQLError('Authentication required');
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          name,
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
  previewAlbumEnrichment: async (_: unknown, { id }: { id: string }) => {
    try {
      const result = await previewAlbumEnrichment(id);
      return result;
    } catch (error) {
      throw new GraphQLError(`Failed to preview album enrichment: ${error}`);
    }
  },

  previewArtistEnrichment: async (_: unknown, { id }: { id: string }) => {
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
              collectionAlbum: true,
              basisRecommendations: true,
              targetRecommendations: true,
              listenLater: true,
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
            OR: [{ basisAlbumId: id }, { targetAlbumId: id }],
          },
        });

        // 3. ListenLater entries
        await tx.listenLater.deleteMany({
          where: { albumId: id },
        });

        // 4. Track artists (via tracks)
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

        // 5. Tracks
        await tx.track.deleteMany({
          where: { albumId: id },
        });

        // 6. ArtistCredit entries
        await tx.artistCredit.deleteMany({
          where: { albumId: id },
        });

        // 7. EnrichmentLog entries
        await tx.enrichmentLog.deleteMany({
          where: { albumId: id },
        });

        // 8. Finally, delete the album itself
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
  updateAlbumDataQuality: async (
    _,
    { id, dataQuality },
    { prisma, session }
  ) => {
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
        userId: session?.user?.id,
        dataQualityBefore: oldAlbum?.dataQuality ?? null,
        dataQualityAfter: dataQuality,
      });

      return album;
    } catch (error) {
      throw new GraphQLError(`Failed to update album data quality: ${error}`);
    }
  },

  updateArtistDataQuality: async (
    _,
    { id, dataQuality },
    { prisma, session }
  ) => {
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
        userId: session?.user?.id,
        dataQualityBefore: oldArtist?.dataQuality ?? null,
        dataQualityAfter: dataQuality,
      });

      return artist;
    } catch (error) {
      throw new GraphQLError(`Failed to update artist data quality: ${error}`);
    }
  },
};
