'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { X } from 'lucide-react';

import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
import { useHintStore } from '@/stores/useHintStore';
import { useTour } from '@/contexts/TourContext';

interface ContextualHintProps {
  id: string;
  title: string;
  description: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  children: React.ReactNode;
}

export default function ContextualHint({
  id,
  title,
  description,
  side = 'bottom',
  align = 'center',
  sideOffset = 8,
  children,
}: ContextualHintProps) {
  const { hasSeenHint, dismissHint } = useHintStore();
  const { isTourActive } = useTour();
  const [open, setOpen] = useState(false);

  // Delay showing the hint slightly so page content settles first
  useEffect(() => {
    if (hasSeenHint(id) || isTourActive) return;
    const timer = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(timer);
  }, [id, hasSeenHint, isTourActive]);

  const dismissed = hasSeenHint(id) || isTourActive;

  const handleDismiss = useCallback(() => {
    setOpen(false);
    dismissHint(id);
  }, [id, dismissHint]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      {!dismissed && (
        <PopoverContent
          side={side}
          align={align}
          sideOffset={sideOffset}
          onPointerDownOutside={handleDismiss}
          className='z-50 max-w-xs rounded-xl border-2 border-zinc-700 bg-zinc-900 p-4 shadow-2xl'
        >
          <div className='flex items-start justify-between gap-2'>
            <div className='min-w-0'>
              <h4 className='mb-1 text-sm font-bold text-white'>{title}</h4>
              <p className='text-xs leading-relaxed text-zinc-300'>
                {description}
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className='flex-shrink-0 p-0.5 text-zinc-400 hover:text-white'
            >
              <X className='h-3.5 w-3.5' />
            </button>
          </div>
          <div className='mt-2 flex justify-end border-t border-zinc-800 pt-2'>
            <button
              onClick={handleDismiss}
              className='text-xs font-medium text-emerald-400 hover:text-emerald-300'
            >
              Got it
            </button>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
