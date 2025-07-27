'use client';

import { useSession } from 'next-auth/react';
import { ChevronDown } from 'lucide-react';

import { useRecommendationsQuery } from '@/hooks';
import { Recommendation } from '@/types/recommendation';

import RecommendationCard from './RecommendationCard';

interface RecommendationsListProps {
  userId?: string;
  title?: string;
}

export default function RecommendationsList({
  userId,
  title = 'Recent Recommendations',
}: RecommendationsListProps) {
  const { data: session } = useSession();
  const {
    recommendations,
    isLoading,
    error,
    isError,
    isLoadingMore,
    hasMorePages,
    loadMoreRecommendations,
  } = useRecommendationsQuery({
    perPage: 10,
    userId,
  });

  const handleEditRecommendation = (recommendation: Recommendation) => {
    // TODO: Implement edit modal/form
    console.log('Edit recommendation:', recommendation);
  };

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <h2 className='text-2xl font-bold text-white mb-6'>{title}</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className='bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl h-64 animate-pulse border border-zinc-600'
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
        <div className='bg-red-950 border border-red-800 text-red-200 px-4 py-3 rounded-lg'>
          Error loading recommendations: {error?.message}
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className='space-y-4'>
        <h2 className='text-2xl font-bold text-white mb-6'>{title}</h2>
        <div className='text-center py-12'>
          <p className='text-zinc-300 text-lg'>No recommendations found.</p>
          <p className='text-zinc-400 text-sm mt-2'>
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
        {recommendations.map(recommendation => (
          <RecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
            currentUserId={session?.user?.id}
            onEdit={handleEditRecommendation}
          />
        ))}
      </div>

      {hasMorePages && (
        <div className='text-center mt-8'>
          <button
            onClick={loadMoreRecommendations}
            disabled={isLoadingMore}
            className='bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2 mx-auto'
          >
            {isLoadingMore ? (
              <>
                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
                Loading...
              </>
            ) : (
              <>
                <ChevronDown className='h-4 w-4' />
                Load More
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
