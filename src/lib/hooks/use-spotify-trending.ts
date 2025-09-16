// src/lib/hooks/use-spotify-trending.ts
// React Query hooks for Spotify trending data via GraphQL

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { gql } from 'graphql-request';

// GraphQL query for Spotify trending data
const SPOTIFY_TRENDING_QUERY = gql`
  query GetSpotifyTrending {
    spotifyTrending {
      newReleases {
        id
        name
        artists
        artistIds
        releaseDate
        image
        spotifyUrl
        type
        totalTracks
      }
      featuredPlaylists {
        id
        name
        description
        image
        tracksTotal
        spotifyUrl
        owner
      }
      topCharts {
        playlistName
        playlistId
        playlistImage
        tracks {
          id
          name
          artists
          artistIds
          album
          albumId
          popularity
          image
        }
      }
      popularArtists {
        searchTerm
        artists {
          id
          name
          popularity
          followers
          genres
          image
          spotifyUrl
        }
      }
      needsSync
      expires
      lastUpdated
    }
  }
`;

export interface SpotifyAlbum {
  id: string;
  name: string;
  artists: string;
  artistIds: string[];
  releaseDate: string;
  image?: string;
  spotifyUrl: string;
  type: string;
  totalTracks: number;
}

export interface SpotifyTrendingData {
  newReleases: SpotifyAlbum[];
  featuredPlaylists: any[];
  topCharts: any[];
  popularArtists: any[];
  needsSync: boolean;
  expires: string | null;
  lastUpdated: string | null;
}

// Hook for all Spotify trending data
export function useSpotifyTrending() {
  const queryClient = useQueryClient();

  const query = useQuery<SpotifyTrendingData>({
    queryKey: ['spotify-trending'],
    queryFn: async () => {
      const data = await graphqlClient.request(SPOTIFY_TRENDING_QUERY) as { spotifyTrending: SpotifyTrendingData };
      return data.spotifyTrending;
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false,
  });

  // If data needs sync, trigger it
  if (query.data?.needsSync && !query.isFetching) {
    // Trigger sync in background
    fetch('/api/spotify/sync')
      .then(() => {
        // Refetch after sync completes
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['spotify-trending'] });
        }, 2000);
      })
      .catch(console.error);
  }

  return query;
}

// Hook specifically for Hot Albums (new releases)
export function useHotAlbums(limit: number = 10) {
  const { data, ...rest } = useSpotifyTrending();

  return {
    ...rest,
    data: data?.newReleases?.slice(0, limit) || [],
    totalCount: data?.newReleases?.length || 0,
  };
}

// Hook for featured playlists
export function useFeaturedPlaylists() {
  const { data, ...rest } = useSpotifyTrending();

  return {
    ...rest,
    data: data?.featuredPlaylists || [],
  };
}

// Hook for top charts
export function useTopCharts() {
  const { data, ...rest } = useSpotifyTrending();

  return {
    ...rest,
    data: data?.topCharts || [],
  };
}

// Hook for popular artists
export function usePopularArtists() {
  const { data, ...rest } = useSpotifyTrending();

  return {
    ...rest,
    data: data?.popularArtists || [],
  };
}

// Mutation to trigger Spotify sync manually
export function useSpotifySync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/spotify/sync');
      if (!response.ok) {
        throw new Error('Failed to sync Spotify data');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch Spotify data
      queryClient.invalidateQueries({ queryKey: ['spotify-trending'] });
    },
  });
}