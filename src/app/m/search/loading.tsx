import { Search } from 'lucide-react';

export default function MobileSearchLoading() {
  return (
    <div className='min-h-screen bg-black'>
      <div className='px-4 py-4'>
        {/* Search type indicator skeleton */}
        <div className='mb-4'>
          <div className='h-4 w-48 bg-zinc-800 rounded animate-pulse' />
        </div>

        {/* Results skeleton */}
        <div className='space-y-2'>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className='flex items-center gap-3 p-3 bg-zinc-900 rounded-lg border border-zinc-800 animate-pulse'
            >
              <div className='w-12 h-12 bg-zinc-800 rounded-md' />
              <div className='flex-1 min-w-0 space-y-1'>
                <div className='h-4 w-3/4 bg-zinc-800 rounded' />
                <div className='h-3 w-1/2 bg-zinc-800 rounded' />
              </div>
              <div className='h-6 w-14 bg-zinc-800 rounded' />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
