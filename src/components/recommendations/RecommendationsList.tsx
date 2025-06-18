'use client';

import { useRecommendationsQuery } from '@/hooks';

import RecommendationCard from './RecommendationCard';

interface RecommendationsListProps {
  userId?: string;
  title?: string;
}

export default function RecommendationsList({
  userId,
  title = 'Recent Recommendations',
}: RecommendationsListProps) {
  const { data, isLoading, error, isError } = useRecommendationsQuery({
    page: 1,
    perPage: 10,
    userId,
  });

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <h2 className='text-2xl font-bold text-white mb-6'>{title}</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className='bg-gray-200 rounded-lg h-64 animate-pulse'
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className='space-y-4'>
        <h2 className='text-2xl font-bold text-white mb-6'>{title}</h2>
        <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded'>
          Error loading recommendations: {error?.message}
        </div>
      </div>
    );
  }

  if (!data?.recommendations || data.recommendations.length === 0) {
    return (
      <div className='space-y-4'>
        <h2 className='text-2xl font-bold text-white mb-6'>{title}</h2>
        <div className='text-center py-12'>
          <p className='text-gray-400 text-lg'>No recommendations found.</p>
          <p className='text-gray-500 text-sm mt-2'>
            {userId
              ? "This user hasn't created any recommendations yet."
              : 'Be the first to create a recommendation!'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <h2 className='text-2xl font-bold text-white mb-6'>{title}</h2>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {data.recommendations.map(recommendation => (
          <RecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
          />
        ))}
      </div>

      {data.pagination && data.pagination.has_more && (
        <div className='text-center mt-8'>
          <button className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors'>
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
