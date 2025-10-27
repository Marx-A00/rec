'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Music, User, Building2 } from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';
import AnimatedLoader from '@/components/ui/AnimatedLoader';
import { useUniversalSearch, SearchMode } from '@/hooks/useUniversalSearch';
import { useSearchNavigation } from '@/hooks/useSearchNavigation';
import { UnifiedSearchResult } from '@/types/search';
import { sanitizeArtistName } from '@/lib/utils';
import { defaultEntityTypes } from '@/components/ui/UniversalSearchBar';

// TODO: Re-add 'all' when we figure out the "ALL" search
type SearchFilter = 'albums' | 'artists' | 'tracks';

function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  // Support both 'type' (from SimpleSearchBar) and 'filter' (from page tabs) params
  const typeParam =
    searchParams.get('type') || searchParams.get('filter') || 'albums';
  const filterParam = typeParam as SearchFilter;
  const [activeFilter, setActiveFilter] = useState<SearchFilter>(filterParam);
  const [searchMode, setSearchMode] =
    useState<SearchMode>('LOCAL_AND_EXTERNAL');
  const [currentLimit, setCurrentLimit] = useState(20);

  // Map filter to searchType
  const searchType = activeFilter;

  const {
    results = [],
    isLoading,
    error,
    hasMore,
  } = useUniversalSearch(query, {
    entityTypes: defaultEntityTypes,
    searchType,
    filters: [],
    debounceMs: 300,
    minQueryLength: 2,
    maxResults: currentLimit,
    enabled: query.length >= 2,
    searchMode,
  });

  // Reset limit when query changes
  useEffect(() => {
    setCurrentLimit(20);
  }, [query, activeFilter]);

  const loadMore = () => {
    setCurrentLimit(prev => prev + 20);
  };

  const { navigateToResult } = useSearchNavigation({
    entityTypes: defaultEntityTypes,
    enablePrefetching: false,
  });

  // IMPORTANT: All hooks must be called before any early returns!
  // Filter results based on active filter
  const filteredResults = useMemo(() => {
    return results.filter(r => {
      if (activeFilter === 'albums') return r.type === 'album';
      if (activeFilter === 'artists') return r.type === 'artist';
      if (activeFilter === 'tracks') return r.type === 'track';
      return true;
    });
  }, [activeFilter, results]);

  // Group results by entity type (artist, album, track)
  const groupedByEntityType = useMemo(() => {
    return Array.isArray(filteredResults)
      ? filteredResults.reduce(
          (acc, result) => {
            if (!acc[result.type]) {
              acc[result.type] = [];
            }
            acc[result.type].push(result);
            return acc;
          },
          {} as Record<string, UnifiedSearchResult[]>
        )
      : {};
  }, [filteredResults]);

  // Debug: identify duplicate keys before rendering
  useEffect(() => {
    const counts = new Map<string, number>();
    const dupes: Record<string, number> = {};
    filteredResults.forEach(r => {
      const key = `${r.type}:${(r as any).source || 'unknown'}:${r.id}`;
      const next = (counts.get(key) || 0) + 1;
      counts.set(key, next);
      if (next > 1) {
        dupes[key] = next;
      }
    });
    if (Object.keys(dupes).length > 0) {
      console.warn('[Search] Duplicate render keys detected:', dupes);
    }
  }, [filteredResults]);

  // Further group albums by release type (Album, Single, EP, etc.)
  const groupedByReleaseType = useMemo(() => {
    const albumResults = filteredResults.filter(r => r.type === 'album');
    const usedIds = new Set<string>();

    const grouped = {
      singles: albumResults.filter(r => {
        if (r.primaryType === 'Single' && !usedIds.has(r.id)) {
          usedIds.add(r.id);
          return true;
        }
        return false;
      }),
      eps: albumResults.filter(r => {
        if (r.primaryType === 'EP' && !usedIds.has(r.id)) {
          usedIds.add(r.id);
          return true;
        }
        return false;
      }),
      mixtapes: albumResults.filter(r => {
        if (
          r.secondaryTypes?.includes('Mixtape/Street') &&
          !usedIds.has(r.id)
        ) {
          usedIds.add(r.id);
          return true;
        }
        return false;
      }),
      albums: albumResults.filter(r => {
        if (
          (!r.primaryType || r.primaryType === 'Album') &&
          !r.secondaryTypes?.includes('Compilation') &&
          !usedIds.has(r.id)
        ) {
          usedIds.add(r.id);
          return true;
        }
        return false;
      }),
      other: albumResults.filter(r => {
        if (!usedIds.has(r.id)) {
          usedIds.add(r.id);
          return true;
        }
        return false;
      }),
    };

    // Debug logging
    if (albumResults.length > 0) {
      console.log('=== GROUPED BY RELEASE TYPE DEBUG ===');
      console.log('Total album results:', albumResults.length);
      console.log(
        'All album results sources:',
        albumResults.map(r => r.source)
      );
      console.log(
        'All album results primaryTypes:',
        albumResults.map(r => r.primaryType)
      );
      console.log('Singles:', grouped.singles.length);
      console.log('EPs:', grouped.eps.length);
      console.log('Mixtapes:', grouped.mixtapes.length);
      console.log('Albums:', grouped.albums.length);
      console.log('Other:', grouped.other.length);

      console.log('\n--- First 5 Albums ---');
      grouped.albums.slice(0, 5).forEach((r, i) => {
        console.log(`${i + 1}. "${r.title}" by ${r.artist}`);
        console.log(`   ID: ${r.id}`);
        console.log(`   Source: ${r.source}`);
        console.log(`   PrimaryType: ${r.primaryType}`);
        console.log(`   SecondaryTypes: ${JSON.stringify(r.secondaryTypes)}`);
        console.log(`   Image URL: ${r.image?.url}`);
        console.log(`   Cover Image: ${r.cover_image}`);
      });
      console.log('====================================');
    }

    return grouped;
  }, [filteredResults]);

  // Auto-trigger external search on mount
  useEffect(() => {
    if (query.length >= 2) {
      setSearchMode('LOCAL_AND_EXTERNAL');
    }
  }, [query]);

  // Update active filter when URL param changes
  useEffect(() => {
    setActiveFilter(filterParam);
  }, [filterParam]);

  // Handle filter change
  const handleFilterChange = (filter: SearchFilter) => {
    setActiveFilter(filter);
    const params = new URLSearchParams(searchParams.toString());
    params.set('filter', filter);
    router.push(`/search?${params.toString()}`);
  };

  const handleResultClick = async (result: UnifiedSearchResult) => {
    try {
      await navigateToResult(result);
    } catch (error) {
      console.error('Navigation failed:', error);
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'album':
        return <Music className='h-5 w-5' />;
      case 'artist':
        return <User className='h-5 w-5' />;
      case 'label':
        return <Building2 className='h-5 w-5' />;
      default:
        return <Music className='h-5 w-5' />;
    }
  };

  const getResultTypeColor = (type: string) => {
    switch (type) {
      case 'album':
        return 'bg-blue-900 text-blue-200';
      case 'artist':
        return 'bg-green-900 text-green-200';
      case 'label':
        return 'bg-purple-900 text-purple-200';
      default:
        return 'bg-zinc-800 text-zinc-300';
    }
  };

  if (!query) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] text-center px-4'>
        <Music className='h-16 w-16 text-zinc-600 mb-4' />
        <h2 className='text-2xl font-semibold text-white mb-2'>
          Start Searching
        </h2>
        <p className='text-zinc-400 max-w-md'>
          Enter a search query to find albums, artists, and labels
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh]'>
        <AnimatedLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] text-center px-4'>
        <div className='bg-red-900/20 border border-red-900 rounded-lg p-6 max-w-md'>
          <h2 className='text-xl font-semibold text-red-400 mb-2'>
            Search Error
          </h2>
          <p className='text-red-300'>
            Failed to fetch search results. Please try again.
          </p>
        </div>
      </div>
    );
  }

  if (!Array.isArray(results) || results.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] text-center px-4'>
        <Music className='h-16 w-16 text-zinc-600 mb-4' />
        <h2 className='text-2xl font-semibold text-white mb-2'>
          No Results Found
        </h2>
        <p className='text-zinc-400 max-w-md'>
          No results found for &quot;{query}&quot;. Try a different search term.
        </p>
      </div>
    );
  }

  return (
    <div className='max-w-7xl mx-auto px-4 py-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-white mb-2'>Search Results</h1>
        <p className='text-zinc-400'>
          Found {filteredResults.length} result
          {filteredResults.length !== 1 ? 's' : ''} for &quot;{query}&quot;
        </p>
      </div>

      {/* Filter Tabs */}
      <div className='flex items-center gap-2 mb-8 border-b border-zinc-800'>
        {/* TODO: Re-enable when we figure out the "ALL" search */}
        {/* <button
          onClick={() => handleFilterChange('all')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeFilter === 'all'
              ? 'text-white border-cosmic-latte'
              : 'text-zinc-400 border-transparent hover:text-zinc-300'
          }`}
        >
          All
        </button> */}
        <button
          onClick={() => handleFilterChange('albums')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeFilter === 'albums'
              ? 'text-white border-cosmic-latte'
              : 'text-zinc-400 border-transparent hover:text-zinc-300'
          }`}
        >
          Albums
        </button>
        <button
          onClick={() => handleFilterChange('artists')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeFilter === 'artists'
              ? 'text-white border-cosmic-latte'
              : 'text-zinc-400 border-transparent hover:text-zinc-300'
          }`}
        >
          Artists
        </button>
        <button
          onClick={() => handleFilterChange('tracks')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeFilter === 'tracks'
              ? 'text-white border-cosmic-latte'
              : 'text-zinc-400 border-transparent hover:text-zinc-300'
          }`}
        >
          Tracks
        </button>
      </div>

      <div className='space-y-8'>
        {/* Albums Section - Show by release type */}
        {activeFilter === 'albums' ? (
          <>
            {/* Studio Albums */}
            {groupedByReleaseType.albums.length > 0 && (
              <div>
                <div className='flex items-center gap-2 mb-4'>
                  <div className='text-zinc-400'>
                    <Music className='h-5 w-5' />
                  </div>
                  <h2 className='text-xl font-semibold text-white'>Albums</h2>
                  <span className='text-sm text-zinc-500'>
                    ({groupedByReleaseType.albums.length})
                  </span>
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {groupedByReleaseType.albums.slice(0, 10).map(result => (
                    <button
                      key={`album:${result.id}`}
                      onClick={() => handleResultClick(result)}
                      className='flex items-start gap-4 p-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors text-left'
                    >
                      <div className='flex-shrink-0 relative w-16 h-16'>
                        <AlbumImage
                          src={result.image?.url || result.cover_image}
                          alt={result.image?.alt || result.title}
                          width={64}
                          height={64}
                          className='w-full h-full object-cover rounded'
                          fallbackIcon={getResultIcon(result.type)}
                        />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <h3 className='text-base font-medium text-white truncate mb-1'>
                          {result.title}
                        </h3>
                        <p className='text-sm text-zinc-400 truncate mb-2'>
                          {sanitizeArtistName(result.artist)}
                        </p>
                        <div className='flex items-center gap-2'>
                          <span className='px-2 py-1 text-xs rounded bg-blue-900 text-blue-200'>
                            Album
                          </span>
                          {result.releaseDate && (
                            <span className='text-xs text-zinc-500'>
                              {new Date(result.releaseDate).getFullYear()}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Artists moved below main Albums but outside of Albums-only conditional */}

            {/* Singles */}
            {groupedByReleaseType.singles.length > 0 && (
              <div>
                <div className='flex items-center gap-2 mb-4'>
                  <div className='text-zinc-400'>
                    <Music className='h-5 w-5' />
                  </div>
                  <h2 className='text-xl font-semibold text-white'>Singles</h2>
                  <span className='text-sm text-zinc-500'>
                    ({groupedByReleaseType.singles.length})
                  </span>
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {groupedByReleaseType.singles.slice(0, 10).map(result => (
                    <button
                      key={`single:${result.id}`}
                      onClick={() => handleResultClick(result)}
                      className='flex items-start gap-4 p-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors text-left'
                    >
                      <div className='flex-shrink-0 relative w-16 h-16'>
                        <AlbumImage
                          src={result.image?.url || result.cover_image}
                          alt={result.image?.alt || result.title}
                          width={64}
                          height={64}
                          className='w-full h-full object-cover rounded'
                          fallbackIcon={getResultIcon(result.type)}
                        />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <h3 className='text-base font-medium text-white truncate mb-1'>
                          {result.title}
                        </h3>
                        <p className='text-sm text-zinc-400 truncate mb-2'>
                          {sanitizeArtistName(result.artist)}
                        </p>
                        <div className='flex items-center gap-2'>
                          <span className='px-2 py-1 text-xs rounded bg-green-900 text-green-200'>
                            Single
                          </span>
                          {result.releaseDate && (
                            <span className='text-xs text-zinc-500'>
                              {new Date(result.releaseDate).getFullYear()}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* EPs */}
            {groupedByReleaseType.eps.length > 0 && (
              <div>
                <div className='flex items-center gap-2 mb-4'>
                  <div className='text-zinc-400'>
                    <Music className='h-5 w-5' />
                  </div>
                  <h2 className='text-xl font-semibold text-white'>EPs</h2>
                  <span className='text-sm text-zinc-500'>
                    ({groupedByReleaseType.eps.length})
                  </span>
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {groupedByReleaseType.eps.slice(0, 10).map(result => (
                    <button
                      key={`ep:${result.id}`}
                      onClick={() => handleResultClick(result)}
                      className='flex items-start gap-4 p-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors text-left'
                    >
                      <div className='flex-shrink-0 relative w-16 h-16'>
                        <AlbumImage
                          src={result.image?.url || result.cover_image}
                          alt={result.image?.alt || result.title}
                          width={64}
                          height={64}
                          className='w-full h-full object-cover rounded'
                          fallbackIcon={getResultIcon(result.type)}
                        />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <h3 className='text-base font-medium text-white truncate mb-1'>
                          {result.title}
                        </h3>
                        <p className='text-sm text-zinc-400 truncate mb-2'>
                          {sanitizeArtistName(result.artist)}
                        </p>
                        <div className='flex items-center gap-2'>
                          <span className='px-2 py-1 text-xs rounded bg-purple-900 text-purple-200'>
                            EP
                          </span>
                          {result.releaseDate && (
                            <span className='text-xs text-zinc-500'>
                              {new Date(result.releaseDate).getFullYear()}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mixtapes */}
            {groupedByReleaseType.mixtapes.length > 0 && (
              <div>
                <div className='flex items-center gap-2 mb-4'>
                  <div className='text-zinc-400'>
                    <Music className='h-5 w-5' />
                  </div>
                  <h2 className='text-xl font-semibold text-white'>Mixtapes</h2>
                  <span className='text-sm text-zinc-500'>
                    ({groupedByReleaseType.mixtapes.length})
                  </span>
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {groupedByReleaseType.mixtapes.slice(0, 10).map(result => (
                    <button
                      key={`mixtape:${result.id}`}
                      onClick={() => handleResultClick(result)}
                      className='flex items-start gap-4 p-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors text-left'
                    >
                      <div className='flex-shrink-0 relative w-16 h-16'>
                        <AlbumImage
                          src={result.image?.url || result.cover_image}
                          alt={result.image?.alt || result.title}
                          width={64}
                          height={64}
                          className='w-full h-full object-cover rounded'
                          fallbackIcon={getResultIcon(result.type)}
                        />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <h3 className='text-base font-medium text-white truncate mb-1'>
                          {result.title}
                        </h3>
                        <p className='text-sm text-zinc-400 truncate mb-2'>
                          {sanitizeArtistName(result.artist)}
                        </p>
                        <div className='flex items-center gap-2'>
                          <span className='px-2 py-1 text-xs rounded bg-orange-900 text-orange-200'>
                            Mixtape
                          </span>
                          {result.releaseDate && (
                            <span className='text-xs text-zinc-500'>
                              {new Date(result.releaseDate).getFullYear()}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}

        {/* Artists Section - moved just after Albums */}
        {activeFilter === 'artists' &&
          groupedByEntityType.artist &&
          groupedByEntityType.artist.length > 0 && (
            <div>
              <div className='flex items-center gap-2 mb-4'>
                <div className='text-zinc-400'>
                  <User className='h-5 w-5' />
                </div>
                <h2 className='text-xl font-semibold text-white'>Artists</h2>
                <span className='text-sm text-zinc-500'>
                  ({groupedByEntityType.artist.length})
                </span>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {groupedByEntityType.artist.slice(0, 10).map(result => (
                  <button
                    key={`artist:${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className='flex items-start gap-4 p-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors text-left'
                  >
                    <div className='flex-shrink-0 relative w-16 h-16'>
                      <AlbumImage
                        src={result.image?.url || result.cover_image}
                        cloudflareImageId={(result as any).cloudflareImageId}
                        alt={
                          result.image?.alt ||
                          (result.type === 'artist'
                            ? sanitizeArtistName(result.title)
                            : result.title)
                        }
                        width={64}
                        height={64}
                        className='w-full h-full object-cover rounded'
                        fallbackIcon={getResultIcon(result.type)}
                      />
                    </div>

                    <div className='flex-1 min-w-0'>
                      <h3 className='text-base font-medium text-white truncate mb-1'>
                        {sanitizeArtistName(result.title)}
                      </h3>
                      <p className='text-sm text-zinc-400 truncate mb-2'>
                        Artist
                      </p>
                      <div className='flex items-center gap-2'>
                        <span className='px-2 py-1 text-xs rounded bg-green-900 text-green-200'>
                          Artist
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

        {/* Tracks Section */}
        {activeFilter === 'tracks' &&
          groupedByEntityType.track &&
          groupedByEntityType.track.length > 0 && (
            <div>
              <div className='flex items-center gap-2 mb-4'>
                <div className='text-zinc-400'>
                  <Music className='h-5 w-5' />
                </div>
                <h2 className='text-xl font-semibold text-white'>Tracks</h2>
                <span className='text-sm text-zinc-500'>
                  ({groupedByEntityType.track.length})
                </span>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {groupedByEntityType.track.slice(0, 10).map(result => (
                  <button
                    key={`track:${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className='flex items-start gap-4 p-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors text-left'
                  >
                    <div className='flex-shrink-0 relative w-16 h-16'>
                      <AlbumImage
                        src={result.image?.url || result.cover_image}
                        alt={result.image?.alt || result.title}
                        width={64}
                        height={64}
                        className='w-full h-full object-cover rounded'
                        fallbackIcon={getResultIcon(result.type)}
                      />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <h3 className='text-base font-medium text-white truncate mb-1'>
                        {result.title}
                      </h3>
                      <p className='text-sm text-zinc-400 truncate mb-1'>
                        {sanitizeArtistName(result.artist)}
                      </p>
                      {result.subtitle && (
                        <p className='text-xs text-zinc-500 truncate mb-2'>
                          {result.subtitle}
                        </p>
                      )}
                      <div className='flex items-center gap-2'>
                        <span className='px-2 py-1 text-xs rounded bg-orange-900 text-orange-200'>
                          Track
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

        {/* Load More Button */}
        {hasMore && !isLoading && filteredResults.length > 0 && (
          <div className='flex justify-center mt-8 mb-4'>
            <button
              onClick={loadMore}
              className='px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105'
            >
              Load More Results
            </button>
          </div>
        )}

        {/* Loading state for load more */}
        {isLoading && currentLimit > 20 && (
          <div className='flex justify-center mt-8 mb-4'>
            <AnimatedLoader className='scale-50' />
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className='flex items-center justify-center min-h-[60vh]'>
          <AnimatedLoader />
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
