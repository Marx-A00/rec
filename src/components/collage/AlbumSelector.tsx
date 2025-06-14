'use client';

import Image from 'next/image';
import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { Album } from '@/types/album';

interface AlbumSelectorProps {
  userCollection: Album[];
  searchResults: Album[];
  searchQuery: string;
  isSearching: boolean;
  onAlbumSelect: (album: Album) => void;
  onSearch: (query: string) => void;
  onSearchQueryChange: (query: string) => void;
}

export default function AlbumSelector({
  userCollection,
  searchResults,
  searchQuery,
  isSearching,
  onAlbumSelect,
  onSearch,
  onSearchQueryChange,
}: AlbumSelectorProps) {
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  const handleSearchInput = (value: string) => {
    onSearchQueryChange(value);

    // Debounce search
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      onSearch(value);
    }, 300);

    setSearchTimeout(timeout);
  };

  const AlbumCard = ({ album }: { album: Album }) => (
    <div
      onClick={() => onAlbumSelect(album)}
      className='relative group cursor-pointer bg-zinc-800 rounded-lg overflow-hidden hover:bg-zinc-700 transition-colors'
    >
      <Image
        src={album.image.url}
        alt={`${album.artists?.[0]?.name} - ${album.title}`}
        width={128}
        height={128}
        className='w-full aspect-square object-cover'
      />
      <div className='absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-70 transition-all duration-200 flex items-center justify-center'>
        <div className='opacity-0 group-hover:opacity-100 text-cosmic-latte text-xs text-center p-2'>
          <p className='font-medium truncate mb-1'>{album.title}</p>
          <p className='text-zinc-300 truncate'>{album.artists?.[0]?.name}</p>
        </div>
      </div>
      <div className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity'>
        <div className='bg-emeraled-green text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold'>
          +
        </div>
      </div>
    </div>
  );

  return (
    <div className='space-y-6'>
      {/* Search */}
      <div>
        <h3 className='text-lg font-semibold text-cosmic-latte mb-3'>
          Search Albums
        </h3>
        <Input
          type='text'
          placeholder='Search for albums...'
          value={searchQuery}
          onChange={e => handleSearchInput(e.target.value)}
          className='bg-zinc-800 border-zinc-700 text-cosmic-latte placeholder-zinc-500'
        />
        {isSearching && (
          <p className='text-zinc-400 text-sm mt-2'>Searching...</p>
        )}
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div>
          <h4 className='text-md font-medium text-cosmic-latte mb-3'>
            Search Results ({searchResults.length})
          </h4>
          <div className='grid grid-cols-3 gap-3 max-h-64 overflow-y-auto'>
            {searchResults.map(album => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
          {searchResults.length === 0 && !isSearching && searchQuery && (
            <p className='text-zinc-500 text-center py-4'>No albums found.</p>
          )}
        </div>
      )}

      {/* User Collection */}
      <div>
        <h3 className='text-lg font-semibold text-cosmic-latte mb-3'>
          My Collection ({userCollection.length})
        </h3>
        <div className='grid grid-cols-3 gap-3 max-h-96 overflow-y-auto'>
          {userCollection.map(album => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
        {userCollection.length === 0 && (
          <p className='text-zinc-500 text-center py-4'>
            No albums in your collection yet.
          </p>
        )}
      </div>
    </div>
  );
}
