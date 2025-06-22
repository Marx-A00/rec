export function AlbumDetailsSkeleton() {
  return (
    <div className='animate-pulse space-y-6'>
      {/* Album Header Skeleton */}
      <div className='flex gap-6'>
        <div className='w-48 h-48 bg-gray-200 rounded-lg'></div>
        <div className='flex-1 space-y-4'>
          <div className='h-8 bg-gray-200 rounded w-3/4'></div>
          <div className='h-6 bg-gray-200 rounded w-1/2'></div>
          <div className='h-4 bg-gray-200 rounded w-1/4'></div>
          <div className='space-y-2'>
            <div className='h-4 bg-gray-200 rounded w-full'></div>
            <div className='h-4 bg-gray-200 rounded w-5/6'></div>
            <div className='h-4 bg-gray-200 rounded w-4/6'></div>
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className='border-b border-gray-200'>
        <div className='flex space-x-8'>
          <div className='h-10 bg-gray-200 rounded w-20'></div>
          <div className='h-10 bg-gray-200 rounded w-24'></div>
          <div className='h-10 bg-gray-200 rounded w-28'></div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className='space-y-4'>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className='flex gap-4 p-4 border border-gray-200 rounded'
          >
            <div className='w-16 h-16 bg-gray-200 rounded'></div>
            <div className='flex-1 space-y-2'>
              <div className='h-4 bg-gray-200 rounded w-3/4'></div>
              <div className='h-3 bg-gray-200 rounded w-1/2'></div>
              <div className='h-3 bg-gray-200 rounded w-1/4'></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className='animate-pulse'>
      <div className='bg-gray-200 rounded-lg h-64 w-full'></div>
      <div className='mt-2 space-y-2'>
        <div className='h-4 bg-gray-200 rounded w-3/4'></div>
        <div className='h-3 bg-gray-200 rounded w-1/2'></div>
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className='space-y-4'>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className='animate-pulse flex gap-4 p-4'>
          <div className='w-12 h-12 bg-gray-200 rounded'></div>
          <div className='flex-1 space-y-2'>
            <div className='h-4 bg-gray-200 rounded w-3/4'></div>
            <div className='h-3 bg-gray-200 rounded w-1/2'></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className='animate-pulse'>
      {/* Header */}
      <div className='flex gap-4 p-4 border-b border-gray-200'>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className='h-4 bg-gray-200 rounded flex-1'></div>
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className='flex gap-4 p-4 border-b border-gray-100'>
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div
              key={colIndex}
              className='h-4 bg-gray-200 rounded flex-1'
            ></div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function CollectionsSkeleton() {
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className='animate-pulse bg-zinc-800 rounded-lg p-6 space-y-4'
        >
          {/* Header */}
          <div className='space-y-2'>
            <div className='h-5 bg-zinc-700 rounded w-3/4'></div>
            <div className='h-4 bg-zinc-700 rounded w-1/2'></div>
          </div>

          {/* Cover Image */}
          <div className='aspect-square bg-zinc-700 rounded-lg'></div>

          {/* Footer */}
          <div className='flex justify-between'>
            <div className='h-4 bg-zinc-700 rounded w-16'></div>
            <div className='h-4 bg-zinc-700 rounded w-20'></div>
          </div>
        </div>
      ))}
    </div>
  );
}
