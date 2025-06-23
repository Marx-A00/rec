'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';
import { Album } from '@/types/album';
import { sanitizeArtistName } from '@/lib/utils';

interface AlbumSelectorProps {
  userCollection: Album[];
  searchResults: Album[];
  searchQuery: string;
  isSearching: boolean;
  onAlbumSelect: (album: Album) => void;
  onSearch: (query: string) => Promise<void>;
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
  const [activeTab, setActiveTab] = useState<'collection' | 'search'>(
    'collection'
  );

  const albums = activeTab === 'collection' ? userCollection : searchResults;

  return (
    <div className='space-y-6'>
      {/* Tabs */}
      <div className='flex space-x-1 bg-zinc-800 p-1 rounded-lg'>
        <button
          onClick={() => setActiveTab('collection')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'collection'
              ? 'bg-zinc-700 text-white'
              : 'text-zinc-300 hover:text-white'
          }`}
        >
          My Collection ({userCollection.length})
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'search'
              ? 'bg-zinc-700 text-white'
              : 'text-zinc-300 hover:text-white'
          }`}
        >
          Search Albums
        </button>
      </div>

      {/* Search (only show when search tab is active) */}
      {activeTab === 'search' && (
        <div className='relative'>
          <Search className='absolute left-3 top-3 h-4 w-4 text-zinc-400' />
          <input
            type='text'
            placeholder='Search albums...'
            value={searchQuery}
            onChange={e => {
              onSearchQueryChange(e.target.value);
              onSearch(e.target.value);
            }}
            className='w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
          {isSearching && (
            <div className='absolute right-3 top-3'>
              <div className='w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin' />
            </div>
          )}
        </div>
      )}

      {/* Album Grid */}
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-96 overflow-y-auto'>
        {albums.map(album => (
          <div
            key={album.id}
            onClick={() => onAlbumSelect(album)}
            className='cursor-pointer transition-all duration-200 rounded-lg p-2 hover:bg-zinc-800/50'
          >
            <AlbumImage
              src={album.image?.url}
              alt={`${album.title} by ${sanitizeArtistName(album.artists?.[0]?.name || 'Unknown Artist')}`}
              width={120}
              height={120}
              className='w-full aspect-square rounded-lg object-cover mb-2'
              sizes='120px'
            />
            <div className='text-center'>
              <p className='text-white text-sm font-medium truncate'>
                {album.title}
              </p>
              <p className='text-zinc-300 text-xs truncate'>
                {sanitizeArtistName(
                  album.artists?.[0]?.name || 'Unknown Artist'
                )}
              </p>
              {album.year && (
                <p className='text-zinc-400 text-xs'>{album.year}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty states */}
      {albums.length === 0 && (
        <div className='text-center py-8 text-zinc-400'>
          {activeTab === 'collection'
            ? 'No albums in your collection yet. Add some albums to get started!'
            : searchQuery
              ? isSearching
                ? 'Searching...'
                : 'No albums found for your search.'
              : 'Enter a search term to find albums.'}
        </div>
      )}
    </div>
  );
}
