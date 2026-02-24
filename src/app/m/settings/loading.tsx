import { ArrowLeft } from 'lucide-react';

export default function MobileSettingsLoading() {
  return (
    <div className='min-h-screen bg-black'>
      {/* Header */}
      <div className='sticky top-0 z-10 bg-black/95 backdrop-blur-lg border-b border-zinc-800'>
        <div className='flex items-center gap-3 px-4 py-3'>
          <div className='min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2'>
            <ArrowLeft className='h-5 w-5 text-zinc-600' />
          </div>
          <h1 className='text-lg font-semibold text-white'>Settings</h1>
        </div>
      </div>

      {/* Loading skeleton */}
      <div className='p-4 space-y-6'>
        <div className='flex items-center gap-4'>
          <div className='w-16 h-16 rounded-full bg-zinc-800 animate-pulse' />
          <div className='space-y-2'>
            <div className='h-5 w-32 bg-zinc-800 rounded animate-pulse' />
            <div className='h-4 w-48 bg-zinc-800 rounded animate-pulse' />
          </div>
        </div>
        <div className='space-y-3'>
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className='h-16 bg-zinc-800 rounded-lg animate-pulse'
            />
          ))}
        </div>
      </div>
    </div>
  );
}
