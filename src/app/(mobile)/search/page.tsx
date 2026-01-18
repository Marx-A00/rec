'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Clock, Music, User, Building2, Trash2 } from 'lucide-react';
import Link from 'next/link';

import AlbumImage from '@/components/ui/AlbumImage';
import { MobileButton } from '@/components/mobile/MobileButton';
import {
  useUniversalSearch,
  type SearchMode,
} from '@/hooks/useUniversalSearch';
import { sanitizeArtistName, cn } from '@/lib/utils';
import type { UnifiedSearchResult } from '@/types/search';

const RECENT_SEARCHES_KEY = 'rec-mobile-recent-searches';
const MAX_RECENT_SEARCHES = 10;

// Get icon for result type
function getResultIcon(type: string): React.ReactNode {
  switch (type) {
    case 'album':
      return <Music className='h-5 w-5 text-zinc-500' />;
    case 'artist':
      return <User className='h-5 w-5 text-zinc-500' />;
    case 'label':
      return <Building2 className='h-5 w-5 text-zinc-500' />;
    default:
      return <Search className='h-5 w-5 text-zinc-500' />;
  }
}

// Get type badge color
function getTypeBadgeColor(type: string): string {
  switch (type) {
    case 'album':
      return 'bg-blue-900/50 text-blue-300';
    case 'artist':
      return 'bg-green-900/50 text-green-300';
    case 'label':
      return 'bg-purple-900/50 text-purple-300';
    default:
      return 'bg-zinc-800 text-zinc-300';
  }
}

// Get navigation path for result
function getResultPath(result: UnifiedSearchResult): string {
  switch (result.type) {
    case 'album':
      return `/m/albums/${result.id}`;
    case 'artist':
      return `/m/artists/${result.id}`;
    default:
      return `/m/search`;
  }
}

interface RecentSearch {
  query: string;
  timestamp: number;
}

