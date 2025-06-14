import Image from 'next/image';

import { Album } from '@/types/album';

interface AlbumCardProps {
  album: Album | null;
  title: string;
  isActive: boolean;
  onClick: () => void;
  placeholder?: string;
}

export default function AlbumCard({
  album,
  title,
  isActive,
  onClick,
  placeholder = 'Click to search for an album',
}: AlbumCardProps) {
  return (
    <div
      className={`flex-1 border p-4 rounded-lg cursor-pointer transition-all ${
        isActive
          ? 'border-blue-500 border-2 shadow-lg'
          : 'hover:border-gray-400'
      }`}
      onClick={onClick}
    >
      <h3 className='text-lg font-medium mb-2 text-white'>{title}</h3>
      {album ? (
        <div className='flex flex-col items-center'>
          <div className='relative w-full aspect-square mb-2'>
            <Image
              src={album.image.url}
              alt={album.image.alt || ''}
              fill
              sizes='(max-width: 768px) 100vw, 400px'
              className='object-cover rounded'
            />
          </div>
          <div className='text-center'>
            <div className='font-bold text-white'>{album.title}</div>
            <div className='text-gray-300'>{album.artists?.[0]?.name}</div>
            {album.year && (
              <div className='text-sm text-gray-400'>{album.year}</div>
            )}
            {album.genre && album.genre.length > 0 && (
              <div className='text-sm text-gray-400 mt-1'>
                {album.genre.join(', ')}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className='text-center text-gray-500 py-10'>{placeholder}</div>
      )}
    </div>
  );
}
