'use client';

import { useCallback, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import type {
  TrackDiff,
  TrackListSummary,
} from '@/lib/correction/preview/types';

import type { UIFieldSelections } from './types';

/**
 * Props for TrackSection component
 */
export interface TrackSectionProps {
  /** Current field selections */
  selections: UIFieldSelections;
  /** Callback when selections change */
  onSelectionsChange: (selections: UIFieldSelections) => void;
  /** Track diffs from preview */
  trackDiffs: TrackDiff[];
  /** Track summary statistics */
  trackSummary: TrackListSummary;
}

/**
 * Accordion section for track selection.
 *
 * Implements hybrid approach per CONTEXT.md:
 * - Main checkbox: "Apply all tracks" (applyAll)
 * - Collapsible "Show individual tracks" button
 * - When expanded: list of track checkboxes with visual change indicators
 *
 * Features:
 * - Shows "N selected / M total" in trigger
 * - Color-coded change types (yellow=modified, green=added, red=removed)
 * - Track checked if NOT in excludedPositions
 */
export function TrackSection({
  selections,
  onSelectionsChange,
  trackDiffs,
  trackSummary,
}: TrackSectionProps) {
  const [showIndividualTracks, setShowIndividualTracks] = useState(false);

  // Calculate selected count
  const selectedCount = trackDiffs.filter(diff => {
    const positionKey = `${diff.discNumber}-${diff.position}`;
    return !selections.tracks.excludedPositions.has(positionKey);
  }).length;
  const totalCount = trackDiffs.length;

  // Toggle "Apply all tracks"
  const handleToggleApplyAll = useCallback(
    (checked: boolean) => {
      onSelectionsChange({
        ...selections,
        tracks: {
          applyAll: checked,
          excludedPositions: checked
            ? new Set()
            : new Set(
                trackDiffs.map(diff => `${diff.discNumber}-${diff.position}`)
              ),
        },
      });
    },
    [selections, onSelectionsChange, trackDiffs]
  );

  // Toggle individual track
  const handleToggleTrack = useCallback(
    (positionKey: string, checked: boolean) => {
      const newExcluded = new Set(selections.tracks.excludedPositions);
      if (checked) {
        newExcluded.delete(positionKey);
      } else {
        newExcluded.add(positionKey);
      }
      onSelectionsChange({
        ...selections,
        tracks: {
          ...selections.tracks,
          excludedPositions: newExcluded,
        },
      });
    },
    [selections, onSelectionsChange]
  );

  // Get change indicator color class
  const getChangeColorClass = (changeType: string): string => {
    switch (changeType) {
      case 'MODIFIED':
        return 'text-yellow-400';
      case 'ADDED':
        return 'text-green-400';
      case 'REMOVED':
        return 'text-red-400';
      default:
        return 'text-zinc-400';
    }
  };

  if (trackDiffs.length === 0) {
    return null; // Don't show section if no tracks
  }

  return (
    <AccordionItem value='tracks' className='border-zinc-700'>
      <AccordionTrigger className='px-4 py-3 hover:bg-zinc-800/50'>
        <div className='flex items-center gap-3 w-full'>
          <Checkbox
            checked={selections.tracks.applyAll}
            onCheckedChange={handleToggleApplyAll}
            onClick={e => e.stopPropagation()}
            className='shrink-0'
          />
          <span className='text-sm font-medium text-zinc-100'>
            Tracks ({selectedCount} selected / {totalCount} total)
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className='px-4 pb-4 pt-2'>
        <div className='space-y-3'>
          {/* Apply all checkbox */}
          <div className='flex items-center gap-3 rounded-md bg-zinc-800 p-3'>
            <Checkbox
              checked={selections.tracks.applyAll}
              onCheckedChange={handleToggleApplyAll}
              className='shrink-0'
            />
            <span className='text-sm text-zinc-200'>Apply all tracks</span>
          </div>

          {/* Collapsible individual tracks section */}
          <button
            type='button'
            onClick={() => setShowIndividualTracks(!showIndividualTracks)}
            className='flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-300 transition-colors w-full'
          >
            {showIndividualTracks ? (
              <ChevronUp className='h-3 w-3' />
            ) : (
              <ChevronDown className='h-3 w-3' />
            )}
            <span>Show individual tracks</span>
          </button>

          {/* Individual track list */}
          {showIndividualTracks && (
            <div className='space-y-2 mt-2'>
              {trackDiffs.map(diff => {
                const positionKey = `${diff.discNumber}-${diff.position}`;
                const isSelected =
                  !selections.tracks.excludedPositions.has(positionKey);
                const title =
                  diff.source?.title || diff.current?.title || '(Unknown)';
                const changeColorClass = getChangeColorClass(diff.changeType);

                return (
                  <div
                    key={positionKey}
                    className='flex items-start gap-3 rounded-md bg-zinc-800/50 p-2'
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={checked =>
                        handleToggleTrack(positionKey, Boolean(checked))
                      }
                      className='mt-0.5 shrink-0'
                    />
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-baseline gap-2'>
                        <span className='text-xs font-mono text-zinc-500'>
                          {diff.discNumber}-{diff.position}
                        </span>
                        <span
                          className={`text-xs font-medium truncate ${changeColorClass}`}
                        >
                          {title}
                        </span>
                      </div>
                      {diff.changeType !== 'MATCH' && (
                        <div className='text-xs text-zinc-500 mt-0.5'>
                          {diff.changeType === 'MODIFIED' && '(modified)'}
                          {diff.changeType === 'ADDED' && '(added)'}
                          {diff.changeType === 'REMOVED' && '(removed)'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Track summary */}
          <div className='text-xs text-zinc-500 pt-2'>
            {trackSummary.matching} match · {trackSummary.modified} modified ·{' '}
            {trackSummary.added} added · {trackSummary.removed} removed
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
