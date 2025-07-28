import { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2, MoreHorizontal, Heart } from 'lucide-react';
import Link from 'next/link';

import AlbumImage from '@/components/ui/AlbumImage';
import { Button } from '@/components/ui/button';
import { useDeleteRecommendationMutation } from '@/hooks';
import { Recommendation } from '@/types/recommendation';

import RecommendationDetailModal from './RecommendationDetailModal';

interface RecommendationCardProps {
  recommendation: Recommendation;
  currentUserId?: string;
  currentAlbumId?: string; // New prop to highlight current album
  onEdit?: (recommendation: Recommendation) => void;
  onDetail?: (recommendation: Recommendation) => void; // Kept for backward compatibility
  onAlbumClick?: (albumId: string, albumType: 'source' | 'recommended') => void;
  showDetailModal?: boolean; // New prop to control modal functionality
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

export default function RecommendationCard({
  recommendation,
  currentUserId,
  currentAlbumId,
  onEdit,
  onDetail,
  onAlbumClick,
  showDetailModal = true, // Default to true for automatic modal behavior
}: RecommendationCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedRecommendationId, setSelectedRecommendationId] = useState<
    string | null
  >(null);
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

  // Get dynamic colors based on score
  const scoreColors = getScoreColors(recommendation.score);

  // Check if either album is the current one being viewed
  const isSourceAlbumCurrent =
    currentAlbumId === recommendation.basisAlbumDiscogsId;
  const isRecommendedAlbumCurrent =
    currentAlbumId === recommendation.recommendedAlbumDiscogsId;

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
    if (showDetailModal) {
      // Use built-in modal functionality
      setSelectedRecommendationId(recommendation.id);
    } else if (onDetail) {
      // Fall back to external onDetail handler
      onDetail(recommendation);
    }
  };

  const handleCloseModal = () => {
    setSelectedRecommendationId(null);
  };

  const handleAlbumClick = (albumType: 'source' | 'recommended') => {
    // Don't navigate if it's the current album
    const albumId =
      albumType === 'source'
        ? recommendation.basisAlbumDiscogsId
        : recommendation.recommendedAlbumDiscogsId;

    if (albumId === currentAlbumId) {
      return; // Don't navigate to current album
    }

    if (onAlbumClick) {
      onAlbumClick(albumId, albumType);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  return (
    <>
      <article
        className={`
          bg-black
          rounded-xl shadow-lg hover:shadow-xl 
          transition-all duration-300 hover:scale-[1.01]
          border border-zinc-600
          p-3 relative overflow-hidden
          focus-within:ring-2 focus-within:ring-blue-400 focus-within:ring-offset-2 focus-within:ring-offset-black
          ${showDetailModal || onDetail ? 'cursor-pointer' : ''}
        `}
        onClick={showDetailModal || onDetail ? handleCardClick : undefined}
        onKeyDown={
          showDetailModal || onDetail
            ? e => handleKeyDown(e, handleCardClick)
            : undefined
        }
        tabIndex={showDetailModal || onDetail ? 0 : -1}
        role={showDetailModal || onDetail ? 'button' : 'article'}
        aria-label={`Music recommendation: ${recommendation.basisAlbumTitle} by ${recommendation.basisAlbumArtist} suggests ${recommendation.recommendedAlbumTitle} by ${recommendation.recommendedAlbumArtist}, rated ${recommendation.score} out of 10`}
      >
        {/* Compact header with user info */}
        <div className='flex items-center justify-between mb-3'>
          <div className='flex items-center space-x-2'>
            {recommendation.user?.image ? (
              <div className='relative'>
                <AlbumImage
                  src={recommendation.user.image}
                  alt={recommendation.user.name || 'User'}
                  width={24}
                  height={24}
                  className='rounded-full ring-2 ring-zinc-600 shadow-sm'
                />
                <div className='absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 border-2 border-black rounded-full shadow-sm'></div>
              </div>
            ) : (
              <div className='w-6 h-6 bg-gradient-to-br from-zinc-600 to-zinc-700 rounded-full ring-2 ring-zinc-600 flex items-center justify-center shadow-sm'>
                <span className='text-white font-semibold text-xs'>
                  {(recommendation.user?.name || 'A').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <Link href={`/profile/${recommendation.userId}`}>
              <span className='text-xs font-medium text-cosmic-latte hover:underline cursor-pointer transition-all duration-200'>
                {recommendation.user?.name || 'Anonymous'}
              </span>
            </Link>
          </div>
          {canEdit && (
            <div className='relative' ref={actionMenuRef}>
              <Button
                variant='ghost'
                size='sm'
                onClick={e => {
                  e.stopPropagation();
                  e.currentTarget.blur();
                  setShowActions(!showActions);
                }}
                onKeyDown={e => {
                  e.stopPropagation();
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.currentTarget.blur();
                    setShowActions(!showActions);
                  }
                }}
                className='p-1.5 h-7 w-7 hover:bg-zinc-800 rounded-full transition-colors focus:outline-none'
                aria-label='Recommendation actions menu'
                aria-expanded={showActions}
                aria-haspopup='menu'
              >
                <MoreHorizontal
                  className='h-3 w-3 text-zinc-400'
                  aria-hidden='true'
                />
              </Button>
              {showActions && (
                <div
                  className='absolute right-0 top-8 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-20 py-2 min-w-[140px] backdrop-blur-sm'
                  role='menu'
                  aria-label='Recommendation actions'
                >
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleEdit();
                    }}
                    onKeyDown={e => {
                      e.stopPropagation();
                      handleKeyDown(e, handleEdit);
                    }}
                    className='flex items-center space-x-3 px-4 py-2.5 text-sm hover:bg-zinc-800 w-full text-left transition-colors focus:outline-none focus:bg-zinc-800'
                    role='menuitem'
                    tabIndex={0}
                    aria-label='Edit this recommendation'
                  >
                    <Pencil
                      className='h-4 w-4 text-zinc-400'
                      aria-hidden='true'
                    />
                    <span className='text-zinc-200'>Edit</span>
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    onKeyDown={e => {
                      e.stopPropagation();
                      handleKeyDown(e, handleDelete);
                    }}
                    className={`flex items-center space-x-3 px-4 py-2.5 text-sm hover:bg-zinc-800 w-full text-left transition-colors focus:outline-none focus:bg-zinc-800 ${
                      showDeleteConfirm
                        ? 'text-red-400 bg-red-950'
                        : 'text-zinc-200'
                    }`}
                    disabled={deleteMutation.isPending}
                    role='menuitem'
                    tabIndex={0}
                    aria-label={
                      showDeleteConfirm
                        ? 'Confirm deletion of this recommendation'
                        : 'Delete this recommendation'
                    }
                  >
                    <Trash2 className='h-4 w-4' aria-hidden='true' />
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
                      onKeyDown={e => {
                        e.stopPropagation();
                        handleKeyDown(e, () => setShowDeleteConfirm(false));
                      }}
                      className='flex items-center justify-center px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 w-full transition-colors border-t border-zinc-700 mt-1 focus:outline-none focus:bg-zinc-800'
                      role='menuitem'
                      tabIndex={0}
                      aria-label='Cancel deletion'
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Compact album layout with centered rating */}
        <div className='relative'>
          <div className='grid grid-cols-2 gap-2'>
            {/* Source Album */}
            <div className='relative group'>
              {/* Album info on top */}
              <div className='mb-1.5 text-center'>
                <p className='font-bold text-sm text-white leading-tight line-clamp-1'>
                  {recommendation.basisAlbumTitle}
                </p>
                <p className='text-zinc-300 text-xs font-medium line-clamp-1'>
                  {recommendation.basisAlbumArtist}
                </p>
              </div>
              {/* Album image */}
              <button
                className={`relative w-full aspect-square overflow-hidden rounded-lg focus:outline-none transition-all duration-300 ${
                  isSourceAlbumCurrent
                    ? 'ring-2 ring-cosmic-latte opacity-75 cursor-default'
                    : ''
                }`}
                onClick={e => {
                  e.stopPropagation();
                  e.currentTarget.blur();
                  handleAlbumClick('source');
                }}
                disabled={isSourceAlbumCurrent}
                onKeyDown={e => {
                  e.stopPropagation();
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.currentTarget.blur();
                    handleAlbumClick('source');
                  }
                }}
                aria-label={`View details for ${recommendation.basisAlbumTitle} by ${recommendation.basisAlbumArtist} from ${recommendation.basisAlbumYear || 'unknown year'}`}
                tabIndex={0}
              >
                <AlbumImage
                  src={recommendation.basisAlbumImageUrl}
                  alt={`${recommendation.basisAlbumTitle} by ${recommendation.basisAlbumArtist}`}
                  width={400}
                  height={400}
                  sizes='(max-width: 640px) 45vw, (max-width: 768px) 35vw, 400px'
                  className={`
                    w-full h-full object-cover 
                    transition-all duration-500 ease-out
                    ${isSourceAlbumCurrent ? '' : 'group-hover:scale-105 group-hover:brightness-110'}
                    shadow-lg hover:shadow-xl
                    relative z-10
                  `}
                  priority={false}
                  showSkeleton={false}
                />
                <div className='absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 rounded-lg'></div>
                <div className='absolute bottom-2 left-2 z-20 pointer-events-none'>
                  <span
                    className='bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded shadow-lg'
                    aria-hidden='true'
                  >
                    SRC
                  </span>
                </div>
              </button>
            </div>

            {/* Recommended Album */}
            <div className='relative group'>
              {/* Album info on top */}
              <div className='mb-1.5 text-center'>
                <p className='font-bold text-sm text-white leading-tight line-clamp-1'>
                  {recommendation.recommendedAlbumTitle}
                </p>
                <p className='text-zinc-300 text-xs font-medium line-clamp-1'>
                  {recommendation.recommendedAlbumArtist}
                </p>
              </div>
              {/* Album image */}
              <button
                className={`relative w-full aspect-square overflow-hidden rounded-lg focus:outline-none transition-all duration-300 ${
                  isRecommendedAlbumCurrent
                    ? 'ring-2 ring-cosmic-latte opacity-75 cursor-default'
                    : ''
                }`}
                onClick={e => {
                  e.stopPropagation();
                  e.currentTarget.blur();
                  handleAlbumClick('recommended');
                }}
                disabled={isRecommendedAlbumCurrent}
                onKeyDown={e => {
                  e.stopPropagation();
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.currentTarget.blur();
                    handleAlbumClick('recommended');
                  }
                }}
                aria-label={`View details for ${recommendation.recommendedAlbumTitle} by ${recommendation.recommendedAlbumArtist} from ${recommendation.recommendedAlbumYear || 'unknown year'}`}
                tabIndex={0}
              >
                <AlbumImage
                  src={recommendation.recommendedAlbumImageUrl}
                  alt={`${recommendation.recommendedAlbumTitle} by ${recommendation.recommendedAlbumArtist}`}
                  width={400}
                  height={400}
                  sizes='(max-width: 640px) 45vw, (max-width: 768px) 35vw, 400px'
                  className={`
                    w-full h-full object-cover 
                    transition-all duration-500 ease-out
                    ${isRecommendedAlbumCurrent ? '' : 'group-hover:scale-105 group-hover:brightness-110'}
                    shadow-lg hover:shadow-xl
                    relative z-10
                  `}
                  priority={false}
                  showSkeleton={false}
                />
                <div className='absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 rounded-lg'></div>
                <div className='absolute bottom-2 left-2 z-20 pointer-events-none'>
                  <span
                    className='bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded shadow-lg'
                    aria-hidden='true'
                  >
                    REC
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Centered rating heart between albums */}
          <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20'>
            {/* Rating */}
            <div className='bg-black border-3 border-black rounded-full shadow-lg'>
              <div
                className={`flex items-center justify-center w-10 h-10 bg-gradient-to-r ${scoreColors.bgGradient} rounded-full border-2 ${scoreColors.borderColor} shadow-md`}
                role='img'
                aria-label={`Rating: ${recommendation.score} out of 10 hearts`}
              >
                <div className='flex flex-col items-center'>
                  <Heart
                    className={`h-3 w-3 ${scoreColors.heartColor} drop-shadow-sm mb-0.5`}
                    aria-hidden='true'
                  />
                  <span
                    className={`text-xs font-bold ${scoreColors.textColor} tabular-nums leading-none`}
                    aria-hidden='true'
                  >
                    {recommendation.score}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Compact footer with date */}
        {/* <div className='mt-3 text-xs text-zinc-400 text-center'>
          {new Date(recommendation.createdAt).toLocaleDateString()}
        </div> */}
      </article>

      {/* Built-in Detail Modal */}
      {showDetailModal && (
        <RecommendationDetailModal
          recommendationId={selectedRecommendationId}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}
