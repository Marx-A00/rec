"use client";

import { useQuery } from "@tanstack/react-query";
import { RecommendationsResponse } from "@/types/recommendation";
import RecommendationCard from "./RecommendationCard";

async function fetchRecommendations(page: number = 1, perPage: number = 10, userId?: string): Promise<RecommendationsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });
  
  if (userId) {
    params.append('user_id', userId);
  }
  
  const response = await fetch(`/api/recommendations?${params}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch recommendations');
  }
  return response.json();
}

interface RecommendationsListProps {
  userId?: string;
  title?: string;
}

export default function RecommendationsList({ userId, title = "Recent Recommendations" }: RecommendationsListProps) {
  const {
    data,
    isLoading,
    error,
    isError
  } = useQuery({
    queryKey: ['recommendations', { userId }],
    queryFn: () => fetchRecommendations(1, 10, userId),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-64 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error loading recommendations: {error?.message}
        </div>
      </div>
    );
  }

  if (!data?.recommendations || data.recommendations.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">No recommendations found.</p>
          <p className="text-gray-500 text-sm mt-2">
            {userId ? "This user hasn't created any recommendations yet." : "Be the first to create a recommendation!"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.recommendations.map((recommendation) => (
          <RecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
          />
        ))}
      </div>
      
      {data.pagination && data.pagination.has_more && (
        <div className="text-center mt-8">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
            Load More
          </button>
        </div>
      )}
    </div>
  );
} 