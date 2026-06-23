import { VinylPlaceholder } from '@/components/ui/VinylPlaceholder';

interface LoadingCardsProps {
  count: number;
}

export function LoadingCards({ count }: LoadingCardsProps) {
  return (
    <div className='flex gap-6 overflow-hidden'>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className='shrink-0 w-[240px] bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5'
        >
          <div className='relative aspect-square rounded-lg overflow-hidden mb-5'>
            <VinylPlaceholder animated />
          </div>
          <div className='animate-pulse space-y-2'>
            <div className='h-4 bg-zinc-700/60 rounded w-3/4' />
            <div className='h-3 bg-zinc-800/60 rounded w-1/2' />
          </div>
        </div>
      ))}
    </div>
  );
}
