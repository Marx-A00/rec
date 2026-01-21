// Single album activity (collection_add style)
export function CollectionActivitySkeleton() {
  return (
    <div className='bg-zinc-900 rounded-lg p-3 pb-4 border border-zinc-800 animate-pulse'>
      <div className='flex justify-center items-center gap-2 mb-3'>
        <div className='w-6 h-6 bg-zinc-700 rounded-full flex-shrink-0' />
        <div className='h-4 bg-zinc-700 rounded w-52' />
      </div>
      <div className='flex justify-center'>
        <div className='w-[150px] h-[150px] bg-zinc-800 rounded-lg' />
      </div>
    </div>
  );
}

// Stacked albums activity (recommendation style)
export function RecommendationActivitySkeleton() {
  return (
    <div className='bg-zinc-900 rounded-lg p-3 pb-4 border border-zinc-800 animate-pulse'>
      <div className='flex justify-center items-center gap-2 mb-3'>
        <div className='w-6 h-6 bg-zinc-700 rounded-full flex-shrink-0' />
        <div className='h-4 bg-zinc-700 rounded w-64' />
      </div>
      <div className='flex justify-center'>
        <div className='relative w-[220px] h-[220px]'>
          <div className='absolute left-0 top-0 w-[180px] h-[180px] bg-zinc-800 rounded-lg' />
          <div className='absolute left-14 top-0 w-[160px] h-[160px] bg-zinc-700 rounded-lg border-2 border-zinc-600' />
        </div>
      </div>
    </div>
  );
}

// Grouped albums activity (multiple collection_add style)
export function GroupedActivitySkeleton() {
  return (
    <div className='bg-zinc-900 rounded-lg p-3 pb-4 border border-zinc-800 animate-pulse'>
      <div className='flex justify-center items-center gap-2 mb-3'>
        <div className='w-6 h-6 bg-zinc-700 rounded-full flex-shrink-0' />
        <div className='h-4 bg-zinc-700 rounded w-44' />
      </div>
      <div className='flex justify-center'>
        <div className='flex -space-x-6'>
          {[...Array(4)].map((_, j) => (
            <div
              key={j}
              className='w-24 h-24 bg-zinc-800 rounded-lg ring-2 ring-zinc-900'
              style={{ zIndex: 4 - j }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Follow activity (avatar style)
export function FollowActivitySkeleton() {
  return (
    <div className='bg-zinc-900 rounded-lg p-3 pb-4 border border-zinc-800 animate-pulse'>
      <div className='flex justify-center items-center gap-2 mb-3'>
        <div className='w-6 h-6 bg-zinc-700 rounded-full flex-shrink-0' />
        <div className='h-4 bg-zinc-700 rounded w-36' />
      </div>
      <div className='flex justify-center'>
        <div className='w-[120px] h-[120px] bg-zinc-800 rounded-full' />
      </div>
    </div>
  );
}

// Combined feed skeleton with variety
export function ActivityFeedSkeleton({ count = 4 }: { count?: number }) {
  const skeletonTypes = [
    CollectionActivitySkeleton,
    RecommendationActivitySkeleton,
    GroupedActivitySkeleton,
    FollowActivitySkeleton,
  ];

  return (
    <div className='space-y-4'>
      {Array.from({ length: count }).map((_, i) => {
        const SkeletonComponent = skeletonTypes[i % skeletonTypes.length];
        return <SkeletonComponent key={i} />;
      })}
    </div>
  );
}
