import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Album } from '@/types/album';

async function fetchAlbumDetails(albumId: string): Promise<Album> {
  const response = await fetch(`/api/albums/${albumId}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch album details');
  }
  const data = await response.json();
  return data.album;
}

export function useAlbumDetails(albumId: string, initialData?: Album) {
  return useQuery({
    queryKey: ['album', albumId],
    queryFn: () => fetchAlbumDetails(albumId),
    enabled: !!albumId,
    initialData, // This replaces sessionStorage!
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
