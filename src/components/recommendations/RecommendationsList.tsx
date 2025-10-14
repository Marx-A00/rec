'use client';

import { useSession } from 'next-auth/react';
import { ChevronDown, Loader2 } from 'lucide-react';

import {
  useInfiniteGetRecommendationFeedQuery,
  useInfiniteGetMyRecommendationsQuery,
} from '@/generated/graphql';

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

  // Use the appropriate generated hook based on whether we have a userId
  const myRecsQuery = useInfiniteGetMyRecommendationsQuery(
    { limit: 10 },
    {
      enabled: !!userId,
      initialPageParam: undefined as string | undefined,
      getNextPageParam: lastPage => {
        return lastPage.myRecommendations?.hasMore
          ? { cursor: lastPage.myRecommendations.cursor }
          : undefined;
      },
    }
  );

  const feedQuery = useInfiniteGetRecommendationFeedQuery(
    { limit: 10 },
    {
      enabled: !userId,
      initialPageParam: undefined as string | undefined,
      getNextPageParam: lastPage => {
        return lastPage.recommendationFeed?.hasMore
          ? { cursor: lastPage.recommendationFeed.cursor }
          : undefined;
      },
    }
  );

  // Select the active query based on userId and extract recommendations
  const isUserQuery = !!userId;
  const activeQuery = isUserQuery ? myRecsQuery : feedQuery;
  const {
    isLoading,
    error,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = activeQuery;

  // Extract recommendations based on which query is active
  const allRecommendations = isUserQuery
    ? myRecsQuery.data?.pages.flatMap(
        page => page.myRecommendations?.recommendations || []
      ) || []
    : feedQuery.data?.pages.flatMap(
        page => page.recommendationFeed?.recommendations || []
      ) || [];

  const handleEditRecommendation = (recommendation: any) => {
    // TODO: Implement edit modal/form
    console.log('Edit recommendation:', recommendation);
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Initial loading state (only for the very first fetch)
  if (isLoading && allRecommendations.length === 0) {
    // Check length to avoid flickering if some data already present
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
          Error loading recommendations:{' '}
          {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    );
  }

  if (allRecommendations.length === 0) {
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
        {allRecommendations.map(recommendation => (
          <RecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
            currentUserId={session?.user?.id}
            onEdit={handleEditRecommendation}
          />
        ))}
      </div>

      {hasNextPage && (
        <div className='mt-8'>
          <button
            onClick={handleLoadMore}
            disabled={isFetchingNextPage}
            className='w-full block rounded-md px-4 py-2 h-10 bg-zinc-800/60 hover:bg-cosmic-latte text-zinc-100 hover:text-black border border-zinc-700/60 hover:border-cosmic-latte backdrop-blur-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          >
            <span className='flex items-center justify-center gap-2'>
              {isFetchingNextPage ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Loading…
                </>
              ) : (
                <>
                  Load More
                  <ChevronDown className='h-4 w-4' />
                </>
              )}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
