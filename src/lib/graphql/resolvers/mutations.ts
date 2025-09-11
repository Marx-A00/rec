// src/lib/graphql/resolvers/mutations.ts
// Mutation resolvers for GraphQL API

import { MutationResolvers } from '@/generated/graphql';
import { GraphQLError } from 'graphql';
import { getMusicBrainzQueue, JOB_TYPES } from '@/lib/queue';
import type { CheckAlbumEnrichmentJobData, CheckArtistEnrichmentJobData } from '@/lib/queue/jobs';

export const mutationResolvers: MutationResolvers = {
  // Album management
  addAlbum: async (_, { input }, { user, prisma }) => {
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' }
      });
    }

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

        // If no artistId provided, create a new artist
        if (!artistId && artistInput.artistName) {
          const newArtist = await prisma.artist.create({
            data: {
              name: artistInput.artistName,
              dataQuality: 'LOW',
              enrichmentStatus: 'PENDING',
            }
          });
          artistId = newArtist.id;
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

      // Queue enrichment check for the new album
      try {
        const queue = getMusicBrainzQueue();
        const albumCheckData: CheckAlbumEnrichmentJobData = {
          albumId: album.id,
          source: 'manual',
          priority: 'medium',
          requestId: `add-album-${album.id}`,
        };
        await queue.addJob(JOB_TYPES.CHECK_ALBUM_ENRICHMENT, albumCheckData, {
          priority: 5,
          attempts: 3,
        });
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
          personalRating: input.personalRating,
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
          personalRating: input.personalRating,
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
