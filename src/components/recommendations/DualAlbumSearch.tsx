'use client';

import {
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { Search, User, X, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

// Search UI state machine
type SearchUIState = 'idle' | 'searching' | 'results';

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
const DualAlbumSearch = forwardRef<AlbumSearchRef, AlbumSearchProps>(
  function DualAlbumSearch(
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

    // UI state for animated transitions
    const [uiState, setUIState] = useState<SearchUIState>('idle');

    // Store the search terms for display in results header
    const [activeSearchTerms, setActiveSearchTerms] = useState<{
      album: string;
      artist: string;
    }>({ album: '', artist: '' });

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
        // Reset UI state
        setUIState('idle');
        setActiveSearchTerms({ album: '', artist: '' });
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

    // Derived state for UI transitions
    const hasResults = albumResults.length > 0;
    const searchComplete = searchQuery && !isLoading;

    // Handle going back to input mode
    const handleBackToSearch = () => {
      setUIState('idle');
      setSearchQuery('');
    };

    // Effect to transition from searching to results state
    useEffect(() => {
      if (uiState === 'searching' && searchComplete) {
        setUIState('results');
      }
    }, [uiState, searchComplete]);

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
        // Store search terms for display
        setActiveSearchTerms({
          album: albumQuery.trim(),
          artist: artistQuery.trim(),
        });
        // Transition to searching state (triggers animation)
        setUIState('searching');
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

    // Get border color for results container based on theme
    const getResultsBorderColor = () => {
      if (!colorTheme) return 'border-zinc-600';
      return colorTheme === 'red' ? 'border-red-500/50' : 'border-green-500/50';
    };

    // Get the search summary text for results header
    const getSearchSummary = () => {
      if (activeSearchTerms.album && activeSearchTerms.artist) {
        return `"${activeSearchTerms.album}" by ${activeSearchTerms.artist}`;
      } else if (activeSearchTerms.album) {
        return `"${activeSearchTerms.album}"`;
      } else if (activeSearchTerms.artist) {
        return `by ${activeSearchTerms.artist}`;
      }
      return '';
    };

    // Whether we're in a "morphed" state (searching or results)
    const isMorphedState = uiState === 'searching' || uiState === 'results';

    return (
      <div className='text-white relative'>
        {/* Single container that morphs between states */}
        {isDualMode && (
          <motion.div
            layout
            className={`relative rounded-lg overflow-hidden origin-center transition-colors duration-300 ${
              isMorphedState
                ? `bg-zinc-900 border-2 ${getResultsBorderColor()} p-3`
                : ''
            }`}
            animate={{
              scaleX: isMorphedState ? 0.92 : 1,
            }}
            transition={{
              scaleX: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
              layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
            }}
          >
            <AnimatePresence mode='wait'>
              {/* IDLE STATE: Input fields */}
              {uiState === 'idle' && (
                <motion.div
                  key='inputs'
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className='space-y-3'
                >
                  {/* Label */}
                  <label className='block text-sm font-medium text-white mb-2'>
                    {label}
                  </label>

                  {/* Album input */}
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

                  {/* Artist input */}
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

                  {/* Press Enter hint */}
                  <div className='h-5 flex items-center justify-center'>
                    {hasInputToSearch && (
                      <p className='text-zinc-400 text-xs'>
                        Press Enter to search
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* SEARCHING STATE: Centered loading spinner */}
              {uiState === 'searching' && (
                <motion.div
                  key='searching'
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className='min-h-[140px] flex flex-col items-center justify-center'
                >
                  {/* Centered loading spinner */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15, duration: 0.2 }}
                    className='flex flex-col items-center gap-3'
                  >
                    {/* Spinner */}
                    <div className='relative'>
                      <div
                        className='w-10 h-10 rounded-full animate-spin'
                        style={{
                          borderWidth: '3px',
                          borderStyle: 'solid',
                          borderColor: '#3f3f46',
                          borderTopColor:
                            colorTheme === 'red' ? '#ef4444' : '#22c55e',
                        }}
                      />
                    </div>
                    {/* Search text */}
                    <p className='text-sm text-zinc-400 text-center'>
                      Searching
                      {activeSearchTerms.album
                        ? ` "${activeSearchTerms.album}"`
                        : ''}
                      {activeSearchTerms.artist
                        ? ` by ${activeSearchTerms.artist}`
                        : ''}
                      ...
                    </p>
                  </motion.div>

                  {/* Back button in corner */}
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    onClick={handleBackToSearch}
                    className='absolute top-3 left-3 p-1.5 rounded-full hover:bg-zinc-800 transition-colors'
                    aria-label='Back to search'
                  >
                    <ArrowLeft className='w-4 h-4 text-zinc-400' />
                  </motion.button>
                </motion.div>
              )}

              {/* RESULTS STATE: Populated container with candidates */}
              {uiState === 'results' && (
                <motion.div
                  key='results'
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className='max-h-[240px] overflow-hidden flex flex-col'
                >
                  {/* Header with search info and back button */}
                  <div className='flex items-center justify-between mb-3 flex-shrink-0'>
                    <div className='flex items-center gap-2'>
                      <button
                        onClick={handleBackToSearch}
                        className='p-1.5 rounded-full hover:bg-zinc-800 transition-colors'
                        aria-label='Back to search'
                      >
                        <ArrowLeft className='w-4 h-4 text-zinc-400' />
                      </button>
                      <span className='text-sm text-zinc-400'>
                        {hasResults
                          ? `${albumResults.length} result${albumResults.length !== 1 ? 's' : ''}`
                          : 'No results'}
                      </span>
                    </div>
                    <button
                      onClick={handleBackToSearch}
                      className='p-1.5 rounded-full hover:bg-zinc-800 transition-colors'
                      aria-label='Clear search'
                    >
                      <X className='w-4 h-4 text-zinc-400' />
                    </button>
                  </div>

                  {/* Results list */}
                  {hasResults ? (
                    <div className='space-y-2 overflow-y-auto flex-1 pr-1'>
                      {albumResults.map(
                        (result: UnifiedSearchResult, index) => {
                          const album = convertToAlbum(result);
                          return (
                            <motion.div
                              key={album.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                delay: index * 0.05,
                                duration: 0.2,
                              }}
                              onClick={() => onAlbumSelect(album)}
                              className='flex items-center gap-3 p-2 bg-zinc-800 border border-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-700 hover:border-zinc-600 transition-all'
                            >
                              <div className='w-12 h-12 flex-shrink-0 relative'>
                                <AlbumImage
                                  src={album.image?.url}
                                  alt={`${album.title} by ${sanitizeArtistName(album.artists?.[0]?.name || 'Unknown Artist')}`}
                                  width={48}
                                  height={48}
                                  className='w-full h-full rounded object-cover'
                                  sizes='48px'
                                  showSkeleton={false}
                                />
                              </div>
                              <div className='flex-1 min-w-0'>
                                <p className='font-semibold text-white truncate text-sm'>
                                  {album.title}
                                </p>
                                <p className='text-sm text-zinc-300 truncate'>
                                  {sanitizeArtistName(
                                    album.artists?.[0]?.name || 'Unknown Artist'
                                  )}
                                </p>
                                {album.year && (
                                  <p className='text-xs text-zinc-500'>
                                    {album.year}
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          );
                        }
                      )}
                    </div>
                  ) : (
                    <div className='flex-1 flex items-center justify-center min-h-[100px]'>
                      <p className='text-zinc-500 text-sm'>
                        {getNoResultsMessage()}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Error state - shown in any UI state */}
        {Boolean(error) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='mt-4 text-center py-4'
          >
            <p className='text-red-400 font-medium'>
              Search failed. Please try again.
            </p>
          </motion.div>
        )}

        {/* Legacy single-input mode (backward compatibility) */}
        {!isDualMode && (
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

            {isLoading && (
              <div className='text-center py-4'>
                <p className='text-white font-medium'>Searching...</p>
              </div>
            )}

            {albumResults.length > 0 && (
              <div className='space-y-2 max-h-48 overflow-y-auto relative z-[100] bg-zinc-900 rounded-lg border border-zinc-600 p-2 mt-4'>
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
                <p className='text-white font-medium'>
                  {getNoResultsMessage()}
                </p>
              </div>
            )}

            <div className='h-5 flex items-center justify-center'>
              {!searchQuery && hasInputToSearch && (
                <p className='text-zinc-400 text-xs'>Press Enter to search</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

export default DualAlbumSearch;
