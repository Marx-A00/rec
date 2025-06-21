import { useState } from 'react';
import { Search } from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';
import { useUnifiedSearchQuery } from '@/hooks';
import { Album } from '@/types/album';
import { sanitizeArtistName } from '@/lib/utils';

interface AlbumSearchProps {
  onAlbumSelect: (album: Album) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

export default function AlbumSearch({
  onAlbumSelect,
  placeholder = 'Search for albums...',
  label = 'Search Albums',
  disabled = false,
}: AlbumSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Use TanStack Query for search
  const {
    data: searchResponse,
    isLoading,
    error,
  } = useUnifiedSearchQuery(searchQuery, {
    type: 'album',
    limit: 10,
    minQueryLength: 2,
    enabled: !disabled,
  });

  // Extract albums from the response (handles both formats)
  const searchResults = searchResponse?.data || [];

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    // TanStack Query handles debouncing automatically
  };

  return (
    <div className='space-y-4'>
      <div>
        <label className='block text-sm font-medium text-zinc-300 mb-2'>
          {label}
        </label>
        <div className='relative'>
          <Search className='absolute left-3 top-3 h-4 w-4 text-zinc-400' />
          <input
            type='text'
            placeholder={placeholder}
            value={searchQuery}
            onChange={e => handleInputChange(e.target.value)}
            disabled={disabled}
            className='w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
          />
        </div>
      </div>

      {error && (
        <div className='text-center py-4'>
          <p className='text-red-400'>Search failed. Please try again.</p>
        </div>
      )}

      {isLoading && (
        <div className='text-center py-4'>
          <p className='text-zinc-400'>Searching...</p>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className='space-y-2 max-h-64 overflow-y-auto'>
          {searchResults.map(album => (
            <div
              key={album.id}
              onClick={() => onAlbumSelect(album)}
              className='flex items-center space-x-3 p-3 bg-zinc-900 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors'
            >
              <AlbumImage
                src={album.image?.url}
                alt={`${album.title} by ${sanitizeArtistName(album.artists?.[0]?.name || 'Unknown Artist')}`}
                width={48}
                height={48}
                className='w-12 h-12 rounded object-cover'
                sizes='48px'
              />
              <div className='flex-1 min-w-0'>
                <p className='font-medium text-white truncate'>{album.title}</p>
                <p className='text-sm text-zinc-400 truncate'>
                  {sanitizeArtistName(
                    album.artists?.[0]?.name || 'Unknown Artist'
                  )}
                </p>
                {album.year && (
                  <p className='text-xs text-zinc-500'>{album.year}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {searchQuery && !isLoading && searchResults.length === 0 && (
        <div className='text-center py-4'>
          <p className='text-zinc-400'>No albums found for "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
}
