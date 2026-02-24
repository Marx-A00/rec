export default function MobileHomeLoading() {
  return (
    <div className='px-4 pt-4'>
      {/* Header */}
      <header className='mb-6'>
        <div className='h-7 w-40 bg-zinc-800 rounded animate-pulse' />
        <div className='h-4 w-56 bg-zinc-800 rounded animate-pulse mt-2' />
      </header>

      {/* Feed Skeleton */}
      <div className='space-y-4'>
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className='bg-zinc-900 rounded-lg p-4 border border-zinc-800 animate-pulse'
          >
            <div className='flex items-center gap-2 mb-3'>
              <div className='h-8 w-8 bg-zinc-800 rounded-full' />
              <div className='flex-1'>
                <div className='h-4 w-24 bg-zinc-800 rounded' />
                <div className='h-3 w-16 bg-zinc-800 rounded mt-1' />
              </div>
            </div>
            <div className='flex items-center justify-center gap-2'>
              <div className='h-[120px] w-[120px] bg-zinc-800 rounded-lg' />
              <div className='flex flex-col items-center gap-1 px-1'>
                <div className='h-4 w-4 bg-zinc-800 rounded' />
                <div className='h-6 w-12 bg-zinc-800 rounded-full' />
              </div>
              <div className='h-[120px] w-[120px] bg-zinc-800 rounded-lg' />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
