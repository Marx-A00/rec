'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

import { getImageUrl } from '@/lib/cloudflare-images';
import { VinylPlaceholder } from '@/components/ui/VinylPlaceholder';

interface AlbumImageProps {
  src: string | null | undefined;
  alt: string;
  cloudflareImageId?: string | null;
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

/**
 * Compute the resolved image URL synchronously from props.
 * Used for both initial state and effect updates to avoid layout shifts.
 */
function resolveImageUrl(
  src: string | null | undefined,
  cloudflareImageId: string | null | undefined,
  width: number,
  height: number
): string | null {
  // Priority 1: Use Cloudflare image ID if available (skip 'none' marker)
  if (cloudflareImageId && cloudflareImageId !== 'none') {
    return getImageUrl(cloudflareImageId, { width, height });
  }

  // Priority 2: Use src URL if available
  if (
    src &&
    src !== 'https://via.placeholder.com/400x400?text=No+Image' &&
    src !== '/default-album.svg'
  ) {
    // Check if it's a Cloudflare Images URL and optimize it
    if (src.includes('imagedelivery.net') && src.includes('/public')) {
      const matches = src.match(/imagedelivery\.net\/[^\/]+\/([^\/]+)/);
      if (matches && matches[1]) {
        return getImageUrl(matches[1], { width, height });
      }
    }
    return src;
  }

  // No valid source or invalid URL
  return null;
}

export default function AlbumImage({
  src,
  alt,
  cloudflareImageId,
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
  // Initialize synchronously so the first render has the correct URL
  const [imgSrc, setImgSrc] = useState<string | null>(() =>
    resolveImageUrl(src, cloudflareImageId, width, height)
  );
  const [isLoading, setIsLoading] = useState(true);

  // Update imgSrc when props change (subsequent renders only)
  useEffect(() => {
    const resolved = resolveImageUrl(src, cloudflareImageId, width, height);
    setImgSrc(resolved);
    setIsLoading(resolved !== null);
  }, [src, cloudflareImageId, width, height]);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);

    // Cloudflare image failed → fall back to the original src URL
    if (
      imgSrc?.includes('imagedelivery.net') &&
      src &&
      !src.includes('imagedelivery.net')
    ) {
      setImgSrc(src);
      setIsLoading(true);
      return;
    }

    // Everything failed → show vinyl fallback
    setImgSrc(null);
  };

  // No valid source — show static vinyl fallback
  if (!imgSrc) {
    return (
      <div
        className={`relative overflow-hidden ${fill ? 'absolute inset-0' : ''} ${className}`}
      >
        {fallbackIcon ? (
          <div className='flex items-center justify-center w-full h-full bg-zinc-800 text-zinc-400'>
            {fallbackIcon}
          </div>
        ) : (
          <VinylPlaceholder animated={false} />
        )}
      </div>
    );
  }

  // Native img only for domains with CORS redirect issues
  const useNativeImg =
    imgSrc.includes('coverartarchive.org') || imgSrc.includes('archive.org');

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Loading: animated vinyl (skipped when parent skeleton already handles it) */}
      {isLoading && showSkeleton && (
        <div className='absolute inset-0'>
          <VinylPlaceholder animated />
        </div>
      )}

      {/* Use native img for Cover Art Archive and Cloudflare Images */}
      {useNativeImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgSrc}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          className={`w-full h-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 ${fill ? 'absolute inset-0' : ''}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          draggable={false}
          style={style}
        />
      ) : (
        /* Main image - use Next.js Image for optimized delivery */
        <Image
          src={imgSrc}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          sizes={sizes}
          priority={priority}
          className={`w-full h-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          draggable={false}
          style={style}
          unoptimized={!imgSrc.includes('imagedelivery.net')}
        />
      )}
    </div>
  );
}

// Named export for specific use cases
export { AlbumImage };
// Re-export for backwards compatibility — prefer importing from VinylPlaceholder.tsx directly
export { VinylPlaceholder } from '@/components/ui/VinylPlaceholder';

// Type export for external usage
export type { AlbumImageProps };
