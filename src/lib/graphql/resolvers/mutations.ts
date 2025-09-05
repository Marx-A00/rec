// src/lib/graphql/resolvers/mutations.ts
// Mutation resolvers for GraphQL API

import { MutationResolvers } from '@/generated/graphql';
import { GraphQLError } from 'graphql';

export const mutationResolvers: MutationResolvers = {
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

      const collectionAlbum = await prisma.collectionAlbum.create({
        data: {
          collectionId,
          albumId: input.albumId,
          personalRating: input.personalRating,
          personalNotes: input.personalNotes,
          position: input.position || 0,
        },
      });
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
      const recommendation = await prisma.recommendation.create({
        data: {
          userId: user.id,
          basisAlbumId,
          recommendedAlbumId,
          score,
        },
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
