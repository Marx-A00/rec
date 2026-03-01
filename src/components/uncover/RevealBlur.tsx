'use client';

import { useState } from 'react';

interface RevealBlurProps {
  /** Album art image URL */
  imageUrl: string;
  /** Challenge ID for deterministic strip order (reserved for future use) */
  challengeId: string;
  /** Current reveal stage (1 to TOTAL_STAGES) */
  stage: number;
  /** Optional CSS class for sizing */
  className?: string;
  /** Called when the image finishes loading */
  onLoad?: () => void;
  /** Called if the image fails to load */
  onError?: () => void;
}

/**
 * Blur radius in px for each stage (1-5).
 * Stages 1-4 are in-game with decreasing blur, stage 5 is full reveal (game-over).
 */
const BLUR_RADII = [48, 36, 24, 14, 0] as const;

/**
 * CSS blur-based renderer for the reveal engine.
 * Applies a decreasing blur filter across 5 stages, from frosted glass to clear.
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

  const clampedStage = Math.max(1, Math.min(stage, BLUR_RADII.length));
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
