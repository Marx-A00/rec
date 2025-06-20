'use client';

import AlbumImage from '@/components/ui/AlbumImage';
import { useEffect, useState } from 'react';

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
  const [isLoadingHighQualityImage, setIsLoadingHighQualityImage] =
    useState(false);

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
    if (isRelease(data) && data.type === 'master') {
      console.log('Master release detected:', {
        id: data.id,
        title: data.title,
        type: data.type,
        main_release: data.main_release,
        currentImageUrl: data.basic_information?.cover_image || data.thumb,
      });

      // Try to fetch high-quality image using main_release if available, otherwise try the master ID itself
      const fetchId = data.main_release || data.id;

      setIsLoadingHighQualityImage(true);
      console.log(
        `Fetching high-quality image for master ${data.id}, using ID: ${fetchId}`
      );

      fetch(`/api/albums/${fetchId}`)
        .then(res => res.json())
        .then(result => {
          console.log('High-quality image API response:', result);
          console.log('API response structure:', {
            id: result.id,
            title: result.title,
            image: result.image,
            imageKeys: result.image ? Object.keys(result.image) : 'no image',
            imageUrl: result.image?.url,
          });

          // The API returns the album data directly, not wrapped in {success: true, album: {...}}
          if (result.image && result.image.url) {
            console.log(`Found high-quality image: ${result.image.url}`);
            setHighQualityImageUrl(result.image.url);
          } else {
            console.log('No high-quality image found in response');
            // Let's also check if the image is in a different location
            console.log('Checking alternative image locations:', {
              albumImageUrl: result.albumImageUrl,
              images: result.images,
              cover_image: result.cover_image,
              thumb: result.thumb,
            });
          }
        })
        .catch(error => {
          console.error('Failed to fetch high-quality image:', error);
        })
        .finally(() => {
          setIsLoadingHighQualityImage(false);
        });
    }
  }, [isOpen, data]);

  if (!isOpen || !data) return null;

  const getImageUrl = () => {
    // Use high-quality image if available, otherwise fall back to original logic
    if (highQualityImageUrl) {
      console.log('Using high-quality image:', highQualityImageUrl);
      return highQualityImageUrl;
    }

    if (isCollectionAlbum(data)) {
      const url = data.albumImageUrl;
      console.log('Using collection album image:', url);
      return url;
    } else if (isRelease(data)) {
      // Prefer cover_image over thumb for better quality
      const url = data.basic_information?.cover_image || data.thumb || null;
      console.log('Using release image (cover_image/thumb):', {
        cover_image: data.basic_information?.cover_image,
        thumb: data.thumb,
        selected: url,
      });
      return url;
    }
    console.log('No image URL found, returning null');
    return null;
  };

  const getTitle = () => {
    if (isCollectionAlbum(data)) {
      return data.albumTitle;
    } else if (isRelease(data)) {
      return data.title;
    }
    return 'Unknown Title';
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
        <div className='flex-shrink-0 relative'>
          <AlbumImage
            src={getImageUrl()}
            alt={`${getTitle()} by ${getArtist()}`}
            width={400}
            height={400}
            priority
            className='w-80 h-80 lg:w-96 lg:h-96 rounded-lg object-cover border-2 border-zinc-700 shadow-2xl'
          />

          {/* Loading indicator for high-quality image */}
          {isLoadingHighQualityImage && (
            <div className='absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center'>
              <div className='flex flex-col items-center gap-2'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-cosmic-latte'></div>
                {/* <span className='text-cosmic-latte text-sm'>
                  Loading HD image...
                </span> */}
              </div>
            </div>
          )}

          {/* High-quality image indicator */}
          {/* {highQualityImageUrl && !isLoadingHighQualityImage && (
            <div className='absolute top-2 right-2 bg-emerald-600 text-white text-xs px-2 py-1 rounded-full'>
              HD
            </div>
          )} */}
        </div>

        {/* Album Details */}
        <div className='flex-1 text-center lg:text-left'>
          <h2 className='text-3xl lg:text-4xl font-bold text-cosmic-latte mb-2'>
            {getTitle()}
          </h2>
          <p className='text-xl text-zinc-300 mb-4'>{getArtist()}</p>

          {renderDetails()}
        </div>
      </div>
    </div>
  );
}
