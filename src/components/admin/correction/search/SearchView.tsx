'use client';

import { useState, useEffect } from 'react';

import {
  CorrectionSource,
  useSearchCorrectionCandidatesQuery,
  type SearchCorrectionCandidatesQuery,
} from '@/generated/graphql';
import { getCorrectionStore } from '@/stores/useCorrectionStore';

import type { CurrentDataViewAlbum } from '../CurrentDataView';
import { ErrorState, categorizeError, SourceToggle } from '../shared';

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
}

/**
 * SearchView - Main search step container for correction modal.
 *
 * Wires together:
 * - SourceToggle for MusicBrainz/Discogs selection
 * - SearchInputs for album/artist search fields
 * - GraphQL query for correction search (supports both sources)
 * - SearchResults for displaying results
 * - State persistence via Zustand store
 *
 * Behavior:
 * - Pre-populates inputs with current album title and artist
 * - Search triggers on button click (not auto-search on mount)
 * - If returning from preview step with saved state, auto-triggers search
 * - Results persist when navigating back from preview
 */
export function SearchView({ album }: SearchViewProps) {
  // Initialize store for this album
  const store = getCorrectionStore(album.id);
  const searchQuery = store(s => s.searchQuery);
  const searchOffset = store(s => s.searchOffset);
  const correctionSource = store(s => s.correctionSource);

  // Get actions from store
  const setSearchQuery = store.getState().setSearchQuery;
  const setSearchOffset = store.getState().setSearchOffset;
  const selectResult = store.getState().selectResult;
  const enterManualEdit = store.getState().enterManualEdit;
  const setCorrectionSource = store.getState().setCorrectionSource;

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
    directId: undefined,
  };

  // Map store source to GraphQL enum
  const graphqlSource =
    correctionSource === 'discogs'
      ? CorrectionSource.Discogs
      : CorrectionSource.Musicbrainz;

  // Build query input with source-specific ID field
  const queryInput = {
    albumId: album.id,
    albumTitle: currentQuery.albumTitle,
    artistName: currentQuery.artistName,
    limit: 10,
    offset: searchOffset,
    source: graphqlSource,
    // Pass directId to the correct field based on source
    ...(currentQuery.directId && correctionSource === 'musicbrainz'
      ? { releaseGroupMbid: currentQuery.directId }
      : {}),
    ...(currentQuery.directId && correctionSource === 'discogs'
      ? { discogsId: currentQuery.directId }
      : {}),
  };

  // GraphQL query - enabled for both MusicBrainz and Discogs sources
  const { data, isLoading, error, isFetching } =
    useSearchCorrectionCandidatesQuery(
      { input: queryInput },
      {
        enabled:
          isSearchTriggered &&
          !!(
            currentQuery.albumTitle ||
            currentQuery.artistName ||
            currentQuery.directId
          ),
      }
    );

  // Extract results from GraphQL response
  const results = data?.correctionSearch?.results ?? [];
  const hasMore = data?.correctionSearch?.hasMore ?? false;

  // Handle search submission
  const handleSearch = (query: {
    albumTitle: string;
    artistName: string;
    directId?: string;
  }) => {
    setSearchQuery(query);
    setSearchOffset(0);
    setIsSearchTriggered(true);
  };

  // Handle load more pagination
  const handleLoadMore = () => {
    store.getState().setSearchOffset(searchOffset + 10);
  };

  // Handle result click
  const handleResultClick = (result: GraphQLScoredResult) => {
    // Store handles selection and step navigation
    selectResult(result.releaseGroupMbid);
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
        {/* Source toggle */}
        <SourceToggle
          value={correctionSource}
          onChange={setCorrectionSource}
          disabled={false}
        />

        <SearchInputs
          initialAlbumTitle={currentQuery.albumTitle}
          initialArtistName={currentQuery.artistName}
          onSearch={handleSearch}
          isLoading={false}
          source={correctionSource}
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

  // Source-specific initial state message
  const sourceLabel =
    correctionSource === 'discogs' ? 'Discogs' : 'MusicBrainz';

  return (
    <div className='space-y-4'>
      {/* Source toggle */}
      <SourceToggle
        value={correctionSource}
        onChange={setCorrectionSource}
        disabled={isLoading}
      />

      {/* Search inputs - shared for both sources */}
      <SearchInputs
        initialAlbumTitle={currentQuery.albumTitle}
        initialArtistName={currentQuery.artistName}
        onSearch={handleSearch}
        isLoading={isLoading}
        source={correctionSource}
      />

      {/* Results - after search triggered and not loading */}
      {isSearchTriggered && !isLoading && (
        <SearchResults
          results={results}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onResultClick={handleResultClick}
          onLoadMore={handleLoadMore}
          onManualEdit={enterManualEdit}
        />
      )}
    </div>
  );
}
