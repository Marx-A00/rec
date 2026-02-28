'use client';

import { useState } from 'react';

interface RevealBlurProps {
  /** Album art image URL */
  imageUrl: string;
  /** Challenge ID for deterministic strip order (reserved for future use) */
  challengeId: string;
  /** Current reveal stage (1-4) */
  stage: number;
  /** Optional CSS class for sizing */
  className?: string;
  /** Called when the image finishes loading */
  onLoad?: () => void;
  /** Called if the image fails to load */
  onError?: () => void;
}

/** Blur radius in px for each stage (1-4). Stage 1 = heavy, Stage 4 = clear. */
const BLUR_RADII = [40, 24, 8, 0] as const;

/**
 * CSS blur-based renderer for the reveal engine.
 * Applies a decreasing blur filter across 4 stages, from frosted glass to clear.
 * GPU-accelerated via CSS filters — no Canvas overhead.
 */
export default function RevealBlur({
  imageUrl,
  challengeId: _challengeId,
  stage,
  className,
  onLoad,
  onError,
}: RevealBlurProps) {
  const [isLoading, setIsLoading] = useState(true);

  const clampedStage = Math.max(1, Math.min(stage, 4));
  const blurRadius = BLUR_RADII[clampedStage - 1];

  return (
    <div
      className={`relative aspect-square overflow-hidden rounded-lg ${className ?? ''}`}
    >
      {isLoading && (
        <div className='absolute inset-0 animate-pulse rounded-lg bg-white/10' />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt='Album art'
        className='block h-full w-full object-cover'
        style={{ filter: `blur(${blurRadius}px)` }}
        onLoad={() => {
          setIsLoading(false);
          onLoad?.();
        }}
        onError={() => {
          setIsLoading(false);
          onError?.();
        }}
      />
    </div>
  );
}
