// Central export for all sample data
export * from './users';
export * from './albums';
export * from './tracks';
export * from './recommendations';
export * from './collections';

// Import all sample data for helper functions
import { sampleUsers } from './users';
import { sampleAlbums } from './albums';
import { sampleTracks } from './tracks';
import { sampleRecommendations } from './recommendations';
import { sampleCollections } from './collections';

// Helper to get all sample data
export const getAllSampleData = () => ({
  users: sampleUsers,
  albums: sampleAlbums,
  tracks: sampleTracks,
  recommendations: sampleRecommendations,
  collections: sampleCollections,
});

// Helper functions for cross-referencing data
export const getAlbumsByUserId = (userId: string) => {
  const userRecommendations = sampleRecommendations.filter(
    rec => rec.userId === userId
  );
  const albumIds = new Set([
    ...userRecommendations.map(rec => rec.basisAlbumId),
    ...userRecommendations.map(rec => rec.recommendedAlbumId),
  ]);
  return sampleAlbums.filter(album => albumIds.has(album.id));
};

export const getRecommendationsByUserId = (userId: string) => {
  return sampleRecommendations.filter(rec => rec.userId === userId);
};

// Get detailed recommendations with full album information
export const getDetailedRecommendationsByUserId = (userId: string) => {
  const userRecommendations = sampleRecommendations.filter(
    rec => rec.userId === userId
  );

  return userRecommendations
    .map(rec => {
      const basisAlbum = sampleAlbums.find(
        album => album.id === rec.basisAlbumId
      );
      const recommendedAlbum = sampleAlbums.find(
        album => album.id === rec.recommendedAlbumId
      );

      if (!basisAlbum || !recommendedAlbum) {
        return null;
      }

      return {
        id: rec.id,
        score: rec.score,
        createdAt: rec.createdAt.toISOString(),
        basisAlbum: {
          id: basisAlbum.id,
          title: basisAlbum.title,
          artist: basisAlbum.artist,
          releaseDate: basisAlbum.releaseDate,
          genre: basisAlbum.genre,
          label: basisAlbum.label,
          image: {
            url: basisAlbum.imageUrl || '',
            width: 400,
            height: 400,
            alt: `${basisAlbum.title} album cover`,
          },
        },
        recommendedAlbum: {
          id: recommendedAlbum.id,
          title: recommendedAlbum.title,
          artist: recommendedAlbum.artist,
          releaseDate: recommendedAlbum.releaseDate,
          genre: recommendedAlbum.genre,
          label: recommendedAlbum.label,
          image: {
            url: recommendedAlbum.imageUrl || '',
            width: 400,
            height: 400,
            alt: `${recommendedAlbum.title} album cover`,
          },
        },
      };
    })
    .filter((rec): rec is NonNullable<typeof rec> => rec !== null); // Type-safe filter for non-null recommendations
};

export const getTracksByAlbumId = (albumId: string) => {
  return sampleTracks.filter(track => track.albumId === albumId);
};

export const getUserById = (userId: string) => {
  return sampleUsers.find(user => user.id === userId);
};

export const getAlbumById = (albumId: string) => {
  return sampleAlbums.find(album => album.id === albumId);
};

// Statistics helpers
export const getSampleDataStats = () => {
  return {
    totalUsers: sampleUsers.length,
    totalAlbums: sampleAlbums.length,
    totalTracks: sampleTracks.length,
    totalRecommendations: sampleRecommendations.length,
    totalCollections: sampleCollections.length,
    averageRecommendationScore: Math.round(
      sampleRecommendations.reduce((sum, rec) => sum + rec.score, 0) /
        sampleRecommendations.length
    ),
    genreDistribution: sampleAlbums.reduce(
      (acc, album) => {
        album.genre.forEach(genre => {
          acc[genre] = (acc[genre] || 0) + 1;
        });
        return acc;
      },
      {} as Record<string, number>
    ),
  };
};
