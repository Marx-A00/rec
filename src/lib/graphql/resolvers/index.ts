// GraphQL resolvers have major type issues after schema migration, need complete rewrite
// src/lib/graphql/resolvers/index.ts
// Main resolver map for Apollo Server

import { Resolvers } from '@/generated/resolvers-types';
import type { ResolversTypes } from '@/generated/resolvers-types';
import {
  SearchOrchestrator,
  SearchSource,
  SearchType,
} from '@/lib/search/SearchOrchestrator';
import { unifiedArtistService } from '@/lib/api/unified-artist-service';

import { scalarResolvers } from './scalars';
import { queryResolvers } from './queries';
import { mutationResolvers } from './mutations';
import { subscriptionResolvers } from './subscriptions';

// Production-ready resolvers with DataLoader optimization
export const resolvers: Resolvers = {
  ...scalarResolvers,

  Query: {
    ...queryResolvers,

    // Admin users query
    users: async (_, { offset = 0, limit = 20, search }, { prisma }) => {
      const where = search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {};

      const users = await prisma.user.findMany({
        where,
        skip: offset,
        take: limit,
        include: {
          collections: {
            select: {
              id: true,
              name: true,
            },
            take: 5,
          },
          _count: {
            select: {
              collections: true,
              recommendations: true,
            },
          },
        },
        orderBy: { id: 'desc' }, // Order by ID since createdAt doesn't exist
      });

      return users as unknown as ResolversTypes['User'][];
    },

    usersCount: async (_, { search }, { prisma }) => {
      const where = search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {};

      return prisma.user.count({ where });
    },
    health: () => `GraphQL server running at ${new Date().toISOString()}`,

    // Basic entity queries using DataLoaders
    artist: async (_, { id }, { dataloaders }) => {
      return await dataloaders.artistLoader.load(id);
    },

    album: async (_, { id }, { dataloaders }) => {
      return await dataloaders.albumLoader.load(id);
    },

    track: async (_, { id }, { dataloaders }) => {
      return await dataloaders.trackLoader.load(id);
    },

    user: async (_, { id }, { dataloaders }) => {
      return await dataloaders.userLoader.load(id);
    },

    collection: async (_, { id }, { dataloaders }) => {
      return await dataloaders.collectionLoader.load(id);
    },

    recommendation: async (_, { id }, { prisma }) => {
      const rec = await prisma.recommendation.findUnique({
        where: { id },
        include: {
          basisAlbum: true,
          recommendedAlbum: true,
          user: true,
        },
      });
      return rec as unknown as ResolversTypes['Recommendation'] | null;
    },

    // Unified artist discography for client components
    artistDiscography: async (_, { id }) => {
      const discography = await unifiedArtistService.getArtistDiscography(id);

      type UnifiedDiscographyItem = {
        id: string;
        source?: string | null;
        title: string;
        releaseDate?: string | null;
        primaryType?: string | null;
        secondaryTypes?: string[] | null;
        imageUrl?: string | null;
        thumb?: string | null;
        coverImage?: string | null;
        artist?: string | null;
        artistName?: string | null;
        artistCredits?: Array<{
          artist?: { id?: string; name?: string } | null;
          name?: string | null;
          role?: string | null;
          position?: number | null;
        }>;
        trackCount?: number | null;
      };

      // Map to GraphQL UnifiedRelease type
      return discography.map((release: UnifiedDiscographyItem) => ({
        id: release.id,
        source: release.source?.toUpperCase() || 'UNKNOWN',
        title: release.title,
        releaseDate: release.releaseDate,
        primaryType: release.primaryType,
        secondaryTypes: release.secondaryTypes || [],
        imageUrl:
          release.imageUrl || release.thumb || release.coverImage || null,
        artistName: release.artist || release.artistName || '',
        artistCredits: Array.isArray(release.artistCredits)
          ? release.artistCredits.map((c: any) => ({
              artist: {
                id: c.artist?.id || '',
                name: c.artist?.name || c.name || '',
              },
              role: c.role || null,
              position: typeof c.position === 'number' ? c.position : null,
            }))
          : [],
        trackCount: release.trackCount || null,
        year: release.releaseDate
          ? new Date(release.releaseDate).getFullYear()
          : null,
      }));
    },

    // Enhanced search using SearchOrchestrator
    search: async (_, { input }, { prisma }) => {
      const {
        query,
        type = 'ALL',
        limit = 20,
        searchMode = 'LOCAL_ONLY',
      } = input;

      try {
        // Create SearchOrchestrator instance
        const orchestrator = new SearchOrchestrator(prisma);

        // Map GraphQL search type to SearchType[]
        let searchTypes: SearchType[] = [];
        if (type === 'ALL') {
          searchTypes = ['album', 'artist', 'track'];
        } else if (type === 'ARTIST') {
          searchTypes = ['artist'];
        } else if (type === 'ALBUM') {
          searchTypes = ['album'];
        } else if (type === 'TRACK') {
          searchTypes = ['track'];
        }

        // Determine which sources to search based on searchMode
        let sources: SearchSource[] = [];
        if (searchMode === 'LOCAL_ONLY') {
          sources = [SearchSource.LOCAL];
        } else if (searchMode === 'LOCAL_AND_EXTERNAL') {
          sources = [SearchSource.LOCAL, SearchSource.MUSICBRAINZ];
        } else if (searchMode === 'EXTERNAL_ONLY') {
          sources = [SearchSource.MUSICBRAINZ];
        }

        // Perform orchestrated search
        const searchResult = await orchestrator.search({
          query,
          types: searchTypes,
          sources,
          limit: limit ?? 20,
          deduplicateResults: true,
        });

        // Separate results by source
        const localResults = searchResult.sources.local?.results || [];
        const musicbrainzResults =
          searchResult.sources.musicbrainz?.results || [];

        // For local results, fetch from database
        const localAlbumIds = localResults
          .filter(r => r.type === 'album')
          .map(r => r.id);
        const localArtistIds = localResults
          .filter(r => r.type === 'artist')
          .map(r => r.id);
        const localTrackIds = localResults
          .filter(r => r.type === 'track')
          .map(r => r.id);

        const dbAlbums =
          localAlbumIds.length > 0
            ? await prisma.album.findMany({
                where: { id: { in: localAlbumIds } },
                include: {
                  artists: {
                    include: {
                      artist: true,
                    },
                  },
                },
              })
            : [];

        const dbArtists =
          localArtistIds.length > 0
            ? await prisma.artist.findMany({
                where: { id: { in: localArtistIds } },
              })
            : [];

        const dbTracks =
          localTrackIds.length > 0
            ? await prisma.track.findMany({
                where: { id: { in: localTrackIds } },
                include: {
                  album: true,
                  artists: {
                    include: {
                      artist: true,
                    },
                  },
                },
              })
            : [];

        // For MusicBrainz results, check if they already exist in DB
        const mbAlbumIds = musicbrainzResults
          .filter(r => r.type === 'album')
          .map(r => r.id);
        const mbArtistIds = musicbrainzResults
          .filter(r => r.type === 'artist')
          .map(r => r.id);
        const mbTrackIds = musicbrainzResults
          .filter(r => r.type === 'track')
          .map(r => r.id);

        // Find which MusicBrainz items already exist in our DB
        const existingMbAlbums =
          mbAlbumIds.length > 0
            ? await prisma.album.findMany({
                where: { musicbrainzId: { in: mbAlbumIds } },
                include: {
                  artists: {
                    include: {
                      artist: true,
                    },
                  },
                },
              })
            : [];

        const existingMbArtists =
          mbArtistIds.length > 0
            ? await prisma.artist.findMany({
                where: { musicbrainzId: { in: mbArtistIds } },
              })
            : [];

        const existingMbTracks =
          mbTrackIds.length > 0
            ? await prisma.track.findMany({
                where: { musicbrainzId: { in: mbTrackIds } },
                include: {
                  album: true,
                  artists: {
                    include: {
                      artist: true,
                    },
                  },
                },
              })
            : [];

        // For MusicBrainz results NOT in DB, create temporary objects
        const existingMbAlbumIds = new Set(
          existingMbAlbums.map(a => a.musicbrainzId)
        );
        const existingMbArtistIds = new Set(
          existingMbArtists.map(a => a.musicbrainzId)
        );
        const existingMbTrackIds = new Set(
          existingMbTracks.map(t => t.musicbrainzId)
        );

        const newMbAlbums = musicbrainzResults
          .filter(r => r.type === 'album' && !existingMbAlbumIds.has(r.id))
          .map(r => ({
            id: r.id, // Use MusicBrainz ID as temporary ID
            musicbrainzId: r.id,
            title: r.title,
            releaseDate: r.releaseDate || null, // Handle empty strings
            coverArtUrl: null,
            artists: [],
          }));

        const newMbArtists = musicbrainzResults
          .filter(r => r.type === 'artist' && !existingMbArtistIds.has(r.id))
          .map(r => ({
            id: r.id, // Use MusicBrainz ID as temporary ID
            musicbrainzId: r.id,
            name: r.title, // title is the artist name in UnifiedSearchResult
            imageUrl: null,
          }));

        const newMbTracks = musicbrainzResults
          .filter(r => r.type === 'track' && !existingMbTrackIds.has(r.id))
          .map(r => ({
            id: r.id, // Use MusicBrainz ID as temporary ID
            musicbrainzId: r.id,
            title: r.title,
            durationMs: 0,
            trackNumber: 0,
            albumId: null, // Set albumId to null instead of album object
            album: null,
            artists: [],
          }));

        // Combine all results
        const albums = [...dbAlbums, ...existingMbAlbums, ...newMbAlbums];
        const artists = [...dbArtists, ...existingMbArtists, ...newMbArtists];
        const tracks = [...dbTracks, ...existingMbTracks, ...newMbTracks];

        return {
          artists,
          albums,
          tracks,
          total: searchResult.totalResults,
          hasMore: false,
        } as unknown as ResolversTypes['SearchResults'];
      } catch (error) {
        console.error('Search error:', error);
        return {
          artists: [],
          albums: [],
          tracks: [],
          total: 0,
          hasMore: false,
        } as unknown as ResolversTypes['SearchResults'];
      }
    },
  },

  // Type resolvers for relationships
  Artist: {
    albums: async (parent, _, { dataloaders }) => {
      return dataloaders.albumsByArtistLoader.load(parent.id);
    },
    // Computed fields with simple implementations
    albumCount: async (parent, _, { prisma }) => {
      return prisma.albumArtist.count({ where: { artistId: parent.id } });
    },
    trackCount: async (parent, _, { prisma }) => {
      return prisma.trackArtist.count({ where: { artistId: parent.id } });
    },
    popularity: () => null, // Placeholder
  },

  Album: {
    artists: async (parent, _, { dataloaders }) => {
      return dataloaders.artistsByAlbumLoader.load(parent.id);
    },
    tracks: async (parent, _, { dataloaders }) => {
      return dataloaders.tracksByAlbumLoader.load(parent.id);
    },
    // Computed fields
    duration: parent => {
      if (!parent.durationMs) return null;
      const minutes = Math.floor(parent.durationMs / 60000);
      const seconds = Math.floor((parent.durationMs % 60000) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    },
    averageRating: () => null, // Placeholder
    inCollectionsCount: async (parent, _, { prisma }) => {
      return prisma.collectionAlbum.count({ where: { albumId: parent.id } });
    },
    recommendationScore: () => null, // Placeholder
  },

  Track: {
    album: async (parent, _, { dataloaders }) => {
      if (!parent.albumId) return null;
      return dataloaders.albumLoader.load(parent.albumId);
    },
    artists: async (parent, _, { prisma }) => {
      const trackArtists = await prisma.trackArtist.findMany({
        where: { trackId: parent.id },
        include: { artist: true },
        orderBy: { position: 'asc' },
      });
      const credits = trackArtists.map(ta => ({
        artist: ta.artist,
        role: ta.role || 'performer',
        position: ta.position,
      }));
      return credits as unknown as ResolversTypes['ArtistCredit'][];
    },
    // Simplified audio features
    audioFeatures: () => null, // Placeholder - would need audio features data
    duration: parent => {
      if (!parent.durationMs) return null;
      const minutes = Math.floor(parent.durationMs / 60000);
      const seconds = Math.floor((parent.durationMs % 60000) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    },
    popularity: () => null, // Placeholder
  },

  User: {
    collections: async (parent, _, { dataloaders }) => {
      return dataloaders.collectionsByUserLoader.load(parent.id);
    },
    isFollowing: () => null, // Placeholder
    mutualFollowers: () => [], // Placeholder
    _count: async parent => {
      // Return the _count object if it exists (from Prisma include)
      if (parent._count) {
        return parent._count;
      }
      // Otherwise return defaults
      return {
        collections: 0,
        recommendations: 0,
      };
    },
  },

  Collection: {
    user: async (parent, _, { dataloaders }) => {
      return dataloaders.userLoader.load(parent.user.id);
    },
    albums: async (parent, _, { prisma }) => {
      // Fetch collection albums with their album data
      const collectionAlbums = await prisma.collectionAlbum.findMany({
        where: { collectionId: parent.id },
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
        orderBy: { position: 'asc' },
      });

      return collectionAlbums as unknown as ResolversTypes['CollectionAlbum'][];
    },
    // Simplified computed fields
    albumCount: async (parent, _, { prisma }) => {
      return prisma.collectionAlbum.count({
        where: { collectionId: parent.id },
      });
    },
    totalDuration: () => 0, // Placeholder
    averageRating: () => null, // Placeholder
  },

  // Resolve nested fields for collection-album pivot
  CollectionAlbum: {
    collection: async parent => {
      // Return minimal object; field resolvers will populate related fields
      return {
        id: (parent as any).collection.id,
      } as unknown as ResolversTypes['Collection'];
    },
    album: async parent => {
      return {
        id: (parent as any).album.id,
      } as unknown as ResolversTypes['Album'];
    },
  },

  Mutation: {
    ...mutationResolvers,
  },

  Subscription: subscriptionResolvers,
};
