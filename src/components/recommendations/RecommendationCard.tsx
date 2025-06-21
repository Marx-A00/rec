import { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2, MoreHorizontal } from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';
import { Button } from '@/components/ui/button';
import { useDeleteRecommendationMutation } from '@/hooks';
import { Recommendation } from '@/types/recommendation';

interface RecommendationCardProps {
  recommendation: Recommendation;
  currentUserId?: string;
  onEdit?: (recommendation: Recommendation) => void;
  onDetail?: (recommendation: Recommendation) => void;
}

export default function RecommendationCard({
  recommendation,
  currentUserId,
  onEdit,
  onDetail,
}: RecommendationCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const deleteMutation = useDeleteRecommendationMutation({
    onSuccess: () => {
      setShowDeleteConfirm(false);
      setShowActions(false);
    },
    onError: error => {
      console.error('Failed to delete recommendation:', error);
      // TODO: Add toast notification for error
    },
  });

  const canEdit = currentUserId && currentUserId === recommendation.userId;

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(event.target as Node)
      ) {
        setShowActions(false);
        setShowDeleteConfirm(false);
      }
    };

    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showActions]);

  const handleDelete = () => {
    if (showDeleteConfirm) {
      deleteMutation.mutate(recommendation.id);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(recommendation);
    }
    setShowActions(false);
  };

  const handleCardClick = () => {
    if (onDetail) {
      onDetail(recommendation);
    }
  };
  return (
    <div
      className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow relative ${
        onDetail ? 'cursor-pointer' : ''
      }`}
      onClick={onDetail ? handleCardClick : undefined}
    >
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center space-x-2'>
          {recommendation.user?.image && (
            <AlbumImage
              src={recommendation.user.image}
              alt={recommendation.user.name || 'User'}
              width={32}
              height={32}
              className='rounded-full'
            />
          )}
          <span className='text-sm text-gray-600'>
            {recommendation.user?.name || 'Anonymous'}
          </span>
        </div>
        <div className='flex items-center space-x-2'>
          <div className='flex items-center space-x-1'>
            <span className='text-lg font-bold text-yellow-500'>
              {recommendation.score}
            </span>
            <span className='text-sm text-gray-500'>/10</span>
          </div>
          {canEdit && (
            <div className='relative' ref={actionMenuRef}>
              <Button
                variant='ghost'
                size='sm'
                onClick={e => {
                  e.stopPropagation();
                  setShowActions(!showActions);
                }}
                className='p-1 h-8 w-8'
              >
                <MoreHorizontal className='h-4 w-4' />
              </Button>
              {showActions && (
                <div className='absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-10 py-1 min-w-[120px]'>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleEdit();
                    }}
                    className='flex items-center space-x-2 px-3 py-2 text-sm hover:bg-gray-50 w-full text-left'
                  >
                    <Pencil className='h-4 w-4' />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    className={`flex items-center space-x-2 px-3 py-2 text-sm hover:bg-gray-50 w-full text-left ${
                      showDeleteConfirm
                        ? 'text-red-600 bg-red-50'
                        : 'text-gray-700'
                    }`}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className='h-4 w-4' />
                    <span>
                      {showDeleteConfirm
                        ? deleteMutation.isPending
                          ? 'Deleting...'
                          : 'Confirm Delete'
                        : 'Delete'}
                    </span>
                  </button>
                  {showDeleteConfirm && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setShowDeleteConfirm(false);
                      }}
                      className='flex items-center justify-center px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 w-full'
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className='grid grid-cols-2 gap-4'>
        {/* Basis Album */}
        <div className='text-center'>
          <h3 className='text-sm font-medium text-gray-500 mb-2'>
            If you like
          </h3>
          <div className='relative w-full aspect-square mb-2'>
            <AlbumImage
              src={recommendation.basisAlbumImageUrl}
              alt={`${recommendation.basisAlbumTitle} by ${recommendation.basisAlbumArtist}`}
              width={200}
              height={200}
              sizes='(max-width: 768px) 50vw, 200px'
              className='w-full h-full object-cover rounded'
            />
          </div>
          <div className='space-y-1'>
            <p className='font-semibold text-sm'>
              {recommendation.basisAlbumTitle}
            </p>
            <p className='text-gray-600 text-xs'>
              {recommendation.basisAlbumArtist}
            </p>
            {recommendation.basisAlbumYear && (
              <p className='text-gray-500 text-xs'>
                {recommendation.basisAlbumYear}
              </p>
            )}
          </div>
        </div>

        {/* Recommended Album */}
        <div className='text-center'>
          <h3 className='text-sm font-medium text-gray-500 mb-2'>
            You might like
          </h3>
          <div className='relative w-full aspect-square mb-2'>
            <AlbumImage
              src={recommendation.recommendedAlbumImageUrl}
              alt={`${recommendation.recommendedAlbumTitle} by ${recommendation.recommendedAlbumArtist}`}
              width={200}
              height={200}
              sizes='(max-width: 768px) 50vw, 200px'
              className='w-full h-full object-cover rounded'
            />
          </div>
          <div className='space-y-1'>
            <p className='font-semibold text-sm'>
              {recommendation.recommendedAlbumTitle}
            </p>
            <p className='text-gray-600 text-xs'>
              {recommendation.recommendedAlbumArtist}
            </p>
            {recommendation.recommendedAlbumYear && (
              <p className='text-gray-500 text-xs'>
                {recommendation.recommendedAlbumYear}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className='mt-4 text-xs text-gray-400 text-center'>
        {new Date(recommendation.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}
