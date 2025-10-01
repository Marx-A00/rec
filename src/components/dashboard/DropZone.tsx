// src/components/dashboard/DropZone.tsx
'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Plus, ArrowRightLeft, ArrowUpDown } from 'lucide-react';

interface DropZoneProps {
  id: string;
  type:
    | 'create-horizontal'
    | 'create-vertical'
    | 'insert-between'
    | 'main-layout';
  isActive?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export default function DropZone({
  id,
  type,
  isActive = false,
  children,
  className = '',
}: DropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { type },
  });

  const getDropZoneContent = () => {
    switch (type) {
      case 'create-horizontal':
        return (
          <div className='flex items-center gap-2 text-emerald-400'>
            <ArrowRightLeft className='w-4 h-4' />
            <span className='text-sm font-medium'>Create Horizontal Group</span>
          </div>
        );
      case 'create-vertical':
        return (
          <div className='flex items-center gap-2 text-emerald-400'>
            <ArrowUpDown className='w-4 h-4' />
            <span className='text-sm font-medium'>Create Vertical Group</span>
          </div>
        );
      case 'insert-between':
        return (
          <div className='flex items-center gap-2 text-blue-400'>
            <Plus className='w-4 h-4' />
            <span className='text-sm font-medium'>Insert Here</span>
          </div>
        );
      case 'main-layout':
        return children;
      default:
        return children;
    }
  };

  const getDropZoneStyles = () => {
    const baseStyles = 'transition-all duration-200';

    if (type === 'main-layout') {
      return `${baseStyles} ${className}`;
    }

    const activeStyles =
      isActive || isOver ? 'opacity-100 scale-100' : 'opacity-0 scale-95';

    const hoverStyles = isOver
      ? 'border-emerald-500 bg-emerald-500/10'
      : 'border-zinc-600 bg-zinc-800/50';

    return `
      ${baseStyles} 
      ${activeStyles}
      ${hoverStyles}
      border-2 border-dashed rounded-lg p-4
      flex items-center justify-center
      min-h-[60px]
      ${className}
    `;
  };

  return (
    <div ref={setNodeRef} className={getDropZoneStyles()}>
      {getDropZoneContent()}
    </div>
  );
}
