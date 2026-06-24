'use client';

import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AlbumImage from '@/components/ui/AlbumImage';
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';
import {
  formatActivityTimeRange,
  formatTimeAgo,
  type GroupedActivity,
} from '@/utils/activity-grouping';
import type {
  TransformedActivity,
  TransformedActivityMetadata,
} from '@/utils/transform-activity';
import { ScoreColorOverrideContext } from '@/components/feed/ScoreColorOverrideContext';

// Default score color function
const defaultGetScoreColors = (score: number) => {
  if (score >= 10) {
    return {
      heartColor: 'text-red-500 fill-red-500',
      textColor: 'text-red-400',
      bgGradient: 'from-red-950 to-red-950',
      borderColor: 'border-red-500/40',
    };
  } else if (score >= 8) {
    return {
      heartColor: 'text-emerald-500 fill-emerald-500',
      textColor: 'text-emerald-400',
      bgGradient: 'from-emerald-950 to-emerald-950',
      borderColor: 'border-emerald-500/40',
    };
  } else {
    // 5-7 range (yellow)
    return {
      heartColor: 'text-yellow-500 fill-yellow-500',
      textColor: 'text-yellow-400',
      bgGradient: 'from-yellow-950 to-yellow-950',
      borderColor: 'border-yellow-500/40',
    };
  }
};

interface GroupedActivityItemProps {
  group: GroupedActivity;
  className?: string;
}

