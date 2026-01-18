'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AlbumImage from '@/components/ui/AlbumImage';
import { formatTimeAgo } from '@/utils/activity-grouping';
import { cn } from '@/lib/utils';

interface BasisAlbum {
  id: string;
  title: string;
  coverArtUrl?: string;
  artists?: Array<{
    artist?: {
      name?: string;
    };
  }>;
}

interface RecommendationMetadata {
  score?: number;
  basisAlbum?: BasisAlbum;
}

interface Activity {
  id: string;
  actorId: string;
  actorName: string;
  actorImage: string | null;
  albumId?: string;
  albumTitle?: string;
  albumArtist?: string;
  artistId?: string;
  albumImage?: string | null;
  createdAt: string;
  metadata?: RecommendationMetadata;
}

interface MobileRecommendationCardProps {
  activity: Activity;
  className?: string;
}

// Helper function to get color classes based on score
const getScoreColors = (score: number) => {
  if (score >= 10) {
    return {
      heartColor: 'text-red-500 fill-red-500',
      textColor: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
    };
  } else if (score >= 8) {
    return {
      heartColor: 'text-emeraled-green fill-emeraled-green',
      textColor: 'text-emeraled-green',
      bgColor: 'bg-emeraled-green/10',
      borderColor: 'border-emeraled-green/30',
    };
  } else {
    return {
      heartColor: 'text-yellow-500 fill-yellow-500',
      textColor: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
    };
  }
};

export default function MobileRecommendationCard({
  activity,
  className,
}: MobileRecommendationCardProps) {
  const basisAlbum = activity.metadata?.basisAlbum;
  const score = activity.metadata?.score;
  const scoreColors = score ? getScoreColors(score) : null;

  return (
    <div
      className={cn(
        'bg-zinc-900 rounded-lg p-4 border border-zinc-800',
        className
      )}
    >
      {/* Header - User info */}
      <div className='flex items-center gap-2 mb-3'>
        <Link href={`/m/profile/${activity.actorId}`}>
          <Avatar className='h-8 w-8'>
            <AvatarImage
              src={activity.actorImage || undefined}
              alt={activity.actorName}
            />
            <AvatarFallback className='bg-zinc-700 text-zinc-200 text-xs'>
              {activity.actorName.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className='flex-1 min-w-0'>
          <Link
            href={`/m/profile/${activity.actorId}`}
            className='text-sm font-medium text-white hover:text-emeraled-green'
          >
            {activity.actorName}
          </Link>
          <p className='text-xs text-zinc-500'>
            {formatTimeAgo(activity.createdAt)}
          </p>
        </div>
      </div>

      {/* Album Pair - Side by side */}
      <div className='flex items-center justify-center gap-2 mb-3'>
        {/* Basis Album */}
        {basisAlbum && (
          <Link
            href={`/m/albums/${basisAlbum.id}`}
            className='flex-shrink-0 active:scale-95 transition-transform'
          >
            <AlbumImage
              src={basisAlbum.coverArtUrl || '/placeholder-album.png'}
              alt={basisAlbum.title}
              width={120}
              height={120}
              className='w-[120px] h-[120px] rounded-lg border border-zinc-700'
            />
          </Link>
        )}

        {/* Arrow with Score */}
        <div className='flex flex-col items-center gap-1 px-1'>
          <span className='text-zinc-500 text-lg'>→</span>
          {score && scoreColors && (
            <div
              className={cn(
                'flex items-center gap-0.5 px-2 py-1 rounded-full',
                scoreColors.bgColor,
                scoreColors.borderColor,
                'border'
              )}
            >
              <Heart className={cn('h-3 w-3', scoreColors.heartColor)} />
              <span className={cn('text-xs font-bold', scoreColors.textColor)}>
                {score}
              </span>
            </div>
          )}
        </div>

        {/* Recommended Album */}
        <Link
          href={`/m/albums/${activity.albumId}`}
          className='flex-shrink-0 active:scale-95 transition-transform'
        >
          <AlbumImage
            src={activity.albumImage || '/placeholder-album.png'}
            alt={activity.albumTitle || 'Album'}
            width={120}
            height={120}
            className='w-[120px] h-[120px] rounded-lg border-2 border-emeraled-green/30'
          />
        </Link>
      </div>

      {/* Caption */}
      <p className='text-sm text-zinc-400 text-center'>
        {basisAlbum ? (
          <>
            If you like{' '}
            <span className='text-zinc-300'>{basisAlbum.title}</span>, check out{' '}
            <Link
              href={`/m/albums/${activity.albumId}`}
              className='text-white font-medium'
            >
              {activity.albumTitle}
            </Link>
          </>
        ) : (
          <>
            Recommends{' '}
            <Link
              href={`/m/albums/${activity.albumId}`}
              className='text-white font-medium'
            >
              {activity.albumTitle}
            </Link>{' '}
            by{' '}
            <Link
              href={`/m/artists/${activity.artistId}`}
              className='text-zinc-300'
            >
              {activity.albumArtist}
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
