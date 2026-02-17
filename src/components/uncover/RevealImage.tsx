'use client';

import { useState, useEffect } from 'react';
import { Grid3X3, Droplets, Loader2 } from 'lucide-react';

import { useRevealStore, type RevealStyle } from '@/stores/useRevealStore';

import type { RevealMode } from '@/hooks/useRevealImage';

import RevealCanvas from './RevealCanvas';
import RevealBlur from './RevealBlur';

interface RevealImageProps {
  /** Album art image URL */
  imageUrl: string;
  /** Challenge ID for deterministic reveal order */
  challengeId: string;
  /** Current reveal stage (1-6) */
  stage: number;
  /** Reveal pattern mode (default: 'scattered') */
  revealMode?: RevealMode;
  /** Optional CSS class for container sizing */
  className?: string;
  /** Whether to show the style toggle button (default: true) */
  showToggle?: boolean;
  /** Show loading overlay (for submission state) */
  isSubmitting?: boolean;
  /** Called when the image finishes loading */
  onLoad?: () => void;
  /** Called if the image fails to load */
  onError?: () => void;
}

const STYLE_ICONS: Record<RevealStyle, typeof Grid3X3> = {
  pixelation: Grid3X3,
  blur: Droplets,
};

const STYLE_LABELS: Record<RevealStyle, string> = {
  pixelation: 'Switch to blur style',
  blur: 'Switch to pixelation style',
};

/**
 * Main reveal image component that orchestrates both reveal styles.
 * Renders either RevealCanvas (pixelation) or RevealBlur based on user preference.
 * Includes an optional toggle button to switch between styles mid-game.
 */
export function RevealImage({
  imageUrl,
  challengeId,
  stage,
  revealMode,
  className,
  showToggle = true,
  isSubmitting = false,
  onLoad,
  onError,
}: RevealImageProps) {
  const { preferredStyle, setPreferredStyle } = useRevealStore();
  const [isImageLoading, setIsImageLoading] = useState(true);

  // Reset loading state when imageUrl changes
  useEffect(() => {
    setIsImageLoading(true);
  }, [imageUrl]);

  const toggleStyle = () => {
    setPreferredStyle(preferredStyle === 'pixelation' ? 'blur' : 'pixelation');
  };

  const handleImageLoad = () => {
    setIsImageLoading(false);
    onLoad?.();
  };

  const handleImageError = () => {
    setIsImageLoading(false);
    onError?.();
  };

  const Icon = STYLE_ICONS[preferredStyle];

  const sharedProps = {
    imageUrl,
    challengeId,
    stage,
    onLoad: handleImageLoad,
    onError: handleImageError,
  };

  return (
    <div className={'relative ' + (className ?? '')}>
      {preferredStyle === 'pixelation' ? (
        <RevealCanvas {...sharedProps} revealMode={revealMode} />
      ) : (
        <RevealBlur {...sharedProps} />
      )}

      {/* Loading overlay during image load or submission */}
      {(isImageLoading || isSubmitting) && (
        <div className='absolute inset-0 flex items-center justify-center rounded-lg bg-black/30 backdrop-blur-sm transition-opacity'>
          <Loader2 className='h-8 w-8 animate-spin text-white/80' />
        </div>
      )}

      {showToggle && (
        <button
          type='button'
          onClick={toggleStyle}
          aria-label={STYLE_LABELS[preferredStyle]}
          title={STYLE_LABELS[preferredStyle]}
          className='absolute bottom-2 right-2 rounded-md bg-black/50 p-1.5 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black'
        >
          <Icon className='h-4 w-4' />
        </button>
      )}
    </div>
  );
}
