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

const GET_ALBUM = `
  query GetAlbum($id: UUID!) {
    album(id: $id) { id }
  }
`;

const ADD_ALBUM = `
  mutation AddAlbum($input: AlbumInput!) {
    addAlbum(input: $input) { id title }
  }
`;

async function ensureLocalAlbumId(album: Album): Promise<string> {
  // 1) If a local DB album with this ID exists, use it (local source path)
  try {
    const existing: any = await graphqlClient.request(GET_ALBUM, {
      id: album.id,
    });
    if (existing?.album?.id) {
      return existing.album.id as string;
    }
  } catch (_) {
    // ignore and fallback to create path
  }

  // 2) Create the album using explicit source identifiers (no inference)
  const artistInputs = (album.artists || []).map(a => ({ artistName: a.name }));

  const input: any = {
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

  const created: any = await graphqlClient.request(ADD_ALBUM, { input });
  return created.addAlbum.id as string;
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

    const collectionsData: any = await graphqlClient.request(collectionsQuery);
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
            name
          }
        }
      `;
      const newCollection: any = await graphqlClient.request(createMutation);
      collectionId = newCollection.createCollection.id;
    } else {
      // Use the first collection or find "My Collection"
      const defaultCollection =
        collectionsData.myCollections.find(
          (c: any) => c.name === 'My Collection'
        ) || collectionsData.myCollections[0];
      collectionId = defaultCollection.id;
    }

    // Ensure we have a local album ID (create from MBID/metadata if needed)
    const localAlbumId = await ensureLocalAlbumId(album);

    // Now add the album to the collection using the local DB album ID
    await graphqlClient.request(ADD_ALBUM_TO_COLLECTION, {
      collectionId,
      albumId: localAlbumId,
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
