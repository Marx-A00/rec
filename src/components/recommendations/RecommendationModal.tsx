'use client';

import { useEffect, useState } from 'react';
import { Volume2, Play, RotateCcw, Settings, Zap } from 'lucide-react';

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

function Turntable({
  album,
  title,
  side,
  isActive,
  onClick,
  placeholder = 'Search to load track',
}: TurntableProps) {
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    if (album && isActive) {
      setIsSpinning(true);
      const timer = setTimeout(() => setIsSpinning(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [album, isActive]);

  return (
    <div className='relative'>
      {/* Turntable Base */}
      <div className='relative bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-full p-8 border-4 border-zinc-700 shadow-2xl'>
        {/* Turntable Platter */}
        <div
          className={`relative w-72 h-72 bg-gradient-to-br from-zinc-900 to-black rounded-full border-2 border-zinc-600 shadow-inner cursor-pointer transition-all duration-300 ${
            isActive
              ? 'ring-4 ring-blue-500 ring-opacity-50'
              : 'hover:border-zinc-500'
          } ${isSpinning ? 'animate-spin' : ''}`}
          onClick={onClick}
          style={{ animationDuration: isSpinning ? '3s' : '0s' }}
        >
          {/* Center Spindle */}
          <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-zinc-400 rounded-full border-2 border-zinc-300 z-20 shadow-lg'></div>

          {/* Album Display */}
          {album ? (
            <>
              {/* Album Artwork as Vinyl Record */}
              <div className='absolute inset-4'>
                <div className='relative w-full h-full rounded-full overflow-hidden border-2 border-zinc-800 shadow-lg'>
                  <AlbumImage
                    src={album.image.url}
                    alt={`${album.title} by ${sanitizeArtistName(album.artists?.[0]?.name || 'Unknown Artist')}`}
                    width={400}
                    height={400}
                    className='w-full h-full object-cover'
                  />
                  {/* Vinyl Grooves Overlay */}
                  <div className='absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-transparent opacity-30'></div>
                  <div
                    className='absolute inset-0'
                    style={{
                      background: `repeating-conic-gradient(from 0deg, transparent 0deg, transparent 2deg, rgba(0,0,0,0.1) 2deg, rgba(0,0,0,0.1) 4deg)`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Album Info Display */}
              <div className='absolute -bottom-20 left-1/2 transform -translate-x-1/2 text-center'>
                <div className='bg-black/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-zinc-700'>
                  <div className='font-bold text-white text-sm truncate max-w-48'>
                    {album.title}
                  </div>
                  <div className='text-zinc-300 text-xs truncate'>
                    {sanitizeArtistName(
                      album.artists?.[0]?.name || 'Unknown Artist'
                    )}
                  </div>
                  {album.year && (
                    <div className='text-zinc-400 text-xs'>{album.year}</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className='absolute inset-8 flex items-center justify-center'>
              <div className='text-center text-zinc-500'>
                <div className='w-16 h-16 bg-zinc-800 rounded-full border-2 border-zinc-700 flex items-center justify-center mx-auto mb-2'>
                  <Play className='w-6 h-6' />
                </div>
                <div className='text-xs font-medium'>{placeholder}</div>
              </div>
            </div>
          )}
        </div>

        {/* Turntable Controls */}
        <div className='absolute top-4 right-4 flex flex-col space-y-2'>
          <button className='w-8 h-8 bg-zinc-700 hover:bg-zinc-600 rounded-full flex items-center justify-center transition-colors'>
            <RotateCcw className='w-4 h-4 text-zinc-300' />
          </button>
          <button className='w-8 h-8 bg-zinc-700 hover:bg-zinc-600 rounded-full flex items-center justify-center transition-colors'>
            <Settings className='w-4 h-4 text-zinc-300' />
          </button>
        </div>

        {/* Side Label */}
        <div className='absolute -top-2 left-1/2 transform -translate-x-1/2'>
          <div className='bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg'>
            {title}
          </div>
        </div>
      </div>

      {/* Tonearm */}
      <div
        className={`absolute top-8 ${side === 'left' ? 'right-4' : 'left-4'} transition-all duration-500 ${
          album ? 'rotate-12' : 'rotate-45'
        }`}
      >
        <div className='w-24 h-1 bg-gradient-to-r from-zinc-600 to-zinc-500 rounded-full origin-left shadow-lg'></div>
        <div className='absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-zinc-400 rounded-full border border-zinc-300 shadow-md'></div>
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
        isExiting ? 'bg-opacity-0' : 'bg-opacity-95'
      }`}
      style={{
        backdropFilter: isExiting ? 'none' : 'blur(8px)',
        transition: isExiting
          ? 'background-color 300ms ease-out, backdrop-filter 0ms ease-out'
          : 'background-color 300ms ease-out, backdrop-filter 150ms ease-out',
      }}
      onClick={onClose}
    >
      <div
        className={`bg-gradient-to-br from-zinc-900 via-black to-zinc-900 border-2 border-zinc-700 rounded-2xl max-w-7xl w-full max-h-[95vh] overflow-y-auto transition-all duration-300 relative shadow-2xl ${
          isExiting
            ? 'opacity-0 scale-95 translate-y-4'
            : 'opacity-100 scale-100 translate-y-0'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Close X button */}
        <button
          onClick={onClose}
          className='absolute top-6 right-6 z-[110] text-zinc-400 hover:text-white transition-all duration-200 hover:scale-110 bg-black/50 backdrop-blur-sm rounded-full p-2'
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

        {/* DJ Deck Interface */}
        <div className='p-8'>
          {/* Header with DJ Branding */}
          <div className='text-center mb-8'>
            <h1 className='text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-2'>
              REC DECK
            </h1>
            <p className='text-zinc-400 text-sm'>
              Professional Music Recommendation Mixer
            </p>
          </div>

          {/* Search Control Panel */}
          <div className='bg-gradient-to-r from-zinc-800 to-zinc-900 rounded-xl p-6 mb-8 border border-zinc-700 shadow-lg relative overflow-hidden'>
            {/* Animated Background Glow */}
            <div className='absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 animate-pulse'></div>

            <div className='relative z-10'>
              <div className='flex items-center gap-4 mb-4'>
                <div className='relative'>
                  <Zap className='w-5 h-5 text-yellow-500 drop-shadow-lg' />
                  <div className='absolute inset-0 bg-yellow-500/20 w-5 h-5 rounded-full animate-ping'></div>
                </div>
                <h2 className='text-xl font-semibold text-white drop-shadow-sm'>
                  Track Search -{' '}
                  <span
                    className={`${isSearchingForBasis ? 'text-blue-400' : 'text-purple-400'} transition-colors duration-300`}
                  >
                    {isSearchingForBasis
                      ? 'Deck A (Source)'
                      : 'Deck B (Recommendation)'}
                  </span>
                </h2>
                <div className='flex-1'></div>
                <div className='relative'>
                  <div
                    className={`w-3 h-3 rounded-full ${isSearchingForBasis ? 'bg-blue-500' : 'bg-purple-500'} animate-pulse shadow-lg`}
                  ></div>
                  <div
                    className={`absolute inset-0 w-3 h-3 rounded-full ${isSearchingForBasis ? 'bg-blue-500/30' : 'bg-purple-500/30'} animate-ping`}
                  ></div>
                </div>
              </div>

              <AlbumSearch
                onAlbumSelect={handleAlbumSelect}
                placeholder={`Search for ${isSearchingForBasis ? 'source' : 'recommended'} album...`}
                disabled={false}
              />
            </div>
          </div>

          {/* Dual Turntable Setup */}
          <div className='flex flex-col xl:flex-row items-center justify-center gap-12 mb-8'>
            {/* Left Turntable - Basis Album */}
            <div className='flex flex-col items-center group'>
              <Turntable
                album={selectedBasisAlbum}
                title='DECK A - SOURCE'
                side='left'
                isActive={isSearchingForBasis}
                onClick={() => switchAlbumType(true)}
                placeholder='Load source track'
              />
              {/* Deck Status Indicator */}
              <div className='mt-4 flex items-center space-x-2'>
                <div
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${selectedBasisAlbum ? 'bg-green-500 shadow-green-500/50 shadow-lg' : 'bg-zinc-600'}`}
                ></div>
                <span
                  className={`text-xs font-medium transition-colors duration-300 ${selectedBasisAlbum ? 'text-green-400' : 'text-zinc-500'}`}
                >
                  {selectedBasisAlbum ? 'LOADED' : 'EMPTY'}
                </span>
              </div>
            </div>

            {/* Center Mixer Panel */}
            <div className='flex flex-col items-center space-y-6'>
              {/* Enhanced Crossfader */}
              <div className='bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl p-6 border border-zinc-700 shadow-lg relative overflow-hidden'>
                {/* Subtle animated background */}
                <div className='absolute inset-0 bg-gradient-to-br from-zinc-700/20 to-zinc-900/20 animate-pulse'></div>

                <div className='relative z-10'>
                  <div className='text-center mb-4'>
                    <div className='text-sm font-bold text-zinc-300 mb-2 drop-shadow-sm'>
                      CROSSFADER
                    </div>
                    <div className='w-32 h-3 bg-zinc-700 rounded-full relative shadow-inner border border-zinc-600'>
                      {/* Animated glow track */}
                      <div className='absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 rounded-full animate-pulse'></div>
                      <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-7 h-7 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full border-2 border-white shadow-xl transition-all duration-300 hover:scale-110 cursor-pointer'>
                        <div className='absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse opacity-50'></div>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Volume Controls */}
                  <div className='flex items-center space-x-6 justify-center'>
                    <div className='text-center group cursor-pointer'>
                      <div className='relative mb-2'>
                        <Volume2 className='w-5 h-5 text-blue-400 mx-auto transition-all duration-300 group-hover:text-blue-300 group-hover:scale-110 drop-shadow-lg' />
                        <div className='absolute inset-0 bg-blue-400/20 w-5 h-5 rounded-full animate-ping opacity-0 group-hover:opacity-100'></div>
                      </div>
                      <div className='w-3 h-20 bg-zinc-700 rounded-full mx-auto relative shadow-inner border border-zinc-600'>
                        <div className='absolute bottom-0 w-full h-3/4 bg-gradient-to-t from-blue-600 via-blue-500 to-blue-400 rounded-full transition-all duration-300 group-hover:from-blue-500 group-hover:via-blue-400 group-hover:to-blue-300'>
                          <div className='absolute inset-0 bg-gradient-to-t from-transparent to-white/20 rounded-full'></div>
                        </div>
                        {/* Volume level indicators */}
                        <div className='absolute inset-x-0 bottom-0 space-y-1 p-1'>
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-full h-0.5 rounded ${i < 4 ? 'bg-blue-500/60' : 'bg-transparent'}`}
                            ></div>
                          ))}
                        </div>
                      </div>
                      <div className='text-xs text-blue-400 mt-1 font-medium'>
                        DECK A
                      </div>
                    </div>

                    <div className='text-center group cursor-pointer'>
                      <div className='relative mb-2'>
                        <Volume2 className='w-5 h-5 text-purple-400 mx-auto transition-all duration-300 group-hover:text-purple-300 group-hover:scale-110 drop-shadow-lg' />
                        <div className='absolute inset-0 bg-purple-400/20 w-5 h-5 rounded-full animate-ping opacity-0 group-hover:opacity-100'></div>
                      </div>
                      <div className='w-3 h-20 bg-zinc-700 rounded-full mx-auto relative shadow-inner border border-zinc-600'>
                        <div className='absolute bottom-0 w-full h-2/3 bg-gradient-to-t from-purple-600 via-purple-500 to-purple-400 rounded-full transition-all duration-300 group-hover:from-purple-500 group-hover:via-purple-400 group-hover:to-purple-300'>
                          <div className='absolute inset-0 bg-gradient-to-t from-transparent to-white/20 rounded-full'></div>
                        </div>
                        {/* Volume level indicators */}
                        <div className='absolute inset-x-0 bottom-0 space-y-1 p-1'>
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-full h-0.5 rounded ${i < 3 ? 'bg-purple-500/60' : 'bg-transparent'}`}
                            ></div>
                          ))}
                        </div>
                      </div>
                      <div className='text-xs text-purple-400 mt-1 font-medium'>
                        DECK B
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Connection Indicator */}
              <div className='flex items-center space-x-3 bg-zinc-900/50 rounded-full px-4 py-2 border border-zinc-700'>
                <div className='relative'>
                  <div
                    className={`w-4 h-4 rounded-full transition-all duration-300 ${selectedBasisAlbum ? 'bg-green-500' : 'bg-red-500'} shadow-lg`}
                  ></div>
                  <div
                    className={`absolute inset-0 w-4 h-4 rounded-full ${selectedBasisAlbum ? 'bg-green-500/30' : 'bg-red-500/30'} animate-ping`}
                  ></div>
                </div>
                <div className='w-12 border-t-2 border-zinc-600 relative'>
                  <div className='absolute top-0 left-0 w-full border-t-2 border-yellow-500/30 animate-pulse'></div>
                </div>
                <div className='relative'>
                  <Zap className='w-6 h-6 text-yellow-500 drop-shadow-lg' />
                  <div className='absolute inset-0 bg-yellow-500/20 w-6 h-6 rounded-full animate-ping'></div>
                </div>
                <div className='w-12 border-t-2 border-zinc-600 relative'>
                  <div className='absolute top-0 left-0 w-full border-t-2 border-yellow-500/30 animate-pulse'></div>
                </div>
                <div className='relative'>
                  <div
                    className={`w-4 h-4 rounded-full transition-all duration-300 ${selectedRecommendedAlbum ? 'bg-green-500' : 'bg-red-500'} shadow-lg`}
                  ></div>
                  <div
                    className={`absolute inset-0 w-4 h-4 rounded-full ${selectedRecommendedAlbum ? 'bg-green-500/30' : 'bg-red-500/30'} animate-ping`}
                  ></div>
                </div>
              </div>
            </div>

            {/* Right Turntable - Recommended Album */}
            <div className='flex flex-col items-center group'>
              <Turntable
                album={selectedRecommendedAlbum}
                title='DECK B - REC'
                side='right'
                isActive={!isSearchingForBasis}
                onClick={() => switchAlbumType(false)}
                placeholder='Load rec track'
              />
              {/* Deck Status Indicator */}
              <div className='mt-4 flex items-center space-x-2'>
                <div
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${selectedRecommendedAlbum ? 'bg-green-500 shadow-green-500/50 shadow-lg' : 'bg-zinc-600'}`}
                ></div>
                <span
                  className={`text-xs font-medium transition-colors duration-300 ${selectedRecommendedAlbum ? 'text-green-400' : 'text-zinc-500'}`}
                >
                  {selectedRecommendedAlbum ? 'LOADED' : 'EMPTY'}
                </span>
              </div>
            </div>
          </div>

          {/* Enhanced Recommendation Creation Panel */}
          <div className='bg-gradient-to-r from-zinc-800 to-zinc-900 rounded-xl p-6 border border-zinc-700 shadow-lg relative overflow-hidden'>
            {/* Subtle animated background */}
            <div className='absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-green-500/5 to-emerald-500/5 animate-pulse'></div>

            <div className='relative z-10'>
              <CreateRecommendationForm
                basisAlbum={selectedBasisAlbum}
                recommendedAlbum={selectedRecommendedAlbum}
                onSuccess={handleSuccess}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
