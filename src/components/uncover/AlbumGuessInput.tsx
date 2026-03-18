'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
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
 * - Dropdown rendered via portal into root mobile container (not document.body)
 * - Uses position:absolute (not fixed) to avoid iOS Safari keyboard bugs
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
  const [dropdownPos, setDropdownPos] = useState<DropdownPosition | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const commandRef = useRef<HTMLDivElement>(null);

  // Portal target: the root mobile layout container (fixed inset-0).
  // We portal here instead of document.body so we can use position:absolute
  // relative to this container. This avoids iOS Safari's broken position:fixed
  // behavior when the virtual keyboard is open.
  const getPortalTarget = useCallback(() => {
    return document.getElementById('mobile-root') ?? document.body;
  }, []);

  // Measure the input's position and compute where the portal dropdown should go.
  // Uses position:absolute relative to the root mobile container instead of
  // position:fixed on document.body, avoiding iOS Safari keyboard positioning bugs.
  const updateDropdownPosition = useCallback(() => {
    if (!commandRef.current) return;
    const portalTarget = getPortalTarget();
    const inputRect = commandRef.current.getBoundingClientRect();
    const containerRect = portalTarget.getBoundingClientRect();
    const DROPDOWN_GAP = 4;
    const VIEWPORT_PADDING = 8;
    // Position relative to the portal target container
    const relativeTop = inputRect.bottom - containerRect.top;
    const relativeLeft = inputRect.left - containerRect.left;
    const availableBelow =
      containerRect.height - relativeTop - DROPDOWN_GAP - VIEWPORT_PADDING;
    const maxHeight = Math.min(300, availableBelow);
    setDropdownPos({
      top: relativeTop + DROPDOWN_GAP,
      left: relativeLeft,
      width: inputRect.width,
      maxHeight: Math.max(maxHeight, 120), // minimum usable height
    });
  }, [getPortalTarget]);

  const showDropdown = isOpen && inputValue.length >= 2;

  // Recalculate position when dropdown becomes visible or viewport changes.
  // Keyed on showDropdown (not just isOpen) because the keyboard may have
  // shifted elements between focus and the user typing 2+ characters.
  useEffect(() => {
    if (!showDropdown) return;
    updateDropdownPosition();

    const handleChange = () => updateDropdownPosition();
    const vv = window.visualViewport;

    // visualViewport fires on keyboard open/close, pinch zoom, address bar
    vv?.addEventListener('resize', handleChange);
    vv?.addEventListener('scroll', handleChange);
    window.addEventListener('resize', handleChange);

    return () => {
      vv?.removeEventListener('resize', handleChange);
      vv?.removeEventListener('scroll', handleChange);
      window.removeEventListener('resize', handleChange);
    };
  }, [showDropdown, updateDropdownPosition]);

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

  // Close dropdown on click outside (checks both container and portaled dropdown)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inContainer =
        containerRef.current && containerRef.current.contains(target);
      const inDropdown =
        dropdownRef.current && dropdownRef.current.contains(target);
      if (!inContainer && !inDropdown) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dropdownContent = showDropdown && dropdownPos && (
    <CommandList
      className='custom-scrollbar overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900 shadow-lg'
      style={{ maxHeight: dropdownPos.maxHeight }}
    >
      {isError ? (
        <CommandEmpty>Search unavailable. Keep typing to retry.</CommandEmpty>
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
                <div className='text-sm text-zinc-400'>{result.artistName}</div>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      )}
    </CommandList>
  );

  return (
    <div className='space-y-3' ref={containerRef}>
      <div className='relative w-full'>
        <Command
          ref={commandRef}
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

          {/* Portal dropdown into the root mobile container (fixed inset-0) to escape
              stacking context and overflow clipping. Uses position:absolute instead of
              position:fixed to avoid iOS Safari keyboard positioning bugs. */}
          {dropdownContent &&
            createPortal(
              <div
                ref={dropdownRef}
                className='z-[60]'
                style={{
                  position: 'absolute',
                  top: dropdownPos!.top,
                  left: dropdownPos!.left,
                  width: dropdownPos!.width,
                }}
              >
                {dropdownContent}
              </div>,
              getPortalTarget()
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
