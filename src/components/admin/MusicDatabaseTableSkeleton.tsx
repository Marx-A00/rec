import { Skeleton } from '@/components/ui/skeletons/Skeleton';

interface MusicDatabaseTableSkeletonProps {
  type: 'albums' | 'artists' | 'tracks';
  rows?: number;
}

export function MusicDatabaseTableSkeleton({
  type,
  rows = 10,
}: MusicDatabaseTableSkeletonProps) {
  if (type === 'albums') {
    return (
      <div className='animate-pulse'>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className='flex items-center gap-4 p-4 border-b border-zinc-800'
          >
            {/* Checkbox */}
            <div className='w-4 h-4 bg-zinc-700 rounded' />

            {/* Album info with cover */}
            <div className='flex items-center gap-3 flex-1'>
              <Skeleton className='h-4 w-4' /> {/* Chevron */}
              <Skeleton className='h-10 w-10 rounded' /> {/* Cover art */}
              <div className='space-y-2 flex-1'>
                <Skeleton className='h-4 w-48' /> {/* Title */}
                <Skeleton className='h-3 w-24' /> {/* Label */}
              </div>
            </div>

            {/* Artists */}
            <Skeleton className='h-4 w-32' />

            {/* Release Date */}
            <Skeleton className='h-4 w-24' />

            {/* Tracks */}
            <Skeleton className='h-4 w-12' />

            {/* Quality badge */}
            <Skeleton className='h-6 w-20 rounded' />

            {/* Status */}
            <div className='flex items-center gap-1'>
              <Skeleton className='h-4 w-4 rounded-full' />
              <Skeleton className='h-4 w-20' />
            </div>

            {/* Actions */}
            <div className='flex items-center gap-2'>
              <Skeleton className='h-8 w-8 rounded' />
              <Skeleton className='h-8 w-20 rounded' />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'artists') {
    return (
      <div className='animate-pulse'>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className='flex items-center gap-4 p-4 border-b border-zinc-800'
          >
            {/* Checkbox */}
            <div className='w-4 h-4 bg-zinc-700 rounded' />

            {/* Artist info with image */}
            <div className='flex items-center gap-3 flex-1'>
              <Skeleton className='h-4 w-4' /> {/* Chevron */}
              <Skeleton className='h-10 w-10 rounded-full' />{' '}
              {/* Artist image */}
              <Skeleton className='h-4 w-40' /> {/* Name */}
            </div>

            {/* Country */}
            <Skeleton className='h-4 w-12' />

            {/* Formed */}
            <Skeleton className='h-4 w-16' />

            {/* Albums */}
            <Skeleton className='h-4 w-12' />

            {/* Tracks */}
            <Skeleton className='h-4 w-12' />

            {/* Quality badge */}
            <Skeleton className='h-6 w-20 rounded' />

            {/* Status */}
            <div className='flex items-center gap-1'>
              <Skeleton className='h-4 w-4 rounded-full' />
              <Skeleton className='h-4 w-20' />
            </div>

            {/* Actions */}
            <div className='flex items-center gap-2'>
              <Skeleton className='h-8 w-8 rounded' />
              <Skeleton className='h-8 w-20 rounded' />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Tracks
  return (
    <div className='animate-pulse'>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className='flex items-center gap-4 p-4 border-b border-zinc-800'
        >
          {/* Track title */}
          <Skeleton className='h-4 w-48 flex-1' />

          {/* Artists */}
          <Skeleton className='h-4 w-32' />

          {/* Album with cover */}
          <div className='flex items-center gap-2'>
            <Skeleton className='h-8 w-8 rounded' />
            <Skeleton className='h-4 w-32' />
          </div>

          {/* Track # */}
          <Skeleton className='h-4 w-12' />

          {/* Duration */}
          <Skeleton className='h-4 w-16' />

          {/* ISRC */}
          <Skeleton className='h-4 w-28' />
        </div>
      ))}
    </div>
  );
}

/**
 * Overlay version that shows on top of existing content
 * Use this when you want to show that data is being refreshed
 */
export function MusicDatabaseTableLoadingOverlay() {
  return (
    <div className='absolute inset-0 bg-zinc-900/80 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-lg'>
      <div className='flex flex-col items-center gap-3'>
        <div className='relative'>
          <div className='h-10 w-10 rounded-full border-2 border-zinc-600 border-t-zinc-300 animate-spin' />
        </div>
        <span className='text-sm text-zinc-400'>Loading...</span>
      </div>
    </div>
  );
}
