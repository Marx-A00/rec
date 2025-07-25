import { useState, useImperativeHandle, forwardRef } from 'react';
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
  colorTheme?: 'red' | 'green';
}

export interface AlbumSearchRef {
  clearInput: () => void;
}

const AlbumSearch = forwardRef<AlbumSearchRef, AlbumSearchProps>(
  function AlbumSearch(
    {
      onAlbumSelect,
      placeholder = 'Search for albums...',
      label = 'Search Albums',
      disabled = false,
      colorTheme,
    },
    ref
  ) {
    const [searchQuery, setSearchQuery] = useState('');

    // Expose clearInput method to parent components
    useImperativeHandle(ref, () => ({
      clearInput: () => {
        setSearchQuery('');
      },
    }));

    // Use TanStack Query for search
    const {
      data: searchResponse,
      isLoading,
      error,
    } = useUnifiedSearchQuery(searchQuery, {
      type: 'albums',
      limit: 10,
      minQueryLength: 2,
      enabled: !disabled && searchQuery.length >= 2,
    });

    // Extract albums from the response and convert SearchResultItem to Album format
    const searchResults =
      searchResponse?.results
        ?.filter(result => result.type === 'album')
        .map(result => ({
          id: result.id,
          title: result.title,
          artists: [
            {
              id: result.id, // Use result.id as fallback since we don't have separate artist ID
              name: result.artist,
            },
          ],
          year: result.releaseDate ? parseInt(result.releaseDate) : undefined,
          image: result.image,
        })) || [];

    const handleInputChange = (value: string) => {
      setSearchQuery(value);
      console.log(
        'RecommendationModal AlbumSearch:',
        value,
        'Results:',
        searchResults.length
      );
      // TanStack Query handles debouncing automatically
    };

    // Get color classes based on theme
    const getColorClasses = () => {
      if (!colorTheme) {
        return 'border-zinc-700 focus:ring-blue-500';
      }

      return colorTheme === 'red'
        ? 'border-red-500/70 focus:ring-red-500 focus:border-red-500'
        : 'border-green-500/70 focus:ring-green-500 focus:border-green-500';
    };

    return (
      <div className='space-y-4 text-white relative'>
        <div>
          <label className='block text-sm font-medium text-white mb-2'>
            {label}
          </label>
          <div className='relative z-20'>
            <Search className='absolute left-3 top-3 h-4 w-4 text-zinc-400' />
            <input
              type='text'
              placeholder={placeholder}
              value={searchQuery}
              onChange={e => handleInputChange(e.target.value)}
              disabled={disabled}
              className={`w-full pl-10 pr-4 py-2 bg-zinc-900 border rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${getColorClasses()}`}
            />
          </div>
        </div>

        {error && (
          <div className='text-center py-4'>
            <p className='text-red-400 font-medium'>
              Search failed. Please try again.
            </p>
          </div>
        )}

        {isLoading && (
          <div className='text-center py-4'>
            <p className='text-white font-medium'>Searching...</p>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className='space-y-2 max-h-64 overflow-y-auto relative z-[200] bg-zinc-900 rounded-lg border border-zinc-600 p-2'>
            {searchResults.map(album => (
              <div
                key={album.id}
                onClick={() => onAlbumSelect(album)}
                className='flex items-center space-x-3 p-3 bg-zinc-800 border border-zinc-600 rounded-lg cursor-pointer hover:bg-zinc-700 hover:border-zinc-500 transition-all relative'
              >
                <div className='w-12 h-12 flex-shrink-0 relative'>
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
                <div className='flex-1 min-w-0 relative z-10'>
                  <p className='font-semibold text-white truncate text-sm'>
                    {album.title}
                  </p>
                  <p className='text-sm text-zinc-300 truncate'>
                    {sanitizeArtistName(
                      album.artists?.[0]?.name || 'Unknown Artist'
                    )}
                  </p>
                  {album.year && (
                    <p className='text-xs text-zinc-400'>{album.year}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {searchQuery && !isLoading && searchResults.length === 0 && (
          <div className='text-center py-4'>
            <p className='text-white font-medium'>
              No albums found for &quot;{searchQuery}&quot;
            </p>
          </div>
        )}
      </div>
    );
  }
);

export default AlbumSearch;
