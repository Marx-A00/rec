import { Skeleton } from '@/components/ui/skeletons';

/**
 * Loading skeleton for the search step.
 *
 * Renders:
 * - Input field skeletons (album title, artist name, search button)
 * - 5 result row skeletons (thumbnail + text lines)
 *
 * Used when search is in progress to provide visual feedback.
 */
export function SearchSkeleton() {
  return (
    <div className='space-y-4'>
      {/* Input skeletons */}
      <div className='space-y-3'>
        <Skeleton className='h-9 w-full' />
        <Skeleton className='h-9 w-full' />
        <Skeleton className='h-9 w-full' />
      </div>

      {/* Results skeletons */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className='flex gap-3 p-3'>
          <Skeleton className='h-12 w-12 rounded flex-shrink-0' />
          <div className='flex-1 space-y-2'>
            <Skeleton className='h-4 w-2/3' />
            <Skeleton className='h-3 w-1/3' />
          </div>
        </div>
      ))}
    </div>
  );
}
