export default function MainLoading() {
  return (
    <div className='min-h-screen bg-black text-white'>
      <div className='container mx-auto px-4 py-8'>
        {/* Header skeleton */}
        <div className='mb-8'>
          <div className='h-4 w-20 bg-zinc-800 rounded animate-pulse mb-4'></div>
          <div className='h-8 w-64 bg-zinc-800 rounded animate-pulse mb-2'></div>
          <div className='h-4 w-96 bg-zinc-800 rounded animate-pulse'></div>
        </div>

        {/* Content skeleton */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          {/* Image skeleton */}
          <div className='lg:col-span-1'>
            <div className='aspect-square w-full max-w-md mx-auto bg-zinc-800 rounded-lg animate-pulse'></div>
          </div>

          {/* Info skeleton */}
          <div className='lg:col-span-2 space-y-6'>
            <div className='space-y-2'>
              <div className='h-10 w-3/4 bg-zinc-800 rounded animate-pulse'></div>
              <div className='h-6 w-1/2 bg-zinc-800 rounded animate-pulse'></div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className='h-6 bg-zinc-800 rounded animate-pulse'
                ></div>
              ))}
            </div>
          </div>
        </div>

        {/* Loading message */}
        <div className='flex items-center justify-center mt-12'>
          <div className='flex items-center space-x-3'>
            <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-red-500'></div>
            <span className='text-zinc-400'>Loading content...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
