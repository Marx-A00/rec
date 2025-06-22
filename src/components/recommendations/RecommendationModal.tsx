'use client';

import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';

import { Album } from '@/types/album';
import AlbumImage from '@/components/ui/AlbumImage';
import { sanitizeArtistName } from '@/lib/utils';

import AlbumSearch from './AlbumSearch';
import CreateRecommendationForm from './CreateRecommendationForm';

interface RecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isExiting: boolean;
}

interface TurntableProps {
  album: Album | null;
  title: string;
  side: 'left' | 'right';
  isActive: boolean;
  onClick: () => void;
  placeholder?: string;
}

interface SimilarityRatingDialProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function Turntable({
  album,
  title,
  side,
  isActive,
  onClick,
  placeholder = 'Search to load track',
}: TurntableProps) {
  return (
    <div className='relative'>
      {/* Turntable Base */}
      <div className='relative bg-zinc-800 rounded-full p-4 border-2 border-zinc-700'>
        {/* Turntable Platter */}
        <div
          className={`relative w-32 h-32 bg-zinc-900 rounded-full border border-zinc-600 cursor-pointer ${
            isActive ? 'ring-2 ring-blue-500' : 'hover:border-zinc-500'
          }`}
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
                    width={200}
                    height={200}
                    className='w-full h-full object-cover'
                  />
                </div>
              </div>

              {/* Album Info Display */}
              <div className='absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-center'>
                <div className='bg-black/80 rounded px-2 py-1 border border-zinc-700'>
                  <div className='font-bold text-white text-xs truncate max-w-32'>
                    {album.title}
                  </div>
                  <div className='text-zinc-300 text-xs truncate'>
                    {sanitizeArtistName(
                      album.artists?.[0]?.name || 'Unknown Artist'
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className='absolute inset-4 flex items-center justify-center'>
              <div className='text-center text-zinc-500'>
                <div className='w-8 h-8 bg-zinc-800 rounded-full border border-zinc-700 flex items-center justify-center mx-auto mb-1'>
                  <Play className='w-4 h-4' />
                </div>
                <div className='text-xs'>{placeholder}</div>
              </div>
            </div>
          )}
        </div>

        {/* Side Label */}
        <div className='absolute -top-1 left-1/2 transform -translate-x-1/2'>
          <div className='bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold'>
            {title}
          </div>
        </div>
      </div>
    </div>
  );
}

