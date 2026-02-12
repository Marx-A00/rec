'use client';

import { Skeleton } from '@/components/ui/skeletons/Skeleton';

interface SkeletonTimelineProps {
  itemCount?: number;
  /** Use compact size to match EnrichmentTimeline compact variant */
  compact?: boolean;
}

export function SkeletonTimeline({
  itemCount = 3,
  compact = true,
}: SkeletonTimelineProps) {
  // Match Timeline component: size="sm" uses gap-4, size="md" uses gap-6
  // TimelineIcon: size="sm" is h-6 w-6, size="md" is h-8 w-8
  const iconSize = compact ? 'h-6 w-6' : 'h-8 w-8';
  const gapSize = compact ? 'gap-4' : 'gap-6';

  return (
    <div
      className={`flex flex-col ${gapSize}`}
      role='status'
      aria-busy='true'
      aria-live='polite'
    >
      <span className='sr-only'>Loading timeline...</span>
      {Array.from({ length: itemCount }).map((_, i) => (
        <div key={i} className='relative flex gap-4 pb-2'>
          {/* Icon column - matches TimelineIcon */}
          <Skeleton className={`${iconSize} rounded-full shrink-0`} />

          {/* Content column - matches TimelineHeader structure */}
          <div className='flex-1 flex flex-col gap-1'>
            {/* Header row with title and time */}
            <div className='flex items-center gap-2'>
              {/* Title - text-sm font-semibold */}
              <Skeleton className={compact ? 'h-3 w-36' : 'h-4 w-40'} />
              {/* Triggered by badge */}
              <Skeleton className='h-3 w-12' />
              {/* Time - text-xs */}
              <Skeleton className='h-3 w-20 ml-auto' />
            </div>
            {/* Description - text-sm */}
            <Skeleton className={compact ? 'h-3 w-56' : 'h-4 w-64'} />
          </div>
        </div>
      ))}
    </div>
  );
}
