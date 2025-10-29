'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, ChevronDown, ChevronUp } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AlbumImage from '@/components/ui/AlbumImage';
import { formatActivityTimeRange } from '@/utils/activity-grouping';

// Helper function to get color classes based on score
const getScoreColors = (score: number) => {
  if (score >= 10) {
    return {
      heartColor: 'text-red-500 fill-red-500',
      textColor: 'text-red-600',
      bgGradient: 'from-red-50/10 to-pink-50/10',
      borderColor: 'border-red-500/30',
    };
  } else if (score >= 8) {
    return {
      heartColor: 'text-emeraled-green fill-emeraled-green',
      textColor: 'text-emeraled-green',
      bgGradient: 'from-green-50/10 to-emerald-50/10',
      borderColor: 'border-emeraled-green/30',
    };
  } else {
    // 5-7 range (yellow)
    return {
      heartColor: 'text-yellow-500 fill-yellow-500',
      textColor: 'text-yellow-600',
      bgGradient: 'from-yellow-50/10 to-amber-50/10',
      borderColor: 'border-yellow-500/30',
    };
  }
};

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
    return (
      <SingleActivityDisplay
        activity={group.activities[0]}
        onAlbumClick={onAlbumClick}
        className={className}
      />
    );
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
            <span className='text-emeraled-green font-semibold'>
              {activityCount} albums
            </span>{' '}
            to their collection {timeRange}
          </span>
        );
      case 'recommendation':
        return (
          <span>
            made{' '}
            <span className='text-emeraled-green font-semibold'>
              {activityCount} recommendations
            </span>{' '}
            {timeRange}
          </span>
        );
      case 'follow':
        return (
          <span>
            followed{' '}
            <span className='text-emeraled-green font-semibold'>
              {activityCount} users
            </span>{' '}
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
      className={`bg-zinc-900 rounded-lg p-3 pb-4 border border-zinc-800 ${className}`}
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
                    href={activity.albumId ? `/albums/${activity.albumId}?source=local` : '#'}
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
                    {group.type === 'collection_add' &&
                      activity.metadata?.personalRating && (
                        <div className='absolute -top-1 -right-1 bg-zinc-900 border border-cosmic-latte/50 rounded-full w-6 h-6 flex items-center justify-center ring-2 ring-zinc-900'>
                          <span className='text-[10px] text-cosmic-latte font-bold'>
                            {activity.metadata.personalRating}
                          </span>
                        </div>
                      )}

                    {/* Show score for recommendations */}
                    {group.type === 'recommendation' &&
                      activity.metadata?.score && (
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
              {group.activities.map(activity => (
                <Link
                  key={activity.id}
                  href={activity.albumId ? `/albums/${activity.albumId}?source=local` : '#'}
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
                    {group.type === 'collection_add' &&
                      activity.metadata?.personalRating && (
                        <div className='absolute -top-1 -right-1 bg-zinc-900 border border-cosmic-latte/50 rounded-full w-6 h-6 flex items-center justify-center ring-2 ring-zinc-900'>
                          <span className='text-[10px] text-cosmic-latte font-bold'>
                            {activity.metadata.personalRating}
                          </span>
                        </div>
                      )}

                    {/* Show score for recommendations */}
                    {group.type === 'recommendation' &&
                      activity.metadata?.score && (
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
            <span className='text-emeraled-green'>{activity.albumArtist}</span>
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
      className={`bg-zinc-900 rounded-lg p-3 pb-4 border border-zinc-800 ${className}`}
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

      {/* Recommendation Visual - Stacked Albums */}
      {activity.type === 'recommendation' && activity.albumImage && (
        <div className='flex justify-center relative'>
          <div className='relative inline-block'>
            {/* Stacked Album Container */}
            <div className='relative w-[280px] h-[260px] transition-all duration-300 ease-out [&:hover]:w-[420px] [&:hover_.rec-album]:left-[200px] [&:hover_.arrow-indicator]:opacity-100 [&:hover_.basis-text]:opacity-100'>
              {/* Basis Album (back) */}
              {activity.metadata?.basisAlbum && (
                <Link
                  href={`/albums/${activity.metadata.basisAlbum.id}?source=local`}
                  className='absolute left-0 top-0 transition-all duration-300 ease-out cursor-pointer hover:scale-105'
                  title={`View ${activity.metadata.basisAlbum.title}`}
                >
                  <div className='relative'>
                    <AlbumImage
                      src={
                        activity.metadata.basisAlbum.coverArtUrl ||
                        '/placeholder-album.png'
                      }
                      alt={activity.metadata.basisAlbum.title}
                      width={180}
                      height={180}
                      className='w-[180px] h-[180px] rounded-lg shadow-lg border border-zinc-700/50 hover:border-zinc-600 transition-all'
                    />
                  </div>
                </Link>
              )}

              {/* Recommended Album (front) */}
              <Link
                href={`/albums/${activity.albumId}?source=local`}
                className='rec-album absolute left-14 top-0 transition-all duration-300 ease-out cursor-pointer hover:scale-105'
                title={`View ${activity.albumTitle} by ${activity.albumArtist}`}
              >
                <div className='relative'>
                  <AlbumImage
                    src={activity.albumImage}
                    alt={`${activity.albumTitle} by ${activity.albumArtist}`}
                    width={220}
                    height={220}
                    className='w-[220px] h-[220px] rounded-lg shadow-2xl border-2 border-emeraled-green/30 hover:border-emeraled-green/50 transition-all'
                  />
                </div>
              </Link>

              {/* Score indicator with heart - visible on hover between albums */}
              {activity.metadata?.score && (
                <div className='arrow-indicator absolute left-[155px] top-[75px] opacity-0 transition-all duration-300 z-20'>
                  <div className='bg-zinc-900 border-2 border-zinc-800 rounded-full shadow-lg'>
                    <div
                      className={`flex items-center justify-center w-16 h-16 bg-gradient-to-r ${getScoreColors(activity.metadata.score).bgGradient} rounded-full border-2 ${getScoreColors(activity.metadata.score).borderColor} shadow-md`}
                    >
                      <div className='flex flex-col items-center'>
                        <Heart
                          className={`h-4 w-4 ${getScoreColors(activity.metadata.score).heartColor} drop-shadow-sm mb-0.5`}
                        />
                        <span
                          className={`text-xs font-bold ${getScoreColors(activity.metadata.score).textColor} tabular-nums leading-none`}
                        >
                          {activity.metadata.score}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Basis album text - shows on hover with the albums */}
              {activity.metadata?.basisAlbum && (
                <div className='basis-text absolute bottom-0 left-0 w-[420px] opacity-0 transition-opacity duration-300 pointer-events-none'>
                  <p className='text-xs text-zinc-500 text-center w-full px-4 pb-1'>
                    if you like{' '}
                    <span className='text-zinc-400'>
                      {activity.metadata.basisAlbum.title}
                    </span>{' '}
                    by{' '}
                    <span className='text-zinc-400'>
                      {
                        activity.metadata.basisAlbum.artists?.[0]?.artist
                          ?.name
                      }
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Collection Add Visual - Single Album */}
      {activity.type === 'collection_add' && activity.albumImage && (
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
              className='w-[150px] h-[150px] rounded-lg border-2 border-zinc-700 hover:border-cosmic-latte/50 transition-all shadow-xl'
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