function SimilarityRatingDial({
  value,
  onChange,
  disabled = false,
}: SimilarityRatingDialProps) {
  const [isDragging, setIsDragging] = useState(false);

  // Calculate rotation angle (0-135 degrees for values 5-10)
  // Start at 12 o'clock (0 degrees) for score 5, end at southeast (135 degrees) for score 10
  const rotation = ((value - 5) / 5) * 135;

  const updateValueFromMouse = (e: MouseEvent | React.MouseEvent) => {
    const knobElement = document.querySelector(
      '[data-knob="true"]'
    ) as HTMLElement;
    if (!knobElement) return;

    const rect = knobElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    let degrees = (angle * 180) / Math.PI + 90; // Convert to 0-360 with 0 at top

    // Normalize to 0-360
    if (degrees < 0) degrees += 360;

    // Map angle to our range (0-135 degrees = scores 5-10)
    // If below 0 degrees (dragging above 12 o'clock), stay at score 5
    // If above 135 degrees, stay at score 10
    let clampedDegrees;
    if (degrees > 180) {
      // If we're in the left half (past 6 o'clock), clamp to 0 (score 5)
      clampedDegrees = 0;
    } else if (degrees > 135) {
      // If we're past the southeast position, clamp to 135 (score 10)
      clampedDegrees = 135;
    } else {
      clampedDegrees = Math.max(0, Math.min(135, degrees));
    }

    const newValue = Math.round((clampedDegrees / 135) * 5) + 5;

    if (newValue !== value && newValue >= 5 && newValue <= 10) {
      onChange(newValue);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    setIsDragging(true);
    updateValueFromMouse(e);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || disabled) return;
    updateValueFromMouse(e);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse event listeners when dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, disabled, value]);

  return (
    <div className='flex flex-col items-center space-y-2'>
      {/* Dial Label */}
      <div className='text-center'>
        <div className='text-sm font-bold text-zinc-300 mb-1'>SCORE</div>
        <div className='text-xl font-bold text-blue-400'>{value}/10</div>
      </div>

      {/* Main Dial Container */}
      <div className='relative'>
        {/* Outer Ring with LED Indicators */}
        <div className='relative w-20 h-20 rounded-full bg-zinc-700 border-2 border-zinc-600'>
          {/* LED Ring */}
          {Array.from({ length: 6 }, (_, i) => {
            const ledAngle = (i * 135) / 5 - 90; // Start at -90 degrees (12 o'clock) and go to 45 degrees (southeast)
            const ledScore = i + 5;
            const isActive = ledScore <= value;
            const ledX = 50 + 35 * Math.cos((ledAngle * Math.PI) / 180);
            const ledY = 50 + 35 * Math.sin((ledAngle * Math.PI) / 180);

            return (
              <div
                key={i}
                className={`absolute w-1 h-1 rounded-full ${
                  isActive
                    ? ledScore <= 6
                      ? 'bg-yellow-500'
                      : ledScore <= 8
                        ? 'bg-green-500'
                        : 'bg-emerald-400'
                    : 'bg-zinc-800'
                }`}
                style={{
                  left: `${ledX}%`,
                  top: `${ledY}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            );
          })}

          {/* Inner Knob */}
          <div
            data-knob='true'
            className={`absolute top-1/2 left-1/2 w-12 h-12 rounded-full cursor-pointer ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
            }`}
            style={{
              background:
                'conic-gradient(from 0deg, #71717a, #a1a1aa, #d4d4d8, #a1a1aa, #71717a)',
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
            }}
            onMouseDown={handleMouseDown}
          >
            {/* Knob Indicator Line */}
            <div
              className='absolute w-0.5 h-4 bg-white rounded-full'
              style={{
                top: '4px',
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            />

            {/* Center Dot */}
            <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-zinc-900 rounded-full' />
          </div>
        </div>
      </div>

      {/* Status Text */}
      <div className='text-center'>
        <div
          className={`text-xs font-medium ${
            value <= 6
              ? 'text-yellow-400'
              : value <= 8
                ? 'text-green-400'
                : 'text-emerald-400'
          }`}
        >
          {value <= 6 ? 'DECENT' : value <= 8 ? 'GREAT' : 'PERFECT'}
        </div>
      </div>
    </div>
  );
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
  const [similarityRating, setSimilarityRating] = useState<number>(5);

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
      setSimilarityRating(5);
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
    setSimilarityRating(5);
    onClose();
  };

  return (
    <div
      className='fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[100] p-4'
      onClick={onClose}
    >
      <div
        className='bg-zinc-900 border border-zinc-700 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto relative'
        onClick={e => e.stopPropagation()}
      >
        {/* Close X button */}
        <button
          onClick={onClose}
          className='absolute top-4 right-4 z-[110] text-zinc-400 hover:text-white bg-black/50 rounded-full p-1'
        >
          <svg
            className='w-5 h-5'
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

        <div className='p-6'>
          {/* Header */}
          <div className='text-center mb-6'>
            <h1 className='text-2xl font-bold text-blue-400 mb-1'>
              Create Recommendation
            </h1>
            <p className='text-zinc-400 text-sm'>
              Select source and recommended albums
            </p>
          </div>

          {/* Search Control Panel */}
          <div className='bg-zinc-800 rounded-lg p-4 mb-6 border border-zinc-700'>
            <div className='flex items-center gap-4 mb-3'>
              <h2 className='text-lg font-semibold text-white'>
                Search:{' '}
                <span
                  className={`${isSearchingForBasis ? 'text-blue-400' : 'text-purple-400'}`}
                >
                  {isSearchingForBasis ? 'Source Album' : 'Recommended Album'}
                </span>
              </h2>
              <div className='flex-1'></div>
              <div
                className={`w-2 h-2 rounded-full ${isSearchingForBasis ? 'bg-blue-500' : 'bg-purple-500'}`}
              ></div>
            </div>

            <AlbumSearch
              onAlbumSelect={handleAlbumSelect}
              placeholder={`Search for ${isSearchingForBasis ? 'source' : 'recommended'} album...`}
              disabled={false}
            />
          </div>

          {/* Turntables and Score */}
          <div className='flex items-center justify-center gap-8 mb-6'>
            {/* Left Turntable */}
            <div className='flex flex-col items-center'>
              <Turntable
                album={selectedBasisAlbum}
                title='SOURCE'
                side='left'
                isActive={isSearchingForBasis}
                onClick={() => switchAlbumType(true)}
                placeholder='Load source'
              />
              <div className='mt-2 flex items-center space-x-2'>
                <div
                  className={`w-2 h-2 rounded-full ${selectedBasisAlbum ? 'bg-green-500' : 'bg-zinc-600'}`}
                ></div>
                <span
                  className={`text-xs ${selectedBasisAlbum ? 'text-green-400' : 'text-zinc-500'}`}
                >
                  {selectedBasisAlbum ? 'LOADED' : 'EMPTY'}
                </span>
              </div>
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
              />
              <div className='mt-2 flex items-center space-x-2'>
                <div
                  className={`w-2 h-2 rounded-full ${selectedRecommendedAlbum ? 'bg-green-500' : 'bg-zinc-600'}`}
                ></div>
                <span
                  className={`text-xs ${selectedRecommendedAlbum ? 'text-green-400' : 'text-zinc-500'}`}
                >
                  {selectedRecommendedAlbum ? 'LOADED' : 'EMPTY'}
                </span>
              </div>
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
    </div>
  );
}
