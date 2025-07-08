// src/components/ui/ripple.tsx
import React, { ComponentPropsWithoutRef, CSSProperties } from 'react';

import { cn } from '@/lib/utils';

interface RippleProps extends ComponentPropsWithoutRef<'div'> {
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
  color?: string;
}

export const Ripple = React.memo(function Ripple({
  mainCircleSize = 150,
  mainCircleOpacity = 0.8,
  numCircles = 8,
  color = '#FFFBEB', // cosmic-latte
  className,
  ...props
}: RippleProps) {
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

        return (
          <div
            key={i}
            className='absolute animate-ripple rounded-full'
            style={
              {
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: color,
                opacity: opacity,
                animationDelay: animationDelay,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                border: `2px solid ${color}`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
});

Ripple.displayName = 'Ripple';
