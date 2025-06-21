'use client';

import { useEffect, useState } from 'react';

import { Album } from '@/types/album';

import AlbumCard from './AlbumCard';
import AlbumSearch from './AlbumSearch';
import CreateRecommendationForm from './CreateRecommendationForm';

interface RecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isExiting: boolean;
}

export default function RecommendationModal({
  isOpen,
  onClose,
  isExiting,
}: RecommendationModalProps) {
  const [selectedBasisAlbum, setSelectedBasisAlbum] = useState<Album | null>(
    null
  );
  const [selectedRecommendedAlbum, setSelectedRecommendedAlbum] =
    useState<Album | null>(null);
  const [isSearchingForBasis, setIsSearchingForBasis] = useState<boolean>(true);

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

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedBasisAlbum(null);
      setSelectedRecommendedAlbum(null);
      setIsSearchingForBasis(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAlbumSelect = (album: Album) => {
    if (isSearchingForBasis) {
      setSelectedBasisAlbum(album);
    } else {
      setSelectedRecommendedAlbum(album);
    }
  };

  const switchAlbumType = (isBasis: boolean) => {
    setIsSearchingForBasis(isBasis);
  };

  const handleSuccess = () => {
    // Reset form after successful creation
    setSelectedBasisAlbum(null);
    setSelectedRecommendedAlbum(null);
    setIsSearchingForBasis(true);
    onClose();
  };

  return (
    <div
      className={`fixed inset-0 bg-black flex items-center justify-center z-[100] p-4 transition-all duration-300 ${
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
        className={`bg-black border border-zinc-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto transition-all duration-300 relative ${
          isExiting
            ? 'opacity-0 scale-95 translate-y-4'
            : 'opacity-100 scale-100 translate-y-0'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Close X button */}
        <button
          onClick={onClose}
          className='absolute top-4 right-4 z-[110] text-cosmic-latte hover:text-white transition-all duration-200 hover:scale-110'
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

        {/* Modal Content */}
        <div className='p-6'>
          <h1 className='text-3xl font-bold text-center mb-8 text-cosmic-latte'>
            Create Recommendation
          </h1>

          <div className='space-y-6'>
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <h2 className='text-xl font-semibold text-white'>
                  Search for {isSearchingForBasis ? 'Basis' : 'Recommended'}{' '}
                  Album
                </h2>
              </div>

              <AlbumSearch
                onAlbumSelect={handleAlbumSelect}
                placeholder='Search for an album by title or artist'
                disabled={false}
              />
            </div>

            <div className='flex flex-col md:flex-row gap-6 justify-center'>
              <AlbumCard
                album={selectedBasisAlbum}
                title='Basis Album'
                isActive={isSearchingForBasis}
                onClick={() => switchAlbumType(true)}
                placeholder={
                  isSearchingForBasis
                    ? 'Search for an album above'
                    : 'Click to search for a basis album'
                }
              />

              <AlbumCard
                album={selectedRecommendedAlbum}
                title='Recommended Album'
                isActive={!isSearchingForBasis}
                onClick={() => switchAlbumType(false)}
                placeholder={
                  !isSearchingForBasis
                    ? 'Search for an album above'
                    : 'Click to search for a recommended album'
                }
              />
            </div>

            <CreateRecommendationForm
              basisAlbum={selectedBasisAlbum}
              recommendedAlbum={selectedRecommendedAlbum}
              onSuccess={handleSuccess}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
