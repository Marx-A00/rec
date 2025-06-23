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
      className={`bg-zinc-900 rounded-lg p-4 border border-zinc-800 hover:border-zinc-700 transition-colors ${className}`}
    >
      <div className='flex items-start gap-3'>
        {/* Actor Avatar */}
        <Link href={`/profile/${activity.actorId}`}>
          <Avatar className='h-10 w-10 hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0'>
            <AvatarImage
              src={activity.actorImage || undefined}
              alt={activity.actorName}
            />
            <AvatarFallback className='bg-zinc-700 text-zinc-200 text-sm'>
              {activity.actorName.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </Link>

        {/* Activity Content */}
        <div className='flex-1 min-w-0'>
          <div className='flex items-start justify-between gap-2'>
            <div className='flex-1 min-w-0'>
              <p className='text-sm text-zinc-300'>
                <Link
                  href={`/profile/${activity.actorId}`}
                  className='text-cosmic-latte hover:text-emeraled-green font-medium transition-colors'
                >
                  {activity.actorName}
                </Link>{' '}
                {getActivityText()}
              </p>

              <p className='text-xs text-zinc-500 mt-1'>
                {getTimeAgo(activity.createdAt)}
              </p>
            </div>

            {/* Timestamp */}
            <div className='flex-shrink-0'>
              <span className='text-xs text-zinc-500'>
                {new Date(activity.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Album/Target Visual */}
          {(activity.type === 'recommendation' ||
            activity.type === 'collection_add') &&
            activity.albumImage && (
              <div className='mt-3 flex items-center gap-3'>
                <div
                  className='cursor-pointer hover:opacity-80 transition-opacity'
                  onClick={handleAlbumClick}
                  title={`View ${activity.albumTitle} by ${activity.albumArtist}`}
                >
                  <AlbumImage
                    src={activity.albumImage}
                    alt={`${activity.albumTitle} by ${activity.albumArtist}`}
                    width={60}
                    height={60}
                    className='w-15 h-15 rounded border border-zinc-700 hover:border-zinc-600 transition-colors'
                  />
                </div>

                {activity.type === 'recommendation' &&
                  activity.metadata?.score && (
                    <div className='text-xs text-zinc-400'>
                      <span className='text-emeraled-green font-medium'>
                        {activity.metadata.score}/10
                      </span>{' '}
                      similarity
                    </div>
                  )}
              </div>
            )}

          {/* Follow Target Avatar */}
          {activity.type === 'follow' && activity.targetImage && (
            <div className='mt-3'>
              <Link href={`/profile/${activity.targetId}`}>
                <Avatar className='h-12 w-12 hover:opacity-80 transition-opacity cursor-pointer'>
                  <AvatarImage
                    src={activity.targetImage}
                    alt={activity.targetName || 'User'}
                  />
                  <AvatarFallback className='bg-zinc-700 text-zinc-200'>
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
