'use client';

import {
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { Search, X, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Album } from '@/types/album';
import { UnifiedSearchResult } from '@/types/search';
import {
  useUniversalSearch,
  UseUniversalSearchOptions,
} from '@/hooks/useUniversalSearch';
import AlbumImage from '@/components/ui/AlbumImage';
import { sanitizeArtistName } from '@/lib/utils';

// Search UI state machine
type SearchUIState = 'idle' | 'searching' | 'results';

interface AlbumSearchProps {
  onAlbumSelect: (album: Album) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  colorTheme?: 'red' | 'green';
}

export interface AlbumSearchRef {
  clearInput: () => void;
}

/**
 * Album search component for recommendation flows.
 * Single input that handles mixed "album artist" queries via MusicBrainz bare terms matching.
 */
const DualAlbumSearch = forwardRef<AlbumSearchRef, AlbumSearchProps>(
  function DualAlbumSearch(
    {
      onAlbumSelect,
      placeholder = 'Search albums...',
      label = 'Search Albums',
      disabled = false,
      colorTheme,
    },
    ref
  ) {
    const [inputValue, setInputValue] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [uiState, setUIState] = useState<SearchUIState>('idle');
    const [activeSearchTerm, setActiveSearchTerm] = useState('');

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
        setInputValue('');
        setSearchQuery('');
        setUIState('idle');
        setActiveSearchTerm('');
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
        source: result.source as Album['source'],
        // For MusicBrainz results, the search id IS the MusicBrainz UUID
        musicbrainzId: result.source === 'musicbrainz' ? result.id : undefined,
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
    // Sort results to prioritize full albums over singles/EPs
    const sortByReleaseType = (
      a: UnifiedSearchResult,
      b: UnifiedSearchResult
    ) => {
      const priority: Record<string, number> = {
        Album: 0,
        EP: 1,
        Single: 2,
        Broadcast: 3,
        Other: 4,
      };
      const aPriority = priority[a.primaryType || 'Other'] ?? 5;
      const bPriority = priority[b.primaryType || 'Other'] ?? 5;
      return aPriority - bPriority;
    };

    const albumResults =
      searchResults
        ?.filter((result: UnifiedSearchResult) => result.type === 'album')
        .sort(sortByReleaseType) || [];

    // Derived state for UI transitions
    const hasResults = albumResults.length > 0;
    const searchComplete = searchQuery && !isLoading;

    const handleBackToSearch = () => {
      setUIState('idle');
      setSearchQuery('');
    };

    // Transition from searching to results state
    useEffect(() => {
      if (uiState === 'searching' && searchComplete) {
        setUIState('results');
      }
    }, [uiState, searchComplete]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && inputValue.trim()) {
        e.preventDefault();
        setActiveSearchTerm(inputValue.trim());
        setUIState('searching');
        setSearchQuery(inputValue.trim());
      }
    };

    const hasInputToSearch = inputValue.trim().length > 0;

    const getNoResultsMessage = () => {
      return `No albums found for "${activeSearchTerm}"`;
    };

    const getResultsBorderColor = () => {
      if (!colorTheme) return 'border-zinc-600';
      return colorTheme === 'red' ? 'border-red-500/50' : 'border-green-500/50';
    };

    // Whether we're in a "morphed" state (searching or results)
    const isMorphedState = uiState === 'searching' || uiState === 'results';

    return (
      <div className='text-white relative'>
        <motion.div
          className={`rounded-lg overflow-hidden transition-colors duration-300 ${
            isMorphedState
              ? `absolute inset-x-0 top-0 z-50 bg-zinc-900/95 backdrop-blur-xs border-2 ${getResultsBorderColor()} p-4 shadow-2xl`
              : 'relative w-full'
          }`}
          style={isMorphedState ? { maxHeight: '600px' } : {}}
        >
          <AnimatePresence mode='wait'>
            {/* IDLE STATE: Single search input */}
            {uiState === 'idle' && (
              <motion.div
                key='inputs'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className='space-y-3'
              >
                <label className='block text-sm font-medium text-white mb-2'>
                  {label}
                </label>

                <div className='relative z-20'>
                  <Search className='absolute left-3 top-3 h-4 w-4 text-zinc-400' />
                  <input
                    id='recommendation-search-input'
                    type='text'
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    aria-label='Search albums'
                    tabIndex={0}
                    className={`w-full pl-10 pr-4 py-3 min-h-[44px] bg-zinc-900 border rounded-lg text-white placeholder-zinc-400 focus:outline-hidden focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${getColorClasses()}`}
                  />
                </div>

                <div className='h-5 flex items-center justify-center'>
                  {hasInputToSearch && (
                    <p className='text-zinc-400 text-xs'>
                      Press Enter to search
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* SEARCHING STATE: Loading spinner */}
            {uiState === 'searching' && (
              <motion.div
                key='searching'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className='min-h-[500px] flex flex-col items-center justify-center'
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15, duration: 0.2 }}
                  className='flex flex-col items-center gap-3'
                >
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
                  <p className='text-sm text-zinc-400 text-center'>
                    Searching &ldquo;{activeSearchTerm}&rdquo;...
                  </p>
                </motion.div>

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

            {/* RESULTS STATE */}
            {uiState === 'results' && (
              <motion.div
                key='results'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className='max-h-[500px] overflow-hidden flex flex-col'
              >
                <div className='flex items-center justify-between mb-3 shrink-0'>
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

                {hasResults ? (
                  <div className='space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar'>
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
                            <div className='w-12 h-12 shrink-0 relative'>
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

        {/* Error state */}
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
      </div>
    );
  }
);

export default DualAlbumSearch;
