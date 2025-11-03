import { useSession } from 'next-auth/react';
import { useMemo } from 'react';

import { useGetMyCollectionsQuery } from '@/generated/graphql';

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

export const useUserCollectionStatus = (albumId: string) => {
  const { data: session } = useSession();

  // Use the generated GraphQL hook
  const { data, isLoading } = useGetMyCollectionsQuery(
    {},
    {
      enabled: !!session?.user, // Only fetch if user is authenticated
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    }
  );

  // Transform and filter the data
  const userAlbums = useMemo((): UserAlbum[] => {
    if (!data?.myCollections) {
      return [];
    }

    // Get albums only from "My Collection" (not Listen Later or other collections)
    const allAlbums: UserAlbum[] = [];

    for (const collection of data.myCollections) {
      // Only check the "My Collection" collection (not Listen Later or other collections)
      if (collection.name !== 'My Collection') continue;

      for (const collectionAlbum of collection.albums || []) {
        if (collectionAlbum.album) {
          const album = collectionAlbum.album;
          const artistName =
            album.artists?.[0]?.artist?.name || 'Unknown Artist';

          allAlbums.push({
            id: album.id,
            title: album.title,
            artist: artistName,
            releaseDate: album.releaseDate
              ? album.releaseDate.toString()
              : undefined,
            image: album.coverArtUrl
              ? {
                  url: album.coverArtUrl,
                  width: 400,
                  height: 400,
                  alt: `${album.title} cover`,
                }
              : undefined,
          });
        }
      }
    }

    return allAlbums;
  }, [data]);

  const isInCollection = userAlbums.some(album => album.id === albumId);

  return {
    isInCollection,
    isLoading: isLoading && !!session?.user,
    userAlbums,
  };
};
