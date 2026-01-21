import { Skeleton } from '@/components/ui/skeletons';

export function AlbumCardSkeleton() {
  return (
    <div className='space-y-3'>
      <Skeleton className='aspect-square w-full rounded-md' />
      <div className='space-y-2'>
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-3 w-3/4' />
      </div>
    </div>
  );
}

export function RecommendationCardSkeleton() {
  return (
    <div className='flex gap-4 p-4'>
      <Skeleton className='h-20 w-20 rounded-md' />
      <div className='flex-1 space-y-2'>
        <Skeleton className='h-4 w-3/4' />
        <Skeleton className='h-3 w-1/2' />
        <div className='flex gap-2'>
          <Skeleton className='h-8 w-20' />
          <Skeleton className='h-8 w-20' />
        </div>
      </div>
    </div>
  );
}

export function UserCardSkeleton() {
  return (
    <div className='flex items-center gap-3 p-4'>
      <Skeleton className='h-10 w-10 rounded-full' />
      <div className='flex-1 space-y-2'>
        <Skeleton className='h-4 w-1/3' />
        <Skeleton className='h-3 w-1/2' />
      </div>
      <Skeleton className='h-8 w-20' />
    </div>
  );
}

export function SearchResultsSkeleton() {
  return (
    <div className='space-y-4'>
      {[...Array(5)].map((_, i) => (
        <div key={i} className='flex gap-3'>
          <Skeleton className='h-12 w-12 rounded-md' />
          <div className='flex-1 space-y-2'>
            <Skeleton className='h-4 w-2/3' />
            <Skeleton className='h-3 w-1/3' />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CollectionGridSkeleton() {
  return (
    <div className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4'>
      {[...Array(8)].map((_, i) => (
        <AlbumCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className='space-y-6'>
      {[...Array(3)].map((_, i) => (
        <div key={i} className='space-y-3 border-b pb-6'>
          <div className='flex items-center gap-2'>
            <Skeleton className='h-8 w-8 rounded-full' />
            <Skeleton className='h-4 w-32' />
          </div>
          <RecommendationCardSkeleton />
        </div>
      ))}
    </div>
  );
}

export function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className='h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary' />
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className='flex min-h-screen items-center justify-center'>
      <LoadingSpinner />
    </div>
  );
}

export function InlineLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className='flex items-center gap-2 text-sm text-muted-foreground'>
      <div className='h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary' />
      <span>{text}</span>
    </div>
  );
}
