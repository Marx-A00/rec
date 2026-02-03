'use client';

import { useState, useEffect } from 'react';

import {
  useSearchCorrectionCandidatesQuery,
  type SearchCorrectionCandidatesQuery,
} from '@/generated/graphql';
import type { useCorrectionModalState } from '@/hooks/useCorrectionModalState';

import type { CurrentDataViewAlbum } from '../CurrentDataView';

import { ErrorState, categorizeError } from '../shared';
import { SearchInputs } from './SearchInputs';
import { SearchResults } from './SearchResults';
import { SearchSkeleton } from './SearchSkeleton';

// Extract types from GraphQL query result
type GraphQLGroupedResult =
  SearchCorrectionCandidatesQuery['correctionSearch']['results'][number];
type GraphQLScoredResult = GraphQLGroupedResult['primaryResult'];

export interface SearchViewProps {
  /** Current album data (for pre-populating search inputs) */
  album: CurrentDataViewAlbum;
  /** Callback when user selects a search result */
  onResultSelect: (result: GraphQLScoredResult) => void;
  /** Callback when user wants manual edit (no good results) */
  onManualEdit: () => void;
  /** Modal state for persistence */
  modalState: ReturnType<typeof useCorrectionModalState>;
}

/**
 * SearchView - Main search step container for correction modal.
 *
 * Wires together:
 * - SearchInputs for album/artist search fields
 * - GraphQL query for MusicBrainz search
 * - SearchResults for displaying results
 * - State persistence via modalState hook
 *
 * Behavior:
 * - Pre-populates inputs with current album title and artist
 * - Search triggers on button click (not auto-search on mount)
 * - If returning from preview step with saved state, auto-triggers search
 * - Results persist when navigating back from preview
 */
export function SearchView({
  album,
  onResultSelect,
  onManualEdit,
  modalState,
}: SearchViewProps) {
  const {
    searchQuery,
    setSearchQuery,
    searchOffset,
    setSearchOffset,
    setSelectedResult,
  } = modalState;

  // Extract initial values from album
  const initialAlbumTitle = album.title;
  const initialArtistName = album.artists[0]?.artist.name ?? '';

  // Track whether search has been triggered (only true after first search submission)
  // If searchQuery exists in state, we're returning from preview and should auto-search
  const [isSearchTriggered, setIsSearchTriggered] = useState(
    () => !!searchQuery
  );

  // Use persisted query or fallback to album data
  const currentQuery = searchQuery ?? {
    albumTitle: initialAlbumTitle,
    artistName: initialArtistName,
  };

  // GraphQL query - only enabled when search is triggered and query has content
  const { data, isLoading, error, isFetching } =
    useSearchCorrectionCandidatesQuery(
      {
        input: {
          albumId: album.id,
          albumTitle: currentQuery.albumTitle,
          artistName: currentQuery.artistName,
          limit: 10,
          offset: searchOffset,
        },
      },
      {
        enabled:
          isSearchTriggered &&
          !!(currentQuery.albumTitle || currentQuery.artistName),
      }
    );

  // Extract results from GraphQL response
  const results = data?.correctionSearch?.results ?? [];
  const hasMore = data?.correctionSearch?.hasMore ?? false;

  // Handle search submission
  const handleSearch = (query: { albumTitle: string; artistName: string }) => {
    setSearchQuery(query);
    setSearchOffset(0);
    setIsSearchTriggered(true);
  };

  // Handle load more pagination
  const handleLoadMore = () => {
    setSearchOffset(searchOffset + 10);
  };

  // Handle result click
  const handleResultClick = (result: GraphQLScoredResult) => {
    setSelectedResult(result.releaseGroupMbid);
    onResultSelect(result);
  };

  // Auto-trigger search on mount if returning from preview with saved state
  useEffect(() => {
    if (searchQuery && !isSearchTriggered) {
      setIsSearchTriggered(true);
    }
  }, [searchQuery, isSearchTriggered]);

  // Show skeleton during initial search (not during load more)
  const showSkeleton = isLoading && isSearchTriggered && searchOffset === 0;

  // Loading more indicator (pagination)
  const isLoadingMore = isFetching && searchOffset > 0;

  // Handle retry
  const handleRetry = () => {
    // Re-trigger the search with the same query
    if (searchQuery) {
      handleSearch(searchQuery);
    }
  };

  // Error state
  if (error && isSearchTriggered) {
    const errorType = categorizeError(error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Search failed. Please try again.';

    return (
      <div className='space-y-4'>
        <SearchInputs
          initialAlbumTitle={currentQuery.albumTitle}
          initialArtistName={currentQuery.artistName}
          onSearch={handleSearch}
          isLoading={false}
        />
        <ErrorState
          message={errorMessage}
          type={errorType}
          onRetry={handleRetry}
          isRetrying={isFetching}
        />
      </div>
    );
  }

  // Loading skeleton (full replacement per CONTEXT.md)
  if (showSkeleton) {
    return <SearchSkeleton />;
  }

  return (
    <div className='space-y-4'>
      <SearchInputs
        initialAlbumTitle={currentQuery.albumTitle}
        initialArtistName={currentQuery.artistName}
        onSearch={handleSearch}
        isLoading={isLoading}
      />

      {/* Initial state - before first search */}
      {!isSearchTriggered && (
        <div className='p-6 text-center text-zinc-400 border border-dashed border-zinc-700 rounded-lg'>
          Search MusicBrainz for the correct album data
        </div>
      )}

      {/* Results - after search triggered and not loading */}
      {isSearchTriggered && !isLoading && (
        <SearchResults
          results={results}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onResultClick={handleResultClick}
          onLoadMore={handleLoadMore}
          onManualEdit={onManualEdit}
        />
      )}
    </div>
  );
}
