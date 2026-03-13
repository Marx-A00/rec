'use client';

import { useEffect, useRef, useState } from 'react';

import { useSearchGameAlbumsQuery } from '@/generated/graphql';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface AlbumGuessInputProps {
  onGuess: (guessText: string, localAlbumId?: string) => void;
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
 * - Full keyboard support:
 *   - Enter: Submit highlighted guess
 *   - Escape: Close dropdown and blur input
 *   - Arrow Up/Down: Navigate dropdown (handled by cmdk)
 *   - Tab: Move to Skip button (natural tab order)
 * - Click-outside to close
 * - Mobile-friendly: 44px+ touch targets, scrollable dropdown
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
  // Track cmdk's internal highlighted/selected value so we can reset it
  // after each guess. Without this, cmdk holds onto the previous selection
  // and keyboard navigation (Enter/arrows) breaks on subsequent guesses.
  const [selectedValue, setSelectedValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(inputValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue]);

  // Search query (enabled when 2+ characters typed)
  const { data, isLoading, isError } = useSearchGameAlbumsQuery(
    { query: debouncedValue, limit: 10 },
    {
      enabled: debouncedValue.length >= 2,
      retry: 1,
      staleTime: 0,
      gcTime: 30_000,
    }
  );

  const results = data?.searchGameAlbums ?? [];

  // Handle album selection
  const handleSelect = (resultId: string) => {
    const result = results.find(r => String(r.id) === resultId);
    if (!result) return;

    // Format guess text: "Album Title - Artist Name"
    const guessText = `${result.title} - ${result.artistName}`;

    // Submit with text and optional local album ID
    onGuess(guessText, result.localAlbumId ?? undefined);

    // Clear input, reset cmdk selection, and close dropdown
    setInputValue('');
    setSelectedValue('');
    setIsOpen(false);

    // Refocus input for next guess
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    }
    // Enter and arrow keys are handled by cmdk Command component
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className='space-y-3' ref={containerRef}>
      <div className='relative w-full'>
        <Command
          shouldFilter={false}
          value={selectedValue}
          onValueChange={setSelectedValue}
          onKeyDown={handleKeyDown}
          className='rounded-md border border-zinc-700 focus-within:ring-2 focus-within:ring-emerald-500'
        >
          <CommandInput
            ref={inputRef}
            placeholder='Search for an album...'
            value={inputValue}
            onValueChange={val => {
              setInputValue(val);
              // Re-open dropdown on typing. Needed because after a keyboard
              // submission (Enter), isOpen is false but the input never
              // blurred, so onFocus won't fire again to reopen it.
              if (val.length >= 2) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onClear={() => {
              setInputValue('');
              setSelectedValue('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            disabled={disabled || isSubmitting}
            className='h-12 min-h-[44px]'
            aria-label='Search for an album'
          />
          {isOpen && inputValue.length >= 2 && (
            <CommandList className='custom-scrollbar absolute left-0 right-0 top-full z-50 mt-1 max-h-[300px] overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900 shadow-lg'>
              {isError ? (
                <CommandEmpty>
                  Search unavailable. Keep typing to retry.
                </CommandEmpty>
              ) : isLoading ? (
                <CommandEmpty>Searching...</CommandEmpty>
              ) : results.length === 0 ? (
                <CommandEmpty>No albums found</CommandEmpty>
              ) : (
                <CommandGroup>
                  {results.map(result => (
                    <CommandItem
                      key={result.id}
                      value={String(result.id)}
                      onSelect={() => handleSelect(String(result.id))}
                      className='min-h-[44px] cursor-pointer py-3 data-[selected=true]:bg-zinc-700'
                    >
                      <div>
                        <div className='font-medium'>{result.title}</div>
                        <div className='text-sm text-zinc-400'>
                          {result.artistName}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          )}
        </Command>
      </div>

      <button
        onClick={onSkip}
        disabled={disabled || isSubmitting}
        className='min-h-[44px] w-full rounded-md border border-zinc-600 bg-transparent px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500'
      >
        {isSubmitting ? 'Skipping...' : 'Skip Guess'}
      </button>
    </div>
  );
}
