import { ArrowLeft } from 'lucide-react';

export default function MobileFollowingLoading() {
  return (
    <div className='min-h-screen bg-black'>
      {/* Header skeleton */}
      <div className='sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-zinc-800 px-4 py-3'>
        <div className='flex items-center gap-3'>
          <div className='min-h-[44px] min-w-[44px] flex items-center'>
            <ArrowLeft className='h-5 w-5 text-zinc-600' />
          </div>
          <div className='flex-1'>
            <div className='h-5 w-24 bg-zinc-800 rounded animate-pulse' />
            <div className='h-4 w-20 bg-zinc-800 rounded animate-pulse mt-1' />
          </div>
        </div>
      </div>

      {/* Tab skeleton */}
      <div className='px-4 py-3 border-b border-zinc-800'>
        <div className='flex'>
          <div className='flex-1 py-2 flex justify-center'>
            <div className='h-4 w-20 bg-zinc-800 rounded animate-pulse' />
          </div>
          <div className='flex-1 py-2 flex justify-center'>
            <div className='h-4 w-20 bg-zinc-800 rounded animate-pulse' />
          </div>
        </div>
      </div>

      {/* List skeleton */}
      <div className='px-4 py-4 space-y-3'>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className='bg-zinc-900 rounded-lg p-4 border border-zinc-800 animate-pulse'
          >
            <div className='flex items-center gap-3'>
              <div className='h-12 w-12 bg-zinc-800 rounded-full' />
              <div className='flex-1'>
                <div className='h-4 w-24 bg-zinc-800 rounded mb-2' />
                <div className='h-3 w-32 bg-zinc-800 rounded' />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
