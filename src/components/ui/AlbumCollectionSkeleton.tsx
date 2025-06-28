import React from 'react';

interface AlbumCollectionSkeletonProps {
  /**
   * Number of skeleton items to render
   * @default 10
   */
  count?: number;

  /**
   * Additional CSS classes for the container
   */
  className?: string;

  /**
   * Show hover effects on skeleton items
   * @default true
   */
  showHoverEffects?: boolean;

  /**
   * Layout style for the skeleton grid
   * @default 'grid' - Full responsive grid
   * @option 'row' - Single horizontal row
   */
  layout?: 'grid' | 'row';
}

interface AlbumSkeletonItemProps {
  showHoverEffects: boolean;
  delay?: number;
  layout?: 'grid' | 'row';
}

function AlbumSkeletonItem({
  showHoverEffects,
  delay = 0,
  layout = 'grid',
}: AlbumSkeletonItemProps) {
  const itemClasses =
    layout === 'row'
      ? `relative group cursor-pointer transition-all duration-200 flex-shrink-0 w-32 ${showHoverEffects ? 'hover:scale-105 hover:z-10' : ''}`
      : `relative group cursor-pointer transition-all duration-200 ${showHoverEffects ? 'hover:scale-105 hover:z-10' : ''}`;

  return (
    <div className={itemClasses} style={{ animationDelay: `${delay}ms` }}>
      {/* Main album cover skeleton */}
      <div className='relative w-full aspect-square rounded border border-zinc-800 group-hover:border-zinc-600 transition-colors overflow-hidden bg-zinc-800'>
        {/* Animated shimmer effect */}
        <div className='absolute inset-0 bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent -translate-x-full animate-pulse transition-transform duration-1000'></div>

        {/* Music note placeholder in center */}
        <div className='absolute inset-0 flex items-center justify-center'>
          <div className='w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center animate-pulse'>
            <svg
              className='w-4 h-4 text-zinc-600'
              fill='currentColor'
              viewBox='0 0 20 20'
            >
              <path d='M18 3a1 1 0 0 0-1.196-.98l-10 2A1 1 0 0 0 6 5v6.114A4.369 4.369 0 0 0 5 11a4 4 0 1 0 4 4V5.114l8-1.6V9.114A4.369 4.369 0 0 0 16 9a4 4 0 1 0 4 4V3zM5 17a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm11 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4z' />
            </svg>
          </div>
        </div>
      </div>

      {/* Hover overlay skeleton */}
      {showHoverEffects && (
        <div className='absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-70 transition-all duration-200 rounded flex items-center justify-center'>
          <div className='opacity-0 group-hover:opacity-100 text-center p-2 transform translate-y-2 group-hover:translate-y-0 transition-all duration-200'>
            {/* Title skeleton */}
            <div className='h-3 bg-zinc-300 rounded mb-2 animate-pulse'></div>
            {/* Artist skeleton */}
            <div className='h-2 bg-zinc-400 rounded mb-2 w-3/4 mx-auto animate-pulse'></div>
            {/* Rating skeleton */}
            <div className='h-2 bg-emeraled-green/50 rounded w-1/2 mx-auto animate-pulse'></div>
          </div>
        </div>
      )}

      {/* Year badge skeleton */}
      <div className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity'>
        <div className='h-4 w-8 bg-black/75 rounded animate-pulse'></div>
      </div>
    </div>
  );
}

export default function AlbumCollectionSkeleton({
  count = 10,
  className = '',
  showHoverEffects = true,
  layout = 'grid',
}: AlbumCollectionSkeletonProps) {
  const containerClasses =
    layout === 'row'
      ? `flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${className}`
      : `grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 ${className}`;

  return (
    <div className={containerClasses}>
      {Array.from({ length: count }).map((_, i) => (
        <AlbumSkeletonItem
          key={i}
          showHoverEffects={showHoverEffects}
          delay={i * 50} // Staggered animation delay
          layout={layout}
        />
      ))}
    </div>
  );
}
