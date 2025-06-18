'use client';

import { useEffect, useRef, useState } from 'react';

import { useNavigation } from '@/hooks/useNavigation';
import { UnifiedSearchResult } from '@/types/search';

import SearchBar from './SearchBar';
import SearchResults from './SearchResults';

interface AlbumSearchProps {
  className?: string;
  placeholder?: string;
  showResults?: boolean;
}

export default function AlbumSearch({
  className = '',
  placeholder = 'Search albums, artists, or genres...',
  showResults = true,
}: AlbumSearchProps) {
  const [searchResults, setSearchResults] = useState<UnifiedSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);
  // New state for keyboard navigation
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const { navigateToAlbum, navigateToArtist, navigateToLabel, prefetchRoute } =
    useNavigation();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const searchAlbums = async (query: string) => {
    // Clear results if query is empty
    if (!query.trim()) {
      setSearchResults([]);
      setShowResultsDropdown(false);
      setHighlightedIndex(-1); // Reset highlight
      return;
    }

    // Don't search if already loading
    if (isLoading) return;

    console.log('Searching for:', query);
    setIsLoading(true);
    setError(null);
    setHighlightedIndex(-1); // Reset highlight when search changes

    try {
      const response = await fetch(
        `/api/search?query=${encodeURIComponent(query)}&type=all`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search');
      }

      const data = await response.json();
      // Show all result types
      const allResults = data.results || [];
      setSearchResults(allResults);
      setShowResultsDropdown(true);

      // Prefetch the first few results for better performance
      allResults.slice(0, 3).forEach((result: UnifiedSearchResult) => {
        if (result.type === 'album') {
          prefetchRoute(`/albums/${result.id}`);
        } else if (result.type === 'artist') {
          prefetchRoute(`/artists/${result.id}`);
        } else if (result.type === 'label') {
          prefetchRoute(`/labels/${result.id}`);
        }
      });
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultSelect = async (result: UnifiedSearchResult) => {
    setShowResultsDropdown(false);
    setHighlightedIndex(-1);

    try {
      if (result.type === 'album') {
        // Pre-populate the cache with search result data
        // queryClient.setQueryData(['album', result.id], result);
        await navigateToAlbum(result.id, {
          onError: error => {
            setError(`Failed to navigate to album: ${error.message}`);
          },
        });
      } else if (result.type === 'artist') {
        // Store artist data and navigate to artist page
        sessionStorage.setItem(`artist-${result.id}`, JSON.stringify(result));
        await navigateToArtist(result.id, {
          onError: error => {
            setError(`Failed to navigate to artist: ${error.message}`);
          },
        });
      } else if (result.type === 'label') {
        // Store label data and navigate to label page
        sessionStorage.setItem(`label-${result.id}`, JSON.stringify(result));
        await navigateToLabel(result.id, {
          onError: error => {
            setError(`Failed to navigate to label: ${error.message}`);
          },
        });
      } else {
        // For unknown types, try to handle as album for now
        console.log('Unknown result type:', result.type, result);
        setError('Unknown result type, please try a different search');
      }
    } catch (navigationError) {
      console.error('Navigation error:', navigationError);
      // Error is already handled by the onError callback
    }
  };

  const handleClear = () => {
    setSearchResults([]);
    setShowResultsDropdown(false);
    setError(null);
    setHighlightedIndex(-1);
  };

  // Keyboard navigation handlers
  const handleNavigate = (direction: 'up' | 'down') => {
    if (searchResults.length === 0) return;

    setHighlightedIndex(current => {
      if (direction === 'down') {
        // Stop at the last item, don't wrap to top
        return current < searchResults.length - 1 ? current + 1 : current;
      } else {
        // Stop at the first item, don't wrap to bottom
        return current > 0 ? current - 1 : current;
      }
    });
  };

  const handleSelectHighlighted = () => {
    if (highlightedIndex >= 0 && searchResults[highlightedIndex]) {
      handleResultSelect(searchResults[highlightedIndex]);
    }
  };

  const handleEscape = () => {
    setShowResultsDropdown(false);
    setHighlightedIndex(-1);
  };

  const handleMouseEnter = (index: number) => {
    setHighlightedIndex(index);
  };

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-search-container]')) {
        setShowResultsDropdown(false);
        setHighlightedIndex(-1);
      }
    };

    if (showResultsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showResultsDropdown]);

  return (
    <div
      ref={searchContainerRef}
      className={`relative ${className}`}
      data-search-container
    >
      <SearchBar
        placeholder={placeholder}
        onSearch={searchAlbums}
        onClear={handleClear}
        debounceMs={500}
        resultsCount={searchResults.length}
        highlightedIndex={highlightedIndex}
        onNavigate={handleNavigate}
        onSelectHighlighted={handleSelectHighlighted}
        onEscape={handleEscape}
      />

      {error && (
        <div className='absolute top-full left-0 right-0 mt-2 bg-red-900 border border-red-700 rounded-lg p-3 text-red-200 text-sm z-50'>
          {error}
        </div>
      )}

      {showResults && showResultsDropdown && (
        <div className='absolute top-full left-0 right-0 mt-2 z-40'>
          <SearchResults
            results={searchResults}
            isLoading={isLoading}
            onAlbumSelect={handleResultSelect}
            highlightedIndex={highlightedIndex}
            onMouseEnter={handleMouseEnter}
          />
        </div>
      )}
    </div>
  );
}
