'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Play } from 'lucide-react';

import { Album } from '@/types/album';
import { useDrawerLayout } from '@/hooks/useDrawerLayout';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import AlbumImage from '@/components/ui/AlbumImage';
import { sanitizeArtistName } from '@/lib/utils';

import AlbumSearchBackwardCompatible, {
  AlbumSearchRef,
} from './AlbumSearchBackwardCompatible';
import CreateRecommendationForm from './CreateRecommendationForm';
import SimilarityRatingDial from './SimilarityRatingDial';

// Local Turntable component that accepts responsive size props
interface TurntableProps {
  album: Album | null;
  title: string;
  side: 'left' | 'right';
  isActive: boolean;
  onClick: () => void;
  placeholder?: string;
  size?: number;
}

function Turntable({
  album,
  title,
  side,
  isActive,
  onClick,
  placeholder = 'Search to load track',
  size = 224, // default w-56 h-56 = 224px
}: TurntableProps) {
  const isSource = title === 'SOURCE';
  const activeColor = isSource ? 'ring-red-500' : 'ring-green-500';
  const labelColor = isSource ? 'bg-red-600' : 'bg-green-600';

  return (
    <div className='relative'>
      {/* Turntable Base */}
      <div className='relative bg-zinc-800 rounded-full p-4 border-2 border-zinc-700'>
        {/* Turntable Platter */}
        <div
          className={`relative bg-zinc-900 rounded-full border border-zinc-600 cursor-pointer ${
            isActive ? `ring-2 ${activeColor}` : 'hover:border-zinc-500'
          }`}
          style={{ width: size, height: size }}
          onClick={onClick}
        >
          {/* Center Spindle */}
          <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-zinc-400 rounded-full z-20'></div>

          {/* Album Display */}
          {album ? (
            <>
              {/* Album Artwork as Vinyl Record */}
              <div className='absolute inset-2'>
                <div className='relative w-full h-full rounded-full overflow-hidden border border-zinc-800'>
                  <AlbumImage
                    src={album.image.url}
                    alt={`${album.title} by ${sanitizeArtistName(album.artists?.[0]?.name || 'Unknown Artist')}`}
                    width={300}
                    height={300}
                    className='w-full h-full object-cover'
                  />
                </div>
              </div>

              {/* Album Info Display */}
              <div className='absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center'>
                <div className='bg-black/80 rounded px-3 py-2 border border-zinc-700'>
                  <div
                    className='font-bold text-white text-sm truncate'
                    style={{ maxWidth: size }}
                  >
                    {album.title}
                  </div>
                  <div className='text-zinc-300 text-sm truncate'>
                    {sanitizeArtistName(
                      album.artists?.[0]?.name || 'Unknown Artist'
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className='absolute inset-6 flex items-center justify-center'>
              <div className='text-center text-zinc-500'>
                <div className='w-12 h-12 flex items-center justify-center mx-auto mb-2'>
                  <Play className='w-6 h-6' />
                </div>
                <div className='text-sm'>{placeholder}</div>
              </div>
            </div>
          )}
        </div>

        {/* Side Label */}
        <div className='absolute -top-1 left-1/2 transform -translate-x-1/2'>
          <div
            className={`${labelColor} text-white px-2 py-1 rounded text-xs font-bold`}
          >
            {title}
          </div>
        </div>
      </div>
    </div>
  );
}

interface RecommendationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RecommendationDrawer({
  isOpen,
  onClose,
  onSuccess,
}: RecommendationDrawerProps) {
  const [selectedBasisAlbum, setSelectedBasisAlbum] = useState<Album | null>(
    null
  );
  const [selectedRecommendedAlbum, setSelectedRecommendedAlbum] =
    useState<Album | null>(null);
  const [isSearchingForBasis, setIsSearchingForBasis] = useState<boolean>(true);
  const [similarityRating, setSimilarityRating] = useState<number>(5);

  // Get responsive layout configuration
  const layoutConfig = useDrawerLayout();

  // Ref to access AlbumSearch methods
  const albumSearchRef = useRef<AlbumSearchRef>(null);

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedBasisAlbum(null);
      setSelectedRecommendedAlbum(null);
      setIsSearchingForBasis(true);
      setSimilarityRating(5);
    }
  }, [isOpen]);

  const handleAlbumSelect = (album: Album) => {
    if (isSearchingForBasis) {
      setSelectedBasisAlbum(album);
      // Clear the input
      albumSearchRef.current?.clearInput();
      // Switch to recommended if it's empty
      if (!selectedRecommendedAlbum) {
        setIsSearchingForBasis(false);
      }
    } else {
      setSelectedRecommendedAlbum(album);
      // Clear the input
      albumSearchRef.current?.clearInput();
      // Switch to basis if it's empty
      if (!selectedBasisAlbum) {
        setIsSearchingForBasis(true);
      }
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
    setSimilarityRating(5);
    onClose();
    onSuccess?.();
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className='h-[90vh] bg-zinc-900 border-zinc-700'>
        <DrawerHeader className='flex-shrink-0'>
          <div className='flex items-center justify-between'>
            <DrawerTitle className='text-2xl font-bold text-white'>
              Create Recommendation
            </DrawerTitle>
            <DrawerClose asChild>
              <button
                className='text-zinc-400 hover:text-white bg-black/50 rounded-full p-1'
                aria-label='Close drawer'
              >
                <X className='w-5 h-5' />
              </button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className='flex-1 overflow-y-auto'>
          <div className={layoutConfig.containerClasses}>
            {/* Search Bar */}
            <div className='mb-6'>
              <AlbumSearchBackwardCompatible
                ref={albumSearchRef}
                onAlbumSelect={handleAlbumSelect}
                placeholder={`Search for ${isSearchingForBasis ? 'source' : 'recommended'} album...`}
                label=''
                disabled={false}
                colorTheme={isSearchingForBasis ? 'red' : 'green'}
              />
            </div>

            {/* Turntables Layout - Responsive */}
            <div className={`${layoutConfig.turntableClasses} mb-6`}>
              {/* Left Turntable */}
              <div className='flex flex-col items-center'>
                <Turntable
                  album={selectedBasisAlbum}
                  title='SOURCE'
                  side='left'
                  isActive={isSearchingForBasis}
                  onClick={() => switchAlbumType(true)}
                  placeholder='Load source'
                  size={layoutConfig.turntableSize}
                />
              </div>

              {/* Similarity Rating Dial */}
              <div className='flex flex-col items-center'>
                <div className='bg-zinc-800 rounded-lg p-4 border border-zinc-700'>
                  <SimilarityRatingDial
                    value={similarityRating}
                    onChange={setSimilarityRating}
                    disabled={false}
                  />
                </div>
              </div>

              {/* Right Turntable */}
              <div className='flex flex-col items-center'>
                <Turntable
                  album={selectedRecommendedAlbum}
                  title='RECOMMENDED'
                  side='right'
                  isActive={!isSearchingForBasis}
                  onClick={() => switchAlbumType(false)}
                  placeholder='Load rec'
                  size={layoutConfig.turntableSize}
                />
              </div>
            </div>

            {/* Recommendation Form */}
            <div className='relative min-h-[60px]'>
              <CreateRecommendationForm
                basisAlbum={selectedBasisAlbum}
                recommendedAlbum={selectedRecommendedAlbum}
                score={similarityRating}
                onSuccess={handleSuccess}
              />
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
