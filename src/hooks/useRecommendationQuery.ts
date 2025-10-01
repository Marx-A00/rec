import { useQuery } from '@tanstack/react-query';

import { graphqlClient } from '@/lib/graphql-client';
import { queryKeys, QueryError } from '@/lib/queries';
import { Recommendation } from '@/types/recommendation';

const RECOMMENDATION_QUERY = `
  query GetRecommendation($id: String!) {
    recommendation(id: $id) {
      id
      score
      createdAt
      updatedAt
      userId
      basisAlbumDiscogsId
      recommendedAlbumDiscogsId
      basisAlbumTitle
      basisAlbumArtist
      basisAlbumImageUrl
      basisAlbumYear
      recommendedAlbumTitle
      recommendedAlbumArtist
      recommendedAlbumImageUrl
      recommendedAlbumYear
      user {
        id
        name
        image
      }
    }
  }
`;

const fetchRecommendation = async (id: string): Promise<Recommendation> => {
  try {
    const data: any = await graphqlClient.request(RECOMMENDATION_QUERY, { id });
    return data.recommendation;
  } catch (error: any) {
    if (error.response?.errors?.[0]) {
      throw new QueryError(error.response.errors[0].message);
    }
    throw new QueryError('Failed to fetch recommendation');
  }
};

export const useRecommendationQuery = (id: string) => {
  return useQuery({
    queryKey: queryKeys.recommendation(id),
    queryFn: () => fetchRecommendation(id),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (cacheTime renamed to gcTime in v5)
  });
};
