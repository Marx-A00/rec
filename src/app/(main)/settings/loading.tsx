export default function SettingsLoading() {
  return (
    <div className='max-w-4xl mx-auto space-y-6'>
      {/* Header Skeleton */}
      <div className='flex items-center gap-4'>
        <div className='w-8 h-8 bg-zinc-700 rounded animate-pulse' />
        <div>
          <div className='w-24 h-8 bg-zinc-700 rounded animate-pulse mb-2' />
          <div className='w-48 h-4 bg-zinc-700 rounded animate-pulse' />
        </div>
      </div>

      {/* Settings Content Skeleton */}
      <div className='bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden'>
        {/* Tabs Skeleton */}
        <div className='grid grid-cols-4 gap-1 bg-zinc-800 border-b border-zinc-700 p-1'>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className='h-10 bg-zinc-700 rounded animate-pulse' />
          ))}
        </div>

        {/* Content Skeleton */}
        <div className='p-6 space-y-6'>
          <div className='w-48 h-6 bg-zinc-700 rounded animate-pulse' />

          {/* Avatar section skeleton */}
          <div className='flex items-center gap-6'>
            <div className='w-20 h-20 bg-zinc-700 rounded-full animate-pulse' />
            <div className='space-y-2'>
              <div className='w-32 h-5 bg-zinc-700 rounded animate-pulse' />
              <div className='w-40 h-4 bg-zinc-700 rounded animate-pulse' />
              <div className='w-24 h-8 bg-zinc-700 rounded animate-pulse' />
            </div>
          </div>

          {/* Form fields skeleton */}
          <div className='space-y-4'>
            <div className='space-y-2'>
              <div className='w-24 h-4 bg-zinc-700 rounded animate-pulse' />
              <div className='w-full h-10 bg-zinc-700 rounded animate-pulse' />
            </div>
            <div className='space-y-2'>
              <div className='w-16 h-4 bg-zinc-700 rounded animate-pulse' />
              <div className='w-full h-24 bg-zinc-700 rounded animate-pulse' />
            </div>
            <div className='space-y-2'>
              <div className='w-20 h-4 bg-zinc-700 rounded animate-pulse' />
              <div className='w-48 h-4 bg-zinc-700 rounded animate-pulse' />
            </div>
          </div>

          {/* Button skeleton */}
          <div className='w-32 h-10 bg-zinc-700 rounded animate-pulse' />
        </div>
      </div>
    </div>
  );
}
