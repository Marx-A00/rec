import { useMutation, useQueryClient } from '@tanstack/react-query';

import { graphqlClient } from '@/lib/graphql-client';
import { queryKeys } from '@/lib/queries';
import { Album } from '@/types/album';

const ADD_ALBUM_TO_COLLECTION = `
  mutation AddAlbumToCollection($collectionId: String!, $albumId: UUID!, $position: Int) {
    addAlbumToCollection(
      collectionId: $collectionId,
      input: {
        albumId: $albumId,
        position: $position
      }
    ) {
      id
      collection {
        id
        name
      }
      album {
        id
        title
      }
    }
  }
`;

const addToCollection = async (album: Album): Promise<string> => {
  try {
    // First, try to get existing collections
    const collectionsQuery = `
      query GetMyCollections {
        myCollections {
          id
          name
          albumCount
        }
      }
    `;

    const collectionsData: any = await graphqlClient.request(collectionsQuery);
    let collectionId: string;

    if (!collectionsData.myCollections || collectionsData.myCollections.length === 0) {
      // Create default collection if none exists
      const createMutation = `
        mutation CreateCollection {
          createCollection(name: "My Collection", description: "My music collection", isPublic: false) {
            id
            name
          }
        }
      `;
      const newCollection: any = await graphqlClient.request(createMutation);
      collectionId = newCollection.createCollection.id;
    } else {
      // Use the first collection or find "My Collection"
      const defaultCollection = collectionsData.myCollections.find(
        (c: any) => c.name === 'My Collection'
      ) || collectionsData.myCollections[0];
      collectionId = defaultCollection.id;
    }

    // Now add the album to the collection
    await graphqlClient.request(ADD_ALBUM_TO_COLLECTION, {
      collectionId,
      albumId: album.id,
      position: 0, // Add at the beginning
    });

    return `Added "${album.title}" to collection`;
  } catch (error: any) {
    if (error.response?.errors?.[0]) {
      throw new Error(error.response.errors[0].message);
    }
    throw new Error('Failed to add to collection');
  }
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
      // Invalidate user collections specifically
      queryClient.invalidateQueries({ queryKey: ['collections', 'user'] });
      // Invalidate user collection albums for the collection status hook
      queryClient.invalidateQueries({
        queryKey: ['collections', 'user', 'albums'],
      });

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
