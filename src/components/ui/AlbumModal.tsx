'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import AlbumImage from '@/components/ui/AlbumImage';
import { Release } from '@/types/album';
import { CollectionAlbum } from '@/types/collection';

interface AlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Release | CollectionAlbum | null;
  isExiting: boolean;
}

function isCollectionAlbum(
  data: Release | CollectionAlbum | null
): data is CollectionAlbum {
  return data !== null && 'albumTitle' in data && 'albumArtist' in data;
}

function isRelease(data: Release | CollectionAlbum | null): data is Release {
  return (
    data !== null &&
    'title' in data &&
    ('thumb' in data || 'basic_information' in data)
  );
}

export default function AlbumModal({
  isOpen,
  onClose,
  data,
  isExiting,
}: AlbumModalProps) {
  const [highQualityImageUrl, setHighQualityImageUrl] = useState<string | null>(
    null
  );
  const router = useRouter();

  const isMasterRelease = useMemo(
    () => isRelease(data) && data.type === 'master',
    [data]
  );

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Fetch high-quality image for master releases
  useEffect(() => {
    if (!isOpen || !data) {
      setHighQualityImageUrl(null);
      return;
    }

    // Enhanced high-quality image fetching for master releases
    if (isMasterRelease) {
      // Try to fetch high-quality image using main_release if available, otherwise try the master ID itself
      const fetchId = isRelease(data) ? data.main_release || data.id : data.id;

      fetch(`/api/albums/${fetchId}`)
        .then(res => res.json())
        .then(result => {
          // The API returns the album data directly, not wrapped in {success: true, album: {...}}
          if (result.image && result.image.url) {
            setHighQualityImageUrl(result.image.url);
          }
        })
        .catch(error => {
          console.error('Failed to fetch high-quality image:', error);
        });
    }
  }, [isOpen, data, isMasterRelease]);

  if (!isOpen || !data) return null;

  // Get the high-quality image URL when available
  const getHighQualityImageUrl = () => {
    return highQualityImageUrl;
  };

  const getTitle = () => {
    if (isCollectionAlbum(data)) {
      return data.albumTitle;
    } else if (isRelease(data)) {
      return data.title;
    }
    return 'Unknown Title';
  };

  // Get album ID for navigation
  const getAlbumId = () => {
    if (isCollectionAlbum(data)) {
      return data.albumId;
    } else if (isRelease(data)) {
      // Use main_release if available, otherwise fall back to data.id
      return data.main_release || data.id;
    }
    return null;
  };

  // Handle album title click navigation
  const handleAlbumClick = () => {
    const albumId = getAlbumId();
    if (albumId) {
      // Close modal first
      onClose();
      // Navigate to album details page
      router.push(`/albums/${albumId}`);
    }
  };

  // Handle keyboard navigation (Enter key)
  const handleAlbumKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleAlbumClick();
    }
  };

  // is there a reason we are getting these separately?
  const getArtist = () => {
    if (isCollectionAlbum(data)) {
      return data.albumArtist;
    } else if (isRelease(data)) {
      return (
        data.artist ||
        data.basic_information?.artists?.[0]?.name ||
        'Unknown Artist'
      );
    }
    return 'Unknown Artist';
  };

  const renderDetails = () => {
    if (isCollectionAlbum(data)) {
      return (
        <div className='space-y-3 mb-6'>
          {data.albumYear && (
            <p className='text-zinc-400'>
              <span className='text-cosmic-latte font-medium'>Released:</span>{' '}
              {data.albumYear}
            </p>
          )}
          <p className='text-zinc-400'>
            <span className='text-cosmic-latte font-medium'>Added:</span>{' '}
            {new Date(data.addedAt).toLocaleDateString()}
          </p>
          {data.personalRating && (
            <p className='text-zinc-400'>
              <span className='text-cosmic-latte font-medium'>
                Personal Rating:
              </span>
              <span className='text-emeraled-green ml-2'>
                ★ {data.personalRating}/10
              </span>
            </p>
          )}
        </div>
      );
    } else if (isRelease(data)) {
      return (
        <div className='space-y-3 mb-6'>
          {data.year && (
            <p className='text-zinc-400'>
              <span className='text-cosmic-latte font-medium'>Released:</span>{' '}
              {data.year}
            </p>
          )}
          {data.format && (
            <p className='text-zinc-400'>
              <span className='text-cosmic-latte font-medium'>Format:</span>{' '}
              {Array.isArray(data.format)
                ? data.format.join(', ')
                : data.format}
            </p>
          )}
          {data.label && Array.isArray(data.label) && data.label.length > 0 && (
            <p className='text-zinc-400'>
              <span className='text-cosmic-latte font-medium'>Label:</span>{' '}
              {data.label.join(', ')}
            </p>
          )}
          {data.role && (
            <p className='text-zinc-400'>
              <span className='text-cosmic-latte font-medium'>Role:</span>{' '}
              {data.role}
            </p>
          )}
          {data.type && (
            <p className='text-zinc-400'>
              <span className='text-cosmic-latte font-medium'>Type:</span>{' '}
              <span className='capitalize'>{data.type}</span>
              {data.type === 'master' && (
                <span className='text-emerald-400 ml-2'>(Master Release)</span>
              )}
            </p>
          )}
        </div>
      );
    }
    return null;
  };
  return (
    <div
      className={`fixed inset-0 bg-black flex items-center justify-center z-50 p-4 transition-all duration-300 ${
        isExiting ? 'bg-opacity-0' : 'bg-opacity-90'
      }`}
      style={{
        backdropFilter: isExiting ? 'none' : 'blur(4px)',
        transition: isExiting
          ? 'background-color 300ms ease-out, backdrop-filter 0ms ease-out'
          : 'background-color 300ms ease-out, backdrop-filter 150ms ease-out',
      }}
      onClick={onClose}
    >
      <div
        className={`flex flex-col lg:flex-row items-center lg:items-start gap-8 max-w-4xl w-full transition-all duration-300 relative ${
          isExiting
            ? 'opacity-0 scale-95 translate-y-4'
            : 'opacity-100 scale-100 translate-y-0'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Close X button */}
        <button
          onClick={onClose}
          className='absolute -top-2 -right-2 z-60 text-cosmic-latte hover:text-white transition-all duration-200 hover:scale-110'
        >
          <svg
            className='w-6 h-6'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        </button>

        {/* Zoomed Album Cover */}
        <div className='flex-shrink-0'>
          <div className='w-80 h-80 lg:w-96 lg:h-96 bg-zinc-800 rounded-lg border-2 border-zinc-700 shadow-2xl overflow-hidden relative'>
            <AlbumImage
              src={getHighQualityImageUrl()}
              alt={`${getTitle()} by ${getArtist()}`}
              width={384}
              height={384}
              priority
              className='w-full h-full object-cover'
              sizes='(max-width: 1024px) 320px, 384px'
              style={{ aspectRatio: '1/1' }}
            />
          </div>
        </div>

        {/* Album Details */}
        <div className='flex-1 text-center lg:text-left'>
          <button
            onClick={handleAlbumClick}
            onKeyDown={handleAlbumKeyDown}
            className='text-3xl lg:text-4xl font-bold text-cosmic-latte hover:underline cursor-pointer mb-2 transition-all duration-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-cosmic-latte focus:ring-opacity-50 rounded-md px-1'
            tabIndex={0}
            aria-label={`Navigate to album details for ${getTitle()}`}
          >
            {getTitle()}
          </button>
          <p className='text-xl text-zinc-300 mb-4'>{getArtist()}</p>

          {renderDetails()}
        </div>
      </div>
    </div>
  );
}
