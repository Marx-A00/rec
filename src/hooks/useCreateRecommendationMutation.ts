import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  useCreateRecommendationMutation as useGeneratedCreateRecommendationMutation,
  useAddAlbumMutation,
  type AddAlbumMutationVariables,
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
function albumToGraphQLInput(album: Album): AddAlbumMutationVariables['input'] {
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

// ========================================
// Wrapper Hook
// ========================================

/**
 * Wrapper that handles the full recommendation creation flow:
 * 1. Add basisAlbum to database (or get existing)
 * 2. Add recommendedAlbum to database (or get existing)
 * 3. Create recommendation with database UUIDs
 */
export function useCreateRecommendationMutation(
  options: UseCreateRecommendationMutationOptions = {}
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError } = options;

  const addAlbumMutation = useAddAlbumMutation();
  const createRecommendationMutation =
    useGeneratedCreateRecommendationMutation();

  return useMutation({
    mutationFn: async (input: CreateRecommendationWithAlbumsInput) => {
      // Call onSuccess immediately for optimistic UI (close drawer right away)
      onSuccess?.();

      // Step 1 & 2: Add both albums in parallel for faster processing
      const [basisAlbumResult, recommendedAlbumResult] = await Promise.all([
        addAlbumMutation.mutateAsync({
          input: albumToGraphQLInput(input.basisAlbum),
        }),
        addAlbumMutation.mutateAsync({
          input: albumToGraphQLInput(input.recommendedAlbum),
        }),
      ]);

      // Step 3: Create recommendation with database UUIDs
      const recommendation = await createRecommendationMutation.mutateAsync({
        basisAlbumId: basisAlbumResult.addAlbum.id,
        recommendedAlbumId: recommendedAlbumResult.addAlbum.id,
        score: input.score,
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
