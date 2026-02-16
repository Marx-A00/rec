'use client';

import { useEffect, useRef, useState } from 'react';

import { useSearchAlbumsQuery } from '@/generated/graphql';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface AlbumGuessInputProps {
  onGuess: (albumId: string, albumTitle: string, artistName: string) => void;
  onSkip: () => void;
  disabled?: boolean;
  isSubmitting?: boolean;
}

/**
 * Autocomplete search input for guessing albums.
 * 
 * Features:
 * - Debounced search (300ms)
 * - Local database only (no external API calls)
 * - Shows album + artist in dropdown
 * - Auto-submits on selection
 * - Keyboard support (Enter, Escape)
 * - Click-outside to close
 */
export function AlbumGuessInput({
  onGuess,
  onSkip,
  disabled = false,
  isSubmitting = false,
}: AlbumGuessInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(inputValue);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [inputValue]);
  
  // Search query (enabled when 2+ characters typed)
  const { data, isLoading } = useSearchAlbumsQuery(
    { query: debouncedValue, limit: 5 },
    { enabled: debouncedValue.length >= 2 }
  );
  
  const results = data?.searchAlbums ?? [];
  
  // Handle album selection
  const handleSelect = (albumId: string) => {
    const album = results.find(a => a.id === albumId);
    if (!album) return;
    
    // Extract artist name (safely handle null)
    const artistName = album.artists?.[0]?.artist?.name ?? 'Unknown Artist';
    
    // Submit guess
    onGuess(albumId, album.title, artistName);
    
    // Clear input and close dropdown
    setInputValue('');
    setIsOpen(false);
  };
  
  // Close dropdown on Escape
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };
  
  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <div className="space-y-3" ref={containerRef}>
      <div className="relative w-full">
        <Command shouldFilter={false} onKeyDown={handleKeyDown}>
          <CommandInput
            placeholder="Search for an album..."
            value={inputValue}
            onValueChange={setInputValue}
            onFocus={() => setIsOpen(true)}
            disabled={disabled || isSubmitting}
            className="h-12"
          />
          {isOpen && inputValue.length >= 2 && (
            <CommandList className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-zinc-700 bg-zinc-900 shadow-lg">
              {isLoading ? (
                <CommandEmpty>Searching...</CommandEmpty>
              ) : results.length === 0 ? (
                <CommandEmpty>No albums found</CommandEmpty>
              ) : (
                <CommandGroup>
                  {results.map((album) => {
                    const artistName = album.artists?.[0]?.artist?.name ?? 'Unknown Artist';
                    return (
                      <CommandItem
                        key={album.id}
                        value={album.id}
                        onSelect={() => handleSelect(album.id)}
                        className="cursor-pointer"
                      >
                        <div>
                          <div className="font-medium">{album.title}</div>
                          <div className="text-sm text-zinc-400">{artistName}</div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          )}
        </Command>
      </div>
      
      <button
        onClick={onSkip}
        disabled={disabled || isSubmitting}
        className="w-full rounded-md border border-zinc-600 bg-transparent px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? 'Skipping...' : 'Skip Guess'}
      </button>
    </div>
  );
}
