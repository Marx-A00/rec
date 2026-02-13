'use client';

import { useState, FormEvent } from 'react';
import { Search } from 'lucide-react';

import { ClearableInput } from '@/components/ui/ClearableInput';
import { Button } from '@/components/ui/button';
import type { CorrectionSource } from '@/stores/useCorrectionStore';

export interface SearchInputsProps {
  /** Initial album title (pre-populated from current album) */
  initialAlbumTitle: string;
  /** Initial artist name (pre-populated from primary artist) */
  initialArtistName: string;
  /** Callback when search is triggered */
  onSearch: (query: {
    albumTitle: string;
    artistName: string;
    directId?: string;
  }) => void;
  /** Whether search is in progress (disables search button) */
  isLoading?: boolean;
  /** Current correction source (musicbrainz or discogs) */
  source?: CorrectionSource;
}

/**
 * Search form for album correction candidates.
 *
 * Features:
 * - Pre-populates with current album/artist data
 * - Supports text search (title + artist) or direct ID lookup
 * - Validates that at least one field has content
 * - Triggers search on form submit (button click or Enter key)
 * - Search button disabled when all inputs empty or during loading
 */
export function SearchInputs({
  initialAlbumTitle,
  initialArtistName,
  onSearch,
  isLoading = false,
  source = 'musicbrainz',
}: SearchInputsProps) {
  const [albumTitle, setAlbumTitle] = useState(initialAlbumTitle);
  const [artistName, setArtistName] = useState(initialArtistName);
  const [directId, setDirectId] = useState('');

  const trimmedAlbumTitle = albumTitle.trim();
  const trimmedArtistName = artistName.trim();
  const trimmedDirectId = directId.trim();

  // Search enabled if: ID provided OR (title OR artist provided)
  const isSearchDisabled =
    isLoading || (!trimmedDirectId && !trimmedAlbumTitle && !trimmedArtistName);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSearchDisabled) return;

    onSearch({
      albumTitle: trimmedAlbumTitle,
      artistName: trimmedArtistName,
      directId: trimmedDirectId || undefined,
    });
  };

  const idPlaceholder =
    source === 'musicbrainz'
      ? 'MusicBrainz Release Group ID (UUID)'
      : 'Discogs Master ID (numeric)';

  return (
    <form onSubmit={handleSubmit} className='space-y-3'>
      <div>
        <label className='block text-xs text-zinc-500 mb-1'>Album Title</label>
        <ClearableInput
          type='text'
          placeholder='Album title'
          value={albumTitle}
          onChange={e => setAlbumTitle(e.target.value)}
          onClear={() => setAlbumTitle('')}
          aria-label='Album title'
        />
      </div>
      <div>
        <label className='block text-xs text-zinc-500 mb-1'>Artist Name</label>
        <ClearableInput
          type='text'
          placeholder='Artist name'
          value={artistName}
          onChange={e => setArtistName(e.target.value)}
          onClear={() => setArtistName('')}
          aria-label='Artist name'
        />
      </div>
      <div className='pt-2 border-t border-zinc-700'>
        <label className='block text-xs text-zinc-500 mb-1'>
          Direct ID Lookup (optional)
        </label>
        <ClearableInput
          type='text'
          placeholder={idPlaceholder}
          value={directId}
          onChange={e => setDirectId(e.target.value)}
          onClear={() => setDirectId('')}
          aria-label='Direct ID'
        />
        <p className='text-xs text-zinc-600 mt-1'>
          {source === 'musicbrainz'
            ? 'Paste a MusicBrainz release group UUID to look it up directly'
            : 'Paste a Discogs master ID to look it up directly'}
        </p>
      </div>
      <Button
        type='submit'
        variant='primary'
        className='w-full'
        disabled={isSearchDisabled}
      >
        <Search className='h-4 w-4 mr-2' />
        {trimmedDirectId ? 'Look Up by ID' : 'Search'}{' '}
        {source === 'musicbrainz' ? 'MusicBrainz' : 'Discogs'}
      </Button>
    </form>
  );
}
