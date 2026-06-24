'use client';

import { useState, useCallback, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import {
  useUniversalSearch,
  UseUniversalSearchOptions,
} from '@/hooks/useUniversalSearch';
import { UnifiedSearchResult } from '@/types/search';
import AlbumImage from '@/components/ui/AlbumImage';

import { ArtistItem, SelectedArtist } from './SortableArtistItem';

const MAX_ARTISTS = 5;

interface ArtistPickerProps {
  preSelectedArtists?: SelectedArtist[];
  onSelectionChange?: (artists: SelectedArtist[]) => void;
}

export default function ArtistPicker({
  preSelectedArtists,
  onSelectionChange,
}: ArtistPickerProps) {
  const [selectedArtists, setSelectedArtists] = useState<SelectedArtist[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  // Sync when preSelectedArtists changes (initial load, Last.fm populate, etc.)
  useEffect(() => {
    if (preSelectedArtists?.length) {
      setSelectedArtists(preSelectedArtists);
    }
  }, [preSelectedArtists]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Artist search configuration
  const searchOptions: UseUniversalSearchOptions = {
    entityTypes: [
      {
        type: 'artist',
        displayName: 'Artists',
        weight: 1,
        maxResults: 8,
      },
    ],
    searchType: 'artists',
    filters: [],
    debounceMs: 0, // We handle debounce manually
    minQueryLength: 2,
    maxResults: 8,
    enabled: debouncedQuery.length >= 2 && selectedArtists.length < MAX_ARTISTS,
    searchMode: 'LOCAL_AND_EXTERNAL',
  };

  const { results, isLoading } = useUniversalSearch(
    debouncedQuery,
    searchOptions
  );

  const artistResults = (results ?? []).filter(
    (r: UnifiedSearchResult) =>
      r.type === 'artist' && !selectedArtists.some(s => s.id === r.id)
  );

  const handleSelect = useCallback(
    (result: UnifiedSearchResult) => {
      if (selectedArtists.length >= MAX_ARTISTS) return;

      const newArtist: SelectedArtist = {
        id: result.id,
        name: result.title,
        imageUrl: result.image?.url || null,
        source: result.source,
        preFilledFromLastfm: false,
      };

      const updated = [...selectedArtists, newArtist];
      setSelectedArtists(updated);
      onSelectionChange?.(updated);
      setSearchQuery('');
      setDebouncedQuery('');
      setShowResults(false);
    },
    [selectedArtists, onSelectionChange]
  );

  const handleRemove = useCallback(
    (id: string) => {
      const updated = selectedArtists.filter(a => a.id !== id);
      setSelectedArtists(updated);
      onSelectionChange?.(updated);
    },
    [selectedArtists, onSelectionChange]
  );

  const isFull = selectedArtists.length >= MAX_ARTISTS;
  const emptySlotCount = MAX_ARTISTS - selectedArtists.length;

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div>
        <h3 className='text-base font-semibold text-white'>
          Pick your favorite artists
        </h3>
        <p className='text-sm text-zinc-400 mt-1'>
          {selectedArtists.length} / {MAX_ARTISTS} selected
        </p>
      </div>

      {/* Search input */}
      <div className='relative'>
        <div className='relative'>
          <Search className='absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400' />
          <input
            type='text'
            placeholder={
              isFull ? 'Maximum artists selected' : 'Search artists...'
            }
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => {
              if (searchQuery.length >= 2) setShowResults(true);
            }}
            disabled={isFull}
            className='w-full pl-10 pr-4 py-3 min-h-[44px] bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cosmic-latte/50 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm'
          />
        </div>

        {/* Search results dropdown */}
        <AnimatePresence>
          {showResults && debouncedQuery.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className='absolute z-50 w-full mt-2 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden shadow-2xl'
            >
              {isLoading && (
                <div className='px-4 py-3 text-sm text-zinc-400'>
                  Searching...
                </div>
              )}

              {!isLoading && artistResults.length === 0 && (
                <div className='px-4 py-3 text-sm text-zinc-500'>
                  No artists found for &ldquo;{debouncedQuery}&rdquo;
                </div>
              )}

              {artistResults.map((result, index) => (
                <button
                  key={result.id}
                  type='button'
                  onClick={() => handleSelect(result)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-700/50 transition-colors text-left ${
                    index < artistResults.length - 1
                      ? 'border-b border-zinc-700/50'
                      : ''
                  }`}
                >
                  <div className='w-9 h-9 shrink-0 rounded overflow-hidden'>
                    <AlbumImage
                      src={result.image?.url}
                      alt={result.title}
                      width={36}
                      height={36}
                      className='w-full h-full object-cover'
                      sizes='36px'
                      showSkeleton={false}
                    />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium text-white truncate'>
                      {result.title}
                    </p>
                    {result._musicbrainz?.disambiguation && (
                      <p className='text-xs text-zinc-400 truncate'>
                        {result._musicbrainz.disambiguation}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Click outside to close dropdown */}
      {showResults && (
        <div
          className='fixed inset-0 z-40'
          onClick={() => setShowResults(false)}
        />
      )}

      {/* Artist grid */}
      <div className='grid grid-cols-4 gap-2.5 auto-rows-auto'>
        {selectedArtists.map((artist, index) => (
          <ArtistItem
            key={artist.id}
            artist={artist}
            isLarge={index === 0 && selectedArtists.length > 1}
            onRemoveAction={handleRemove}
          />
        ))}

        {/* Empty slots */}
        {Array.from({ length: emptySlotCount }).map((_, i) => {
          const slotIndex = selectedArtists.length + i;
          const isLargeSlot = slotIndex === 0 && selectedArtists.length === 0;
          return (
            <div
              key={`empty-${i}`}
              className={`${
                isLargeSlot ? 'col-span-2 row-span-2' : 'col-span-1'
              }`}
            >
              <div
                className='aspect-square rounded-lg border-2 border-dashed border-zinc-700/50 bg-zinc-800/50 flex items-center justify-center cursor-pointer hover:border-zinc-600 hover:bg-zinc-800 transition-colors'
                onClick={() => {
                  if (!isFull) {
                    const input = document.querySelector<HTMLInputElement>(
                      'input[placeholder*="Search artists"]'
                    );
                    input?.focus();
                  }
                }}
              >
                <Plus className='w-5 h-5 text-zinc-600' />
              </div>
              <p className='mt-1.5 text-[11px] font-medium text-zinc-600'>
                #{slotIndex + 1}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
