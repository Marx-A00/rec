'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AlbumImage from '@/components/ui/AlbumImage';
import { formatActivityTimeRange } from '@/utils/activity-grouping';

interface Activity {
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
}

interface GroupedActivity {
  id: string;
  type: 'follow' | 'recommendation' | 'profile_update' | 'collection_add';
  actorId: string;
  actorName: string;
  actorImage: string | null;
  createdAt: string;
  earliestCreatedAt: string;
  activities: Activity[];
  isGrouped: boolean;
}

interface GroupedActivityItemProps {
  group: GroupedActivity;
  onAlbumClick?: (albumId: string) => void;
  className?: string;
}

export default function GroupedActivityItem({
  group,
  onAlbumClick,
  className = '',
}: GroupedActivityItemProps) {
  // For non-grouped activities, use the original display
  if (!group.isGrouped) {
    return <SingleActivityDisplay activity={group.activities[0]} onAlbumClick={onAlbumClick} className={className} />;
  }

  // For grouped activities, show a condensed view
  const activityCount = group.activities.length;
  const timeRange = formatActivityTimeRange(group);

  const getGroupedActivityText = () => {
    switch (group.type) {
      case 'collection_add':
        return (
          <span>
            added{' '}
            <span className='text-emeraled-green font-semibold'>{activityCount} albums</span>{' '}
            to their collection {timeRange}
          </span>
        );
      case 'recommendation':
        return (
          <span>
            made{' '}
            <span className='text-emeraled-green font-semibold'>{activityCount} recommendations</span>{' '}
            {timeRange}
          </span>
        );
      case 'follow':
        return (
          <span>
            followed{' '}
            <span className='text-emeraled-green font-semibold'>{activityCount} users</span>{' '}
            {timeRange}
          </span>
        );
      default:
        return (
          <span>
            performed {activityCount} actions {timeRange}
          </span>
        );
    }
  };

  return (
    <div
      className={`bg-zinc-900 rounded-lg p-3 pb-4 border border-zinc-800 hover:border-zinc-700 transition-colors ${className}`}
    >
      {/* Header with user and summary */}
      <div className='mb-3'>
        <div className='flex justify-center items-center gap-2'>
          <Link href={`/profile/${group.actorId}`}>
            <Avatar className='h-6 w-6 hover:opacity-80 transition-opacity cursor-pointer'>
              <AvatarImage
                src={group.actorImage || undefined}
                alt={group.actorName}
              />
              <AvatarFallback className='bg-zinc-700 text-zinc-200 text-[10px]'>
                {group.actorName.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </Link>

          <p className='text-sm text-zinc-400 text-center'>
            <Link
              href={`/profile/${group.actorId}`}
              className='text-cosmic-latte hover:text-emeraled-green font-medium transition-colors'
            >
              {group.actorName}
            </Link>{' '}
            {getGroupedActivityText()}
          </p>
        </div>
      </div>

      {/* Album Grid for Collection/Recommendation Activities */}
      {(group.type === 'collection_add' || group.type === 'recommendation') && (
        <div className='grid grid-cols-3 gap-2 max-w-md mx-auto'>
          {group.activities.slice(0, 6).map((activity) => (
            <div
              key={activity.id}
              className='relative group cursor-pointer'
              onClick={() => activity.albumId && onAlbumClick?.(activity.albumId)}
              title={`${activity.albumTitle} by ${activity.albumArtist}`}
            >
              <AlbumImage
                src={activity.albumImage || '/placeholder-album.png'}
                alt={`${activity.albumTitle} by ${activity.albumArtist}`}
                width={100}
                height={100}
                className='w-full h-full rounded border border-zinc-700 group-hover:border-emeraled-green/50 transition-all group-hover:scale-105'
              />

              {/* Show rating badge for collection adds */}
              {group.type === 'collection_add' && activity.metadata?.personalRating && (
                <div className='absolute -bottom-1 -right-1 bg-zinc-900 border border-cosmic-latte/30 rounded-full px-1 py-0.5 text-[8px] text-cosmic-latte font-bold'>
                  {activity.metadata.personalRating}
                </div>
              )}

              {/* Show score for recommendations */}
              {group.type === 'recommendation' && activity.metadata?.score && (
                <div className='absolute -bottom-1 -right-1 bg-zinc-900 border border-emeraled-green/30 rounded-full w-5 h-5 flex items-center justify-center'>
                  <span className='text-[8px] text-emeraled-green font-bold'>
                    {activity.metadata.score}
                  </span>
                </div>
              )}
            </div>
          ))}

          {/* Show "+X more" if there are more than 6 */}
          {activityCount > 6 && (
            <div className='flex items-center justify-center bg-zinc-800 rounded border border-zinc-700'>
              <span className='text-xs text-zinc-400'>+{activityCount - 6} more</span>
            </div>
          )}
        </div>
      )}

      {/* User Grid for Follow Activities */}
      {group.type === 'follow' && (
        <div className='grid grid-cols-3 gap-2 max-w-md mx-auto'>
          {group.activities.slice(0, 6).map((activity) => (
            <Link
              key={activity.id}
              href={`/profile/${activity.targetId}`}
              className='flex flex-col items-center gap-1 p-2 rounded hover:bg-zinc-800 transition-colors'
            >
              <Avatar className='h-16 w-16'>
                <AvatarImage
                  src={activity.targetImage || undefined}
                  alt={activity.targetName || 'User'}
                />
                <AvatarFallback className='bg-zinc-700 text-zinc-200 text-xs'>
                  {activity.targetName?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className='text-[10px] text-zinc-400 text-center truncate max-w-full'>
                {activity.targetName}
              </span>
            </Link>
          ))}

          {/* Show "+X more" if there are more than 6 */}
          {activityCount > 6 && (
            <div className='flex items-center justify-center bg-zinc-800 rounded'>
              <span className='text-xs text-zinc-400'>+{activityCount - 6}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Component for single activity display (non-grouped)
function SingleActivityDisplay({
  activity,
  onAlbumClick,
  className = '',
}: {
  activity: Activity;
  onAlbumClick?: (albumId: string) => void;
  className?: string;
}) {
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
          <>
            recommends{' '}
            <span className='text-emeraled-green font-semibold'>
              {activity.albumTitle}
            </span>{' '}
            by{' '}
            <span className='text-emeraled-green'>
              {activity.albumArtist}
            </span>
          </>
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

  const handleAlbumClick = () => {
    if (activity.albumId && onAlbumClick) {
      onAlbumClick(activity.albumId);
    }
  };

  return (
    <div
      className={`bg-zinc-900 rounded-lg p-3 pb-4 border border-zinc-800 hover:border-zinc-700 transition-colors ${className}`}
    >
      {/* Header */}
      <div className='mb-3'>
        <div className='flex justify-center items-center gap-2'>
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

          <p className='text-sm text-zinc-400 text-center'>
            <Link
              href={`/profile/${activity.actorId}`}
              className='text-cosmic-latte hover:text-emeraled-green font-medium transition-colors'
            >
              {activity.actorName}
            </Link>{' '}
            {getActivityText()}
          </p>
        </div>
      </div>

      {/* Album display for single items */}
      {activity.albumImage && (activity.type === 'recommendation' || activity.type === 'collection_add') && (
        <div className='flex justify-center'>
          <div
            className='cursor-pointer hover:scale-105 transition-transform'
            onClick={handleAlbumClick}
            title={`View ${activity.albumTitle} by ${activity.albumArtist}`}
          >
            <AlbumImage
              src={activity.albumImage}
              alt={`${activity.albumTitle} by ${activity.albumArtist}`}
              width={150}
              height={150}
              className='w-[150px] h-[150px] rounded-lg border-2 border-zinc-700 hover:border-emeraled-green/50 transition-all shadow-xl'
            />
          </div>
        </div>
      )}

      {/* User avatar for follows */}
      {activity.type === 'follow' && activity.targetImage && (
        <div className='flex justify-center'>
          <Link href={`/profile/${activity.targetId}`}>
            <Avatar className='h-[150px] w-[150px] hover:opacity-80 hover:scale-105 transition-all cursor-pointer border-2 border-emeraled-green/30'>
              <AvatarImage
                src={activity.targetImage}
                alt={activity.targetName || 'User'}
              />
              <AvatarFallback className='bg-zinc-700 text-zinc-200 text-3xl'>
                {activity.targetName?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      )}
    </div>
  );
}