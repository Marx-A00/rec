// src/components/dashboard/LayoutDirectionToggle.tsx
'use client';

import React from 'react';
import { ArrowRightLeft, ArrowUpDown, Split } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useDashboard } from '@/contexts/DashboardContext';

interface LayoutDirectionToggleProps {
  layoutPath: string[];
  currentDirection: 'horizontal' | 'vertical';
  className?: string;
}

export default function LayoutDirectionToggle({
  layoutPath,
  currentDirection,
  className = '',
}: LayoutDirectionToggleProps) {
  const { actions } = useDashboard();

  const handleToggleDirection = () => {
    const newDirection =
      currentDirection === 'horizontal' ? 'vertical' : 'horizontal';
    actions.changeLayoutDirection(layoutPath, newDirection);
  };

  const isHorizontal = currentDirection === 'horizontal';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className='flex items-center gap-1 text-xs text-zinc-400'>
        <Split className='w-3 h-3' />
        <span>Layout:</span>
      </div>

      <Button
        variant='ghost'
        size='sm'
        onClick={handleToggleDirection}
        className={`
          h-6 px-2 text-xs font-medium transition-all duration-200
          ${
            isHorizontal
              ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
          }
        `}
        title={`Switch to ${isHorizontal ? 'vertical' : 'horizontal'} layout`}
      >
        {isHorizontal ? (
          <>
            <ArrowRightLeft className='w-3 h-3 mr-1' />
            Horizontal
          </>
        ) : (
          <>
            <ArrowUpDown className='w-3 h-3 mr-1' />
            Vertical
          </>
        )}
      </Button>
    </div>
  );
}
