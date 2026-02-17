'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

import { useRevealImage, type RevealMode } from '@/hooks/useRevealImage';

interface RevealCanvasProps {
  /** Album art image URL */
  imageUrl: string;
  /** Challenge ID for deterministic reveal order */
  challengeId: string;
  /** Current reveal stage (1-6) */
  stage: number;
  /** Reveal pattern mode (default: 'scattered') */
  revealMode?: RevealMode;
  /** Optional CSS class for sizing */
  className?: string;
  /** Called when the image finishes loading */
  onLoad?: () => void;
  /** Called if the image fails to load */
  onError?: () => void;
}

/**
 * Canvas-based pixelation renderer for the reveal engine.
 * Unrevealed tiles are shown at heavy pixelation (16x16 blocks).
 * Revealed tiles are drawn at full resolution.
 */
export default function RevealCanvas({
  imageUrl,
  challengeId,
  stage,
  revealMode,
  className,
  onLoad,
  onError,
}: RevealCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { revealedTiles, gridSize } = useRevealImage({
    challengeId,
    stage,
    mode: revealMode,
  });

  // Load the image via native Image constructor (not Next.js Image)
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      setImage(img);
      setIsLoading(false);
      onLoad?.();
    };

    img.onerror = () => {
      setIsLoading(false);
      onError?.();
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl, onLoad, onError]);

  // Draw the reveal to canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !image) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Size canvas buffer to match container at device pixel ratio
    const displayWidth = rect.width;
    const displayHeight = rect.width; // Square aspect ratio
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    const tileW = displayWidth / gridSize;
    const tileH = displayHeight / gridSize;

    // Build a Set of revealed tile indices for fast lookup
    const revealedSet = new Set(revealedTiles.map(t => t.index));

    // Step 1: Draw pixelated base (entire image at low resolution, stretched)
    // Use an offscreen canvas to avoid DPR scaling issues with self-copy
    const offscreen = document.createElement('canvas');
    offscreen.width = gridSize;
    offscreen.height = gridSize;
    const offCtx = offscreen.getContext('2d');
    if (offCtx) {
      offCtx.imageSmoothingEnabled = false;
      offCtx.drawImage(image, 0, 0, gridSize, gridSize);
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      offscreen,
      0,
      0,
      gridSize,
      gridSize,
      0,
      0,
      displayWidth,
      displayHeight
    );

    // Step 2: Draw clear tiles over revealed regions
    ctx.imageSmoothingEnabled = true;
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const index = y * gridSize + x;
        if (revealedSet.has(index)) {
          const sx = (x / gridSize) * image.naturalWidth;
          const sy = (y / gridSize) * image.naturalHeight;
          const sw = image.naturalWidth / gridSize;
          const sh = image.naturalHeight / gridSize;

          ctx.drawImage(
            image,
            sx,
            sy,
            sw,
            sh,
            x * tileW,
            y * tileH,
            tileW,
            tileH
          );
        }
      }
    }
  }, [image, revealedTiles, gridSize]);

  // Redraw when image or revealed tiles change
  useEffect(() => {
    draw();
  }, [draw]);

  // Handle responsive resizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      draw();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  return (
    <div
      ref={containerRef}
      className={`relative aspect-square ${className ?? ''}`}
    >
      {isLoading && (
        <div className='absolute inset-0 animate-pulse rounded-lg bg-white/10' />
      )}
      <canvas ref={canvasRef} className='block h-full w-full rounded-lg' />
    </div>
  );
}
