'use client';

import { forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import { Search, User } from 'lucide-react';

import { Album } from '@/types/album';
import { UnifiedSearchResult } from '@/types/search';
import {
  useUniversalSearch,
  UseUniversalSearchOptions,
} from '@/hooks/useUniversalSearch';
import AlbumImage from '@/components/ui/AlbumImage';
import { sanitizeArtistName } from '@/lib/utils';
import {
  buildDualInputQuery,
  hasSearchableInput,
} from '@/lib/musicbrainz/query-builder';

/**
 * Props for the AlbumSearchBackwardCompatible component.
 *
 * @param onAlbumSelect - Callback when an album is selected from search results
 * @param placeholder - Placeholder for single-input mode (backward compat)
 * @param albumPlaceholder - Placeholder for album input in dual mode
 * @param artistPlaceholder - Placeholder for artist input in dual mode
 * @param label - Label displayed above the search input(s)
 * @param disabled - Whether the search is disabled
 * @param colorTheme - Color theme for input borders ('red' for source, 'green' for recommended)
 * @param searchMode - 'single' for legacy single-field search, 'dual' for album + artist fields
 */
interface AlbumSearchProps {
  onAlbumSelect: (album: Album) => void;
  placeholder?: string;
  albumPlaceholder?: string;
  artistPlaceholder?: string;
  label?: string;
  disabled?: boolean;
  colorTheme?: 'red' | 'green';
  searchMode?: 'single' | 'dual';
}

export interface AlbumSearchRef {
  clearInput: () => void;
}

/**
 * Album search component with dual-input support for precise searches.
 * Supports both legacy single-input mode and new dual-input (album + artist) mode.
 */
const AlbumSearchBackwardCompatible = forwardRef<
  AlbumSearchRef,
  AlbumSearchProps
>(function AlbumSearchBackwardCompatible(
  {
    onAlbumSelect,
    placeholder = 'Search for albums...',
    albumPlaceholder = 'Search album title...',
    artistPlaceholder = 'Filter by artist (optional)...',
    label = 'Search Albums',
    disabled = false,
    colorTheme,
    searchMode = 'dual',
  },
  ref
) {
  // Single-input mode state (backward compatibility)
  const [inputValue, setInputValue] = useState('');

  // Dual-input mode state
  const [albumQuery, setAlbumQuery] = useState('');
  const [artistQuery, setArtistQuery] = useState('');

  // Search query sent to the hook
  const [searchQuery, setSearchQuery] = useState('');

  // Determine if we're in dual mode
  const isDualMode = searchMode === 'dual';

  // Create proper search options with album entity type
  const searchOptions: UseUniversalSearchOptions = {
    entityTypes: [
      {
        type: 'album',
        displayName: 'Albums',
        searchFields: ['title', 'artist', 'year'],
        weight: 1,
        deduplicate: true,
        maxResults: 50,
      },
    ],
    searchType: 'albums',
    filters: [],
    debounceMs: 300,
    minQueryLength: 2,
    maxResults: 50,
    enabled: !disabled && searchQuery.length >= 2,
    context: 'recommendations',
    deduplicate: true,
    searchMode: 'LOCAL_AND_EXTERNAL',
  };

  // Use the universal search hook directly with album-only configuration
  const {
    results: searchResults,
    isLoading,
    error,
  } = useUniversalSearch(searchQuery, searchOptions);

  // Expose clearInput method to parent components
  useImperativeHandle(ref, () => ({
    clearInput: () => {
      // Clear single-input mode state
      setInputValue('');
      // Clear dual-input mode state
      setAlbumQuery('');
      setArtistQuery('');
      // Clear search query
      setSearchQuery('');
    },
  }));

  // Convert UnifiedSearchResult to Album format
  const convertToAlbum = useCallback((result: UnifiedSearchResult): Album => {
    return {
      id: result.id,
      title: result.title,
      artists: [
        {
          id: result.id,
          name: result.artist,
        },
      ],
      year: result.releaseDate ? parseInt(result.releaseDate) : undefined,
      image: result.image,
    };
  }, []);

  // Get color classes based on theme
  const getColorClasses = (isSecondary = false) => {
    if (!colorTheme) {
      return 'border-zinc-700 focus:ring-blue-500';
    }

    if (colorTheme === 'red') {
      return isSecondary
        ? 'border-red-400/50 focus:ring-red-500 focus:border-red-500'
        : 'border-red-500/70 focus:ring-red-500 focus:border-red-500';
    }

    return isSecondary
      ? 'border-green-400/50 focus:ring-green-500 focus:border-green-500'
      : 'border-green-500/70 focus:ring-green-500 focus:border-green-500';
  };

  // Extract albums from the response
  const albumResults =
    searchResults?.filter(
      (result: UnifiedSearchResult) => result.type === 'album'
    ) || [];

  // Handle single-input mode change
  const handleInputChange = (value: string) => {
    setInputValue(value);
  };

  // Handle single-input mode key down
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      setSearchQuery(inputValue.trim());
      console.log('Executing search for:', inputValue.trim());
    }
  };

  // Handle dual-input mode - album field key down
  const handleAlbumKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      triggerDualSearch();
    }
  };

  // Handle dual-input mode - artist field key down
  const handleArtistKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      triggerDualSearch();
    }
  };

  // Trigger search with dual inputs
  const triggerDualSearch = () => {
    if (!hasSearchableInput(albumQuery, artistQuery)) {
      return;
    }

    const query = buildDualInputQuery(albumQuery, artistQuery);
    if (query) {
      setSearchQuery(query);
      console.log('Executing dual-input search:', query);
    }
  };

  // Check if there's input to show "Press Enter to search" message
  const hasInputToSearch = isDualMode
    ? hasSearchableInput(albumQuery, artistQuery)
    : inputValue.trim().length > 0;

  // Build the "No results" message
  const getNoResultsMessage = () => {
    if (isDualMode) {
      const albumTrimmed = albumQuery.trim();
      const artistTrimmed = artistQuery.trim();

      if (albumTrimmed && artistTrimmed) {
        return `No albums found for "${albumTrimmed}" by "${artistTrimmed}"`;
      } else if (albumTrimmed) {
        return `No albums found for "${albumTrimmed}"`;
      } else if (artistTrimmed) {
        return `No albums found by "${artistTrimmed}"`;
      }
    }
    return `No albums found for "${searchQuery}"`;
  };

  return (
    <div className='space-y-4 text-white relative'>
      {isDualMode ? (
        // Dual-input mode: Album + Artist fields
        <div className='space-y-3'>
          {/* Album input */}
          <div>
            <label className='block text-sm font-medium text-white mb-2'>
              {label}
            </label>
            <div className='relative z-20'>
              <Search className='absolute left-3 top-3 h-4 w-4 text-zinc-400' />
              <input
                id='recommendation-search-input'
                data-tour-step='recommendation-search'
                type='text'
                placeholder={albumPlaceholder}
                value={albumQuery}
                onChange={e => setAlbumQuery(e.target.value)}
                onKeyDown={handleAlbumKeyDown}
                disabled={disabled}
                aria-label='Album title'
                tabIndex={0}
                className={`w-full pl-10 pr-4 py-3 min-h-[44px] bg-zinc-900 border rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${getColorClasses(false)}`}
              />
            </div>
          </div>

          {/* Artist input */}
          <div>
            <div className='relative z-20'>
              <User className='absolute left-3 top-3 h-4 w-4 text-zinc-400' />
              <input
                type='text'
                placeholder={artistPlaceholder}
                value={artistQuery}
                onChange={e => setArtistQuery(e.target.value)}
                onKeyDown={handleArtistKeyDown}
                disabled={disabled}
                aria-label='Artist name (optional)'
                tabIndex={0}
                className={`w-full pl-10 pr-4 py-3 min-h-[44px] bg-zinc-900 border rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${getColorClasses(true)}`}
              />
            </div>
          </div>
        </div>
      ) : (
        // Single-input mode: Legacy behavior
        <div>
          <label className='block text-sm font-medium text-white mb-2'>
            {label}
          </label>
          <div className='relative z-20'>
            <Search className='absolute left-3 top-3 h-4 w-4 text-zinc-400' />
            <input
              id='recommendation-search-input'
              data-tour-step='recommendation-search'
              type='text'
              placeholder={placeholder}
              value={inputValue}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              className={`w-full pl-10 pr-4 py-2 bg-zinc-900 border rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${getColorClasses()}`}
            />
          </div>
        </div>
      )}

      {Boolean(error) && (
        <div className='text-center py-4'>
          <p className='text-red-400 font-medium'>
            Search failed. Please try again.
          </p>
        </div>
      )}

      {isLoading && (
        <div className='text-center py-4'>
          <p className='text-white font-medium'>Searching...</p>
        </div>
      )}

      {albumResults.length > 0 && (
        <div className='space-y-2 max-h-48 overflow-y-auto relative z-[100] bg-zinc-900 rounded-lg border border-zinc-600 p-2'>
          {albumResults.map((result: UnifiedSearchResult) => {
            const album = convertToAlbum(result);
            return (
              <div
                key={album.id}
                onClick={() => onAlbumSelect(album)}
                className='flex items-center space-x-2 p-2 bg-zinc-800 border border-zinc-600 rounded-lg cursor-pointer hover:bg-zinc-700 hover:border-zinc-500 transition-all relative'
              >
                <div className='w-10 h-10 flex-shrink-0 relative'>
                  <AlbumImage
                    src={album.image?.url}
                    alt={`${album.title} by ${sanitizeArtistName(album.artists?.[0]?.name || 'Unknown Artist')}`}
                    width={40}
                    height={40}
                    className='w-full h-full rounded object-cover'
                    sizes='40px'
                    showSkeleton={false}
                  />
                </div>
                <div className='flex-1 min-w-0 relative z-10'>
                  <p className='font-semibold text-white truncate text-sm'>
                    {album.title}
                  </p>
                  <p className='text-sm text-zinc-300 truncate'>
                    {sanitizeArtistName(
                      album.artists?.[0]?.name || 'Unknown Artist'
                    )}
                  </p>
                  {album.year && (
                    <p className='text-xs text-zinc-400'>{album.year}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {searchQuery && !isLoading && albumResults.length === 0 && (
        <div className='text-center py-4'>
          <p className='text-white font-medium'>{getNoResultsMessage()}</p>
        </div>
      )}

      {/* Fixed height container to prevent layout shift */}
      <div className='h-5 flex items-center justify-center'>
        {!searchQuery && hasInputToSearch && (
          <p className='text-zinc-400 text-xs'>Press Enter to search</p>
        )}
      </div>
    </div>
  );
});

export default AlbumSearchBackwardCompatible;
