'use client';

import type { ReactNode } from 'react';

/**
 * Props for ComparisonLayout component
 */
export interface ComparisonLayoutProps {
  /** Content for the left "Current" column */
  current: ReactNode;
  /** Content for the right "MusicBrainz Source" column */
  source: ReactNode;
}

/**
 * Two-column comparison layout for side-by-side data viewing.
 *
 * Provides consistent header styling and spacing for comparing
 * current album data against MusicBrainz source data.
 *
 * Each column has:
 * - Uppercase header label
 * - Consistent padding and spacing
 * - Dark zinc color scheme matching admin modal
 */
export function ComparisonLayout({ current, source }: ComparisonLayoutProps) {
  return (
    <div className='grid grid-cols-2 gap-6'>
      {/* Left column: Current data */}
      <div className='space-y-4'>
        <h3 className='text-sm font-medium text-zinc-400 uppercase tracking-wide'>
          REC DATABASE
        </h3>
        <div className='space-y-4'>{current}</div>
      </div>

      {/* Right column: MusicBrainz source */}
      <div className='space-y-4'>
        <h3 className='text-sm font-medium text-zinc-400 uppercase tracking-wide'>
          MusicBrainz Source
        </h3>
        <div className='space-y-4'>{source}</div>
      </div>
    </div>
  );
}
