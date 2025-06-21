'use client';

import AlbumImage from '@/components/ui/AlbumImage';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { Album } from '@/types/album';
import { sanitizeArtistName } from '@/lib/utils';

interface AlbumSelectorProps {
  albums: Album[];
  selectedAlbums: Album[];
  onAlbumSelect: (album: Album) => void;
  maxSelection: number;
}

export default function AlbumSelector({
  albums,
  selectedAlbums,
  onAlbumSelect,
  maxSelection,
}: AlbumSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAlbums = albums.filter(
    album =>
      album.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      album.artists?.[0]?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      album.year?.toString().includes(searchTerm)
  );

  const isSelected = (album: Album) =>
    selectedAlbums.some(selected => selected.id === album.id);

  const canSelect = selectedAlbums.length < maxSelection;

  return (
    <div className='space-y-6'>
      {/* Search */}
      <div className='relative'>
        <Search className='absolute left-3 top-3 h-4 w-4 text-zinc-400' />
        <input
          type='text'
          placeholder='Search albums...'
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className='w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
        />
      </div>

      {/* Album Grid */}
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-96 overflow-y-auto'>
        {filteredAlbums.map(album => (
          <div
            key={album.id}
            onClick={() => {
              if (isSelected(album) || canSelect) {
                onAlbumSelect(album);
              }
            }}
            className={`
              cursor-pointer transition-all duration-200 rounded-lg p-2
              ${
                isSelected(album)
                  ? 'bg-blue-500/20 ring-2 ring-blue-500'
                  : canSelect
                    ? 'hover:bg-zinc-800/50'
                    : 'opacity-50 cursor-not-allowed'
              }
            `}
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
    </div>
  );
}
