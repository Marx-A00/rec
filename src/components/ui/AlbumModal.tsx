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
  onNavigateToAlbum?: (albumId: string) => void;
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
  onNavigateToAlbum,
}: AlbumModalProps) {
  const [highQualityImageUrl, setHighQualityImageUrl] = useState<string | null>(
    null
  );
  const router = useRouter();

  const isMasterRelease = useMemo(
    () => isRelease(data) && data.type === 'master',
    [data]
  );

  // Enhanced keyboard handling for accessibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      // Handle Escape key
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      // Trap focus within modal
      if (event.key === 'Tab') {
        const modal = document.getElementById('album-modal-container');
        if (!modal) return;

        const focusableElements = modal.querySelectorAll(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[
          focusableElements.length - 1
        ] as HTMLElement;

        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Focus the modal title when opened
      setTimeout(() => {
        const titleButton = document.getElementById('album-modal-title');
        if (titleButton && !titleButton.hasAttribute('disabled')) {
          titleButton.focus();
        } else {
          // Focus close button if title is disabled
          const closeButton = document.querySelector(
            '[aria-label="Close album details modal"]'
          ) as HTMLElement;
          closeButton?.focus();
        }
      }, 100);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
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
      // FIXED: Use same logic as getAlbumId() - for masters, always use master ID!
      const fetchId =
        isRelease(data) && data.type === 'master'
          ? data.id
          : isRelease(data)
            ? data.main_release || data.id
            : data.id;

      console.log(
        '🖼️ AlbumModal - Fetching high-quality image for ID:',
        fetchId,
        'from master:',
        data.id
      );

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

  // Get the image URL with proper fallbacks for different data types
  const getImageUrl = () => {
    // For master releases, prefer high-quality image if available
    if (highQualityImageUrl) {
      return highQualityImageUrl;
    }

    // For collection albums, use the stored image URL
    if (isCollectionAlbum(data)) {
      return data.albumImageUrl;
    }

    // For releases, try to get image from various sources
    if (isRelease(data)) {
      // Try thumb first, then basic_information image
      if (data.thumb) {
        return data.thumb;
      }
      if (data.basic_information?.thumb) {
        return data.basic_information.thumb;
      }
      if (data.basic_information?.cover_image) {
        return data.basic_information.cover_image;
      }
    }

    // Fallback to null if no image is available
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

  // Get album ID for navigation
  const getAlbumId = () => {
    if (isCollectionAlbum(data)) {
      return data.albumId;
    } else if (isRelease(data)) {
      // BUG TRACE: Log the ID selection logic
      console.log('🚨 AlbumModal getAlbumId - Release data:', {
        id: data.id,
        main_release: data.main_release,
        type: data.type,
        title: data.title,
        selectedId: data.main_release || data.id,
      });

      // ISSUE: This prioritizes main_release over master ID!
      // For masters, we should use data.id (master ID), not main_release!
      if (data.type === 'master') {
        console.log('🟢 AlbumModal - Using MASTER ID for navigation:', data.id);
        return data.id;
      } else {
        console.log(
          '🔵 AlbumModal - Using main_release or fallback ID:',
          data.main_release || data.id
        );
        return data.main_release || data.id;
      }
    }
    return null;
  };

  // Check if album navigation is available
  const isNavigationAvailable = () => {
    const albumId = getAlbumId();
    return albumId !== null && albumId !== undefined;
  };

  // Handle album title click navigation
  const handleAlbumClick = () => {
    const albumId = getAlbumId();
    if (albumId) {
      try {
        // Close modal first
        onClose();
        // Convert to string to ensure type safety
        const albumIdString = String(albumId);
        // Use custom navigation handler if provided, otherwise use router
        if (onNavigateToAlbum) {
          onNavigateToAlbum(albumIdString);
        } else {
          // Fallback to internal navigation
          router.push(`/albums/${albumIdString}`);
        }
      } catch (error) {
        console.error('Navigation error:', error);
        // Re-open modal if navigation fails
        // onOpen would need to be passed as prop, for now just log the error
      }
    }
  };

  // Enhanced keyboard navigation with better accessibility
  const handleAlbumKeyDown = (event: React.KeyboardEvent) => {
    // Only handle navigation if album ID is available
    if (!isNavigationAvailable()) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
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
      onClick={e => {
        // Only close if clicking the backdrop, not the modal content
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role='dialog'
      aria-modal='true'
      aria-labelledby='album-modal-title'
      aria-describedby='album-modal-description'
    >
      <div
        id='album-modal-container'
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
          className='absolute -top-2 -right-2 z-60 text-cosmic-latte hover:text-white transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-cosmic-latte focus:ring-opacity-50 rounded-full p-1'
          aria-label='Close album details modal'
          role='button'
          tabIndex={0}
        >
          <svg
            className='w-6 h-6'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
            aria-hidden='true'
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
              src={getImageUrl()}
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
            id='album-modal-title'
            onClick={handleAlbumClick}
            onKeyDown={handleAlbumKeyDown}
            disabled={!isNavigationAvailable()}
            className={`text-3xl lg:text-4xl font-bold mb-2 transition-all duration-200 rounded-md px-1 focus:outline-none ${
              isNavigationAvailable()
                ? 'text-cosmic-latte hover:underline cursor-pointer hover:text-white focus:ring-2 focus:ring-cosmic-latte focus:ring-opacity-50'
                : 'text-zinc-500 cursor-not-allowed'
            }`}
            tabIndex={isNavigationAvailable() ? 0 : -1}
            aria-label={
              isNavigationAvailable()
                ? `Navigate to album details for ${getTitle()}`
                : `${getTitle()} - Album details not available`
            }
            aria-disabled={!isNavigationAvailable()}
            role='button'
          >
            {getTitle()}
          </button>
          <p
            className='text-xl text-zinc-300 mb-4'
            id='album-modal-description'
          >
            By {getArtist()}
          </p>

          {renderDetails()}
        </div>
      </div>
    </div>
  );
}
