'use client';

import { Users } from 'lucide-react';

import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import type { ArtistCreditDiff } from '@/lib/correction/preview/types';

/**
 * Props for ArtistSection component
 */
export interface ArtistSectionProps {
  /** Artist credit diff from preview */
  artistDiff: ArtistCreditDiff;
}

/**
 * Accordion section for displaying artist changes.
 *
 * Unlike other sections, artists are read-only in the UI - they're
 * automatically applied as a unit when corrections are made.
 * This section provides visibility into what artist changes will occur.
 */
export function ArtistSection({ artistDiff }: ArtistSectionProps) {
  // Don't show section if no artist changes
  if (artistDiff.changeType === 'UNCHANGED') {
    return null;
  }

  // Get change indicator styling
  const getChangeTypeStyle = (changeType: string) => {
    switch (changeType) {
      case 'ADDED':
        return 'text-green-400 bg-green-400/10';
      case 'MODIFIED':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'REMOVED':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-zinc-400 bg-zinc-400/10';
    }
  };

  const changeLabel =
    artistDiff.changeType === 'ADDED'
      ? 'Will be added'
      : artistDiff.changeType === 'MODIFIED'
        ? 'Will be updated'
        : artistDiff.changeType === 'REMOVED'
          ? 'Will be removed'
          : 'No change';

  return (
    <AccordionItem value='artists' className='border-zinc-700'>
      <div className='flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50'>
        <Users className='h-4 w-4 text-zinc-400 shrink-0' />
        <AccordionTrigger className='flex-1 py-0 hover:no-underline [&>svg]:ml-auto'>
          <span className='text-sm font-medium text-zinc-100'>
            Artists{' '}
            <span
              className={`ml-2 px-2 py-0.5 rounded text-xs ${getChangeTypeStyle(artistDiff.changeType)}`}
            >
              {changeLabel}
            </span>
          </span>
        </AccordionTrigger>
      </div>
      <AccordionContent className='px-4 pb-4 pt-2'>
        <div className='space-y-3'>
          {/* Current artist display */}
          <div className='rounded-md bg-zinc-800/50 p-3'>
            <div className='text-xs font-medium text-zinc-500 mb-1'>
              Current
            </div>
            <div className='text-sm text-zinc-300'>
              {artistDiff.currentDisplay || '(no artists)'}
            </div>
          </div>

          {/* Arrow indicator */}
          <div className='flex justify-center'>
            <span className='text-zinc-500'>↓</span>
          </div>

          {/* Source artist display */}
          <div className='rounded-md bg-zinc-800/50 p-3 border border-green-500/20'>
            <div className='text-xs font-medium text-zinc-500 mb-1'>
              New (from source)
            </div>
            <div className='text-sm text-green-400'>
              {artistDiff.sourceDisplay || '(no artists)'}
            </div>
          </div>

          {/* Info note */}
          <div className='text-xs text-zinc-500 pt-2'>
            Artists are automatically applied as a unit with the correction.
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
