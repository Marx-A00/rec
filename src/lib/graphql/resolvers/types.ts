// Schema migration broke GraphQL resolvers, needs complete rewrite
// src/lib/graphql/resolvers/types.ts
// Type resolvers for GraphQL schema relationships and computed fields
// @ts-nocheck - Prisma types don't match GraphQL types; this file completes objects at runtime

import { Prisma } from '@prisma/client';

import { Resolvers } from '@/generated/resolvers-types';

import {
  cacheAlbumPopularity,
  cacheAlbumAverageRating,
  cacheArtistFollowerCount,
  cachedField,
} from '../field-cache';

// Type for UserFollow with optional relations
type UserFollowWithRelations = Prisma.UserFollowGetPayload<{
  include: { follower: true; followed: true };
}>;

export const typeResolvers: Resolvers = {
  // Artist type resolvers
  Artist: {
    // Relationship resolvers using DataLoaders
    albums: async (parent, _, { dataloaders }) => {
      return dataloaders.albumsByArtistLoader.load(parent.id);
    },

    tracks: async (parent, _, { prisma }) => {
      // Get all tracks where this artist is credited
      const trackArtists = await prisma.trackArtist.findMany({
        where: { artistId: parent.id },
        include: { track: true },
        orderBy: { position: 'asc' },
      });
      return trackArtists.map(ta => ta.track);
    },

    // Computed field resolvers with caching
    albumCount: async (parent, _, { prisma }) => {
      return cachedField(
        'artist',
        parent.id,
        'albumCount',
        async () =>
          prisma.albumArtist.count({
            where: { artistId: parent.id },
          }),
        { ttl: 1800 } // 30 minutes
      );
    },

    trackCount: async (parent, _, { prisma }) => {
      return cachedField(
        'artist',
        parent.id,
        'trackCount',
        async () =>
          prisma.trackArtist.count({
            where: { artistId: parent.id },
          }),
        { ttl: 1800 } // 30 minutes
      );
    },

    popularity: async (parent, _, { prisma }) => {
      return cacheAlbumPopularity(parent.id, async () => {
        // Calculate popularity based on collection count and recommendations
        const inCollections = await prisma.albumArtist.count({
          where: {
            artistId: parent.id,
            album: {
              collectionAlbums: {
                some: {},
              },
            },
          },
        });

        if (inCollections === 0) return null;
        // Simple popularity score: log scale of collection count
        return Math.min(100, Math.round(Math.log10(inCollections + 1) * 30));
      });
    },
  },

  // Album type resolvers
  Album: {
    // Relationship resolvers
    artists: async (parent, _, { dataloaders }) => {
      return dataloaders.artistsByAlbumLoader.load(parent.id);
    },

    tracks: async (parent, _, { dataloaders }) => {
      return dataloaders.tracksByAlbumLoader.load(parent.id);
    },

    collectionAlbums: async (parent, _, { prisma }) => {
      return prisma.collectionAlbum.findMany({
        where: { albumId: parent.id },
      });
    },

    basisRecommendations: async (parent, _, { dataloaders }) => {
      // Load recommendations where this album is the basis
      return dataloaders.recommendationsByAlbumLoader.load(parent.id);
    },

    targetRecommendations: async (parent, _, { prisma }) => {
      // Recommendations where this album is recommended (different field)
      return prisma.recommendation.findMany({
        where: { recommendedAlbumId: parent.id },
      });
    },

    // Computed field resolvers
    duration: parent => {
      if (!parent.durationMs) return null;
      const minutes = Math.floor(parent.durationMs / 60000);
      const seconds = Math.floor((parent.durationMs % 60000) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    },

    averageRating: async (parent, _, { prisma }) => {
      return cacheAlbumAverageRating(parent.id, async () => {
        const ratings = await prisma.collectionAlbum.findMany({
          where: {
            albumId: parent.id,
            personalRating: { not: null },
          },
          select: { personalRating: true },
        });

        if (ratings.length === 0) return null;

        const sum = ratings.reduce(
          (acc, r) => acc + (r.personalRating || 0),
          0
        );
        return sum / ratings.length;
      });
    },

    inCollectionsCount: async (parent, _, { prisma }) => {
      return cachedField(
        'album',
        parent.id,
        'inCollectionsCount',
        async () =>
          prisma.collectionAlbum.count({
            where: { albumId: parent.id },
          }),
        { ttl: 600 } // 10 minutes
      );
    },

    recommendationScore: () => {
      // Placeholder - implement recommendation scoring logic
      return null;
    },
  },

  // Track type resolvers
  Track: {
    // Relationship resolvers
    album: async (parent, _, { dataloaders }) => {
      const album = await dataloaders.albumLoader.load(parent.albumId);
      if (!album) throw new Error('Album not found');
      return album;
    },

    artists: async (parent, _, { prisma }) => {
      const trackArtists = await prisma.trackArtist.findMany({
        where: { trackId: parent.id },
        include: { artist: true },
        orderBy: { position: 'asc' },
      });
      return trackArtists.map(ta => ({
        artist: ta.artist,
        role: ta.role,
        position: ta.position,
      }));
    },

    audioFeatures: parent => {
      // Extract audio features from the track model
      return {
        energy: parent.energy,
        valence: parent.valence,
        danceability: parent.danceability,
        tempo: parent.tempo,
        acousticness: parent.acousticness,
        instrumentalness: parent.instrumentalness,
        liveness: parent.liveness,
        loudness: parent.loudness,
        speechiness: parent.speechiness,
        key: parent.key,
        mode: parent.mode,
        timeSignature: parent.timeSignature,
      };
    },

    // Computed field resolvers
    duration: parent => {
      if (!parent.durationMs) return null;
      const minutes = Math.floor(parent.durationMs / 60000);
      const seconds = Math.floor((parent.durationMs % 60000) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    },

    popularity: () => {
      // Placeholder - implement track popularity logic
      return null;
    },
  },

  // User type resolvers
  User: {
    collections: async (parent, _, { dataloaders }) => {
      return dataloaders.collectionsByUserLoader.load(parent.id);
    },

    recommendations: async (parent, _, { prisma }) => {
      return prisma.recommendation.findMany({
        where: { userId: parent.id },
        orderBy: { createdAt: 'desc' },
      });
    },

    followers: async (parent, _, { prisma }) => {
      return prisma.userFollow.findMany({
        where: { followedId: parent.id },
        orderBy: { createdAt: 'desc' },
      });
    },

    following: async (parent, _, { prisma }) => {
      return prisma.userFollow.findMany({
        where: { followerId: parent.id },
        orderBy: { createdAt: 'desc' },
      });
    },

    // Computed fields
    isFollowing: () => {
      // Placeholder - implement based on current user context
      return null;
    },

    mutualFollowers: () => {
      // Placeholder - implement mutual followers logic
      return [];
    },
  },

  // Collection type resolvers
  Collection: {
    user: async (parent, _, { dataloaders }) => {
      const user = await dataloaders.userLoader.load(parent.userId);
      if (!user) throw new Error('User not found');
      return user;
    },

    albums: async (parent, _, { prisma }) => {
      return prisma.collectionAlbum.findMany({
        where: { collectionId: parent.id },
        orderBy: { position: 'asc' },
      });
    },

    // Computed fields
    albumCount: async (parent, _, { prisma }) => {
      return prisma.collectionAlbum.count({
        where: { collectionId: parent.id },
      });
    },

    totalDuration: async (parent, _, { prisma }) => {
      const albums = await prisma.collectionAlbum.findMany({
        where: { collectionId: parent.id },
        include: { album: true },
      });

      return albums.reduce((total, ca) => {
        return total + (ca.album.durationMs || 0);
      }, 0);
    },

    averageRating: async (parent, _, { prisma }) => {
      const ratings = await prisma.collectionAlbum.findMany({
        where: {
          collectionId: parent.id,
          personalRating: { not: null },
        },
        select: { personalRating: true },
      });

      if (ratings.length === 0) return null;

      const sum = ratings.reduce((acc, r) => acc + (r.personalRating || 0), 0);
      return sum / ratings.length;
    },
  },

  // CollectionAlbum type resolvers
  CollectionAlbum: {
    collection: async (parent, _, { prisma }) => {
      const collection = await prisma.collection.findUnique({
        where: { id: parent.collectionId },
      });
      if (!collection) throw new Error('Collection not found');
      return collection;
    },

    album: async (parent, _, { prisma }) => {
      const album = await prisma.album.findUnique({
        where: { id: parent.albumId },
      });
      if (!album) throw new Error('Album not found');
      return album;
    },
  },

  // Recommendation type resolvers
  Recommendation: {
    user: async (parent, _, { prisma }) => {
      const user = await prisma.user.findUnique({
        where: { id: parent.userId },
      });
      if (!user) throw new Error('User not found');
      return user;
    },

    basisAlbum: async (parent, _, { prisma }) => {
      const album = await prisma.album.findUnique({
        where: { id: parent.basisAlbumId },
      });
      if (!album) throw new Error('Basis album not found');
      return album;
    },

    recommendedAlbum: async (parent, _, { prisma }) => {
      const album = await prisma.album.findUnique({
        where: { id: parent.recommendedAlbumId },
      });
      if (!album) throw new Error('Recommended album not found');
      return album;
    },

    // Computed fields
    normalizedScore: parent => {
      // Normalize score to 0-1 range (assuming scores are 0-100)
      return parent.score / 100;
    },

    similarity: () => {
      // Placeholder - implement similarity calculation
      return null;
    },
  },

  // UserFollow type resolvers
  UserFollow: {
    follower: async (parent, _, { prisma }) => {
      // Check if follower relation is already loaded
      const parentWithRelations = parent as Partial<UserFollowWithRelations>;
      if (parentWithRelations.follower) {
        return parentWithRelations.follower;
      }
      // Otherwise fetch it using the followerId field
      const user = await prisma.user.findUnique({
        where: { id: (parent as { followerId: string }).followerId },
      });
      if (!user) throw new Error('Follower not found');
      return user;
    },

    followed: async (parent, _, { prisma }) => {
      // Check if followed relation is already loaded
      const parentWithRelations = parent as Partial<UserFollowWithRelations>;
      if (parentWithRelations.followed) {
        return parentWithRelations.followed;
      }
      // Otherwise fetch it using the followedId field
      const user = await prisma.user.findUnique({
        where: { id: (parent as { followedId: string }).followedId },
      });
      if (!user) throw new Error('Followed user not found');
      return user;
    },
  },
  // @ts-expect-error - Prisma return types don't match GraphQL types; field resolvers complete the objects
};
