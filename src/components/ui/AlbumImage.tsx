'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Music } from 'lucide-react';
import { getImageUrl } from '@/lib/cloudflare-images';
// TODO: Consolidate image handling
interface AlbumImageProps {
  src: string | null | undefined;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  fill?: boolean;
  showSkeleton?: boolean;
  fallbackIcon?: React.ReactNode;
  style?: React.CSSProperties;
}

export default function AlbumImage({
  src,
  alt,
  width = 400,
  height = 400,
  className = '',
  priority = false,
  sizes = '(max-width: 768px) 100vw, 400px',
  fill = false,
  showSkeleton = true,
  fallbackIcon,
  style,
}: AlbumImageProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const FALLBACK_IMAGE = '/default-album.svg';
  const MAX_RETRIES = 2;

  // Update imgSrc when src prop changes
  useEffect(() => {
    if (
      src &&
      src !== 'https://via.placeholder.com/400x400?text=No+Image' &&
      src !== FALLBACK_IMAGE
    ) {
      // Check if it's a Cloudflare Images URL and optimize it
      if (src.includes('imagedelivery.net') && src.includes('/public')) {
        // Extract the image ID and rebuild with optimal size
        const matches = src.match(/imagedelivery\.net\/[^\/]+\/([^\/]+)/);
        if (matches && matches[1]) {
          const optimizedUrl = getImageUrl(matches[1], { width, height });
          setImgSrc(optimizedUrl);
        } else {
          setImgSrc(src);
        }
      } else {
        setImgSrc(src);
      }
      setIsLoading(true);
      setHasError(false);
      setRetryCount(0);
    } else if (src === null || src === undefined) {
      // Show loading state when src is null (waiting for URL)
      setImgSrc(null);
      setIsLoading(true);
      setHasError(false);
    } else {
      // Show fallback for invalid URLs
      setImgSrc(FALLBACK_IMAGE);
      setIsLoading(false);
      setHasError(false);
    }
  }, [src]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);

    if (retryCount < MAX_RETRIES && imgSrc !== FALLBACK_IMAGE) {
      // First retry: try removing any query parameters from the URL
      if (retryCount === 0 && imgSrc && imgSrc.includes('?')) {
        const cleanUrl = imgSrc.split('?')[0];
        setImgSrc(cleanUrl);
        setRetryCount(1);
        setIsLoading(true);
        return;
      }

      // Second retry: try without CORS (for some external images)
      if (retryCount === 1) {
        setRetryCount(2);
        setIsLoading(true);
        return;
      }
    }

    // All retries failed, use fallback
    setImgSrc(FALLBACK_IMAGE);
    setHasError(true);
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div
      className={`animate-pulse bg-zinc-800 ${fill ? 'absolute inset-0' : ''} ${className}`}
    >
      <div className='w-full h-full flex items-center justify-center'>
        <Music className='h-8 w-8 text-zinc-600' />
      </div>
    </div>
  );

  // Fallback content when image fails to load
  const FallbackContent = () => (
    <div
      className={`bg-zinc-800 flex items-center justify-center ${fill ? 'absolute inset-0' : ''} ${className}`}
    >
      {fallbackIcon || <Music className='h-12 w-12 text-zinc-600' />}
    </div>
  );

  // If no valid source and not using fallback, show fallback content
  if (!imgSrc) {
    return showSkeleton ? <LoadingSkeleton /> : <FallbackContent />;
  }

  return (
    <div className={`relative ${fill ? '' : 'w-full h-full'}`}>
      {/* Loading skeleton overlay */}
      {isLoading && showSkeleton && <LoadingSkeleton />}

      {/* Main image */}
      <Image
        src={imgSrc}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        sizes={sizes}
        priority={priority}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        // Disable drag to prevent issues with fallback logic
        draggable={false}
        style={style}
        // Use unoptimized for external images to avoid loader warnings
        unoptimized={!imgSrc.includes('imagedelivery.net')}
      />

      {/* Error state overlay (only show if fallback image also fails) */}
      {hasError && imgSrc === FALLBACK_IMAGE && (
        <div
          className={`absolute inset-0 bg-zinc-800 flex items-center justify-center ${className}`}
        >
          <div className='text-center'>
            {fallbackIcon || (
              <Music className='h-12 w-12 text-zinc-600 mx-auto mb-2' />
            )}
            <p className='text-zinc-500 text-sm'>Image unavailable</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Named export for specific use cases
export { AlbumImage };

// Type export for external usage
export type { AlbumImageProps };
