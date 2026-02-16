'use client';

import { Grid3X3, Droplets } from 'lucide-react';

import { useRevealStore, type RevealStyle } from '@/stores/useRevealStore';

import RevealCanvas from './RevealCanvas';
import RevealBlur from './RevealBlur';

interface RevealImageProps {
  /** Album art image URL */
  imageUrl: string;
  /** Challenge ID for deterministic reveal order */
  challengeId: string;
  /** Current reveal stage (1-6) */
  stage: number;
  /** Optional CSS class for container sizing */
  className?: string;
  /** Whether to show the style toggle button (default: true) */
  showToggle?: boolean;
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
  className,
  showToggle = true,
  onLoad,
  onError,
}: RevealImageProps) {
  const { preferredStyle, setPreferredStyle } = useRevealStore();

  const toggleStyle = () => {
    setPreferredStyle(preferredStyle === 'pixelation' ? 'blur' : 'pixelation');
  };

  const Icon = STYLE_ICONS[preferredStyle];

  const sharedProps = {
    imageUrl,
    challengeId,
    stage,
    onLoad,
    onError,
  };

  return (
    <div className={`relative ${className ?? ''}`}>
      {preferredStyle === 'pixelation' ? (
        <RevealCanvas {...sharedProps} />
      ) : (
        <RevealBlur {...sharedProps} />
      )}

      {showToggle && (
        <button
          type='button'
          onClick={toggleStyle}
          aria-label={STYLE_LABELS[preferredStyle]}
          title={STYLE_LABELS[preferredStyle]}
          className='absolute bottom-2 right-2 rounded-md bg-black/50 p-1.5 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/70 hover:text-white'
        >
          <Icon className='h-4 w-4' />
        </button>
      )}
    </div>
  );
}
