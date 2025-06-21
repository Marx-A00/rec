import { useState } from 'react';
import { Search } from 'lucide-react';
import AlbumImage from '@/components/ui/AlbumImage';
import { Album } from '@/types/album';
import { sanitizeArtistName } from '@/lib/utils';

interface AlbumSearchProps {
  onAlbumSelect: (album: Album) => void;
  placeholder?: string;
  label?: string;
}

export default function AlbumSearch({
  onAlbumSelect,
  placeholder = 'Search for albums...',
  label = 'Search Albums',
}: AlbumSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&type=album&limit=10`
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.data || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    // Debounce search
    const timeoutId = setTimeout(() => handleSearch(value), 300);
    return () => clearTimeout(timeoutId);
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
            className='w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>
      </div>

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
