'use client';

import Image from 'next/image';
import { useEffect } from 'react';

import { Release } from '@/types/album';
import { CollectionAlbum } from '@/types/collection';

interface AlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Release | CollectionAlbum | null;
  isExiting: boolean;
}

function isCollectionAlbum(data: any): data is CollectionAlbum {
  return data && data.album && data.album.image && data.album.image.url;
}

function isRelease(data: any): data is Release {
  return data && data.title && (data.thumb || data.basic_information);
}

export default function AlbumModal({
  isOpen,
  onClose,
  data,
  isExiting,
}: AlbumModalProps) {
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
  if (!isOpen || !data) return null;

  const getImageUrl = () => {
    if (isCollectionAlbum(data)) {
      return data.album.image.url;
    } else if (isRelease(data)) {
      return (
        data.basic_information?.cover_image ||
        data.thumb ||
        'https://via.placeholder.com/400x400?text=No+Image'
      );
    }
    return 'https://via.placeholder.com/400x400?text=No+Image';
  };

  const getTitle = () => {
    if (isCollectionAlbum(data)) {
      return data.album.title;
    } else if (isRelease(data)) {
      return data.title;
    }
    return 'Unknown Title';
  };

  // is there a reason we are getting these separately?
  const getArtist = () => {
    if (isCollectionAlbum(data)) {
      return data.album.artist;
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
          {data.album.releaseDate && (
            <p className='text-zinc-400'>
              <span className='text-cosmic-latte font-medium'>Released:</span>{' '}
              {new Date(data.album.releaseDate).getFullYear()}
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
          <Image
            src={getImageUrl()}
            alt={getTitle()}
            width={400}
            height={400}
            className='w-80 h-80 lg:w-96 lg:h-96 rounded-lg object-cover border-2 border-zinc-700 shadow-2xl'
          />
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
