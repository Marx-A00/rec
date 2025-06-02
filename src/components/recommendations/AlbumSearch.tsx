import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import Image from 'next/image';

import { Album } from '@/types/album';

async function fetchAlbums(query: string): Promise<{ albums: Album[] }> {
  const response = await fetch(
    `/api/albums/search?query=${encodeURIComponent(query)}`
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to search albums');
  }
  return response.json();
}

interface AlbumSearchProps {
  onAlbumSelect: (album: Album) => void;
  placeholder: string;
  disabled?: boolean;
}

export default function AlbumSearch({
  onAlbumSelect,
  placeholder,
  disabled,
}: AlbumSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    data: searchData,
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: ['album-search', debouncedQuery],
    queryFn: () => fetchAlbums(debouncedQuery),
    enabled: !!debouncedQuery && debouncedQuery.length > 2 && !disabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const handleAlbumSelect = (album: Album) => {
    onAlbumSelect(album);
    setSearchQuery('');
  };

  return (
    <div className='space-y-4'>
      <div className='relative'>
        <input
          type='text'
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className='border-2 border-gray-300 p-2 rounded-lg w-full text-gray-800 disabled:bg-gray-100'
        />
        {isLoading && (
          <div className='absolute right-3 top-3'>
            <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900'></div>
          </div>
        )}
      </div>

      {isError && <p className='text-red-400 text-sm'>{error?.message}</p>}

      {searchData?.albums && searchData.albums.length > 0 && (
        <div className='border rounded-lg overflow-hidden max-h-60 overflow-y-auto'>
          {searchData.albums.map(album => (
            <div
              key={album.id}
              onClick={() => handleAlbumSelect(album)}
              className='flex items-center p-2 hover:bg-gray-100 cursor-pointer'
            >
              <div className='w-12 h-12 relative mr-3'>
                <Image
                  src={album.image.url}
                  alt={album.image.alt || ''}
                  fill
                  sizes='48px'
                  className='object-cover rounded'
                />
              </div>
              <div>
                <div className='font-medium'>{album.title}</div>
                <div className='text-sm text-gray-600'>{album.artist}</div>
                {album.year && (
                  <div className='text-xs text-gray-500'>{album.year}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
