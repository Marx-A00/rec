'use client';

import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AlbumImage from '@/components/ui/AlbumImage';
import { formatTimeAgo } from '@/utils/activity-grouping';
import { cn } from '@/lib/utils';

interface CollectionMetadata {
  personalRating?: number;
  collectionName?: string;
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
  metadata?: CollectionMetadata;
}

interface MobileCollectionCardProps {
  activity: Activity;
  className?: string;
}

export default function MobileCollectionCard({
  activity,
  className,
}: MobileCollectionCardProps) {
  const rating = activity.metadata?.personalRating;
  const collectionName = activity.metadata?.collectionName;

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
          <p className='text-sm'>
            <Link
              href={`/m/profile/${activity.actorId}`}
              className='font-medium text-white hover:text-emeraled-green'
            >
              {activity.actorName}
            </Link>
            <span className='text-zinc-400'>
              {' '}
              added to {collectionName || 'collection'}
            </span>
          </p>
          <p className='text-xs text-zinc-500'>
            {formatTimeAgo(activity.createdAt)}
          </p>
        </div>
      </div>

      {/* Album */}
      <Link
        href={`/m/albums/${activity.albumId}`}
        className='block active:scale-[0.98] transition-transform'
      >
        <div className='flex gap-3'>
          <div className='relative flex-shrink-0'>
            <AlbumImage
              src={activity.albumImage || '/placeholder-album.png'}
              alt={activity.albumTitle || 'Album'}
              width={80}
              height={80}
              className='w-20 h-20 rounded-lg border border-zinc-700'
            />
            {rating && (
              <div className='absolute -top-1 -right-1 bg-zinc-900 border border-cosmic-latte/50 rounded-full w-6 h-6 flex items-center justify-center'>
                <span className='text-[10px] text-cosmic-latte font-bold'>
                  {rating}
                </span>
              </div>
            )}
          </div>
          <div className='flex-1 min-w-0 py-1'>
            <p className='font-medium text-white truncate'>
              {activity.albumTitle}
            </p>
            <p className='text-sm text-zinc-400 truncate'>
              {activity.albumArtist}
            </p>
            {rating && (
              <p className='text-xs text-yellow-400 mt-1'>★ {rating}/10</p>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
