import { useQuery } from '@tanstack/react-query';

interface CollectionAlbum {
  id: string;
  personalRating: number | null;
  personalNotes: string | null;
  position: number;
  addedAt: string;
  album: {
    id: string;
    title: string;
    coverArtUrl: string | null;
    releaseDate: string | null;
    artists: Array<{
      artist: {
        id: string;
        name: string;
      };
    }>;
  };
}

interface Collection {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  albums: CollectionAlbum[];
}

interface UserCollectionsResponse {
  user: {
    id: string;
    collections: Collection[];
  };
}

export function useUserCollectionsQuery(userId: string) {
  return useQuery<UserCollectionsResponse>({
    queryKey: ['userCollections', userId],
    queryFn: async () => {
      const query = `
        query GetUserCollections($userId: String!) {
          user(id: $userId) {
            id
            collections {
              id
              name
              description
              isPublic
              albums {
                id
                personalRating
                personalNotes
                position
                addedAt
                album {
                  id
                  title
                  coverArtUrl
                  releaseDate
                  artists {
                    artist {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { userId },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch collections');
      }

      const { data, errors } = await response.json();

      if (errors) {
        throw new Error(errors[0]?.message || 'GraphQL error');
      }

      return data;
    },
    enabled: !!userId,
    staleTime: 30000, // 30 seconds
  });
}

// Hook for just the collection list (without albums)
export function useUserCollectionListQuery(userId: string) {
  return useQuery({
    queryKey: ['userCollectionList', userId],
    queryFn: async () => {
      const query = `
        query GetUserCollectionList($userId: String!) {
          user(id: $userId) {
            id
            collections {
              id
              name
              description
              isPublic
              _count {
                albums
              }
            }
          }
        }
      `;

      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { userId },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch collection list');
      }

      const { data, errors } = await response.json();

      if (errors) {
        throw new Error(errors[0]?.message || 'GraphQL error');
      }

      return data;
    },
    enabled: !!userId,
    staleTime: 60000, // 1 minute
  });
}
