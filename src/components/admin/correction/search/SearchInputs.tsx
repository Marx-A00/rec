'use client';

import { useState, FormEvent } from 'react';
import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface SearchInputsProps {
  /** Initial album title (pre-populated from current album) */
  initialAlbumTitle: string;
  /** Initial artist name (pre-populated from primary artist) */
  initialArtistName: string;
  /** Callback when search is triggered */
  onSearch: (query: { albumTitle: string; artistName: string }) => void;
  /** Whether search is in progress (disables search button) */
  isLoading?: boolean;
}

/**
 * Two-field search form for MusicBrainz album correction candidates.
 *
 * Features:
 * - Pre-populates with current album/artist data
 * - Validates that at least one field has content
 * - Triggers search on form submit (button click or Enter key)
 * - Search button disabled when both inputs empty or during loading
 */
export function SearchInputs({
  initialAlbumTitle,
  initialArtistName,
  onSearch,
  isLoading = false,
}: SearchInputsProps) {
  const [albumTitle, setAlbumTitle] = useState(initialAlbumTitle);
  const [artistName, setArtistName] = useState(initialArtistName);

  const trimmedAlbumTitle = albumTitle.trim();
  const trimmedArtistName = artistName.trim();
  const isSearchDisabled =
    isLoading || (!trimmedAlbumTitle && !trimmedArtistName);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSearchDisabled) return;

    onSearch({
      albumTitle: trimmedAlbumTitle,
      artistName: trimmedArtistName,
    });
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-3'>
      <Input
        type='text'
        placeholder='Album title'
        value={albumTitle}
        onChange={e => setAlbumTitle(e.target.value)}
        aria-label='Album title'
      />
      <Input
        type='text'
        placeholder='Artist name'
        value={artistName}
        onChange={e => setArtistName(e.target.value)}
        aria-label='Artist name'
      />
      <Button
        type='submit'
        variant='default'
        className='w-full'
        disabled={isSearchDisabled}
      >
        <Search className='h-4 w-4 mr-2' />
        Search MusicBrainz
      </Button>
    </form>
  );
}
