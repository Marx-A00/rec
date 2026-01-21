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

export function RecommendationsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
      {Array.from({ length: count }).map((_, i) => (
        <RecommendationCardSkeleton key={i} />
      ))}
    </div>
  );
}
