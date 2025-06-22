import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queries';
import { Album } from '@/types/album';
import { sanitizeArtistName } from '@/lib/utils';

interface AddToCollectionRequest {
  albumId: string;
  albumTitle: string;
  albumArtist: string;
  albumYear?: number;
  albumImageUrl?: string;
}

const addToCollection = async (album: Album): Promise<string> => {
  const response = await fetch(`/api/albums/${album.id}/add-to-collection`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      albumTitle: album.title,
      albumArtist: sanitizeArtistName(
        album.artists?.[0]?.name || 'Unknown Artist'
      ),
      albumYear: album.year,
      albumImageUrl: album.image?.url,
      // Let API create/use default collection
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to add to collection');
  }

  const data = await response.json();
  return data.message;
};

interface UseAddToCollectionMutationOptions {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export const useAddToCollectionMutation = (
  options: UseAddToCollectionMutationOptions = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addToCollection,
    onSuccess: message => {
      // Invalidate collections queries to refetch the updated data
      queryClient.invalidateQueries({ queryKey: queryKeys.collections() });
      // We invalidate all user collections since we don't know the current user's ID here
      queryClient.invalidateQueries({ queryKey: ['collections', 'user'] });

      if (options.onSuccess) {
        options.onSuccess(message);
      }
    },
    onError: error => {
      console.error('Error adding to collection:', error);
      if (options.onError) {
        options.onError(
          error instanceof Error ? error.message : 'Failed to add to collection'
        );
      }
    },
  });
};
