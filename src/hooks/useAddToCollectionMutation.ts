import { useMutation, useQueryClient } from '@tanstack/react-query';

import { graphqlClient } from '@/lib/graphql-client';
import { queryKeys } from '@/lib/queries';
import { Album } from '@/types/album';
import type { AlbumInput } from '@/generated/graphql';

const ADD_ALBUM_TO_COLLECTION_WITH_CREATE = `
  mutation AddAlbumToCollectionWithCreate($input: AddAlbumToCollectionWithCreateInput!) {
    addAlbumToCollectionWithCreate(input: $input) {
      id
    }
  }
`;

const GET_ALBUM = `
  query GetAlbum($id: UUID!) {
    album(id: $id) { id }
  }
`;

// Build AlbumInput from Album object
function buildAlbumInput(album: Album): AlbumInput {
  const artistInputs = (album.artists || []).map(a => ({ artistName: a.name }));

  const input: AlbumInput = {
    title: album.title || 'Unknown Album',
    artists:
      artistInputs.length > 0
        ? artistInputs
        : [{ artistName: 'Unknown Artist' }],
  };

  // Attach MusicBrainz ID only if explicitly provided on the album
  if (album.source === 'musicbrainz' && album.musicbrainzId) {
    input.musicbrainzId = album.musicbrainzId;
  }

  // Optional fields
  if (album.releaseDate) input.releaseDate = album.releaseDate;
  if (album.metadata?.numberOfTracks)
    input.totalTracks = album.metadata.numberOfTracks;
  if (album.image?.url) input.coverImageUrl = album.image.url;

  return input;
}

// Check if album exists in local DB
async function checkLocalAlbumExists(albumId: string): Promise<string | null> {
  try {
    const existing: { album?: { id: string } } = await graphqlClient.request(
      GET_ALBUM,
      { id: albumId }
    );
    return existing?.album?.id || null;
  } catch {
    return null;
  }
}

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

    const collectionsData: { myCollections?: { id: string; name: string }[] } =
      await graphqlClient.request(collectionsQuery);
    let collectionId: string;

    if (
      !collectionsData.myCollections ||
      collectionsData.myCollections.length === 0
    ) {
      // Create default collection if none exists
      const createMutation = `
        mutation CreateCollection {
          createCollection(name: "My Collection", description: "My music collection", isPublic: false) {
            id
          }
        }
      `;
      const newCollection: { createCollection: { id: string } } =
        await graphqlClient.request(createMutation);
      collectionId = newCollection.createCollection.id;
    } else {
      // Use the first collection or find "My Collection"
      const defaultCollection =
        collectionsData.myCollections.find(c => c.name === 'My Collection') ||
        collectionsData.myCollections[0];
      collectionId = defaultCollection.id;
    }

    // Check if album exists in local DB
    const existingAlbumId = await checkLocalAlbumExists(album.id);

    // Use combined mutation - pass albumId if exists, otherwise albumData
    await graphqlClient.request(ADD_ALBUM_TO_COLLECTION_WITH_CREATE, {
      input: {
        collectionId,
        position: 0, // Add at the beginning
        ...(existingAlbumId
          ? { albumId: existingAlbumId }
          : { albumData: buildAlbumInput(album) }),
      },
    });

    return `Added "${album.title}" to collection`;
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      error.response &&
      typeof error.response === 'object' &&
      'errors' in error.response &&
      Array.isArray(error.response.errors) &&
      error.response.errors[0]
    ) {
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
