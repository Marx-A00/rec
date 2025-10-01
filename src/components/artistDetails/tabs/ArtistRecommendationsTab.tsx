// src/components/artistDetails/tabs/ArtistRecommendationsTab.tsx
'use client';

import { ChevronDown, Music, TrendingUp, Users, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import RecommendationCard from '@/components/recommendations/RecommendationCard';
import { RecommendationsTabSkeleton } from '@/components/ui/skeletons';
import type { RecommendationFieldsFragment } from '@/generated/graphql';
import {
  useArtistRecommendations,
  FilterType,
  SortType,
} from '@/hooks/useArtistRecommendations';

interface ArtistRecommendationsTabProps {
  artistId: string;
  artistName: string;
}

export default function ArtistRecommendationsTab({
  artistId,
  artistName,
}: ArtistRecommendationsTabProps) {
  const router = useRouter();

  const {
    data,
    isLoading,
    error,
    isError,
    filter,
    setFilter,
    sort,
    setSort,
    loadMore,
    hasMore,
    total,
    refetch,
    isFetching,
  } = useArtistRecommendations({ artistId });

  const recommendations = useMemo(
    () => data?.recommendations || [],
    [data?.recommendations]
  );

  const handleAlbumClick = (clickedAlbumId: string) => {
    router.push(`/albums/${clickedAlbumId}`);
  };

  const filterOptions: { value: FilterType; label: string }[] = useMemo(
    () => [
      { value: 'all', label: 'All Recommendations' },
      { value: 'basis', label: 'Albums as Source' },
      { value: 'recommended', label: 'Albums as Recommended' },
    ],
    []
  );

  const sortOptions: { value: SortType; label: string }[] = useMemo(
    () => [
      { value: 'newest', label: 'Newest First' },
      { value: 'oldest', label: 'Oldest First' },
      { value: 'highest_score', label: 'Highest Score' },
      { value: 'lowest_score', label: 'Lowest Score' },
    ],
    []
  );

  const getEmptyMessage = useMemo(() => {
    switch (filter) {
      case 'basis':
        return `No recommendations use ${artistName}'s albums as the source yet.`;
      case 'recommended':
        return `${artistName}'s albums haven't been recommended based on other albums yet.`;
      default:
        return `No recommendations found for ${artistName}'s albums.`;
    }
  }, [filter, artistName]);

  if (isLoading) {
    return <RecommendationsTabSkeleton />;
  }

  if (isError) {
    return (
      <div className='bg-zinc-900 rounded-lg p-6'>
        <h3 className='text-xl font-semibold mb-4 text-white'>
          Recommendations
        </h3>
        <div className='text-center py-8'>
          <div className='mb-4'>
            <RefreshCw className='h-12 w-12 text-red-500 mx-auto' />
          </div>
          <p className='text-red-400 text-lg mb-2'>
            {error?.message || 'Failed to load recommendations'}
          </p>
          <p className='text-zinc-500 mb-4'>
            There was an error loading the recommendations. Please try again.
          </p>
          <button
            onClick={() => refetch()}
            className='px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-900'
            aria-label='Retry loading recommendations'
          >
            <RefreshCw className='h-4 w-4' />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-zinc-900 rounded-lg p-6'>
      {/* Screen reader announcements */}
      <div className='sr-only' aria-live='polite' aria-atomic='true'>
        {isLoading && 'Loading recommendations'}
        {!isLoading &&
          recommendations.length > 0 &&
          `Showing ${recommendations.length} of ${total} recommendations for ${artistName}. ${filter !== 'all' ? `Filtered by ${filter === 'basis' ? 'albums used as source' : 'albums that were recommended'}` : ''}`}
        {!isLoading && recommendations.length === 0 && getEmptyMessage}
      </div>

      <div className='mb-6'>
        <h3 className='text-xl font-semibold mb-4 text-white'>
          Recommendations
          {total > 0 && (
            <span className='text-sm font-normal text-zinc-400 ml-2'>
              ({recommendations.length}
              {hasMore ? ` of ${total}` : ''})
            </span>
          )}
        </h3>

        {/* Filter and Sort Controls */}
        <div className='flex flex-col sm:flex-row gap-4 mb-6'>
          {/* Filter Toggle */}
          <div
            className='flex gap-2'
            role='group'
            aria-label='Filter recommendations'
          >
            {filterOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                  filter === option.value
                    ? 'bg-cosmic-latte text-black font-medium focus:ring-cosmic-latte'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 focus:ring-zinc-600'
                }`}
                aria-pressed={filter === option.value}
                aria-label={`Show ${option.label.toLowerCase()}`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className='ml-auto'>
            <label htmlFor='sort-select' className='sr-only'>
              Sort recommendations
            </label>
            <select
              id='sort-select'
              value={sort}
              onChange={e => setSort(e.target.value as SortType)}
              className='bg-zinc-800 text-zinc-300 px-4 py-2 rounded-lg border border-zinc-700 focus:outline-none focus:border-cosmic-latte focus:ring-2 focus:ring-cosmic-latte focus:ring-offset-2 focus:ring-offset-zinc-900'
              aria-label='Sort recommendations'
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Recommendations Grid */}
      {recommendations.length === 0 ? (
        <div className='text-center py-12'>
          <div className='mb-4'>
            {filter === 'basis' ? (
              <TrendingUp className='h-12 w-12 text-zinc-600 mx-auto' />
            ) : filter === 'recommended' ? (
              <Users className='h-12 w-12 text-zinc-600 mx-auto' />
            ) : (
              <Music className='h-12 w-12 text-zinc-600 mx-auto' />
            )}
          </div>
          <p className='text-zinc-400 text-lg mb-2'>{getEmptyMessage}</p>
          <p className='text-zinc-500 mb-4'>
            Be the first to create a recommendation!
          </p>
          <div className='flex justify-center gap-4'>
            <button
              onClick={() => router.push('/recommend')}
              className='px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-900'
              aria-label='Create a new recommendation'
            >
              Create Recommendation
            </button>
            <button
              onClick={() => router.push('/browse')}
              className='px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:ring-offset-2 focus:ring-offset-zinc-900'
              aria-label='Browse albums'
            >
              Browse Albums
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {recommendations.map(recommendation => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={{
                  // Cast temporary shape to GraphQL fragment to satisfy types
                  ...(recommendation as unknown as RecommendationFieldsFragment),
                } as RecommendationFieldsFragment}
                onAlbumClick={handleAlbumClick}
                showDetailModal={false}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className='flex justify-center mt-6'>
              <button
                onClick={loadMore}
                disabled={isFetching}
                className='flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-900'
              >
                {isFetching ? (
                  <>
                    <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
                    Loading...
                  </>
                ) : (
                  <>
                    <ChevronDown className='h-4 w-4' />
                    Load More Recommendations
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
