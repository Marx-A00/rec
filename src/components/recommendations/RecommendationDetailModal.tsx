'use client';

import { X, Heart } from 'lucide-react';
import Link from 'next/link';

import AlbumImage from '@/components/ui/AlbumImage';
import { useGetRecommendationQuery } from '@/generated/graphql';

interface RecommendationDetailModalProps {
  recommendationId: string | null;
  onClose: () => void;
}

// Helper function to get color classes based on score
const getScoreColors = (score: number) => {
  if (score >= 10) {
    return {
      heartColor: 'text-red-500 fill-red-500',
      textColor: 'text-red-600',
      bgGradient: 'from-red-50 to-pink-50',
      borderColor: 'border-red-100',
    };
  } else if (score >= 8) {
    return {
      heartColor: 'text-green-500 fill-green-500',
      textColor: 'text-green-600',
      bgGradient: 'from-green-50 to-emerald-50',
      borderColor: 'border-green-100',
    };
  } else {
    // 5-7 range (yellow)
    return {
      heartColor: 'text-yellow-500 fill-yellow-500',
      textColor: 'text-yellow-600',
      bgGradient: 'from-yellow-50 to-amber-50',
      borderColor: 'border-yellow-100',
    };
  }
};

export default function RecommendationDetailModal({
  recommendationId,
  onClose,
}: RecommendationDetailModalProps) {
  const { data, isLoading, error } = useGetRecommendationQuery(
    { id: recommendationId || '' },
    { enabled: !!recommendationId }
  );

  const recommendation = data?.recommendation;

  if (!recommendationId) return null;

  if (isLoading) {
    return (
      <div
        className='fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4 transition-all duration-300'
        style={{
          backdropFilter: 'blur(4px)',
          transition:
            'background-color 300ms ease-out, backdrop-filter 150ms ease-out',
        }}
      >
        <div className='flex flex-col items-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-4'></div>
          <p className='text-white'>Loading recommendation...</p>
        </div>
      </div>
    );
  }

  if (error || !recommendation) {
    return (
      <div
        className='fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4 transition-all duration-300'
        style={{
          backdropFilter: 'blur(4px)',
          transition:
            'background-color 300ms ease-out, backdrop-filter 150ms ease-out',
        }}
      >
        <div className='flex flex-col items-center'>
          <p className='text-red-400 mb-4'>Failed to load recommendation</p>
          <button
            onClick={onClose}
            className='px-4 py-2 bg-zinc-800 text-white rounded hover:bg-zinc-700 transition-colors'
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Get dynamic colors based on score
  const scoreColors = getScoreColors(recommendation.score);

  return (
    <div
      className='fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4 transition-all duration-300'
      style={{
        backdropFilter: 'blur(4px)',
        transition:
          'background-color 300ms ease-out, backdrop-filter 150ms ease-out',
      }}
      onClick={e => {
        // Only close if clicking the backdrop, not the modal content
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role='dialog'
      aria-modal='true'
      aria-labelledby='recommendation-modal-content'
    >
      <div
        className='flex flex-col items-center max-w-4xl w-full transition-all duration-300 relative opacity-100 scale-100 translate-y-0'
        onClick={e => e.stopPropagation()}
      >
        {/* Close X button */}
        <button
          onClick={e => {
            e.currentTarget.blur();
            onClose();
          }}
          className='absolute -top-2 -right-2 z-60 text-cosmic-latte hover:text-white transition-all duration-200 hover:scale-110 focus:outline-none rounded-full p-1'
          aria-label='Close recommendation details modal'
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

        {/* User Info */}
        <div className='flex items-center space-x-3 mb-6'>
          {recommendation.user?.image ? (
            <AlbumImage
              src={recommendation.user.image}
              alt={recommendation.user.username || 'User'}
              width={40}
              height={40}
              className='rounded-full'
            />
          ) : (
            <div className='w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center'>
              <span className='text-white font-semibold'>
                {(recommendation.user?.username || 'A').charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <Link href={`/profile/${recommendation.user.id}`}>
              <span className='text-cosmic-latte font-medium hover:underline hover:text-white'>
                {recommendation.user?.username || 'Anonymous'}
              </span>
            </Link>
            <p className='text-zinc-400 text-sm'>
              {new Date(recommendation.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Albums Layout */}
        <div className='relative'>
          <div className='grid grid-cols-2 gap-8'>
            {/* Source Album */}
            <div className='text-center'>
              <div className='mb-4'>
                <Link
                  href={`/albums/${recommendation.basisAlbum.id}?source=local`}
                >
                  <p className='font-bold text-cosmic-latte text-xl hover:underline cursor-pointer hover:text-white transition-colors'>
                    {recommendation.basisAlbum.title}
                  </p>
                </Link>
                <p className='text-zinc-300 text-lg'>
                  {recommendation.basisAlbum.artists.map((a, idx) => (
                    <span key={a.artist.id}>
                      {idx > 0 && ', '}
                      <Link
                        href={`/artists/${a.artist.id}?source=local`}
                        // TODO: There should be a better way to attatch source rather than just hardcoding
                        className='hover:text-white hover:underline transition-colors'
                      >
                        {a.artist.name}
                      </Link>
                    </span>
                  ))}
                </p>
              </div>
              <Link
                href={`/albums/${recommendation.basisAlbum.id}?source=local`}
              >
                <div className='group relative cursor-pointer'>
                  <div className='relative w-72 h-72 lg:w-80 lg:h-80 mx-auto aspect-square overflow-hidden rounded-lg shadow-2xl transition-all duration-300 group-hover:shadow-xl group-hover:scale-105 bg-zinc-800 border-2 border-zinc-700'>
                    <AlbumImage
                      src={recommendation.basisAlbum.coverArtUrl}
                      alt={`${recommendation.basisAlbum.title} by ${recommendation.basisAlbum.artists.map(a => a.artist.name).join(', ')}`}
                      width={320}
                      height={320}
                      sizes='(max-width: 1024px) 288px, 320px'
                      className='w-full h-full object-cover transition-all duration-300 group-hover:brightness-110'
                      priority
                    />
                    <div className='absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 rounded-lg'></div>
                    <div className='absolute bottom-3 left-3'>
                      <span className='bg-red-600 text-white text-sm font-bold px-3 py-1 rounded shadow-lg'>
                        SRC
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            {/* Recommended Album */}
            <div className='text-center'>
              <div className='mb-4'>
                <Link
                  href={`/albums/${recommendation.recommendedAlbum.id}?source=local`}
                >
                  <p className='font-bold text-cosmic-latte text-xl hover:underline cursor-pointer hover:text-white transition-colors'>
                    {recommendation.recommendedAlbum.title}
                  </p>
                </Link>
                <p className='text-zinc-300 text-lg'>
                  {recommendation.recommendedAlbum.artists.map((a, idx) => (
                    <span key={a.artist.id}>
                      {idx > 0 && ', '}
                      <Link
                        href={`/artists/${a.artist.id}?source=local`}
                        className='hover:text-white hover:underline transition-colors'
                      >
                        {a.artist.name}
                      </Link>
                    </span>
                  ))}
                </p>
              </div>
              <Link
                href={`/albums/${recommendation.recommendedAlbum.id}?source=local`}
              >
                <div className='group relative cursor-pointer'>
                  <div className='relative w-72 h-72 lg:w-80 lg:h-80 mx-auto aspect-square overflow-hidden rounded-lg shadow-2xl transition-all duration-300 group-hover:shadow-xl group-hover:scale-105 bg-zinc-800 border-2 border-zinc-700'>
                    <AlbumImage
                      src={recommendation.recommendedAlbum.coverArtUrl}
                      alt={`${recommendation.recommendedAlbum.title} by ${recommendation.recommendedAlbum.artists.map(a => a.artist.name).join(', ')}`}
                      width={320}
                      height={320}
                      sizes='(max-width: 1024px) 288px, 320px'
                      className='w-full h-full object-cover transition-all duration-300 group-hover:brightness-110'
                      priority
                    />
                    <div className='absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 rounded-lg'></div>
                    <div className='absolute bottom-3 left-3'>
                      <span className='bg-green-600 text-white text-sm font-bold px-3 py-1 rounded shadow-lg'>
                        REC
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Centered rating heart between albums */}
          <div
            className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20'
            style={{ top: 'calc(50% + 32px)' }}
          >
            <div className='bg-black border-2 border-black rounded-full shadow-xl'>
              <div
                className={`flex items-center justify-center w-16 h-16 bg-gradient-to-r ${scoreColors.bgGradient} rounded-full border-2 ${scoreColors.borderColor} shadow-lg`}
              >
                <div className='flex flex-col items-center'>
                  <Heart
                    className={`h-5 w-5 ${scoreColors.heartColor} drop-shadow-sm mb-0.5`}
                  />
                  <span
                    className={`text-sm font-bold ${scoreColors.textColor} tabular-nums leading-none`}
                  >
                    {recommendation.score}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
