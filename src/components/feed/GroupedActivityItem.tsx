'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, ChevronDown, ChevronUp } from 'lucide-react';

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
  const [isExpanded, setIsExpanded] = useState(false);

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

      {/* Albums for Collection/Recommendation Activities */}
      {(group.type === 'collection_add' || group.type === 'recommendation') && (
        <div>
          {/* Stacked view (collapsed) */}
          {!isExpanded && (
            <div className='flex justify-center'>
              <div className='flex -space-x-6'>
                {group.activities.slice(0, 5).map((activity, index) => (
                  <Link
                    key={activity.id}
                    href={activity.albumId ? `/album/${activity.albumId}` : '#'}
                    className='relative group cursor-pointer block'
                    style={{ zIndex: 5 - index }}
                  >
                    <AlbumImage
                      src={activity.albumImage || '/placeholder-album.png'}
                      alt={`${activity.albumTitle} by ${activity.albumArtist}`}
                      width={96}
                      height={96}
                      className='w-24 h-24 rounded-lg ring-2 ring-zinc-900 transition-all group-hover:scale-110 group-hover:ring-cosmic-latte/80 group-hover:z-10'
                    />

                    {/* Show rating badge for collection adds */}
                    {group.type === 'collection_add' && activity.metadata?.personalRating && (
                      <div className='absolute -top-1 -right-1 bg-zinc-900 border border-cosmic-latte/50 rounded-full w-6 h-6 flex items-center justify-center ring-2 ring-zinc-900'>
                        <span className='text-[10px] text-cosmic-latte font-bold'>
                          {activity.metadata.personalRating}
                        </span>
                      </div>
                    )}

                    {/* Show score for recommendations */}
                    {group.type === 'recommendation' && activity.metadata?.score && (
                      <div className='absolute -top-1 -right-1 bg-zinc-900 border border-emeraled-green/50 rounded-full w-6 h-6 flex items-center justify-center ring-2 ring-zinc-900'>
                        <span className='text-[10px] text-emeraled-green font-bold'>
                          {activity.metadata.score}
                        </span>
                      </div>
                    )}
                  </Link>
                ))}

                {/* Show "+X more" if there are more than 5 */}
                {activityCount > 5 && (
                  <div className='flex items-center justify-center w-24 h-24 rounded-lg bg-zinc-800 ring-2 ring-zinc-900 text-xs text-zinc-400 font-medium'>
                    +{activityCount - 5}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Grid view (expanded) */}
          {isExpanded && (
            <div className='grid grid-cols-3 gap-3 max-w-md mx-auto'>
              {group.activities.map((activity) => (
                <Link
                  key={activity.id}
                  href={activity.albumId ? `/album/${activity.albumId}` : '#'}
                  className='flex flex-col gap-1'
                >
                  <div className='relative group cursor-pointer'>
                    <AlbumImage
                      src={activity.albumImage || '/placeholder-album.png'}
                      alt={`${activity.albumTitle} by ${activity.albumArtist}`}
                      width={100}
                      height={100}
                      className='w-full h-full rounded-lg border border-zinc-700 group-hover:border-cosmic-latte/80 transition-all group-hover:scale-105'
                    />

                    {/* Show rating badge for collection adds */}
                    {group.type === 'collection_add' && activity.metadata?.personalRating && (
                      <div className='absolute -top-1 -right-1 bg-zinc-900 border border-cosmic-latte/50 rounded-full w-6 h-6 flex items-center justify-center ring-2 ring-zinc-900'>
                        <span className='text-[10px] text-cosmic-latte font-bold'>
                          {activity.metadata.personalRating}
                        </span>
                      </div>
                    )}

                    {/* Show score for recommendations */}
                    {group.type === 'recommendation' && activity.metadata?.score && (
                      <div className='absolute -top-1 -right-1 bg-zinc-900 border border-emeraled-green/50 rounded-full w-6 h-6 flex items-center justify-center ring-2 ring-zinc-900'>
                        <span className='text-[10px] text-emeraled-green font-bold'>
                          {activity.metadata.score}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Album title and artist (truncated) */}
                  <div className='text-center px-1'>
                    <p className='text-[10px] text-zinc-300 truncate'>
                      {activity.albumTitle}
                    </p>
                    <p className='text-[9px] text-zinc-500 truncate'>
                      {activity.albumArtist}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Expand/Collapse button */}
          <div className='flex justify-center mt-3'>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className='flex items-center gap-1 text-xs text-zinc-400 hover:text-emeraled-green transition-colors'
            >
              {isExpanded ? (
                <>
                  <ChevronUp className='w-4 h-4' />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className='w-4 h-4' />
                  Show all {activityCount}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Stacked Avatars for Follow Activities */}
      {group.type === 'follow' && (
        <div className='flex justify-center'>
          <div className='flex -space-x-3'>
            {group.activities.slice(0, 5).map((activity, index) => (
              <Link
                key={activity.id}
                href={`/profile/${activity.targetId}`}
                className='group relative'
                style={{ zIndex: 5 - index }}
              >
                <Avatar className='h-12 w-12 ring-2 ring-zinc-900 transition-all group-hover:scale-110 group-hover:ring-cosmic-latte/80 group-hover:z-10'>
                  <AvatarImage
                    src={activity.targetImage || undefined}
                    alt={activity.targetName || 'User'}
                  />
                  <AvatarFallback className='bg-zinc-700 text-zinc-200 text-xs'>
                    {activity.targetName?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Link>
            ))}

            {/* Show "+X more" if there are more than 5 */}
            {activityCount > 5 && (
              <div className='flex items-center justify-center h-12 w-12 rounded-full bg-zinc-800 ring-2 ring-zinc-900 text-xs text-zinc-400 font-medium'>
                +{activityCount - 5}
              </div>
            )}
          </div>
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