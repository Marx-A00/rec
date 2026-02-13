'use client';

import { useCallback } from 'react';
import { Image as ImageIcon } from 'lucide-react';

import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import type { ChangeType } from '@/lib/correction/preview/types';

import type { UIFieldSelections } from './types';

/**
 * Props for CoverArtSection component
 */
export interface CoverArtSectionProps {
  /** Current field selections */
  selections: UIFieldSelections;
  /** Callback when selections change */
  onSelectionsChange: (selections: UIFieldSelections) => void;
  /** Cover art comparison data */
  coverArt: {
    currentUrl: string | null;
    sourceUrl: string | null;
    changeType: ChangeType;
  };
}

/**
 * Accordion section for cover art selection.
 *
 * Shows thumbnails of current vs source cover art and allows user to choose:
 * - Use source (replace with MusicBrainz cover)
 * - Keep current (don't change)
 * - Clear (remove cover art)
 */
export function CoverArtSection({
  selections,
  onSelectionsChange,
  coverArt,
}: CoverArtSectionProps) {
  // Don't show section if no cover art change
  if (coverArt.changeType === 'UNCHANGED') {
    return null;
  }

  const handleChange = useCallback(
    (value: string) => {
      onSelectionsChange({
        ...selections,
        coverArt: value as 'use_source' | 'keep_current' | 'clear',
      });
    },
    [selections, onSelectionsChange]
  );

  // Determine what type of change this is
  const changeLabel =
    coverArt.changeType === 'ADDED'
      ? 'New cover available'
      : coverArt.changeType === 'MODIFIED'
        ? 'Different cover available'
        : coverArt.changeType === 'REMOVED'
          ? 'Cover will be removed'
          : 'Cover art change';

  return (
    <AccordionItem value='cover-art' className='border-zinc-700'>
      <div className='flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50'>
        <ImageIcon className='h-4 w-4 text-zinc-400 shrink-0' />
        <AccordionTrigger className='flex-1 py-0 hover:no-underline [&>svg]:ml-auto'>
          <span className='text-sm font-medium text-zinc-100'>
            Cover Art{' '}
            <span className='ml-2 px-2 py-0.5 rounded text-xs text-yellow-400 bg-yellow-400/10'>
              {changeLabel}
            </span>
          </span>
        </AccordionTrigger>
      </div>
      <AccordionContent className='px-4 pb-4 pt-2'>
        <div className='space-y-4'>
          {/* Thumbnail comparison */}
          <div className='flex gap-4'>
            {/* Current cover */}
            <div className='flex-1'>
              <div className='text-xs font-medium text-zinc-500 mb-2'>
                Current
              </div>
              <div className='aspect-square w-32 rounded-md overflow-hidden bg-zinc-800 border border-zinc-700'>
                {coverArt.currentUrl ? (
                  <img
                    src={coverArt.currentUrl}
                    alt='Current cover'
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <div className='w-full h-full flex items-center justify-center text-zinc-600'>
                    <ImageIcon className='h-8 w-8' />
                  </div>
                )}
              </div>
            </div>

            {/* Arrow */}
            <div className='flex items-center pt-6'>
              <span className='text-zinc-500 text-lg'>→</span>
            </div>

            {/* Source cover */}
            <div className='flex-1'>
              <div className='text-xs font-medium text-zinc-500 mb-2'>
                Source
              </div>
              <div className='aspect-square w-32 rounded-md overflow-hidden bg-zinc-800 border border-green-500/30'>
                {coverArt.sourceUrl ? (
                  <img
                    src={coverArt.sourceUrl}
                    alt='Source cover'
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <div className='w-full h-full flex items-center justify-center text-zinc-600'>
                    <ImageIcon className='h-8 w-8' />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Radio options */}
          <div className='space-y-2'>
            <label className='flex items-center gap-3 rounded-md bg-zinc-800 p-3 cursor-pointer hover:bg-zinc-700/50'>
              <input
                type='radio'
                name='cover-art-choice'
                value='use_source'
                checked={selections.coverArt === 'use_source'}
                onChange={() => handleChange('use_source')}
                className='h-4 w-4 text-blue-500 border-zinc-600 bg-zinc-700 focus:ring-blue-500 focus:ring-offset-zinc-900'
              />
              <span className='text-sm text-zinc-200'>
                Use source cover art
              </span>
            </label>
            <label className='flex items-center gap-3 rounded-md bg-zinc-800 p-3 cursor-pointer hover:bg-zinc-700/50'>
              <input
                type='radio'
                name='cover-art-choice'
                value='keep_current'
                checked={selections.coverArt === 'keep_current'}
                onChange={() => handleChange('keep_current')}
                className='h-4 w-4 text-blue-500 border-zinc-600 bg-zinc-700 focus:ring-blue-500 focus:ring-offset-zinc-900'
              />
              <span className='text-sm text-zinc-200'>
                Keep current cover art
              </span>
            </label>
            {coverArt.currentUrl && (
              <label className='flex items-center gap-3 rounded-md bg-zinc-800 p-3 cursor-pointer hover:bg-zinc-700/50'>
                <input
                  type='radio'
                  name='cover-art-choice'
                  value='clear'
                  checked={selections.coverArt === 'clear'}
                  onChange={() => handleChange('clear')}
                  className='h-4 w-4 text-blue-500 border-zinc-600 bg-zinc-700 focus:ring-blue-500 focus:ring-offset-zinc-900'
                />
                <span className='text-sm text-zinc-200'>Clear cover art</span>
              </label>
            )}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
