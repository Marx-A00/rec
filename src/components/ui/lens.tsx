'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion, useMotionTemplate } from 'motion/react';

interface Position {
  x: number;
  y: number;
}

interface LensProps {
  children: React.ReactNode;
  zoomFactor?: number;
  lensSize?: number;
  position?: Position;
  defaultPosition?: Position;
  isStatic?: boolean;
  duration?: number;
  lensColor?: string;
  ariaLabel?: string;
  className?: string;
}

/**
 * Grab a snapshot URL from the first <canvas> or <img> found inside `el`.
 * Returns a data-URL (canvas) or the image src, or null if nothing found.
 */
function getContentSnapshot(el: HTMLElement): string | null {
  // Prefer canvas (RevealCanvas renders here)
  const canvas = el.querySelector('canvas');
  if (canvas) {
    try {
      return canvas.toDataURL();
    } catch {
      // tainted canvas — fall through
    }
  }
  // Fall back to img
  const img = el.querySelector('img');
  if (img?.complete && img.naturalWidth > 0) {
    return img.src;
  }
  return null;
}

/**
 * Magnifying lens component.
 *
 * Renders children once as the base layer. The magnified overlay uses a
 * snapshot of the actual rendered content (canvas.toDataURL or img.src)
 * as a background-image, avoiding the dual-render problem where a second
 * {children} tree would load different images or re-measure incorrectly
 * inside a scaled parent.
 */
export function Lens({
  children,
  zoomFactor = 1.3,
  lensSize = 170,
  isStatic = false,
  position = { x: 0, y: 0 },
  defaultPosition,
  duration = 0.1,
  lensColor = 'black',
  ariaLabel = 'Zoom Area',
  className,
}: LensProps) {
  if (zoomFactor < 1) {
    throw new Error('zoomFactor must be greater than 1');
  }
  if (lensSize < 0) {
    throw new Error('lensSize must be greater than 0');
  }

  const [isHovering, setIsHovering] = useState(false);
  const [mousePosition, setMousePosition] = useState<Position>(position);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const rafRef = useRef<number>(0);

  const currentPosition = useMemo(() => {
    if (isStatic) return position;
    if (defaultPosition && !isHovering) return defaultPosition;
    return mousePosition;
  }, [isStatic, position, defaultPosition, isHovering, mousePosition]);

  // Continuously snapshot while hovering so the magnified view stays in
  // sync with content changes (e.g. reveal stage updates, animations).
  useEffect(() => {
    if (!isHovering) {
      setSnapshotUrl(null);
      return;
    }

    let active = true;
    const refresh = () => {
      if (!active || !contentRef.current) return;
      const url = getContentSnapshot(contentRef.current);
      if (url) setSnapshotUrl(url);
      rafRef.current = requestAnimationFrame(refresh);
    };
    rafRef.current = requestAnimationFrame(refresh);

    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [isHovering]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setIsHovering(false);
  }, []);

  const maskImage = useMotionTemplate`radial-gradient(circle ${
    lensSize / 2
  }px at ${currentPosition.x}px ${
    currentPosition.y
  }px, ${lensColor} 100%, transparent 100%)`;

  const LensContent = useMemo(() => {
    if (!snapshotUrl) return null;
    const { x, y } = currentPosition;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.58 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration }}
        className='absolute inset-0 overflow-hidden'
        style={{
          maskImage,
          WebkitMaskImage: maskImage,
          transformOrigin: `${x}px ${y}px`,
          zIndex: 50,
        }}
      >
        <div
          className='absolute inset-0'
          style={{
            backgroundImage: `url(${snapshotUrl})`,
            backgroundSize: '100% 100%',
            transform: `scale(${zoomFactor})`,
            transformOrigin: `${x}px ${y}px`,
          }}
        />
      </motion.div>
    );
  }, [currentPosition, maskImage, zoomFactor, duration, snapshotUrl]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className ?? 'rounded-xl'}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
      onKeyDown={handleKeyDown}
      role='region'
      aria-label={ariaLabel}
      tabIndex={0}
    >
      <div ref={contentRef}>{children}</div>
      {isStatic || defaultPosition ? (
        LensContent
      ) : (
        <AnimatePresence mode='popLayout'>
          {isHovering && LensContent}
        </AnimatePresence>
      )}
    </div>
  );
}
