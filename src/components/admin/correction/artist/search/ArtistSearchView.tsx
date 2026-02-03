'use client';

import { useState, useEffect } from 'react';
import { Search, AlertCircle, Loader2 } from 'lucide-react';

import { ErrorState, categorizeError } from '../../shared';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useSearchArtistCorrectionCandidatesQuery,
  type Artist,
  type ArtistCorrectionSearchResult,
} from '@/generated/graphql';
import { type useArtistCorrectionModalState } from '@/hooks/useArtistCorrectionModalState';
import { Skeleton } from '@/components/ui/skeletons';

import { ArtistSearchCard } from './ArtistSearchCard';

export interface ArtistSearchViewProps {
  /** Current artist data (for pre-populating search input) */
  artist: Artist;
  /** Callback when user selects a search result */
  onResultSelect: (mbid: string) => void;
  /** Modal state for persistence */
  modalState: ReturnType<typeof useArtistCorrectionModalState>;
}

/**
 * ArtistSearchView - Search step container for artist correction modal.
 *
 * Behavior:
 * - Pre-populates input with current artist name
 * - Search triggers on button click (not auto-search on mount)
 * - If returning from preview step with saved state, auto-triggers search
 * - Results persist when navigating back from preview
 */
export function ArtistSearchView({
  artist,
  onResultSelect,
  modalState,
}: ArtistSearchViewProps) {
  const {
    searchQuery,
    setSearchQuery,
    searchOffset,
    setSearchOffset,
    setSelectedResult,
  } = modalState;

  // Extract initial value from artist
  const initialArtistName = artist.name;

  // Local input state
  const [inputValue, setInputValue] = useState<string>(
    searchQuery ?? initialArtistName
  );

  // Track whether search has been triggered
  const [isSearchTriggered, setIsSearchTriggered] = useState(
    () => !!searchQuery
  );

  // GraphQL query - only enabled when search is triggered
  const { data, isLoading, error, isFetching } =
    useSearchArtistCorrectionCandidatesQuery(
      {
        query: searchQuery ?? '',
        limit: 10,
      },
      {
        enabled: isSearchTriggered && !!searchQuery,
      }
    );

  // Extract results from GraphQL response
  const results = data?.artistCorrectionSearch?.results ?? [];
  const hasMore = data?.artistCorrectionSearch?.hasMore ?? false;

  // Handle search submission
  const handleSearch = () => {
    if (!inputValue.trim()) return;
    setSearchQuery(inputValue.trim());
    setSearchOffset(0);
    setIsSearchTriggered(true);
  };

  // Handle enter key in input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle result click
  const handleResultClick = (result: ArtistCorrectionSearchResult) => {
    setSelectedResult(result.artistMbid);
    onResultSelect(result.artistMbid);
  };

  // Auto-trigger search on mount if returning from preview with saved state
  useEffect(() => {
    if (searchQuery && !isSearchTriggered) {
      setIsSearchTriggered(true);
    }
  }, [searchQuery, isSearchTriggered]);

  // Show skeleton during initial search
  const showSkeleton = isLoading && isSearchTriggered && searchOffset === 0;

  // Loading more indicator (pagination)
  const isLoadingMore = isFetching && searchOffset > 0;

  // Render search skeleton
  if (showSkeleton) {
    return (
      <div className='space-y-4'>
        <div className='space-y-3'>
          <Skeleton className='h-9 w-full' />
          <Skeleton className='h-9 w-32' />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className='flex gap-3 p-3'>
            <Skeleton className='h-12 w-12 rounded-full flex-shrink-0' />
            <div className='flex-1 space-y-2'>
              <Skeleton className='h-4 w-2/3' />
              <Skeleton className='h-3 w-1/3' />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Search input */}
      <div className='flex gap-2'>
        <Input
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Artist name'
          className='flex-1 bg-zinc-800 border-zinc-700 text-zinc-100'
        />
        <Button
          onClick={handleSearch}
          disabled={!inputValue.trim() || isLoading}
          className='gap-2'
        >
          {isLoading ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Search className='h-4 w-4' />
          )}
          Search
        </Button>
      </div>

      {/* Error state */}
      {!!error && isSearchTriggered && (
        <ErrorState
          message={
            error instanceof Error
              ? error.message
              : 'Search failed. Please try again.'
          }
          type={categorizeError(error)}
          onRetry={handleSearch}
          isRetrying={isFetching}
        />
      )}

      {/* Initial state - before first search */}
      {!isSearchTriggered && (
        <div className='p-6 text-center text-zinc-400 border border-dashed border-zinc-700 rounded-lg'>
          Search MusicBrainz for the correct artist data
        </div>
      )}

      {/* No results state */}
      {isSearchTriggered && !isLoading && !error && results.length === 0 && (
        <div className='flex flex-col items-center justify-center py-12 text-center'>
          <AlertCircle className='h-12 w-12 text-zinc-600 mb-4' />
          <h3 className='text-lg font-medium text-cosmic-latte mb-2'>
            No results found
          </h3>
          <p className='text-sm text-zinc-400 max-w-sm'>
            We couldn't find any matches in MusicBrainz. Try adjusting your
            search.
          </p>
        </div>
      )}

      {/* Results */}
      {isSearchTriggered && !isLoading && results.length > 0 && (
        <div className='divide-y divide-zinc-800'>
          {results.map(result => (
            <ArtistSearchCard
              key={result.artistMbid}
              result={result}
              onClick={handleResultClick}
            />
          ))}

          {/* Load more button */}
          {hasMore && (
            <div className='pt-4 text-center'>
              <Button
                variant='outline'
                onClick={() => setSearchOffset(searchOffset + 10)}
                disabled={isLoadingMore}
                className='border-zinc-700'
              >
                {isLoadingMore ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
