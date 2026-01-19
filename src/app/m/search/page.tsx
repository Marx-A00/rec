'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, X, Clock, Music, User, Building2, Trash2 } from 'lucide-react';
import Link from 'next/link';

import AlbumImage from '@/components/ui/AlbumImage';
import { AnimatedLoader } from '@/components/ui/AnimatedLoader';
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
  const sourceParam = result.source ? `?source=${result.source}` : '';
  switch (result.type) {
    case 'album':
      return `/m/albums/${result.id}${sourceParam}`;
    case 'artist':
      return `/m/artists/${result.id}${sourceParam}`;
    default:
      return `/m/search`;
  }
}

interface RecentSearch {
  query: string;
  timestamp: number;
}

export default function MobileSearchPage() {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const urlType = searchParams.get('type') || 'albums';

  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [searchMode, setSearchMode] = useState<SearchMode>(
    urlQuery ? 'LOCAL_AND_EXTERNAL' : 'LOCAL_ONLY'
  );

  // Load recent searches from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // When URL query changes, trigger external search
  useEffect(() => {
    if (urlQuery) {
      setSearchMode('LOCAL_AND_EXTERNAL');
    }
  }, [urlQuery]);

  // Save recent search
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setRecentSearches(prev => {
      const filtered = prev.filter(
        s => s.query.toLowerCase() !== searchQuery.toLowerCase()
      );
      const updated = [
        { query: searchQuery, timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_RECENT_SEARCHES);

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

  // Map URL type to entity types for search
  const getEntityTypes = () => {
    switch (urlType) {
      case 'artists':
        return [
          {
            type: 'artist' as const,
            displayName: 'Artists',
            weight: 1,
            maxResults: 20,
          },
        ];
      case 'tracks':
        return [
          {
            type: 'track' as const,
            displayName: 'Tracks',
            weight: 1,
            maxResults: 20,
          },
        ];
      case 'users':
        return [
          {
            type: 'user' as const,
            displayName: 'Users',
            weight: 1,
            maxResults: 20,
          },
        ];
      case 'albums':
      default:
        return [
          {
            type: 'album' as const,
            displayName: 'Albums',
            weight: 1,
            maxResults: 20,
          },
        ];
    }
  };

  // Search hook
  const { results, isLoading, error } = useUniversalSearch(urlQuery.trim(), {
    entityTypes: getEntityTypes(),
    searchType: urlType as 'albums' | 'artists' | 'tracks' | 'users',
    filters: [],
    debounceMs: 300,
    minQueryLength: 2,
    maxResults: 20,
    enabled: urlQuery.length >= 2,
    searchMode,
  });

  const hasError = !!error;
  const showResults = urlQuery.length >= 2;
  const showRecentSearches = !showResults && recentSearches.length > 0;

  return (
    <div className='min-h-screen bg-black'>
      {/* Content Area */}
      <div className='px-4 py-4'>
        {/* Recent Searches - shown when no query */}
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
                  <Link
                    href={`/m/search?q=${encodeURIComponent(recent.query)}&type=albums`}
                    className='flex-1 flex items-center gap-3 py-3 text-left min-h-[44px]'
                  >
                    <Clock className='h-4 w-4 text-zinc-600' />
                    <span className='text-white'>{recent.query}</span>
                  </Link>
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

        {/* Search Type Indicator */}
        {showResults && (
          <div className='mb-4'>
            <p className='text-sm text-zinc-400'>
              Searching{' '}
              <span className='text-white font-medium'>{urlType}</span> for
              &quot;
              <span className='text-white'>{urlQuery}</span>&quot;
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && showResults && (
          <div className='flex flex-col items-center justify-center py-8'>
            <AnimatedLoader className='scale-50' />
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
        {!isLoading && !hasError && showResults && results.length === 0 && (
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <div className='w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4'>
              <Search className='h-8 w-8 text-zinc-600' />
            </div>
            <p className='text-white font-medium mb-2'>No results found</p>
            <p className='text-sm text-zinc-500 max-w-xs'>
              We couldn&apos;t find any {urlType} matching &quot;{urlQuery}
              &quot;. Try a different search term.
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
                  onClick={() => saveRecentSearch(urlQuery)}
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
              Use the search bar above to find albums, artists, and more.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