export default function GroupedActivityItem({
  group,
  className = '',
}: GroupedActivityItemProps) {
  const colorOverride = useContext(ScoreColorOverrideContext);
  const getScoreColors = colorOverride || defaultGetScoreColors;

  // For non-grouped activities, use the original display
  if (!group.isGrouped) {
    return (
      <SingleActivityDisplay
        activity={group.activities[0]}
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
            collected{' '}
            <span className='text-cosmic-latte font-semibold'>
              {activityCount} albums
            </span>
          </span>
        );
      case 'recommendation':
        return (
          <span>
            made{' '}
            <span className='text-cosmic-latte font-semibold'>
              {activityCount} recommendations
            </span>
          </span>
        );
      case 'follow':
        return (
          <span>
            followed{' '}
            <span className='text-cosmic-latte font-semibold'>
              {activityCount} users
            </span>
          </span>
        );
      default:
        return <span>performed {activityCount} actions</span>;
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
              className='text-cosmic-latte hover:text-cosmic-latte font-medium transition-colors'
            >
              {group.actorName}
            </Link>{' '}
            {getGroupedActivityText()}
            {timeRange && (
              <span className='text-zinc-500 ml-1'>· {timeRange}</span>
            )}
          </p>
        </div>
      </div>

      {/* Albums for Collection/Recommendation Activities */}
      {(group.type === 'collection_add' || group.type === 'recommendation') && (
        <div>
          {/* Recommendations — grid + carousel */}
          {group.type === 'recommendation' && (
            <ExpandedRecGrid
              activities={group.activities}
              getScoreColors={getScoreColors}
            />
          )}

          {/* Collections */}
          {group.type === 'collection_add' && (
            <div className='flex flex-wrap justify-center items-start gap-x-8 gap-y-12 px-4 pb-8 animate-in fade-in zoom-in-95 duration-300'>
              {group.activities.map(activity => (
                <div key={activity.id} className='shrink-0'>
                  {/* Collection Add: Show single album */}
                  {group.type === 'collection_add' && activity.albumImage && (
                    <Link
                      href={`/albums/${activity.albumId}?source=local`}
                      className='relative group cursor-pointer inline-block'
                    >
                      <AlbumImage
                        src={activity.albumImage || '/placeholder-album.png'}
                        cloudflareImageId={activity.albumCloudflareImageId}
                        alt={`${activity.albumTitle} by ${activity.albumArtist}`}
                        width={110}
                        height={110}
                        className='w-[110px] h-[110px] rounded-lg border border-zinc-700 group-hover:border-cosmic-latte/80 transition-all group-hover:scale-105 shadow-lg'
                      />

                      {/* Show rating badge for collection adds */}
                      {(activity.metadata as TransformedActivityMetadata)
                        ?.personalRating && (
                        <div className='absolute -top-1 -right-1 bg-zinc-900 border border-cosmic-latte/50 rounded-full w-6 h-6 flex items-center justify-center ring-2 ring-zinc-900 shadow-md'>
                          <span className='text-[10px] text-cosmic-latte font-bold'>
                            {
                              (activity.metadata as TransformedActivityMetadata)
                                .personalRating
                            }
                          </span>
                        </div>
                      )}

                      {/* Album info tooltip - positioned below album */}
                      <div className='absolute top-full left-1/2 -translate-x-1/2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20'>
                        <p className='text-sm text-zinc-500 text-center'>
                          <span className='text-zinc-300'>
                            {activity.albumTitle}
                          </span>{' '}
                          by{' '}
                          <span className='text-zinc-400'>
                            {activity.albumArtist}
                          </span>
                        </p>
                      </div>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* Follow Activities - show all users */}
      {group.type === 'follow' && (
        <div className='flex flex-wrap justify-center gap-6 px-4 pb-6'>
          {group.activities.map(activity => (
            <Link
              key={activity.id}
              href={`/profile/${activity.targetId}`}
              className='group relative flex flex-col items-center'
            >
              <Avatar className='h-16 w-16 ring-2 ring-zinc-900 transition-all group-hover:scale-105 group-hover:ring-cosmic-latte/80'>
                <AvatarImage
                  src={activity.targetImage || undefined}
                  alt={activity.targetName || 'User'}
                />
                <AvatarFallback className='bg-zinc-700 text-zinc-200 text-sm'>
                  {activity.targetName?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <p className='text-xs text-zinc-300 text-center mt-2'>
                {activity.targetName}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Component for single activity display (non-grouped)
function SingleActivityDisplay({
  activity,
  className = '',
}: {
  activity: TransformedActivity;
  className?: string;
}) {
  const colorOverride = useContext(ScoreColorOverrideContext);
  const getScoreColors = colorOverride || defaultGetScoreColors;
  const getActivityText = () => {
    switch (activity.type) {
      case 'follow':
        return (
          <span>
            followed{' '}
            <Link
              href={`/profile/${activity.targetId}`}
              className='text-cosmic-latte hover:text-cosmic-latte font-medium transition-colors'
            >
              {activity.targetName}
            </Link>
          </span>
        );
      case 'recommendation':
        return (
          <>
            recommends{' '}
            <Link
              href={`/albums/${activity.albumId}?source=local`}
              className='text-cosmic-latte hover:text-cosmic-latte font-semibold transition-colors'
            >
              {activity.albumTitle}
            </Link>{' '}
            by{' '}
            <Link
              href={`/artists/${activity.artistId}`}
              className='text-cosmic-latte hover:text-cosmic-latte transition-colors'
            >
              {activity.albumArtist}
            </Link>
          </>
        );
      case 'collection_add':
        return (
          <span>
            collected{' '}
            <Link
              href={`/albums/${activity.albumId}?source=local`}
              className='text-cosmic-latte hover:text-cosmic-latte font-medium transition-colors'
            >
              {activity.albumTitle}
            </Link>{' '}
            by{' '}
            <Link
              href={`/artists/${activity.artistId}`}
              className='text-cosmic-latte hover:text-cosmic-latte transition-colors'
            >
              {activity.albumArtist}
            </Link>
            {(activity.metadata as TransformedActivityMetadata)
              ?.personalRating && (
              <span className='text-yellow-400 text-sm block mt-1'>
                ★{' '}
                {
                  (activity.metadata as TransformedActivityMetadata)
                    .personalRating
                }
                /10
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
              className='text-cosmic-latte hover:text-cosmic-latte font-medium transition-colors'
            >
              {activity.actorName}
            </Link>{' '}
            {getActivityText()}
            <span className='text-zinc-500 ml-1'>
              · {formatTimeAgo(activity.createdAt)}
            </span>
          </p>
        </div>
      </div>

      {/* Recommendation Visual - Stacked Albums */}
      {activity.type === 'recommendation' && activity.albumImage && (
        <div className='flex justify-center items-center gap-6 relative px-4'>
          {/* Basis album details - left side */}
          {(activity.metadata as TransformedActivityMetadata)
            ?.basisAlbum && (
            <div className='flex-1 text-right min-w-0'>
              <p className='text-lg text-zinc-300 font-medium line-clamp-2 leading-tight'>
                {(activity.metadata as TransformedActivityMetadata).basisAlbum!.title}
              </p>
              <p className='text-sm text-zinc-500 line-clamp-2 leading-tight mt-1'>
                {(activity.metadata as TransformedActivityMetadata).basisAlbum!.artists?.[0]?.artist?.name}
              </p>
            </div>
          )}

          {/* Album pair container */}
          <div className='relative shrink-0'>
            <div className='relative w-[420px] h-[240px]'>
              {/* Basis Album (back) */}
              {(activity.metadata as TransformedActivityMetadata)
                ?.basisAlbum && (
                <Link
                  href={`/albums/${(activity.metadata as TransformedActivityMetadata).basisAlbum!.id}?source=local`}
                  className='absolute left-0 top-0 cursor-pointer hover:scale-105 transition-transform'
                  title={`View ${(activity.metadata as TransformedActivityMetadata).basisAlbum!.title}`}
                >
                  <AlbumImage
                    src={
                      (activity.metadata as TransformedActivityMetadata)
                        .basisAlbum!.coverArtUrl || '/placeholder-album.png'
                    }
                    cloudflareImageId={
                      (activity.metadata as TransformedActivityMetadata)
                        .basisAlbum!.cloudflareImageId
                    }
                    alt={
                      (activity.metadata as TransformedActivityMetadata)
                        .basisAlbum!.title
                    }
                    width={180}
                    height={180}
                    className='w-[180px] h-[180px] rounded-lg shadow-lg border border-zinc-700/50 hover:border-zinc-600 transition-all'
                  />
                </Link>
              )}

              {/* Recommended Album (front) */}
              <Link
                href={`/albums/${activity.albumId}?source=local`}
                className='absolute left-[200px] top-0 cursor-pointer hover:scale-105 transition-transform'
                title={`View ${activity.albumTitle} by ${activity.albumArtist}`}
              >
                <AlbumImage
                  src={activity.albumImage}
                  cloudflareImageId={activity.albumCloudflareImageId}
                  alt={`${activity.albumTitle} by ${activity.albumArtist}`}
                  width={220}
                  height={220}
                  className='w-[220px] h-[220px] rounded-lg shadow-2xl border-2 border-cosmic-latte/30 hover:border-cosmic-latte/50 transition-all'
                />
              </Link>

              {/* Score indicator with heart */}
              {(activity.metadata as TransformedActivityMetadata)?.score && (
                <div className='absolute left-[155px] top-[75px] z-20'>
                  <div className='bg-zinc-900 border-2 border-zinc-800 rounded-full shadow-lg'>
                    <div
                      className={`flex items-center justify-center w-16 h-16 bg-linear-to-r ${getScoreColors((activity.metadata as TransformedActivityMetadata).score!).bgGradient} rounded-full border-2 ${getScoreColors((activity.metadata as TransformedActivityMetadata).score!).borderColor} shadow-md`}
                    >
                      <div className='flex flex-col items-center'>
                        <Heart
                          className={`h-4 w-4 ${getScoreColors((activity.metadata as TransformedActivityMetadata).score!).heartColor} drop-shadow-xs mb-0.5`}
                        />
                        <span
                          className={`text-xs font-bold ${getScoreColors((activity.metadata as TransformedActivityMetadata).score!).textColor} tabular-nums leading-none`}
                        >
                          {
                            (activity.metadata as TransformedActivityMetadata)
                              .score
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recommended album details - right side */}
          <div className='flex-1 min-w-0'>
            <p className='text-lg text-zinc-300 font-medium line-clamp-2 leading-tight'>
              {activity.albumTitle}
            </p>
            <p className='text-sm text-zinc-500 line-clamp-2 leading-tight mt-1'>
              {activity.albumArtist}
            </p>
          </div>
        </div>
      )}

      {/* Collection Add Visual - Single Album */}
      {activity.type === 'collection_add' && activity.albumImage && (
        <div className='flex justify-center'>
          <Link
            href={`/albums/${activity.albumId}?source=local`}
            className='cursor-pointer hover:scale-105 transition-transform inline-block'
            title={`View ${activity.albumTitle} by ${activity.albumArtist}`}
          >
            <AlbumImage
              src={activity.albumImage}
              cloudflareImageId={activity.albumCloudflareImageId}
              alt={`${activity.albumTitle} by ${activity.albumArtist}`}
              width={150}
              height={150}
              className='w-[150px] h-[150px] rounded-lg border-2 border-zinc-700 hover:border-cosmic-latte/50 transition-all shadow-xl'
            />
          </Link>
        </div>
      )}

      {/* User avatar for follows */}
      {activity.type === 'follow' && activity.targetImage && (
        <div className='flex justify-center'>
          <Link href={`/profile/${activity.targetId}`}>
            <Avatar className='h-[150px] w-[150px] hover:opacity-80 hover:scale-105 transition-all cursor-pointer border-2 border-cosmic-latte/30'>
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

// ---------------------------------------------------------------------------
// Expanded recommendation grid + carousel for overflow
// ---------------------------------------------------------------------------

type ScoreColorFn = (score: number) => {
  heartColor: string;
  textColor: string;
  bgGradient: string;
  borderColor: string;
};

function RecPairItem({
  activity,
  getScoreColors,
}: {
  activity: TransformedActivity;
  getScoreColors: ScoreColorFn;
}) {
  const metadata = activity.metadata as TransformedActivityMetadata;
  return (
    <div className='flex items-center gap-3'>
      {/* Basis album details - left */}
      {metadata?.basisAlbum && (
        <div className='max-w-28 text-right'>
          <p className='text-xs text-zinc-300 font-medium line-clamp-2 leading-tight'>
            {metadata.basisAlbum.title}
          </p>
          <p className='text-xs text-zinc-500 line-clamp-2 leading-tight'>
            {metadata.basisAlbum.artists?.[0]?.artist?.name}
          </p>
        </div>
      )}

      {/* Album pair */}
      <div className='relative shrink-0 w-[210px] h-[120px]'>
        {metadata?.basisAlbum && (
          <Link
            href={`/albums/${metadata.basisAlbum.id}?source=local`}
            className='absolute left-0 top-0 cursor-pointer hover:scale-105 transition-transform'
          >
            <AlbumImage
              src={metadata.basisAlbum.coverArtUrl || '/placeholder-album.png'}
              cloudflareImageId={metadata.basisAlbum.cloudflareImageId}
              alt={metadata.basisAlbum.title}
              width={90}
              height={90}
              className='w-[90px] h-[90px] rounded-lg shadow-lg border border-zinc-700/50 hover:border-zinc-600 transition-all'
            />
          </Link>
        )}
        <Link
          href={`/albums/${activity.albumId}?source=local`}
          className='absolute left-[100px] top-0 cursor-pointer hover:scale-105 transition-transform'
        >
          <AlbumImage
            src={activity.albumImage}
            cloudflareImageId={activity.albumCloudflareImageId}
            alt={`${activity.albumTitle} by ${activity.albumArtist}`}
            width={110}
            height={110}
            className='w-[110px] h-[110px] rounded-lg shadow-2xl border-2 border-cosmic-latte/30 hover:border-cosmic-latte/50 transition-all'
          />
        </Link>
        {metadata?.score && (() => {
          const sc = getScoreColors(metadata.score!);
          return (
            <div className='absolute left-[77px] top-[37px] z-20'>
              <div className='bg-zinc-900 border-2 border-zinc-800 rounded-full shadow-lg'>
                <div className={`flex items-center justify-center w-12 h-12 bg-linear-to-r ${sc.bgGradient} rounded-full border-2 ${sc.borderColor} shadow-md`}>
                  <div className='flex flex-col items-center'>
                    <Heart className={`h-3 w-3 ${sc.heartColor} drop-shadow-xs mb-0.5`} />
                    <span className={`text-[10px] font-bold ${sc.textColor} tabular-nums leading-none`}>
                      {metadata.score}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Recommended album details - right */}
      <div className='max-w-28'>
        <p className='text-xs text-zinc-300 font-medium line-clamp-2 leading-tight'>
          {activity.albumTitle}
        </p>
        <p className='text-xs text-zinc-500 line-clamp-2 leading-tight'>
          {activity.albumArtist}
        </p>
      </div>
    </div>
  );
}

function ExpandedRecGrid({
  activities,
  getScoreColors,
}: {
  activities: TransformedActivity[];
  getScoreColors: ScoreColorFn;
}) {
  const PAGE_SIZE = 3;

  // Chunk activities into pages of 3
  const pages: TransformedActivity[][] = [];
  for (let i = 0; i < activities.length; i += PAGE_SIZE) {
    pages.push(activities.slice(i, i + PAGE_SIZE));
  }

  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on('select', onSelect);
    return () => { api.off('select', onSelect); };
  }, [api]);

  // No carousel needed if everything fits in one page
  if (pages.length <= 1) {
    return (
      <div className='pb-4 animate-in fade-in zoom-in-95 duration-300'>
        <div className='flex flex-wrap justify-center items-start gap-x-8 gap-y-8 px-4'>
          {activities.map(activity => (
            <div key={activity.id} className='shrink-0'>
              <RecPairItem activity={activity} getScoreColors={getScoreColors} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='pb-4 animate-in fade-in zoom-in-95 duration-300'>
      <Carousel opts={{ loop: true }} setApi={setApi} className='w-full px-4'>
        <CarouselContent>
          {pages.map((page, pageIdx) => (
            <CarouselItem key={pageIdx}>
              <div className='flex flex-wrap justify-center items-start gap-x-8 gap-y-8'>
                {page.map(activity => (
                  <div key={activity.id} className='shrink-0'>
                    <RecPairItem activity={activity} getScoreColors={getScoreColors} />
                  </div>
                ))}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className='left-0' />
        <CarouselNext className='right-0' />
      </Carousel>

      {/* Dot indicators */}
      <div className='flex justify-center gap-1.5 mt-4'>
        {pages.map((_, i) => (
          <button
            key={i}
            type='button'
            onClick={() => api?.scrollTo(i)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === current
                ? 'bg-cosmic-latte w-4'
                : 'bg-zinc-600 hover:bg-zinc-500'
            }`}
            aria-label={`Go to page ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
