'use client';

import { Skeleton } from '@/components/ui/skeletons';
import { cn } from '@/lib/utils';

interface ModalSkeletonProps {
  variant?: 'album' | 'artist';
  className?: string;
}

/**
 * Skeleton displayed while correction modal fetches initial data.
 * Matches modal layout: step indicator + content area.
 */
export function ModalSkeleton({
  variant = 'album',
  className,
}: ModalSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Step indicator skeleton */}
      <div className='flex items-center justify-center gap-2 py-4'>
        {[1, 2, 3, 4].map(step => (
          <div key={step} className='flex items-center gap-2'>
            <Skeleton className='h-8 w-8 rounded-full' />
            <Skeleton className='h-4 w-16 hidden sm:block' />
            {step < 4 && <Skeleton className='h-0.5 w-8 mx-2' />}
          </div>
        ))}
      </div>

      {/* Content area skeleton */}
      <div className='space-y-4 p-4'>
        {/* Header */}
        <div className='flex items-start gap-4'>
          {/* Cover art / avatar placeholder */}
          <Skeleton
            className={cn(
              'flex-shrink-0',
              variant === 'album'
                ? 'h-24 w-24 rounded-md'
                : 'h-20 w-20 rounded-full'
            )}
          />

          {/* Title and metadata */}
          <div className='flex-1 space-y-3'>
            <Skeleton className='h-6 w-3/4' />
            <Skeleton className='h-4 w-1/2' />
            <Skeleton className='h-4 w-1/3' />
          </div>
        </div>

        {/* Divider */}
        <Skeleton className='h-px w-full' />

        {/* Detail sections */}
        <div className='space-y-4'>
          {/* Section 1 */}
          <div className='space-y-2'>
            <Skeleton className='h-5 w-32' />
            <div className='grid grid-cols-2 gap-3'>
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-3/4' />
              <Skeleton className='h-4 w-2/3' />
            </div>
          </div>

          {/* Section 2 - tracks for album, additional info for artist */}
          {variant === 'album' && (
            <div className='space-y-2'>
              <Skeleton className='h-5 w-24' />
              <div className='space-y-2'>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className='flex items-center gap-3'>
                    <Skeleton className='h-4 w-6' />
                    <Skeleton className='h-4 flex-1' />
                    <Skeleton className='h-4 w-12' />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3 - external IDs */}
          <div className='space-y-2'>
            <Skeleton className='h-5 w-28' />
            <div className='space-y-2'>
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-3/4' />
            </div>
          </div>
        </div>
      </div>

      {/* Footer skeleton */}
      <div className='flex justify-between items-center pt-4 border-t border-zinc-700 px-4'>
        <Skeleton className='h-9 w-24' />
        <Skeleton className='h-9 w-32' />
      </div>
    </div>
  );
}
