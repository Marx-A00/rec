import { ArrowLeft } from 'lucide-react';

export default function MobileGameLoading() {
  return (
    <div className='min-h-screen bg-black pb-8'>
      {/* Sticky Header */}
      <div className='sticky top-0 z-10 border-b border-zinc-800 bg-black/90 px-4 py-3 backdrop-blur-sm'>
        <div className='flex min-h-[44px] min-w-[44px] items-center gap-2'>
          <ArrowLeft className='h-5 w-5 text-zinc-600' />
          <span className='text-zinc-600'>Back</span>
        </div>
      </div>

      <div className='flex flex-col gap-6 px-4 py-8'>
        {/* Header */}
        <div className='text-center'>
          <div className='h-7 w-40 bg-zinc-800 rounded animate-pulse mx-auto mb-2' />
          <div className='h-4 w-56 bg-zinc-800 rounded animate-pulse mx-auto' />
        </div>

        {/* Image placeholder */}
        <div className='aspect-square w-full bg-zinc-900 rounded-lg animate-pulse' />

        {/* Attempt dots */}
        <div className='flex justify-center gap-2'>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className='w-3 h-3 rounded-full bg-zinc-800 animate-pulse'
            />
          ))}
        </div>

        {/* Search input skeleton */}
        <div className='h-12 w-full bg-zinc-900 rounded-lg border border-zinc-800 animate-pulse' />
      </div>
    </div>
  );
}
