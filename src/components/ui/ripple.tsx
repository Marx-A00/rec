// src/components/ui/ripple.tsx
import React, { ComponentPropsWithoutRef, CSSProperties } from 'react';

import { cn } from '@/lib/utils';

interface RippleProps extends ComponentPropsWithoutRef<'div'> {
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
  color?: string;
  /** Accent color for special circles */
  accentColor?: string;
  /** How often accent appears: 'none' | 'every-3rd' | 'every-4th' | 'random-10' | 'random-20' | 'random-30' */
  accentPattern?:
    | 'none'
    | 'every-3rd'
    | 'every-4th'
    | 'random-10'
    | 'random-20'
    | 'random-30';
  /** Optional second accent color */
  accentColor2?: string;
  /** Seed for random patterns (use same seed for consistent results) */
  randomSeed?: number;
}

// Simple seeded random for consistent results
function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed + index * 9999) * 10000;
  return x - Math.floor(x);
}

export const Ripple = React.memo(function Ripple({
  mainCircleSize = 150,
  mainCircleOpacity = 0.8,
  numCircles = 8,
  color = '#FFFBEB', // cosmic-latte
  accentColor,
  accentPattern = 'none',
  accentColor2,
  randomSeed = 42,
  className,
  ...props
}: RippleProps) {
  const getCircleColor = (index: number): string => {
    if (!accentColor || accentPattern === 'none') return color;

    const rand = seededRandom(randomSeed, index);

    switch (accentPattern) {
      case 'every-3rd':
        if (index % 3 === 2) return accentColor;
        break;
      case 'every-4th':
        if (index % 4 === 3) return accentColor;
        if (accentColor2 && index % 4 === 1) return accentColor2;
        break;
      case 'random-10':
        if (rand < 0.1) return accentColor;
        if (accentColor2 && rand >= 0.1 && rand < 0.2) return accentColor2;
        break;
      case 'random-20':
        if (rand < 0.2) return accentColor;
        if (accentColor2 && rand >= 0.2 && rand < 0.35) return accentColor2;
        break;
      case 'random-30':
        if (rand < 0.3) return accentColor;
        if (accentColor2 && rand >= 0.3 && rand < 0.45) return accentColor2;
        break;
    }

    return color;
  };

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 select-none',
        className
      )}
      {...props}
    >
      {Array.from({ length: numCircles }, (_, i) => {
        const size = mainCircleSize + i * 50;
        const opacity = Math.max(0.1, mainCircleOpacity - i * 0.1);
        const animationDelay = `${i * 0.3}s`;
        const circleColor = getCircleColor(i);

        return (
          <div
            key={i}
            className='absolute animate-ripple rounded-full'
            style={
              {
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: circleColor,
                opacity: opacity,
                animationDelay: animationDelay,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                border: `2px solid ${circleColor}`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
});

Ripple.displayName = 'Ripple';
