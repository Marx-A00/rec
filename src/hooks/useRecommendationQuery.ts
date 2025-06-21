import { useQuery } from '@tanstack/react-query';

import { queryKeys, handleApiResponse } from '@/lib/queries';
import { Recommendation } from '@/types/recommendation';

interface RecommendationResponse {
  recommendation: Recommendation;
  success: boolean;
}

const fetchRecommendation = async (id: string): Promise<Recommendation> => {
  const response = await fetch(`/api/recommendations/${id}`);
  const data: RecommendationResponse = await handleApiResponse(response);
  return data.recommendation;
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
