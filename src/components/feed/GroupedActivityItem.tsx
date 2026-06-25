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

      {/* Grouped Recommendations — carousel grid */}
      {group.type === 'recommendation' && (
        <ExpandedRecGrid
          activities={group.activities}
          getScoreColors={getScoreColors}
        />
      )}

      {/* Grouped Collections — carousel grid with side labels */}
      {group.type === 'collection_add' && (
        <ExpandedCollectionGrid activities={group.activities} />
      )}

      {/* Grouped Follows — show all users */}
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
        <div className='flex justify-center relative'>
          <div className='relative inline-block'>
            {/* Stacked Album Container */}
            <div className='relative w-[420px] h-[260px]'>
              {/* Basis Album (back) */}
              {(activity.metadata as TransformedActivityMetadata)
                ?.basisAlbum && (
                <Link
                  href={`/albums/${(activity.metadata as TransformedActivityMetadata).basisAlbum!.id}?source=local`}
                  className='absolute left-0 top-0 transition-all duration-300 ease-out cursor-pointer hover:scale-105'
                  title={`View ${(activity.metadata as TransformedActivityMetadata).basisAlbum!.title}`}
                >
                  <div className='relative'>
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
                  </div>
                </Link>
              )}

              {/* Recommended Album (front) */}
              <Link
                href={`/albums/${activity.albumId}?source=local`}
                className='rec-album absolute left-[200px] top-0 cursor-pointer hover:scale-105 transition-transform'
                title={`View ${activity.albumTitle} by ${activity.albumArtist}`}
              >
                <div className='relative'>
                  <AlbumImage
                    src={activity.albumImage}
                    cloudflareImageId={activity.albumCloudflareImageId}
                    alt={`${activity.albumTitle} by ${activity.albumArtist}`}
                    width={220}
                    height={220}
                    className='w-[220px] h-[220px] rounded-lg shadow-2xl border-2 border-cosmic-latte/30 hover:border-cosmic-latte/50 transition-all'
                  />
                </div>
              </Link>

              {/* Score indicator with heart - visible on hover between albums */}
              {(activity.metadata as TransformedActivityMetadata)?.score && (
                <div className='arrow-indicator absolute left-[155px] top-[75px] z-20'>
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

              {/* Basis album text - shows on hover with the albums */}
              {(activity.metadata as TransformedActivityMetadata)
                ?.basisAlbum && (
                <div className='basis-text absolute bottom-0 left-0 w-[420px] pointer-events-none'>
                  <p className='text-sm text-zinc-500 text-center w-full px-4 pb-1 line-clamp-1'>
                    if you like{' '}
                    <span className='text-zinc-400'>
                      {
                        (activity.metadata as TransformedActivityMetadata)
                          .basisAlbum!.title
                      }
                    </span>{' '}
                    by{' '}
                    <span className='text-zinc-400'>
                      {
                        (activity.metadata as TransformedActivityMetadata)
                          .basisAlbum!.artists?.[0]?.artist?.name
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
// Recommendation pair item — basis + rec album with score heart
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
        <div className='max-w-20 text-right'>
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
      <div className='max-w-20'>
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

// ---------------------------------------------------------------------------
// Expanded recommendation grid with carousel for overflow
// ---------------------------------------------------------------------------

function ExpandedRecGrid({
  activities,
  getScoreColors,
}: {
  activities: TransformedActivity[];
  getScoreColors: ScoreColorFn;
}) {
  const PAGE_SIZE = 3;

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
      <div className='py-2 pb-4 animate-in fade-in zoom-in-95 duration-300'>
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
    <div className='py-2 pb-4 animate-in fade-in zoom-in-95 duration-300'>
      <Carousel opts={{ loop: true }} setApi={setApi} className='w-full px-12'>
        <CarouselContent>
          {pages.map((page, pageIdx) => (
            <CarouselItem key={pageIdx}>
              <div className='flex justify-center items-start gap-x-6'>
                {page.map(activity => (
                  <div key={activity.id} className='shrink-0'>
                    <RecPairItem activity={activity} getScoreColors={getScoreColors} />
                  </div>
                ))}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className='-left-2' />
        <CarouselNext className='-right-2' />
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

// ---------------------------------------------------------------------------
// Collection grid with carousel for overflow
// ---------------------------------------------------------------------------

const COLLECTION_PAGE_SIZE = 5;

function CollectionItem({ activity }: { activity: TransformedActivity }) {
  return (
    <div className='w-[196px] flex items-center gap-2'>
      <div className='w-[80px] text-right shrink-0'>
        <p className='text-xs text-zinc-300 font-medium line-clamp-2 leading-tight'>
          {activity.albumTitle}
        </p>
        <p className='text-xs text-zinc-500 line-clamp-2 leading-tight'>
          {activity.albumArtist}
        </p>
      </div>

      {activity.albumImage && (
        <Link
          href={`/albums/${activity.albumId}?source=local`}
          className='group cursor-pointer inline-block shrink-0'
        >
          <AlbumImage
            src={activity.albumImage || '/placeholder-album.png'}
            cloudflareImageId={activity.albumCloudflareImageId}
            alt={`${activity.albumTitle} by ${activity.albumArtist}`}
            width={110}
            height={110}
            className='w-[110px] h-[110px] rounded-lg border border-zinc-700 group-hover:border-cosmic-latte/80 transition-all group-hover:scale-105 shadow-lg'
          />
        </Link>
      )}
    </div>
  );
}

function ExpandedCollectionGrid({
  activities,
}: {
  activities: TransformedActivity[];
}) {
  const pages: TransformedActivity[][] = [];
  for (let i = 0; i < activities.length; i += COLLECTION_PAGE_SIZE) {
    pages.push(activities.slice(i, i + COLLECTION_PAGE_SIZE));
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

  if (pages.length <= 1) {
    return (
      <div className='py-2 pb-4'>
        <div className='flex justify-center gap-x-8 gap-y-6 px-4 -translate-x-11'>
          {activities.map(activity => (
            <CollectionItem key={activity.id} activity={activity} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='py-2 pb-4'>
      <Carousel opts={{ loop: true }} setApi={setApi} className='w-full px-12'>
        <CarouselContent>
          {pages.map((page, pageIdx) => (
            <CarouselItem key={pageIdx}>
              <div className='flex justify-center gap-x-8 gap-y-6 -translate-x-11'>
                {page.map(activity => (
                  <CollectionItem key={activity.id} activity={activity} />
                ))}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className='-left-2' />
        <CarouselNext className='-right-2' />
      </Carousel>

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