export default function MobileSearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [searchMode, setSearchMode] = useState<SearchMode>('LOCAL_ONLY');
  const [inputFocused, setInputFocused] = useState(false);

  // Load recent searches from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save recent search
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setRecentSearches(prev => {
      // Remove duplicates and add new search at the beginning
      const filtered = prev.filter(
        s => s.query.toLowerCase() !== searchQuery.toLowerCase()
      );
      const updated = [
        { query: searchQuery, timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_RECENT_SEARCHES);

      // Persist to localStorage
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore localStorage errors
      }

      return updated;
    });
  }, []);

  // Clear all recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Remove single recent search
  const removeRecentSearch = useCallback((searchQuery: string) => {
    setRecentSearches(prev => {
      const updated = prev.filter(
        s => s.query.toLowerCase() !== searchQuery.toLowerCase()
      );
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore localStorage errors
      }
      return updated;
    });
  }, []);

  // Search hook
  const { results, isLoading, error } = useUniversalSearch(query.trim(), {
    entityTypes: [
      {
        type: 'album',
        displayName: 'Albums',
        weight: 3,
        maxResults: 10,
      },
      {
        type: 'artist',
        displayName: 'Artists',
        weight: 2,
        maxResults: 6,
      },
    ],
    searchType: 'all',
    filters: [],
    debounceMs: 300,
    minQueryLength: 2,
    maxResults: 20,
    enabled: query.length >= 2,
    searchMode,
  });

  // Convert error to boolean for safe JSX rendering
  const hasError = !!error;

  // Handle recent search click
  const handleRecentSearchClick = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    setSearchMode('LOCAL_AND_EXTERNAL');
  }, []);

  // Handle Enter key for external search
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && query.length >= 2) {
        saveRecentSearch(query);
        setSearchMode('LOCAL_AND_EXTERNAL');
      }
    },
    [query, saveRecentSearch]
  );

  // Clear input
  const handleClear = useCallback(() => {
    setQuery('');
    setSearchMode('LOCAL_ONLY');
  }, []);

  const showResults = query.length >= 2;
  const showRecentSearches =
    !showResults && recentSearches.length > 0 && inputFocused;

  return (
    <div className='min-h-screen bg-black'>
      {/* Search Header */}
      <div className='sticky top-0 z-10 bg-black border-b border-zinc-800 px-4 py-3'>
        <div className='flex items-center gap-3'>
          {/* Search Input */}
          <div className='flex-1 relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500' />
            <input
              type='text'
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                if (e.target.value.length < 2) {
                  setSearchMode('LOCAL_ONLY');
                }
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setTimeout(() => setInputFocused(false), 200)}
              placeholder='Search albums, artists...'
              className='w-full h-11 pl-10 pr-10 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors'
              autoFocus
            />
            {query && (
              <button
                onClick={handleClear}
                className='absolute right-3 top-1/2 -translate-y-1/2 p-1'
                aria-label='Clear search'
              >
                <X className='h-4 w-4 text-zinc-500' />
              </button>
            )}
          </div>

          {/* Cancel Button */}
          <MobileButton
            variant='ghost'
            size='sm'
            onClick={() => router.back()}
            className='text-zinc-400'
          >
            Cancel
          </MobileButton>
        </div>

        {/* Search Mode Indicator */}
        {showResults && (
          <p className='mt-2 text-xs text-zinc-500'>
            {searchMode === 'LOCAL_ONLY' ? (
              <>
                Searching locally. Press{' '}
                <span className='text-zinc-400'>Enter</span> to search more
                sources.
              </>
            ) : (
              'Searching all sources...'
            )}
          </p>
        )}
      </div>

      {/* Content Area */}
      <div className='px-4 py-4'>
        {/* Recent Searches */}
        {showRecentSearches && (
          <section>
            <div className='flex items-center justify-between mb-3'>
              <h2 className='text-sm font-medium text-zinc-400'>
                Recent Searches
              </h2>
              <button
                onClick={clearRecentSearches}
                className='text-xs text-zinc-500 flex items-center gap-1 min-h-[44px]'
              >
                <Trash2 className='h-3 w-3' />
                Clear all
              </button>
            </div>
            <div className='space-y-1'>
              {recentSearches.map(recent => (
                <div
                  key={recent.timestamp}
                  className='flex items-center justify-between group'
                >
                  <button
                    onClick={() => handleRecentSearchClick(recent.query)}
                    className='flex-1 flex items-center gap-3 py-3 text-left min-h-[44px]'
                  >
                    <Clock className='h-4 w-4 text-zinc-600' />
                    <span className='text-white'>{recent.query}</span>
                  </button>
                  <button
                    onClick={() => removeRecentSearch(recent.query)}
                    className='p-2 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity min-h-[44px] min-w-[44px] flex items-center justify-center'
                    aria-label={`Remove ${recent.query}`}
                  >
                    <X className='h-4 w-4' />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Loading State */}
        {isLoading && showResults && (
          <div className='flex flex-col items-center justify-center py-12'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-emeraled-green mb-4' />
            <p className='text-sm text-zinc-500'>Searching...</p>
          </div>
        )}

        {/* Error State */}
        {hasError && showResults && (
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <div className='text-4xl mb-4'>😔</div>
            <p className='text-white font-medium mb-2'>Search failed</p>
            <p className='text-sm text-zinc-500'>Please try again later</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading &&
          !hasError &&
          showResults &&
          results.length === 0 &&
          searchMode === 'LOCAL_AND_EXTERNAL' && (
            <div className='flex flex-col items-center justify-center py-12 text-center'>
              <Search className='h-12 w-12 text-zinc-600 mb-4' />
              <p className='text-white font-medium mb-2'>No results found</p>
              <p className='text-sm text-zinc-500'>
                Try a different search term
              </p>
            </div>
          )}

        {/* Search Results */}
        {!isLoading && !hasError && showResults && results.length > 0 && (
          <section>
            <h2 className='text-sm font-medium text-zinc-400 mb-3'>
              Results ({results.length})
            </h2>
            <div className='space-y-2'>
              {results.map(result => (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={getResultPath(result)}
                  onClick={() => saveRecentSearch(query)}
                  className='flex items-center gap-3 p-3 bg-zinc-900 rounded-lg border border-zinc-800 active:scale-[0.98] transition-transform'
                >
                  {/* Image */}
                  <div className='w-12 h-12 flex-shrink-0 rounded-md overflow-hidden'>
                    <AlbumImage
                      src={result.image?.url || result.cover_image}
                      alt={result.title}
                      width={48}
                      height={48}
                      className='w-full h-full object-cover'
                      fallbackIcon={getResultIcon(result.type)}
                    />
                  </div>

                  {/* Info */}
                  <div className='flex-1 min-w-0'>
                    <p className='text-white font-medium truncate'>
                      {result.type === 'artist'
                        ? sanitizeArtistName(result.title)
                        : result.title}
                    </p>
                    <p className='text-sm text-zinc-500 truncate'>
                      {result.type === 'album' && result.artist
                        ? sanitizeArtistName(result.artist)
                        : result.type === 'artist'
                          ? 'Artist'
                          : result.type}
                    </p>
                  </div>

                  {/* Type Badge */}
                  <span
                    className={cn(
                      'text-xs px-2 py-1 rounded capitalize',
                      getTypeBadgeColor(result.type)
                    )}
                  >
                    {result.type}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Initial State - No Query */}
        {!showResults && !showRecentSearches && (
          <div className='flex flex-col items-center justify-center py-16 text-center'>
            <Search className='h-16 w-16 text-zinc-700 mb-4' />
            <h2 className='text-lg font-medium text-white mb-2'>
              Search for music
            </h2>
            <p className='text-sm text-zinc-500 max-w-xs'>
              Find albums, artists, and more. Start typing to search.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
