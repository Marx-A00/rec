import { useSession } from 'next-auth/react';
import { useMemo } from 'react';

import { useGetMyCollectionsQuery } from '@/generated/graphql';

interface ListenLaterAlbum {
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

export const useListenLaterStatus = (albumId: string) => {
  const { data: session } = useSession();

  // Use the same generated GraphQL hook as useUserCollectionStatus
  // This means both hooks share the same cache - only one network request!
  const { data, isLoading } = useGetMyCollectionsQuery(
    {},
    {
      enabled: !!session?.user, // Only fetch if user is authenticated
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    }
  );

  // Transform and filter the data
  const listenLaterAlbums = useMemo((): ListenLaterAlbum[] => {
    if (!data?.myCollections) {
      return [];
    }

    // Find the "Listen Later" collection specifically
    const listenLaterCollection = data.myCollections.find(
      collection => collection.name === 'Listen Later'
    );

    if (!listenLaterCollection) {
      return [];
    }

    // Map albums from the Listen Later collection
    const albums: ListenLaterAlbum[] = [];

    for (const collectionAlbum of listenLaterCollection.albums || []) {
      if (collectionAlbum.album) {
        const album = collectionAlbum.album;
        const artistName = album.artists?.[0]?.artist?.name || 'Unknown Artist';

        albums.push({
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

    return albums;
  }, [data]);

  const isInListenLater = listenLaterAlbums.some(album => album.id === albumId);

  return {
    isInListenLater,
    isLoading: isLoading && !!session?.user,
    listenLaterAlbums,
  };
};
