'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import AlbumImage from '@/components/ui/AlbumImage';
import {
  useUniversalSearch,
  type SearchMode,
} from '@/hooks/useUniversalSearch';
import type { UnifiedSearchResult } from '@/types/search';
import {
  useAddAlbumToCollectionWithCreateMutation,
  type AlbumInput,
} from '@/generated/graphql';

interface InlineAlbumPickerProps {
  collectionId: string;
  existingAlbumIds: Set<string>;
  onClose: () => void;
  onAlbumsAdded: () => void;
}

function buildAlbumInput(result: UnifiedSearchResult): AlbumInput {
  return {
    title: result.title,
    artists: [{ artistName: result.artist || 'Unknown Artist' }],
    coverImageUrl: result.image?.url || undefined,
    releaseDate: result.releaseDate || undefined,
    musicbrainzId: result.source === 'musicbrainz' ? result.id : undefined,
  };
}

export default function InlineAlbumPicker({
  collectionId,
  existingAlbumIds,
  onClose,
  onAlbumsAdded,
}: InlineAlbumPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [staged, setStaged] = useState<UnifiedSearchResult[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [addProgress, setAddProgress] = useState({ completed: 0, total: 0 });

  const addMutation = useAddAlbumToCollectionWithCreateMutation();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search
  const { results, isLoading: isSearching } = useUniversalSearch(
    debouncedQuery,
    {
      entityTypes: [
        { type: 'album', displayName: 'Albums', weight: 1, maxResults: 12 },
      ],
      searchType: 'albums',
      filters: [],
      debounceMs: 0,
      minQueryLength: 2,
      maxResults: 12,
      enabled: debouncedQuery.length >= 2,
      searchMode: 'LOCAL_AND_EXTERNAL' as SearchMode,
    }
  );

  const stagedIds = new Set(staged.map(s => s.id));

  const toggleStaged = useCallback(
    (result: UnifiedSearchResult) => {
      if (existingAlbumIds.has(result.id)) return;
      setStaged(prev =>
        prev.some(s => s.id === result.id)
          ? prev.filter(s => s.id !== result.id)
          : [...prev, result]
      );
    },
    [existingAlbumIds]
  );

  const removeStaged = useCallback((id: string) => {
    setStaged(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleAddAll = async () => {
    if (staged.length === 0 || isAdding) return;
    setIsAdding(true);
    setAddProgress({ completed: 0, total: staged.length });

    for (let i = 0; i < staged.length; i++) {
      const result = staged[i];
      try {
        const input =
          result.source === 'local'
            ? { collectionId, albumId: result.id, position: 0 }
            : { collectionId, albumData: buildAlbumInput(result), position: 0 };
        await addMutation.mutateAsync({ input });
      } catch {
        // Continue with remaining albums
      }
      setAddProgress({ completed: i + 1, total: staged.length });
    }

    setIsAdding(false);
    setStaged([]);
    onAlbumsAdded();
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className='overflow-hidden'
    >
      <div className='bg-zinc-900/50 border border-zinc-700 rounded-xl p-4 space-y-4'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <h3 className='text-sm font-semibold text-zinc-300'>
            Search albums to add
          </h3>
          <button
            type='button'
            onClick={onClose}
            className='text-zinc-500 hover:text-white transition-colors'
            aria-label='Close'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Search Input */}
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500' />
          <input
            type='text'
            placeholder='Search by album or artist name...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoFocus
            className='w-full pl-10 pr-4 h-10 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cosmic-latte/40 focus:border-transparent'
          />
        </div>

        {/* Staged Albums Row */}
        <AnimatePresence>
          {staged.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className='overflow-hidden'
            >
              <div className='flex items-center gap-3'>
                <div className='flex gap-2 overflow-x-auto flex-1 py-1'>
                  {staged.map(album => (
                    <div key={album.id} className='relative shrink-0 group'>
                      <div className='w-14 h-14 rounded-md overflow-hidden'>
                        <AlbumImage
                          src={album.image?.url}
                          alt={album.title}
                          width={56}
                          height={56}
                          className='w-full h-full object-cover'
                        />
                      </div>
                      <button
                        type='button'
                        onClick={() => removeStaged(album.id)}
                        className='absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-800 border border-zinc-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'
                        aria-label={`Remove ${album.title}`}
                      >
                        <X className='w-3 h-3 text-zinc-300' />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type='button'
                  onClick={handleAddAll}
                  disabled={isAdding}
                  className='shrink-0 px-4 py-2 bg-cosmic-latte text-black text-sm font-semibold rounded-lg hover:bg-cosmic-latte/90 disabled:opacity-50 transition-colors'
                >
                  {isAdding ? (
                    <span className='flex items-center gap-2'>
                      <Loader2 className='w-3.5 h-3.5 animate-spin' />
                      {addProgress.completed}/{addProgress.total}
                    </span>
                  ) : (
                    `Add ${staged.length} Album${staged.length > 1 ? 's' : ''}`
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Results Grid */}
        {isSearching && (
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='w-5 h-5 animate-spin text-zinc-500' />
          </div>
        )}

        {!isSearching && debouncedQuery.length >= 2 && results.length === 0 && (
          <p className='text-center text-sm text-zinc-500 py-6'>
            No albums found for &quot;{debouncedQuery}&quot;
          </p>
        )}

        {!isSearching && results.length > 0 && (
          <div className='grid grid-cols-4 sm:grid-cols-6 gap-3'>
            {results.map(result => {
              const isExisting = existingAlbumIds.has(result.id);
              const isSelected = stagedIds.has(result.id);

              return (
                <button
                  key={result.id}
                  type='button'
                  onClick={() => toggleStaged(result)}
                  disabled={isExisting || isAdding}
                  className='text-left group relative'
                >
                  {/* Album Cover */}
                  <div className='aspect-square rounded-lg overflow-hidden mb-1.5 relative'>
                    <AlbumImage
                      src={result.image?.url}
                      alt={result.title}
                      width={160}
                      height={160}
                      className='w-full h-full object-cover'
                    />

                    {/* Selection Overlay */}
                    {isSelected && (
                      <div className='absolute inset-0 bg-black/50 flex items-center justify-center'>
                        <div className='w-8 h-8 rounded-full bg-cosmic-latte flex items-center justify-center'>
                          <Check className='w-5 h-5 text-black' />
                        </div>
                      </div>
                    )}

                    {/* Already Added Overlay */}
                    {isExisting && (
                      <div className='absolute inset-0 bg-black/60 flex items-center justify-center'>
                        <span className='text-[10px] font-semibold text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full'>
                          Added
                        </span>
                      </div>
                    )}

                    {/* Hover highlight */}
                    {!isExisting && !isSelected && (
                      <div className='absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors' />
                    )}
                  </div>

                  {/* Title + Artist */}
                  <p className='text-xs font-medium text-white truncate'>
                    {result.title}
                  </p>
                  <p className='text-[11px] text-zinc-500 truncate'>
                    {result.artist}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* Empty prompt */}
        {debouncedQuery.length < 2 && results.length === 0 && (
          <p className='text-center text-sm text-zinc-500 py-4'>
            Start typing to search for albums
          </p>
        )}
      </div>
    </motion.div>
  );
}
