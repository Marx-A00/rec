'use client';

import { X, Heart } from 'lucide-react';
import Link from 'next/link';

import AlbumImage from '@/components/ui/AlbumImage';
import { Button } from '@/components/ui/button';
import { useRecommendationQuery } from '@/hooks';
import { Recommendation } from '@/types/recommendation';

interface RecommendationDetailModalProps {
  recommendationId: string | null;
  onClose: () => void;
}

export default function RecommendationDetailModal({
  recommendationId,
  onClose,
}: RecommendationDetailModalProps) {
  const {
    data: recommendation,
    isLoading,
    error,
  } = useRecommendationQuery(recommendationId || '');

  if (!recommendationId) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-start justify-center pt-20 z-50 p-4'>
      <div className='bg-black border border-zinc-600 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl'>
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b border-zinc-700'>
          <h2 className='text-xl font-bold text-white'>
            Recommendation Details
          </h2>
          <Button
            variant='ghost'
            size='sm'
            onClick={onClose}
            className='hover:bg-zinc-800 text-zinc-400 hover:text-white h-8 w-8 p-0'
          >
            <X className='h-4 w-4' />
          </Button>
        </div>

        {/* Content */}
        <div className='p-4'>
          {isLoading && (
            <div className='flex items-center justify-center py-8'>
              <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-white'></div>
              <span className='ml-3 text-zinc-300 text-sm'>
                Loading recommendation...
              </span>
            </div>
          )}

          {error && (
            <div className='text-center py-8'>
              <div className='text-red-400 mb-2 text-sm'>
                Failed to load recommendation
              </div>
              <div className='text-zinc-400 text-xs'>
                {error instanceof Error ? error.message : 'Unknown error'}
              </div>
            </div>
          )}

          {recommendation && (
            <div className='space-y-6'>
              {/* User Info */}
              <div className='flex items-center space-x-3'>
                {recommendation.user?.image ? (
                  <div className='relative'>
                    <AlbumImage
                      src={recommendation.user.image}
                      alt={recommendation.user.name || 'User'}
                      width={40}
                      height={40}
                      className='rounded-full ring-2 ring-zinc-600 shadow-sm'
                    />
                    <div className='absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-black rounded-full shadow-sm'></div>
                  </div>
                ) : (
                  <div className='w-10 h-10 bg-gradient-to-br from-zinc-600 to-zinc-700 rounded-full ring-2 ring-zinc-600 flex items-center justify-center shadow-sm'>
                    <span className='text-white font-semibold text-sm'>
                      {(recommendation.user?.name || 'A')
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <Link href={`/profile/${recommendation.userId}`}>
                    <h3 className='font-semibold text-lg text-white hover:underline cursor-pointer transition-all duration-200'>
                      {recommendation.user?.name || 'Anonymous'}
                    </h3>
                  </Link>
                  <p className='text-zinc-400 text-xs'>
                    {new Date(recommendation.createdAt).toLocaleDateString(
                      'en-US',
                      {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }
                    )}
                  </p>
                </div>
              </div>

              {/* Album Comparison - Compact Layout */}
              <div className='relative'>
                <div className='grid grid-cols-2 gap-4'>
                  {/* Basis Album */}
                  <div className='text-center space-y-3'>
                    <div className='mb-3'>
                      <div className='space-y-1'>
                        <p className='font-bold text-sm text-white leading-tight line-clamp-2'>
                          {recommendation.basisAlbumTitle}
                        </p>
                        <p className='text-zinc-300 text-xs font-medium line-clamp-1'>
                          {recommendation.basisAlbumArtist}
                        </p>
                        {recommendation.basisAlbumYear && (
                          <p className='text-zinc-400 text-xs'>
                            {recommendation.basisAlbumYear}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className='relative group'>
                      <div className='relative w-full max-w-48 mx-auto aspect-square overflow-hidden rounded-lg shadow-lg'>
                        <AlbumImage
                          src={recommendation.basisAlbumImageUrl}
                          alt={`${recommendation.basisAlbumTitle} by ${recommendation.basisAlbumArtist}`}
                          width={192}
                          height={192}
                          sizes='192px'
                          className='w-full h-full object-cover transition-all duration-300 group-hover:scale-105'
                        />
                        <div className='absolute bottom-2 left-2'>
                          <span className='bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded shadow-lg'>
                            SRC
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recommended Album */}
                  <div className='text-center space-y-3'>
                    <div className='mb-3'>
                      <div className='space-y-1'>
                        <p className='font-bold text-sm text-white leading-tight line-clamp-2'>
                          {recommendation.recommendedAlbumTitle}
                        </p>
                        <p className='text-zinc-300 text-xs font-medium line-clamp-1'>
                          {recommendation.recommendedAlbumArtist}
                        </p>
                        {recommendation.recommendedAlbumYear && (
                          <p className='text-zinc-400 text-xs'>
                            {recommendation.recommendedAlbumYear}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className='relative group'>
                      <div className='relative w-full max-w-48 mx-auto aspect-square overflow-hidden rounded-lg shadow-lg'>
                        <AlbumImage
                          src={recommendation.recommendedAlbumImageUrl}
                          alt={`${recommendation.recommendedAlbumTitle} by ${recommendation.recommendedAlbumArtist}`}
                          width={192}
                          height={192}
                          sizes='192px'
                          className='w-full h-full object-cover transition-all duration-300 group-hover:scale-105'
                        />
                        <div className='absolute bottom-2 left-2'>
                          <span className='bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded shadow-lg'>
                            REC
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Centered rating heart between albums - Smaller */}
                <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20'>
                  <div className='bg-black border-2 border-black rounded-full shadow-xl'>
                    <div className='flex items-center justify-center w-12 h-12 bg-gradient-to-r from-red-50 to-pink-50 rounded-full border-2 border-red-100 shadow-lg'>
                      <div className='flex flex-col items-center'>
                        <Heart className='h-4 w-4 text-red-500 fill-red-500 drop-shadow-sm mb-0.5' />
                        <span className='text-xs font-bold text-red-600 tabular-nums leading-none'>
                          {recommendation.score}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
