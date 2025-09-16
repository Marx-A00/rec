// @ts-nocheck - Schema migration broke GraphQL resolvers, needs complete rewrite
// src/lib/graphql/resolvers/mutations.ts
// Mutation resolvers for GraphQL API

import { MutationResolvers } from '@/generated/graphql';
import { GraphQLError } from 'graphql';
import { getMusicBrainzQueue, JOB_TYPES } from '@/lib/queue';
import type { CheckAlbumEnrichmentJobData, CheckArtistEnrichmentJobData, CheckTrackEnrichmentJobData } from '@/lib/queue/jobs';
import { alertManager } from '@/lib/monitoring';

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
  createTrack: async (_: any, { input }: any, { user, prisma, activityTracker, priorityManager, sessionId, requestId }: any) => {
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' }
      });
    }

    try {
      // Validate that the album exists
      const album = await prisma.album.findUnique({
        where: { id: input.albumId }
      });

      if (!album) {
        throw new GraphQLError('Album not found', {
          extensions: { code: 'NOT_FOUND' }
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
        }
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
                mode: 'insensitive'
              }
            }
          });

          if (existingArtist) {
            artistId = existingArtist.id;
            console.log(`🔄 Reusing existing artist: "${existingArtist.name}" (${existingArtist.id})`);
          } else {
            // Create new artist
            const newArtist = await prisma.artist.create({
              data: {
                name: artistInput.artistName,
                dataQuality: 'LOW',
                enrichmentStatus: 'PENDING',
              }
            });
            artistId = newArtist.id;
            console.log(`✨ Created new artist: "${newArtist.name}" (${newArtist.id})`);
          }
        }

        if (artistId) {
          await prisma.trackArtist.create({
            data: {
              trackId: track.id,
              artistId: artistId,
              role: artistInput.role || 'primary',
            }
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
        
        await queue.addJob(JOB_TYPES.CHECK_TRACK_ENRICHMENT, trackCheckData, jobOptions);
        
      } catch (queueError) {
        console.warn('Failed to queue enrichment check for new track:', queueError);
      }

      return track;

    } catch (error) {
      console.error('Error creating track:', error);
      throw new GraphQLError('Failed to create track', {
        extensions: { code: 'INTERNAL_ERROR' }
      });
    }
  },

  updateTrack: async (_: any, { id, input }: any, { user, prisma }: any) => {
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' }
      });
    }

    try {
      // Check that track exists
      const existingTrack = await prisma.track.findUnique({
        where: { id }
      });

      if (!existingTrack) {
        throw new GraphQLError('Track not found', {
          extensions: { code: 'NOT_FOUND' }
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
          dataQuality: input.musicbrainzId ? 'MEDIUM' : existingTrack.dataQuality,
          enrichmentStatus: input.musicbrainzId ? 'COMPLETED' : existingTrack.enrichmentStatus,
          lastEnriched: input.musicbrainzId ? new Date() : existingTrack.lastEnriched,
        }
      });

      return updatedTrack;

    } catch (error) {
      console.error('Error updating track:', error);
      throw new GraphQLError('Failed to update track', {
        extensions: { code: 'INTERNAL_ERROR' }
      });
    }
  },

  deleteTrack: async (_: any, { id }: any, { user, prisma }: any) => {
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' }
      });
    }

    try {
      // Check that track exists
      const existingTrack = await prisma.track.findUnique({
        where: { id }
      });

      if (!existingTrack) {
        throw new GraphQLError('Track not found', {
          extensions: { code: 'NOT_FOUND' }
        });
      }

      // Delete the track (CASCADE will handle TrackArtist relationships)
      await prisma.track.delete({
        where: { id }
      });

      return true;

    } catch (error) {
      console.error('Error deleting track:', error);
      throw new GraphQLError('Failed to delete track', {
        extensions: { code: 'INTERNAL_ERROR' }
      });
    }
  },

  addAlbum: async (_, { input }, { user, prisma, activityTracker, priorityManager, sessionId, requestId }) => {
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' }
      });
    }

    // TODO shouldn't we first check if the album already exists?

    try {
      // Parse release date if provided
      const releaseDate = input.releaseDate ? new Date(input.releaseDate) : null;

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
          // Set initial enrichment data
          dataQuality: input.musicbrainzId ? 'MEDIUM' : 'LOW',
          enrichmentStatus: input.musicbrainzId ? 'COMPLETED' : 'PENDING',
          lastEnriched: input.musicbrainzId ? new Date() : null,
        }
      });

      // Handle artist associations
      for (const artistInput of input.artists) {
        let artistId = artistInput.artistId;

        // If no artistId provided, try to find existing artist by name first
        if (!artistId && artistInput.artistName) {
          // Search for existing artist by name (case-insensitive)
          const existingArtist = await prisma.artist.findFirst({
            where: {
              name: {
                equals: artistInput.artistName,
                mode: 'insensitive'
              }
            }
          });

          if (existingArtist) {
            // Use existing artist
            artistId = existingArtist.id;
            console.log(`🔄 Reusing existing artist: "${existingArtist.name}" (${existingArtist.id})`);
          } else {
            // Create new artist only if none exists
            const newArtist = await prisma.artist.create({
              data: {
                name: artistInput.artistName,
                dataQuality: 'LOW',
                enrichmentStatus: 'PENDING',
              }
            });
            artistId = newArtist.id;
            console.log(`✨ Created new artist: "${newArtist.name}" (${newArtist.id})`);
          }
        }

        if (artistId) {
          await prisma.albumArtist.create({
            data: {
              albumId: album.id,
              artistId: artistId,
              role: artistInput.role || 'PRIMARY',
            }
          });
        }
      }

      // Queue enrichment check for the new album using smart priority management
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
        
        await queue.addJob(JOB_TYPES.CHECK_ALBUM_ENRICHMENT, albumCheckData, jobOptions);
        
        // Log priority decision for debugging
        priorityManager.logPriorityDecision(
          'manual',
          album.id,
          jobOptions.priority / 10, // Convert back to 1-10 scale
          { 
            actionImportance: 8,
            userActivity: 0, 
            entityRelevance: 0, 
            systemLoad: 0 
          },
          jobOptions.delay
        );
        
      } catch (queueError) {
        console.warn('Failed to queue enrichment check for new album:', queueError);
      }

      // Return the album with its relationships
      return await prisma.album.findUnique({
        where: { id: album.id },
        include: {
          artists: {
            include: {
              artist: true,
            },
          },
          tracks: true,
        },
      }) as any;

    } catch (error) {
      console.error('Error creating album:', error);
      throw new GraphQLError('Failed to create album', {
        extensions: { code: 'INTERNAL_ERROR' }
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

      } catch (queueError) {
        // Log queue errors but don't fail the user operation
        console.warn('Failed to queue enrichment check for album collection add:', queueError);
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
      // Perform immediate database operation
      const recommendation = await prisma.recommendation.create({
        data: {
          userId: user.id,
          basisAlbumId,
          recommendedAlbumId,
          score,
        },
      });

      // Queue lightweight enrichment checks (non-blocking)
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
          queue.addJob(JOB_TYPES.CHECK_ALBUM_ENRICHMENT, basisAlbumCheckData, {
            priority: 8, // High priority for recommendation creation
            attempts: 3,
          }),
          queue.addJob(JOB_TYPES.CHECK_ALBUM_ENRICHMENT, recommendedAlbumCheckData, {
            priority: 8, // High priority for recommendation creation
            attempts: 3,
          })
        ]);

      } catch (queueError) {
        // Log queue errors but don't fail the user operation
        console.warn('Failed to queue enrichment checks for recommendation creation:', queueError);
      }

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
      const recommendation = await prisma.recommendation.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

      if (!recommendation) {
        throw new GraphQLError('Recommendation not found or access denied');
      }

      await prisma.recommendation.delete({
        where: { id },
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
      const userFollow = await prisma.userFollow.create({
        data: {
          followerId: user.id,
          followedId: userId,
        },
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
      await prisma.userFollow.deleteMany({
        where: {
          followerId: user.id,
          followedId: userId,
        },
      });
      return true;
    } catch (error) {
      throw new GraphQLError(`Failed to unfollow user: ${error}`);
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
};
