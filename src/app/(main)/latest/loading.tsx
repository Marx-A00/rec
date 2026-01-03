import { Music } from 'lucide-react';

export default function ReleasesLoading() {
  return (
    <div className='container mx-auto px-4 py-8 max-w-7xl'>
      {/* Page Header Skeleton */}
      <div className='mb-8'>
        <div className='flex items-center gap-3 mb-4'>
          <div className='text-green-500 p-3 bg-green-500/10 rounded-xl border border-green-500/20'>
            <Music className='w-6 h-6' />
          </div>
          <div>
            <h1 className='text-4xl font-bold text-white'>New Releases</h1>
            <p className='text-zinc-400 text-lg mt-1'>
              Latest albums synced from Spotify
            </p>
          </div>
        </div>

        {/* Stats bar skeleton */}
        <div className='flex items-center justify-between py-4 border-b border-zinc-800'>
          <div className='flex items-center gap-6'>
            <div className='h-5 w-24 bg-zinc-800 rounded animate-pulse' />
            <div className='h-5 w-32 bg-zinc-800 rounded animate-pulse' />
          </div>
          <div className='h-8 w-40 bg-zinc-800 rounded animate-pulse' />
        </div>
      </div>

      {/* Albums Grid Skeleton */}
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-6'>
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className='bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4'
          >
            <div className='animate-pulse'>
              <div className='aspect-square bg-zinc-700/60 rounded-lg mb-3' />
              <div className='space-y-2'>
                <div className='h-4 bg-zinc-700/60 rounded w-3/4' />
                <div className='h-3 bg-zinc-800/60 rounded w-1/2' />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
