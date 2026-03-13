export default function MobileGameLoading() {
  return (
    <div className='flex h-full flex-col gap-6 px-4 py-8'>
      {/* Header */}
      <div className='text-center'>
        <div className='mx-auto mb-2 h-7 w-40 animate-pulse rounded bg-zinc-800' />
        <div className='mx-auto h-4 w-56 animate-pulse rounded bg-zinc-800' />
      </div>

      {/* Image placeholder */}
      <div className='mx-auto aspect-square w-full max-w-[280px] animate-pulse rounded-lg bg-zinc-900' />

      {/* Attempt dots */}
      <div className='flex justify-center gap-2'>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className='h-3 w-3 animate-pulse rounded-full bg-zinc-800'
          />
        ))}
      </div>

      {/* Search input skeleton */}
      <div className='h-12 w-full animate-pulse rounded-lg border border-zinc-800 bg-zinc-900' />
    </div>
  );
}
