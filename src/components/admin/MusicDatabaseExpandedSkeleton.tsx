import { Skeleton } from '@/components/ui/skeletons/Skeleton';

/**
 * Skeleton for the expanded album row content.
 * Matches the layout of AlbumExpandedContent in music-database/page.tsx
 */
export function AlbumExpandedSkeleton() {
  return (
    <div className='p-4 bg-zinc-800/50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200'>
      {/* Metadata Grid */}
      <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
        {/* Database ID */}
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>
            Database ID
          </div>
          <Skeleton className='h-4 w-48' />
        </div>
        {/* MusicBrainz ID */}
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>
            MusicBrainz ID
          </div>
          <Skeleton className='h-4 w-48' />
        </div>
        {/* Release Date */}
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>
            Release Date
          </div>
          <Skeleton className='h-4 w-24' />
        </div>
        {/* Label */}
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>Label</div>
          <Skeleton className='h-4 w-32' />
        </div>
        {/* Barcode */}
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>Barcode</div>
          <Skeleton className='h-4 w-28' />
        </div>
        {/* Last Enriched */}
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>
            Last Enriched
          </div>
          <Skeleton className='h-4 w-24' />
        </div>
        {/* Track Count */}
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>
            Track Count
          </div>
          <Skeleton className='h-4 w-16' />
        </div>
        {/* Image Status */}
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>
            Image Status
          </div>
          <Skeleton className='h-4 w-24' />
        </div>
      </div>

      {/* Delete Button Placeholder */}
      <div className='flex justify-end pt-4 border-t border-zinc-700'>
        <Skeleton className='h-8 w-28' />
      </div>

      {/* Tracks Section Header */}
      <div>
        <div className='flex items-center gap-2 mb-2'>
          <Skeleton className='h-4 w-4' />
          <Skeleton className='h-4 w-4' />
          <Skeleton className='h-4 w-24' />
        </div>
        {/* Track rows skeleton */}
        <div className='space-y-1'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className='flex items-center justify-between p-2 bg-zinc-900/50 rounded'
            >
              <div className='flex items-center gap-3 flex-1'>
                <Skeleton className='h-3 w-8' />
                <Skeleton className='h-3 w-40' />
              </div>
              <div className='flex items-center gap-4'>
                <Skeleton className='h-3 w-20' />
                <Skeleton className='h-3 w-12' />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enrichment Logs Section */}
      <div className='border-t border-zinc-700 pt-4'>
        <div className='flex items-center justify-between mb-3'>
          <Skeleton className='h-5 w-32' />
          <Skeleton className='h-8 w-20' />
        </div>
        {/* Log entries skeleton */}
        <div className='space-y-2'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className='flex items-center gap-4 p-3 bg-zinc-900/30 rounded'
            >
              <Skeleton className='h-4 w-4 rounded-full' />
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-4 w-32' />
              <Skeleton className='h-4 w-20' />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for the expanded artist row content.
 * Matches the layout of ArtistExpandedContent in music-database/page.tsx
 */
export function ArtistExpandedSkeleton() {
  return (
    <div className='p-4 bg-zinc-800/50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200'>
      {/* Metadata Grid */}
      <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
        {/* Database ID */}
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>
            Database ID
          </div>
          <Skeleton className='h-4 w-48' />
        </div>
        {/* MusicBrainz ID */}
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>
            MusicBrainz ID
          </div>
          <Skeleton className='h-4 w-48' />
        </div>
        {/* Country */}
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>Country</div>
          <Skeleton className='h-4 w-12' />
        </div>
        {/* Formed Year */}
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>
            Formed Year
          </div>
          <Skeleton className='h-4 w-16' />
        </div>
        {/* Listeners */}
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>
            Listeners (Last.fm)
          </div>
          <Skeleton className='h-4 w-24' />
        </div>
        {/* Last Enriched */}
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>
            Last Enriched
          </div>
          <Skeleton className='h-4 w-24' />
        </div>
        {/* Image Status */}
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>
            Image Status
          </div>
          <Skeleton className='h-4 w-24' />
        </div>
      </div>

      {/* Delete Button Placeholder */}
      <div className='flex justify-end pt-2 border-t border-zinc-700'>
        <Skeleton className='h-8 w-28' />
      </div>

      {/* Albums Section */}
      <div>
        <div className='flex items-center gap-2 mb-2'>
          <Skeleton className='h-4 w-4' />
          <Skeleton className='h-4 w-24' />
        </div>
        {/* Albums grid skeleton */}
        <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className='flex items-center gap-2 p-2 bg-zinc-900/50 rounded'
            >
              <Skeleton className='h-10 w-10 rounded' />
              <div className='flex-1 min-w-0 space-y-1'>
                <Skeleton className='h-3 w-24' />
                <Skeleton className='h-3 w-12' />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enrichment Logs Section */}
      <div className='border-t border-zinc-700 pt-4'>
        <div className='flex items-center justify-between mb-3'>
          <Skeleton className='h-5 w-32' />
          <Skeleton className='h-8 w-20' />
        </div>
        {/* Log entries skeleton */}
        <div className='space-y-2'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className='flex items-center gap-4 p-3 bg-zinc-900/30 rounded'
            >
              <Skeleton className='h-4 w-4 rounded-full' />
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-4 w-32' />
              <Skeleton className='h-4 w-20' />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
