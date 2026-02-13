import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  useCreateRecommendationWithAlbumsMutation,
  type AlbumInput,
} from '@/generated/graphql';
import { queryKeys } from '@/lib/queries';
import type { Album } from '@/types/album';

// ========================================
// Types
// ========================================

export interface CreateRecommendationWithAlbumsInput {
  basisAlbum: Album;
  recommendedAlbum: Album;
  score: number;
}

export interface UseCreateRecommendationMutationOptions {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

// ========================================
// Helper Functions
// ========================================

/**
 * Convert Album from search results to AlbumInput for GraphQL
 */
function albumToGraphQLInput(album: Album): AlbumInput {
  return {
    title: album.title,
    releaseDate:
      album.releaseDate || (album.year ? album.year.toString() : null),
    albumType: album.type || 'ALBUM',
    totalTracks: album.metadata?.numberOfTracks || album.tracks?.length || null,
    coverImageUrl: album.image?.url || null,
    // Only use actual MusicBrainz IDs, never fall back to database UUIDs
    musicbrainzId: album.musicbrainzId || null,
    artists: [
      {
        artistName: album.artists?.[0]?.name || 'Unknown Artist',
        role: 'PRIMARY',
      },
    ],
  };
}

/**
 * Check if an album already exists in the local database
 * (has a valid UUID format and source indicates it's from our DB)
 */
function isLocalDatabaseAlbum(album: Album): boolean {
  // Check if the ID is a valid UUID format (local DB albums have UUIDs)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return (
    uuidRegex.test(album.id) &&
    (album.source === 'local' || album.source === undefined)
  );
}

// ========================================
// Wrapper Hook
// ========================================

/**
 * Wrapper that handles the full recommendation creation flow using
 * the combined createRecommendation mutation with inline album creation.
 *
 * This approach:
 * - Uses a single network round trip instead of 2-3
 * - Provides atomic transaction (all or nothing)
 * - Maintains proper LlamaLog provenance chains
 */
export function useCreateRecommendationMutation(
  options: UseCreateRecommendationMutationOptions = {}
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError } = options;

  const createRecommendationMutation =
    useCreateRecommendationWithAlbumsMutation();

  return useMutation({
    mutationFn: async (input: CreateRecommendationWithAlbumsInput) => {
      // Call onSuccess immediately for optimistic UI (close drawer right away)
      onSuccess?.();

      // Build the input object based on whether albums exist in DB
      const basisIsLocal = isLocalDatabaseAlbum(input.basisAlbum);
      const recommendedIsLocal = isLocalDatabaseAlbum(input.recommendedAlbum);

      // Use the combined mutation with inline album creation
      const recommendation = await createRecommendationMutation.mutateAsync({
        input: {
          score: input.score,
          // Basis album: use ID if exists in DB, otherwise provide data for creation
          ...(basisIsLocal
            ? { basisAlbumId: input.basisAlbum.id }
            : { basisAlbumData: albumToGraphQLInput(input.basisAlbum) }),
          // Recommended album: use ID if exists in DB, otherwise provide data for creation
          ...(recommendedIsLocal
            ? { recommendedAlbumId: input.recommendedAlbum.id }
            : {
                recommendedAlbumData: albumToGraphQLInput(
                  input.recommendedAlbum
                ),
              }),
        },
      });

      return recommendation;
    },
    onSuccess: () => {
      // Invalidate and refetch recommendations after mutation completes
      queryClient.invalidateQueries({
        queryKey: queryKeys.recommendations(),
      });
    },
    onError: error => {
      onError?.(error);
    },
  });
}

// Re-export generated types for convenience
export type { CreateRecommendationMutationVariables } from '@/generated/graphql';
export { QueryError, isQueryError, getErrorMessage } from '@/lib/queries';
