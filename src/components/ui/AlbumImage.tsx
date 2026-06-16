'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

import { getImageUrl } from '@/lib/cloudflare-images';

const ICON_COLOR = '#FFFBEB'; // cosmic latte

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
 * Vinyl record SVG with waveform icon.
 * When animated=true, rings glow with a staggered breathe effect.
 */
function VinylPlaceholder({ animated = false }: { animated?: boolean }) {
  const delays = [0, 0.2, 0.4, 0.6, 0.8];
  const animStyle = (i: number) =>
    animated
      ? { animation: `vinylBreathe 2.5s ease-in-out ${delays[i]}s infinite` }
      : undefined;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="400" height="400" fill="#18181b" />
      <circle cx="200" cy="200" r="150" fill="#27272a" stroke="#3f3f46" strokeWidth="2" style={animStyle(0)} />
      <circle cx="200" cy="200" r="120" fill="#18181b" stroke="#3f3f46" strokeWidth="1" opacity="0.5" style={animStyle(1)} />
      <circle cx="200" cy="200" r="90" fill="#27272a" stroke="#3f3f46" strokeWidth="1" opacity="0.4" style={animStyle(2)} />
      <circle cx="200" cy="200" r="60" fill="#18181b" stroke="#3f3f46" strokeWidth="1" opacity="0.3" style={animStyle(3)} />
      <circle cx="200" cy="200" r="40" fill="#3f3f46" style={animStyle(4)} />
      {/* Waveform icon */}
      <g transform="translate(200, 200)" stroke={ICON_COLOR} strokeWidth="2.5" strokeLinecap="round" fill="none">
        <line x1="-12" y1="-6" x2="-12" y2="6" />
        <line x1="-6" y1="-12" x2="-6" y2="12" />
        <line x1="0" y1="-8" x2="0" y2="8" />
        <line x1="6" y1="-14" x2="6" y2="14" />
        <line x1="12" y1="-4" x2="12" y2="4" />
      </g>
      {animated && (
        <style>{`
          @keyframes vinylBreathe {
            0%, 100% { opacity: 0.15; filter: brightness(1); }
            50% { opacity: 0.7; filter: brightness(1.6); }
          }
        `}</style>
      )}
    </svg>
  );
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
        {fallbackIcon || <VinylPlaceholder animated={false} />}
      </div>
    );
  }

  // Check if this needs native img (CORS issues with redirects or Cloudflare Images)
  const useNativeImg =
    imgSrc.includes('coverartarchive.org') ||
    imgSrc.includes('archive.org') ||
    imgSrc.includes('imagedelivery.net');

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Loading: animated vinyl with breathe effect */}
      {isLoading && showSkeleton && (
        <div className={`${fill ? 'absolute inset-0' : 'absolute inset-0'}`}>
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

// Type export for external usage
export type { AlbumImageProps };
