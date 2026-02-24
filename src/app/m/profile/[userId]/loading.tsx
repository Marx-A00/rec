import { ArrowLeft, Share2 } from 'lucide-react';

export default function MobileProfileLoading() {
  return (
    <div className='min-h-screen bg-black pb-4'>
      {/* Sticky Header */}
      <div className='sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-zinc-800 px-4 py-3'>
        <div className='flex items-center justify-between'>
          <div className='min-h-[44px] min-w-[44px] flex items-center'>
            <ArrowLeft className='h-5 w-5 text-zinc-600' />
          </div>
          <div className='h-5 w-24 bg-zinc-800 rounded animate-pulse' />
          <div className='min-h-[44px] min-w-[44px] flex items-center justify-center'>
            <Share2 className='h-5 w-5 text-zinc-800' />
          </div>
        </div>
      </div>

      {/* Profile Hero Skeleton */}
      <section className='px-4 py-6 flex flex-col items-center'>
        {/* Avatar */}
        <div className='w-20 h-20 rounded-full bg-zinc-800 animate-pulse mb-4 border-2 border-zinc-700' />

        {/* Username */}
        <div className='h-6 w-36 bg-zinc-800 rounded animate-pulse mb-1' />

        {/* Bio */}
        <div className='h-4 w-48 bg-zinc-800 rounded animate-pulse mt-2' />

        {/* Stats Row */}
        <div className='flex gap-8 mt-4 mb-4'>
          {[...Array(3)].map((_, i) => (
            <div key={i} className='flex flex-col items-center'>
              <div className='h-6 w-8 bg-zinc-800 rounded animate-pulse' />
              <div className='h-3 w-14 bg-zinc-800 rounded animate-pulse mt-1' />
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className='h-10 w-28 bg-zinc-800 rounded-lg animate-pulse' />
      </section>

      {/* Tab Navigation Skeleton */}
      <div className='px-4 mb-4'>
        <div className='flex bg-zinc-900 rounded-lg p-1'>
          <div className='flex-1 h-[44px] bg-zinc-800 rounded-md animate-pulse' />
          <div className='flex-1 h-[44px] bg-zinc-900 rounded-md' />
        </div>
      </div>

      {/* Content Grid Skeleton */}
      <div className='px-4'>
        <div className='grid grid-cols-2 gap-3'>
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className='bg-zinc-900 rounded-lg p-3 border border-zinc-800'
            >
              <div className='flex items-center justify-center gap-2 mb-2'>
                <div className='w-12 h-12 bg-zinc-800 rounded-md animate-pulse' />
                <div className='w-4 h-4 bg-zinc-800 rounded animate-pulse' />
                <div className='w-12 h-12 bg-zinc-800 rounded-md animate-pulse' />
              </div>
              <div className='flex justify-center mb-2'>
                <div className='h-5 w-16 bg-zinc-800 rounded-full animate-pulse' />
              </div>
              <div className='h-4 w-full bg-zinc-800 rounded animate-pulse mx-auto' />
              <div className='h-3 w-2/3 bg-zinc-800 rounded animate-pulse mx-auto mt-1' />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
