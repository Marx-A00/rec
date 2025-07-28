export function AlbumDetailsSkeleton() {
  return (
    <div className='animate-pulse space-y-6 px-4 py-8'>
      {/* Back Button Skeleton */}
      <div className='h-6 bg-zinc-700 rounded w-20 mb-8'></div>

      {/* Album Header Skeleton */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8'>
        {/* Album Cover */}
        <div className='lg:col-span-1'>
          <div className='relative aspect-square w-full max-w-md mx-auto bg-zinc-800 rounded-lg shadow-2xl'></div>
        </div>

        {/* Album Info */}
        <div className='lg:col-span-2 space-y-6'>
          <div className='space-y-4'>
            <div className='h-10 bg-zinc-700 rounded w-3/4'></div>
            <div className='h-6 bg-zinc-700 rounded w-1/2'></div>
            <div className='h-12 bg-zinc-800 rounded w-48'></div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='h-5 bg-zinc-700 rounded w-full'></div>
            <div className='h-5 bg-zinc-700 rounded w-full'></div>
            <div className='h-5 bg-zinc-700 rounded w-full'></div>
            <div className='h-5 bg-zinc-700 rounded w-full'></div>
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className='w-full'>
        <div className='grid grid-cols-4 gap-0 bg-zinc-900 rounded-lg p-1 mb-6'>
          <div className='h-10 bg-zinc-700 rounded'></div>
          <div className='h-10 bg-zinc-700 rounded'></div>
          <div className='h-10 bg-zinc-700 rounded'></div>
          <div className='h-10 bg-zinc-700 rounded'></div>
        </div>

        {/* Tab Content Skeleton */}
        <div className='bg-zinc-900 rounded-lg p-6 space-y-4'>
          <div className='h-6 bg-zinc-700 rounded w-32'></div>
          <div className='space-y-2'>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className='flex items-center justify-between p-3 bg-zinc-800 rounded-lg'
              >
                <div className='flex items-center space-x-3'>
                  <div className='w-8 h-4 bg-zinc-700 rounded'></div>
                  <div className='h-4 bg-zinc-700 rounded w-48'></div>
                </div>
                <div className='h-4 bg-zinc-700 rounded w-12'></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className='animate-pulse'>
      <div className='bg-zinc-800 rounded-lg h-64 w-full'></div>
      <div className='mt-2 space-y-2'>
        <div className='h-4 bg-zinc-700 rounded w-3/4'></div>
        <div className='h-3 bg-zinc-700 rounded w-1/2'></div>
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className='space-y-4'>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className='animate-pulse flex gap-4 p-4'>
          <div className='w-12 h-12 bg-zinc-700 rounded'></div>
          <div className='flex-1 space-y-2'>
            <div className='h-4 bg-zinc-700 rounded w-3/4'></div>
            <div className='h-3 bg-zinc-700 rounded w-1/2'></div>
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
      <div className='flex gap-4 p-4 border-b border-zinc-700'>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className='h-4 bg-zinc-700 rounded flex-1'></div>
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className='flex gap-4 p-4 border-b border-zinc-800'>
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div
              key={colIndex}
              className='h-4 bg-zinc-700 rounded flex-1'
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

export function RecommendationCardSkeleton() {
  return (
    <div className='animate-pulse bg-black rounded-xl border border-zinc-600 p-3'>
      {/* Header with user info */}
      <div className='flex items-center justify-between mb-3'>
        <div className='flex items-center space-x-2'>
          <div className='w-6 h-6 bg-zinc-700 rounded-full'></div>
          <div className='h-3 bg-zinc-700 rounded w-20'></div>
        </div>
        <div className='w-7 h-7 bg-zinc-800 rounded-full'></div>
      </div>

      {/* Album layout */}
      <div className='relative'>
        <div className='grid grid-cols-2 gap-2'>
          {/* Source Album */}
          <div>
            <div className='mb-1.5 space-y-1'>
              <div className='h-3 bg-zinc-700 rounded w-3/4 mx-auto'></div>
              <div className='h-2.5 bg-zinc-700 rounded w-1/2 mx-auto'></div>
            </div>
            <div className='aspect-square bg-zinc-800 rounded-lg'></div>
          </div>

          {/* Recommended Album */}
          <div>
            <div className='mb-1.5 space-y-1'>
              <div className='h-3 bg-zinc-700 rounded w-3/4 mx-auto'></div>
              <div className='h-2.5 bg-zinc-700 rounded w-1/2 mx-auto'></div>
            </div>
            <div className='aspect-square bg-zinc-800 rounded-lg'></div>
          </div>
        </div>

        {/* Center rating skeleton */}
        <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20'>
          <div className='w-10 h-10 bg-zinc-800 rounded-full border-2 border-black'></div>
        </div>
      </div>
    </div>
  );
}

export function RecommendationsTabSkeleton() {
  return (
    <div className='bg-zinc-900 rounded-lg p-6'>
      {/* Header skeleton */}
      <div className='mb-6'>
        <div className='h-7 bg-zinc-700 rounded w-48 mb-4'></div>

        {/* Filter and Sort Controls skeleton */}
        <div className='flex flex-col sm:flex-row gap-4'>
          {/* Filter Toggle skeleton */}
          <div className='flex gap-2'>
            <div className='h-10 bg-zinc-800 rounded-lg w-32'></div>
            <div className='h-10 bg-zinc-800 rounded-lg w-32'></div>
            <div className='h-10 bg-zinc-800 rounded-lg w-40'></div>
          </div>

          {/* Sort Dropdown skeleton */}
          <div className='ml-auto'>
            <div className='h-10 bg-zinc-800 rounded-lg w-40'></div>
          </div>
        </div>
      </div>

      {/* Recommendations Grid skeleton */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {Array.from({ length: 6 }).map((_, i) => (
          <RecommendationCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
