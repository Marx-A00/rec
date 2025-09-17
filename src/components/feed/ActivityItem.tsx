'use client';

import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AlbumImage from '@/components/ui/AlbumImage';

interface ActivityItemProps {
  activity: {
    id: string;
    type: 'follow' | 'recommendation' | 'profile_update' | 'collection_add';
    actorId: string;
    actorName: string;
    actorImage: string | null;
    targetId?: string;
    targetName?: string;
    targetImage?: string | null;
    albumId?: string;
    albumTitle?: string;
    albumArtist?: string;
    albumImage?: string | null;
    createdAt: string;
    metadata?: any;
  };
  onAlbumClick?: (albumId: string) => void;
  className?: string;
}

export default function ActivityItem({
  activity,
  onAlbumClick,
  className = '',
}: ActivityItemProps) {
  const getActivityText = () => {
    switch (activity.type) {
      case 'follow':
        return (
          <span>
            followed{' '}
            <Link
              href={`/profile/${activity.targetId}`}
              className='text-emeraled-green hover:text-emeraled-green/80 font-medium'
            >
              {activity.targetName}
            </Link>
          </span>
        );
      case 'recommendation':
        return (
          <span>
            recommended{' '}
            <span className='text-cosmic-latte font-medium'>
              {activity.albumTitle}
            </span>{' '}
            by <span className='text-zinc-300'>{activity.albumArtist}</span>
            {activity.metadata?.basisAlbumTitle && (
              <span className='text-zinc-400 text-sm block mt-1'>
                Based on {activity.metadata.basisAlbumTitle} by{' '}
                {activity.metadata.basisAlbumArtist}
              </span>
            )}
          </span>
        );
      case 'collection_add':
        return (
          <span>
            added{' '}
            <span className='text-cosmic-latte font-medium'>
              {activity.albumTitle}
            </span>{' '}
            by <span className='text-zinc-300'>{activity.albumArtist}</span> to
            collection
            {activity.metadata?.collectionName && (
              <span className='text-emeraled-green font-medium'>
                {' '}
                {activity.metadata.collectionName}
              </span>
            )}
            {activity.metadata?.personalRating && (
              <span className='text-yellow-400 text-sm block mt-1'>
                ★ {activity.metadata.personalRating}/10
              </span>
            )}
          </span>
        );
      case 'profile_update':
        return <span>updated their profile</span>;
      default:
        return <span>did something</span>;
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const activityDate = new Date(dateString);
    const diffInSeconds = Math.floor(
      (now.getTime() - activityDate.getTime()) / 1000
    );

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return activityDate.toLocaleDateString();
  };

  const handleAlbumClick = () => {
    if (activity.albumId && onAlbumClick) {
      onAlbumClick(activity.albumId);
    }
  };

  return (
    <div
      className={`bg-zinc-900 rounded-lg p-3 pb-8 border border-zinc-800 hover:border-zinc-700 transition-colors ${className}`}
    >
      <div className='relative'>
        {/* Header with avatar and text */}
        <div className='flex items-center gap-2 mb-3'>
          <Link href={`/profile/${activity.actorId}`}>
            <Avatar className='h-6 w-6 hover:opacity-80 transition-opacity cursor-pointer'>
              <AvatarImage
                src={activity.actorImage || undefined}
                alt={activity.actorName}
              />
              <AvatarFallback className='bg-zinc-700 text-zinc-200 text-[10px]'>
                {activity.actorName.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </Link>

          <p className='text-[11px] text-zinc-400 flex-1'>
            <Link
              href={`/profile/${activity.actorId}`}
              className='text-cosmic-latte hover:text-emeraled-green font-medium transition-colors'
            >
              {activity.actorName}
            </Link>{' '}
            {activity.type === 'recommendation' ? (
              <>
                recommends{' '}
                <span className='text-emeraled-green font-medium'>
                  {activity.albumTitle}
                </span>{' '}
                by{' '}
                <span className='text-emeraled-green'>
                  {activity.albumArtist}
                </span>
              </>
            ) : (
              getActivityText()
            )}
          </p>
        </div>

        {/* Main content area for albums */}
        <div className='w-full'>

          {/* Recommendation Visual - MASSIVE albums */}
          {activity.type === 'recommendation' && activity.albumImage && (
            <div className='flex justify-center relative'>
              <div className='relative inline-block'>
                {/* Stacked Album Container - FILL THE SPACE */}
                <div
                  className='relative w-[180px] h-[140px] transition-all duration-300 ease-out [&:hover]:w-[300px] [&:hover_.rec-album]:left-[160px] [&:hover_.basis-badge]:opacity-100 [&:hover_.basis-info]:opacity-100 [&:hover_.arrow-indicator]:opacity-100 [&:hover_.basis-text]:opacity-100'
                >
                  {/* Basis Album (back) */}
                  {activity.metadata?.basisAlbum && (
                    <div
                      className='absolute left-0 top-0 transition-all duration-300 ease-out'
                      onClick={() => {
                        // You could add click handler for basis album if needed
                      }}
                    >
                      <div className='relative'>
                        <AlbumImage
                          src={activity.metadata.basisAlbum.coverArtUrl || '/placeholder-album.png'}
                          alt={activity.metadata.basisAlbum.title}
                          width={140}
                          height={140}
                          className='w-[140px] h-[140px] rounded-lg shadow-lg border border-zinc-700/50 transition-all'
                        />
                        <div className='basis-badge absolute -top-2 -left-2 w-7 h-7 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-600 opacity-0 transition-opacity'>
                          <span className='text-xs text-zinc-400 font-bold'>B</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recommended Album (front) */}
                  <div
                    className='rec-album absolute left-10 top-0 transition-all duration-300 ease-out cursor-pointer hover:scale-105'
                    onClick={handleAlbumClick}
                    title={`View ${activity.albumTitle} by ${activity.albumArtist}`}
                  >
                    <div className='relative'>
                      <AlbumImage
                        src={activity.albumImage}
                        alt={`${activity.albumTitle} by ${activity.albumArtist}`}
                        width={140}
                        height={140}
                        className='w-[140px] h-[140px] rounded-lg shadow-2xl border-2 border-emeraled-green/30 hover:border-emeraled-green/50 transition-all'
                      />
                      <div className='absolute -top-2 -right-2 w-8 h-8 bg-emeraled-green rounded-full flex items-center justify-center shadow-lg'>
                        <svg className='w-5 h-5 text-zinc-900' fill='currentColor' viewBox='0 0 20 20'>
                          <path fillRule='evenodd' d='M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z' clipRule='evenodd' />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Arrow indicator - visible on hover */}
                  <div className='arrow-indicator absolute left-[120px] top-[55px] opacity-0 transition-all duration-300'>
                    <svg
                      className='w-10 h-5 text-emeraled-green/40'
                      viewBox='0 0 24 12'
                      fill='none'
                    >
                      <path
                        d='M1 6H18M18 6L13 1M18 6L13 11'
                        stroke='currentColor'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                  </div>

                  {/* Score Badge - positioned absolutely */}
                  <div className='absolute -bottom-2 left-1/2 transform -translate-x-1/2 z-10'>
                    <div className='bg-zinc-900 border border-emeraled-green/30 rounded-full px-2 py-0.5'>
                      <span className='text-[10px] text-emeraled-green font-medium'>
                        {activity.metadata?.score}/10
                      </span>
                    </div>
                  </div>

                  {/* Basis album text - shows on hover with the albums */}
                  {activity.metadata?.basisAlbum && (
                    <div className='basis-text absolute top-[150px] left-0 w-[300px] opacity-0 transition-opacity duration-300 pointer-events-none'>
                      <p className='text-[10px] text-zinc-500 text-center w-full'>
                        if you like{' '}
                        <span className='text-zinc-400'>
                          {activity.metadata.basisAlbum.title}
                        </span>{' '}
                        by{' '}
                        <span className='text-zinc-400'>
                          {activity.metadata.basisAlbum.artists?.[0]?.artist?.name}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Collection Add Visual - MASSIVE */}
          {activity.type === 'collection_add' && activity.albumImage && (
            <div className='flex justify-center'>
              <div className='relative'>
                <div
                  className='cursor-pointer hover:scale-105 transition-transform'
                  onClick={handleAlbumClick}
                  title={`View ${activity.albumTitle} by ${activity.albumArtist}`}
                >
                  <AlbumImage
                    src={activity.albumImage}
                    alt={`${activity.albumTitle} by ${activity.albumArtist}`}
                    width={140}
                    height={140}
                    className='w-[140px] h-[140px] rounded-lg border-2 border-zinc-700 hover:border-cosmic-latte/50 transition-all shadow-xl'
                  />
                </div>
                {activity.metadata?.personalRating && (
                  <div className='absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-zinc-900 border border-cosmic-latte/30 rounded-full px-2 py-0.5'>
                    <span className='text-[10px] text-cosmic-latte font-medium'>
                      {activity.metadata.personalRating}/10
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Follow Target Avatar - BIGGER to match album size */}
          {activity.type === 'follow' && activity.targetImage && (
            <div className='flex justify-center'>
              <Link href={`/profile/${activity.targetId}`}>
                <Avatar className='h-[140px] w-[140px] hover:opacity-80 hover:scale-105 transition-all cursor-pointer border-2 border-emeraled-green/30'>
                  <AvatarImage
                    src={activity.targetImage}
                    alt={activity.targetName || 'User'}
                  />
                  <AvatarFallback className='bg-zinc-700 text-zinc-200 text-2xl'>
                    {activity.targetName?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
