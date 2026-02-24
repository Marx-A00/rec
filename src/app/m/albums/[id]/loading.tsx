import { ArrowLeft, Share2 } from 'lucide-react';

export default function MobileAlbumLoading() {
  return (
    <div className='min-h-screen bg-black pb-4'>
      {/* Sticky Header */}
      <div className='sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-zinc-800 px-4 py-3'>
        <div className='flex items-center justify-between'>
          <div className='min-h-[44px] min-w-[44px] flex items-center'>
            <ArrowLeft className='h-5 w-5 text-zinc-600' />
          </div>
          <div className='h-5 w-32 bg-zinc-800 rounded animate-pulse' />
          <div className='min-h-[44px] min-w-[44px] flex items-center justify-center'>
            <Share2 className='h-5 w-5 text-zinc-800' />
          </div>
        </div>
      </div>

      {/* Album Hero Skeleton */}
      <section className='px-4 py-6'>
        <div className='flex gap-4'>
          {/* Album Cover */}
          <div className='w-32 h-32 flex-shrink-0 bg-zinc-800 rounded-lg animate-pulse' />

          {/* Album Info */}
          <div className='flex-1 py-1 space-y-2'>
            <div className='h-6 w-3/4 bg-zinc-800 rounded animate-pulse' />
            <div className='h-4 w-1/2 bg-zinc-800 rounded animate-pulse' />
            <div className='h-4 w-1/3 bg-zinc-800 rounded animate-pulse mt-3' />
            <div className='flex gap-1 mt-2'>
              <div className='h-5 w-14 bg-zinc-800 rounded-full animate-pulse' />
              <div className='h-5 w-16 bg-zinc-800 rounded-full animate-pulse' />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className='flex gap-3 mt-6'>
          <div className='flex-1 h-11 bg-zinc-800 rounded-lg animate-pulse' />
          <div className='w-11 h-11 bg-zinc-800 rounded-lg animate-pulse' />
          <div className='w-11 h-11 bg-zinc-800 rounded-lg animate-pulse' />
        </div>
      </section>

      {/* Tracklist Skeleton */}
      <section className='px-4 mb-6'>
        <div className='h-6 w-24 bg-zinc-800 rounded animate-pulse mb-3' />
        <div className='bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800'>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className='flex items-center py-3 px-4 border-b border-zinc-800/50 last:border-0'
            >
              <div className='w-7 h-4 bg-zinc-800 rounded animate-pulse' />
              <div className='flex-1 h-4 bg-zinc-800 rounded animate-pulse mx-3' />
              <div className='w-10 h-4 bg-zinc-800 rounded animate-pulse' />
            </div>
          ))}
        </div>
      </section>

      {/* Recommendations Skeleton */}
      <section className='px-4 mb-6'>
        <div className='h-6 w-40 bg-zinc-800 rounded animate-pulse mb-3' />
        <div className='flex gap-3 overflow-hidden'>
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className='w-32 flex-shrink-0 bg-zinc-900 rounded-lg p-3 border border-zinc-800'
            >
              <div className='w-full aspect-square bg-zinc-800 rounded-md animate-pulse mb-2' />
              <div className='h-4 w-full bg-zinc-800 rounded animate-pulse' />
              <div className='h-3 w-2/3 bg-zinc-800 rounded animate-pulse mt-1' />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
