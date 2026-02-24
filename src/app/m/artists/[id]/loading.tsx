import { ArrowLeft, Share2 } from 'lucide-react';

export default function MobileArtistLoading() {
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

      {/* Artist Hero Skeleton */}
      <section className='px-4 py-6 flex flex-col items-center'>
        {/* Circular Photo */}
        <div className='w-[120px] h-[120px] rounded-full bg-zinc-800 animate-pulse mb-4 border-2 border-zinc-800' />

        {/* Name */}
        <div className='h-7 w-48 bg-zinc-800 rounded animate-pulse' />

        {/* Disambiguation */}
        <div className='h-4 w-32 bg-zinc-800 rounded animate-pulse mt-2' />

        {/* Meta info */}
        <div className='flex items-center gap-4 mt-3'>
          <div className='h-4 w-16 bg-zinc-800 rounded animate-pulse' />
          <div className='h-4 w-28 bg-zinc-800 rounded animate-pulse' />
        </div>
      </section>

      {/* Bio Skeleton */}
      <section className='px-4 mb-6'>
        <div className='h-6 w-24 bg-zinc-800 rounded animate-pulse mb-2' />
        <div className='bg-zinc-900 rounded-lg p-4 border border-zinc-800 space-y-2'>
          <div className='h-4 w-full bg-zinc-800 rounded animate-pulse' />
          <div className='h-4 w-full bg-zinc-800 rounded animate-pulse' />
          <div className='h-4 w-3/4 bg-zinc-800 rounded animate-pulse' />
        </div>
      </section>

      {/* Discography Skeleton */}
      <section className='px-4 mb-6'>
        <div className='h-6 w-32 bg-zinc-800 rounded animate-pulse mb-3' />
        <div className='grid grid-cols-2 gap-3'>
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className='bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden'
            >
              <div className='aspect-square bg-zinc-800 animate-pulse' />
              <div className='p-3 space-y-1'>
                <div className='h-4 w-3/4 bg-zinc-800 rounded animate-pulse' />
                <div className='h-3 w-1/2 bg-zinc-800 rounded animate-pulse' />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
