'use client';

import { Skeleton } from '@/components/ui/skeletons/Skeleton';

interface SkeletonTimelineProps {
  itemCount?: number;
}

export function SkeletonTimeline({ itemCount = 3 }: SkeletonTimelineProps) {
  return (
    <div
      className='space-y-4 py-4'
      role='status'
      aria-busy='true'
      aria-live='polite'
    >
      <span className='sr-only'>Loading timeline...</span>
      {Array.from({ length: itemCount }).map((_, i) => (
        <div key={i} className='flex gap-3'>
          <Skeleton className='h-8 w-8 rounded-full shrink-0' />
          <div className='flex-1 space-y-2'>
            <div className='flex items-center justify-between'>
              <Skeleton className='h-4 w-32' />
              <Skeleton className='h-3 w-16' />
            </div>
            <Skeleton className='h-3 w-48' />
          </div>
        </div>
      ))}
    </div>
  );
}
