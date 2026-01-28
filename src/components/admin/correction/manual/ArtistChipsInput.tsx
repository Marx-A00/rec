'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ArtistChipsInputProps {
  artists: string[];
  onChange: (artists: string[]) => void;
  error?: string;
}

/**
 * Multi-value artist input with chips.
 * 
 * - Each artist renders as a removable Badge chip
 * - Enter key adds new artist (no duplicates)
 * - Backspace on empty input removes last artist
 * - Validates artist count immediately after remove
 * - Shows error if no artists remain
 */
export function ArtistChipsInput({
  artists,
  onChange,
  error: externalError,
}: ArtistChipsInputProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [internalError, setInternalError] = React.useState<string | undefined>();
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Combined error (external or internal)
  const error = externalError || internalError;

  const handleRemove = (index: number) => {
    const newArtists = artists.filter((_, i) => i !== index);
    onChange(newArtists);

    // Immediate validation after removal
    if (newArtists.length === 0) {
      setInternalError('At least one artist required');
    } else {
      setInternalError(undefined);
    }
  };

  const handleAdd = () => {
    const trimmed = inputValue.trim();

    // Don't add empty values
    if (!trimmed) return;

    // Don't add duplicates
    if (artists.includes(trimmed)) {
      setInputValue('');
      return;
    }

    // Add to array
    const newArtists = [...artists, trimmed];
    onChange(newArtists);
    
    // Clear error when artist added
    setInternalError(undefined);
    
    // Clear input and keep focus for rapid entry
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Backspace' && inputValue === '') {
      // Remove last artist when backspace on empty input
      if (artists.length > 0) {
        handleRemove(artists.length - 1);
      }
    }
  };

  const handleChipKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRemove(index);
    }
  };

  return (
    <div className="space-y-1">
      <label className="text-sm text-zinc-400">Artists</label>
      <div
        className={cn(
          'flex flex-wrap gap-2 p-2 border rounded-md bg-zinc-800',
          error ? 'border-red-500' : 'border-zinc-700'
        )}
      >
        {artists.map((artist, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="gap-1.5 pl-2.5 pr-1.5"
          >
            {artist}
            <button
              type="button"
              role="button"
              tabIndex={0}
              onClick={() => handleRemove(index)}
              onKeyDown={(e) => handleChipKeyDown(e, index)}
              className="hover:bg-zinc-700 rounded-sm p-0.5 transition-colors"
              aria-label={`Remove ${artist}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={artists.length === 0 ? 'Add artist name' : 'Add another'}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm text-zinc-100 placeholder:text-zinc-500"
        />
      </div>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
