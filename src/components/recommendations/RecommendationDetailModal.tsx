'use client';

import { X } from 'lucide-react';

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
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b border-gray-200'>
          <h2 className='text-2xl font-bold text-gray-800'>
            Recommendation Details
          </h2>
          <Button variant='ghost' size='sm' onClick={onClose}>
            <X className='h-5 w-5' />
          </Button>
        </div>

        {/* Content */}
        <div className='p-6'>
          {isLoading && (
            <div className='flex items-center justify-center py-12'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900'></div>
              <span className='ml-3 text-gray-600'>
                Loading recommendation...
              </span>
            </div>
          )}

          {error && (
            <div className='text-center py-12'>
              <div className='text-red-600 mb-2'>
                Failed to load recommendation
              </div>
              <div className='text-gray-500 text-sm'>
                {error instanceof Error ? error.message : 'Unknown error'}
              </div>
            </div>
          )}

          {recommendation && (
            <div className='space-y-8'>
              {/* User Info & Score */}
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-3'>
                  {recommendation.user?.image && (
                    <AlbumImage
                      src={recommendation.user.image}
                      alt={recommendation.user.name || 'User'}
                      width={48}
                      height={48}
                      className='rounded-full'
                    />
                  )}
                  <div>
                    <h3 className='font-semibold text-lg'>
                      {recommendation.user?.name || 'Anonymous'}
                    </h3>
                    <p className='text-gray-500 text-sm'>
                      {new Date(recommendation.createdAt).toLocaleDateString(
                        'en-US',
                        {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        }
                      )}
                    </p>
                  </div>
                </div>
                <div className='text-center'>
                  <div className='text-3xl font-bold text-yellow-500'>
                    {recommendation.score}
                  </div>
                  <div className='text-sm text-gray-500'>/10</div>
                </div>
              </div>

              {/* Album Comparison */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                {/* Basis Album */}
                <div className='text-center space-y-4'>
                  <h4 className='text-lg font-medium text-gray-700'>
                    If you like
                  </h4>
                  <div className='relative w-64 h-64 mx-auto'>
                    <AlbumImage
                      src={recommendation.basisAlbumImageUrl}
                      alt={`${recommendation.basisAlbumTitle} by ${recommendation.basisAlbumArtist}`}
                      width={256}
                      height={256}
                      sizes='256px'
                      className='w-full h-full object-cover rounded-lg shadow-md'
                    />
                  </div>
                  <div className='space-y-2'>
                    <h5 className='text-xl font-bold text-gray-900'>
                      {recommendation.basisAlbumTitle}
                    </h5>
                    <p className='text-gray-600 text-lg'>
                      {recommendation.basisAlbumArtist}
                    </p>
                    {recommendation.basisAlbumYear && (
                      <p className='text-gray-500'>
                        {recommendation.basisAlbumYear}
                      </p>
                    )}
                    <p className='text-sm text-gray-400 mt-3'>
                      Discogs ID: {recommendation.basisAlbumDiscogsId}
                    </p>
                  </div>
                </div>

                {/* Recommended Album */}
                <div className='text-center space-y-4'>
                  <h4 className='text-lg font-medium text-gray-700'>
                    You might like
                  </h4>
                  <div className='relative w-64 h-64 mx-auto'>
                    <AlbumImage
                      src={recommendation.recommendedAlbumImageUrl}
                      alt={`${recommendation.recommendedAlbumTitle} by ${recommendation.recommendedAlbumArtist}`}
                      width={256}
                      height={256}
                      sizes='256px'
                      className='w-full h-full object-cover rounded-lg shadow-md'
                    />
                  </div>
                  <div className='space-y-2'>
                    <h5 className='text-xl font-bold text-gray-900'>
                      {recommendation.recommendedAlbumTitle}
                    </h5>
                    <p className='text-gray-600 text-lg'>
                      {recommendation.recommendedAlbumArtist}
                    </p>
                    {recommendation.recommendedAlbumYear && (
                      <p className='text-gray-500'>
                        {recommendation.recommendedAlbumYear}
                      </p>
                    )}
                    <p className='text-sm text-gray-400 mt-3'>
                      Discogs ID: {recommendation.recommendedAlbumDiscogsId}
                    </p>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className='border-t border-gray-200 pt-6'>
                <h4 className='text-lg font-medium text-gray-700 mb-4'>
                  Metadata
                </h4>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
                  <div>
                    <span className='font-medium text-gray-600'>Created:</span>
                    <span className='ml-2 text-gray-800'>
                      {new Date(recommendation.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className='font-medium text-gray-600'>
                      Last Updated:
                    </span>
                    <span className='ml-2 text-gray-800'>
                      {new Date(recommendation.updatedAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className='font-medium text-gray-600'>
                      Recommendation ID:
                    </span>
                    <span className='ml-2 text-gray-800 font-mono text-xs'>
                      {recommendation.id}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='flex justify-end p-6 border-t border-gray-200'>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
