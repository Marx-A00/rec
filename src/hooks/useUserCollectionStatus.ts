import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

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

const fetchUserCollectionAlbums = async (): Promise<UserAlbum[]> => {
  const response = await fetch('/api/collections/user/albums');

  if (!response.ok) {
    if (response.status === 401) {
      return []; // User not authenticated
    }
    throw new Error('Failed to fetch user collection');
  }

  const data = await response.json();
  return data.albums || [];
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
