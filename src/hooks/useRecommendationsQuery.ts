import { useQuery } from '@tanstack/react-query';

import { graphqlClient } from '@/lib/graphql-client';
import { RecommendationsResponse } from '@/types/recommendation';
import {
  queryKeys,
  defaultQueryOptions,
  QueryError,
} from '@/lib/queries';

// ========================================
// GraphQL Queries
// ========================================

const RECOMMENDATION_FEED_QUERY = `
  query GetRecommendationFeed($cursor: String, $limit: Int) {
    recommendationFeed(cursor: $cursor, limit: $limit) {
      recommendations {
        id
        score
        createdAt
        user {
          id
          name
          image
        }
        basisAlbum {
          id
          title
          coverArtUrl
          artists {
            artist {
              name
            }
          }
        }
        recommendedAlbum {
          id
          title
          coverArtUrl
          artists {
            artist {
              name
            }
          }
        }
      }
      cursor
      hasMore
    }
  }
`;

const MY_RECOMMENDATIONS_QUERY = `
  query GetMyRecommendations($sort: RecommendationSort, $limit: Int) {
    myRecommendations(sort: $sort, limit: $limit) {
      id
      score
      createdAt
      user {
        id
        name
        image
      }
      basisAlbum {
        id
        title
        coverArtUrl
        artists {
          artist {
            name
          }
        }
      }
      recommendedAlbum {
        id
        title
        coverArtUrl
        artists {
          artist {
            name
          }
        }
      }
    }
  }
`;

// ========================================
// API Functions
// ========================================

const fetchRecommendations = async (
  page: number = 1,
  perPage: number = 10,
  userId?: string
): Promise<RecommendationsResponse> => {
  try {
    // If userId is provided, fetch that user's recommendations
    // Otherwise fetch the general feed
    console.log('Fetching recommendations with:', { page, perPage, userId });

    const data: any = userId
      ? await graphqlClient.request(MY_RECOMMENDATIONS_QUERY, { limit: perPage, sort: 'SCORE_DESC' })
      : await graphqlClient.request(RECOMMENDATION_FEED_QUERY, { limit: perPage, cursor: null });

    console.log('GraphQL response:', data);

    // Transform GraphQL response to match expected format
    const rawRecommendations = userId
      ? data.myRecommendations
      : data.recommendationFeed?.recommendations;

    // Transform the nested GraphQL response to flat structure expected by frontend
    const recommendations = (rawRecommendations || []).map((rec: any) => ({
      id: rec.id,
      score: rec.score,
      createdAt: rec.createdAt,
      updatedAt: rec.updatedAt || rec.createdAt,
      userId: rec.user?.id || '',

      // Transform nested album data to flat structure
      basisAlbumDiscogsId: rec.basisAlbum?.id || '',
      basisAlbumTitle: rec.basisAlbum?.title || '',
      basisAlbumArtist: rec.basisAlbum?.artists?.map((a: any) => a.artist.name).join(', ') || '',
      basisAlbumImageUrl: rec.basisAlbum?.coverArtUrl || null,
      basisAlbumYear: rec.basisAlbum?.releaseDate ? new Date(rec.basisAlbum.releaseDate).getFullYear().toString() : null,

      recommendedAlbumDiscogsId: rec.recommendedAlbum?.id || '',
      recommendedAlbumTitle: rec.recommendedAlbum?.title || '',
      recommendedAlbumArtist: rec.recommendedAlbum?.artists?.map((a: any) => a.artist.name).join(', ') || '',
      recommendedAlbumImageUrl: rec.recommendedAlbum?.coverArtUrl || null,
      recommendedAlbumYear: rec.recommendedAlbum?.releaseDate ? new Date(rec.recommendedAlbum.releaseDate).getFullYear().toString() : null,

      // Include user data
      user: rec.user
    }));

    return {
      recommendations,
      pagination: {
        total: recommendations.length,
        per_page: perPage,
        page: page,
        has_more: userId ? false : data.recommendationFeed?.hasMore || false
      },
      success: true
    };
  } catch (error: any) {
    console.error('Error fetching recommendations:', error);
    if (error.response?.errors?.[0]) {
      throw new QueryError(error.response.errors[0].message);
    }
    throw new QueryError('Failed to fetch recommendations');
  }
};

// ========================================
// Hook
// ========================================

export interface UseRecommendationsQueryOptions {
  page?: number;
  perPage?: number;
  userId?: string;
  enabled?: boolean;
}

export function useRecommendationsQuery(
  options: UseRecommendationsQueryOptions = {}
) {
  const { page = 1, perPage = 10, userId, enabled = true } = options;

  return useQuery({
    queryKey: userId
      ? queryKeys.recommendationsByUser(userId)
      : queryKeys.recommendations(),
    queryFn: () => fetchRecommendations(page, perPage, userId),
    enabled,
    // Use realtime options for recommendations as they change frequently
    ...defaultQueryOptions.realtime,
  });
}

// Re-export types for convenience
export type { RecommendationsResponse } from '@/types/recommendation';
export { QueryError, isQueryError, getErrorMessage } from '@/lib/queries';
