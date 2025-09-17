import { useQuery } from '@tanstack/react-query';

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
  // If userId is provided, fetch that user's recommendations
  // Otherwise fetch the general feed
  const query = userId ? MY_RECOMMENDATIONS_QUERY : RECOMMENDATION_FEED_QUERY;

  const variables = userId
    ? { limit: perPage, sort: 'SCORE_DESC' }
    : { limit: perPage, cursor: null }; // For pagination, you'd pass cursor from previous response

  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for auth cookies
    body: JSON.stringify({
      query,
      variables
    })
  });

  if (!response.ok) {
    throw new QueryError('Failed to fetch recommendations', response.status);
  }

  const { data, errors } = await response.json();

  if (errors) {
    throw new QueryError(errors[0].message);
  }

  // Transform GraphQL response to match expected format
  const recommendations = userId
    ? data.myRecommendations
    : data.recommendationFeed?.recommendations;

  return {
    recommendations: recommendations || [],
    pagination: {
      total: recommendations?.length || 0,
      per_page: perPage,
      page: page,
      has_more: userId ? false : data.recommendationFeed?.hasMore || false
    },
    success: true
  };
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
