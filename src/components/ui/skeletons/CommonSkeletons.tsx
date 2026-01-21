export function CardSkeleton() {
  return (
    <div className='animate-pulse'>
      <div className='bg-zinc-800 rounded-lg h-64 w-full'></div>
      <div className='mt-2 space-y-2'>
        <div className='h-4 bg-zinc-700 rounded w-3/4'></div>
        <div className='h-3 bg-zinc-700 rounded w-1/2'></div>
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className='space-y-4'>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className='animate-pulse flex gap-4 p-4'>
          <div className='w-12 h-12 bg-zinc-700 rounded'></div>
          <div className='flex-1 space-y-2'>
            <div className='h-4 bg-zinc-700 rounded w-3/4'></div>
            <div className='h-3 bg-zinc-700 rounded w-1/2'></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className='animate-pulse'>
      {/* Header */}
      <div className='flex gap-4 p-4 border-b border-zinc-700'>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className='h-4 bg-zinc-700 rounded flex-1'></div>
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className='flex gap-4 p-4 border-b border-zinc-800'>
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div
              key={colIndex}
              className='h-4 bg-zinc-700 rounded flex-1'
            ></div>
          ))}
        </div>
      ))}
    </div>
  );
}
