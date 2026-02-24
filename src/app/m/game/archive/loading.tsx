export default function MobileArchiveLoading() {
  return (
    <div className='px-4 py-6'>
      {/* Title skeleton */}
      <div className='h-7 w-40 bg-zinc-800 rounded animate-pulse mb-4' />

      {/* Calendar skeleton */}
      <div className='bg-zinc-900 rounded-lg border border-zinc-800 p-4'>
        {/* Month header */}
        <div className='flex items-center justify-between mb-4'>
          <div className='h-5 w-8 bg-zinc-800 rounded animate-pulse' />
          <div className='h-5 w-32 bg-zinc-800 rounded animate-pulse' />
          <div className='h-5 w-8 bg-zinc-800 rounded animate-pulse' />
        </div>

        {/* Day headers */}
        <div className='grid grid-cols-7 gap-1 mb-2'>
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className='h-4 bg-zinc-800 rounded animate-pulse mx-auto w-6'
            />
          ))}
        </div>

        {/* Calendar grid */}
        <div className='grid grid-cols-7 gap-1'>
          {[...Array(35)].map((_, i) => (
            <div
              key={i}
              className='aspect-square bg-zinc-800 rounded animate-pulse'
            />
          ))}
        </div>
      </div>
    </div>
  );
}
