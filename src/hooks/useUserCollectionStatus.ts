import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { graphqlClient } from '@/lib/graphql-client';

interface UserAlbum {
  id: string;
  title: string;
  artist: string;
  releaseDate?: string;
  image?: {
    url: string;
    width: number;
    height: number;
    alt: string;
  };
}

const MY_COLLECTIONS_ALBUMS_QUERY = `
  query GetMyCollectionAlbums {
    myCollections {
      id
      name
      albums {
        id
        album {
          id
          title
          releaseDate
          coverArtUrl
          artists {
            artist {
              name
            }
          }
        }
      }
    }
  }
`;

const fetchUserCollectionAlbums = async (): Promise<UserAlbum[]> => {
  try {
    const data: any = await graphqlClient.request(MY_COLLECTIONS_ALBUMS_QUERY);

    if (!data.myCollections) {
      return [];
    }

    // Flatten all albums from all collections
    const allAlbums: UserAlbum[] = [];

    for (const collection of data.myCollections) {
      for (const collectionAlbum of collection.albums || []) {
        if (collectionAlbum.album) {
          const album = collectionAlbum.album;
          const artistName = album.artists?.[0]?.artist?.name || 'Unknown Artist';

          allAlbums.push({
            id: album.id,
            title: album.title,
            artist: artistName,
            releaseDate: album.releaseDate,
            image: album.coverArtUrl ? {
              url: album.coverArtUrl,
              width: 400,
              height: 400,
              alt: `${album.title} cover`
            } : undefined
          });
        }
      }
    }

    return allAlbums;
  } catch (error) {
    console.error('Failed to fetch collection albums:', error);
    return [];
  }
};

export const useUserCollectionStatus = (albumId: string) => {
  const { data: session } = useSession();

  const { data: userAlbums = [], isLoading } = useQuery({
    queryKey: ['collections', 'user', 'albums'],
    queryFn: fetchUserCollectionAlbums,
    enabled: !!session?.user, // Only fetch if user is authenticated
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  const isInCollection = userAlbums.some(album => album.id === albumId);

  return {
    isInCollection,
    isLoading: isLoading && !!session?.user,
    userAlbums,
  };
};
