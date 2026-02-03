'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { TextDiffPart } from '@/generated/graphql';

import { InlineTextDiff } from './InlineTextDiff';

/**
 * Track data from current album
 */
interface TrackData {
  title: string;
  durationMs: number | null;
  trackNumber: number;
}

/**
 * Track data from MusicBrainz source
 */
interface TrackSourceData {
  title: string;
  durationMs: number | null;
  mbid?: string | null;
}

/**
 * Single track diff entry from GraphQL
 */
export interface TrackDiff {
  position: number;
  discNumber: number;
  changeType: 'MATCH' | 'MODIFIED' | 'ADDED' | 'REMOVED' | string;
  current?: TrackData | null;
  source?: TrackSourceData | null;
  titleDiff?: TextDiffPart[] | null;
  durationDelta?: number | null;
}

/**
 * Summary statistics for track comparison
 */
export interface TrackListSummary {
  totalCurrent: number;
  totalSource: number;
  matching: number;
  modified: number;
  added: number;
  removed: number;
}

/**
 * Props for TrackComparison component
 */
export interface TrackComparisonProps {
  trackDiffs: TrackDiff[];
  summary: TrackListSummary;
}

const AUTO_COLLAPSE_THRESHOLD = 30;
const COLLAPSED_TRACK_COUNT = 10;

/**
 * Formats duration from milliseconds to mm:ss format.
 */
function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return '—';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return minutes + ':' + seconds.toString().padStart(2, '0');
}

/**
 * Gets the position display string (disc.track or just track)
 */
function getPositionDisplay(
  diff: TrackDiff,
  hasMultipleDiscs: boolean
): string {
  if (hasMultipleDiscs && diff.discNumber > 1) {
    return diff.discNumber + '.' + diff.position.toString();
  }
  return diff.position.toString();
}

/**
 * Track comparison component for preview workflow.
 *
 * Displays position-aligned track listing with:
 * - Summary header with change counts
 * - Two-column layout: current track | source track
 * - Color-coded rows based on change type (MATCH, MODIFIED, ADDED, REMOVED)
 * - Inline title diffs for modified tracks
 * - Auto-collapse for large track lists (30+ tracks)
 */
export function TrackComparison({ trackDiffs, summary }: TrackComparisonProps) {
  const shouldAutoCollapse = trackDiffs.length >= AUTO_COLLAPSE_THRESHOLD;
  const [showAll, setShowAll] = useState(!shouldAutoCollapse);

  // Check if any track has disc number > 1
  const hasMultipleDiscs = useMemo(
    () => trackDiffs.some(diff => diff.discNumber > 1),
    [trackDiffs]
  );

  // Get tracks to display based on collapse state
  const displayTracks = useMemo(() => {
    if (showAll) return trackDiffs;
    return trackDiffs.slice(0, COLLAPSED_TRACK_COUNT);
  }, [trackDiffs, showAll]);

  // Empty state
  if (trackDiffs.length === 0) {
    return (
      <div className='text-zinc-500 text-sm py-4 text-center'>
        No track data available
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Summary header */}
      <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-sm'>
        <span className='text-zinc-400'>Tracks:</span>
        {summary.matching > 0 && (
          <span className='text-zinc-300'>{summary.matching} matching</span>
        )}
        {summary.modified > 0 && (
          <span className='text-yellow-400'>{summary.modified} modified</span>
        )}
        {summary.added > 0 && (
          <span className='text-green-400'>{summary.added} added</span>
        )}
        {summary.removed > 0 && (
          <span className='text-red-400'>{summary.removed} removed</span>
        )}
      </div>

      {/* Track list header */}
      <div className='grid grid-cols-2 gap-4 text-xs text-zinc-500 uppercase tracking-wide pb-1 border-b border-zinc-700'>
        <div className='flex'>
          <span className='w-8'>#</span>
          <span className='flex-1'>Current</span>
          <span className='w-14 text-right'>Time</span>
        </div>
        <div className='flex'>
          <span className='w-8'>#</span>
          <span className='flex-1'>MusicBrainz</span>
          <span className='w-14 text-right'>Time</span>
        </div>
      </div>

      {/* Track rows */}
      <div className='space-y-1'>
        {displayTracks.map((diff, idx) => (
          <TrackRow
            key={`${diff.discNumber}-${diff.position}-${idx}`}
            diff={diff}
            hasMultipleDiscs={hasMultipleDiscs}
          />
        ))}
      </div>

      {/* Expand/collapse button */}
      {shouldAutoCollapse && (
        <Button
          variant='ghost'
          size='sm'
          className='w-full mt-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? (
            <>
              <ChevronUp className='h-4 w-4 mr-1' />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className='h-4 w-4 mr-1' />
              Show all {trackDiffs.length} tracks
            </>
          )}
        </Button>
      )}
    </div>
  );
}

/**
 * Individual track row component
 */
interface TrackRowProps {
  diff: TrackDiff;
  hasMultipleDiscs: boolean;
}

function TrackRow({ diff, hasMultipleDiscs }: TrackRowProps) {
  const positionDisplay = getPositionDisplay(diff, hasMultipleDiscs);

  // Determine row styling based on change type
  const rowStyles = getRowStyles(diff.changeType);

  return (
    <div
      className={`grid grid-cols-2 gap-4 py-1.5 text-sm ${rowStyles.container}`}
    >
      {/* Current track (left) */}
      <div className='flex items-start'>
        <span
          className={`w-8 tabular-nums text-right pr-2 ${rowStyles.currentPosition}`}
        >
          {diff.current ? positionDisplay + '.' : ''}
        </span>
        <span className={`flex-1 truncate ${rowStyles.currentTitle}`}>
          {diff.current ? diff.current.title : '—'}
        </span>
        <span
          className={`w-14 text-right tabular-nums ${rowStyles.currentDuration}`}
        >
          {diff.current ? formatDuration(diff.current.durationMs) : '—'}
        </span>
      </div>

      {/* Source track (right) */}
      <div className='flex items-start'>
        <span
          className={`w-8 tabular-nums text-right pr-2 ${rowStyles.sourcePosition}`}
        >
          {diff.source ? positionDisplay + '.' : ''}
        </span>
        <span className={`flex-1 truncate ${rowStyles.sourceTitle}`}>
          {diff.source ? (
            diff.titleDiff && diff.titleDiff.length > 0 ? (
              <InlineTextDiff parts={diff.titleDiff} />
            ) : (
              diff.source.title
            )
          ) : (
            '—'
          )}
        </span>
        <span
          className={`w-14 text-right tabular-nums ${rowStyles.sourceDuration}`}
        >
          {diff.source ? formatDuration(diff.source.durationMs) : '—'}
        </span>
      </div>
    </div>
  );
}

/**
 * Get styling classes based on change type
 */
function getRowStyles(changeType: string): {
  container: string;
  currentPosition: string;
  currentTitle: string;
  currentDuration: string;
  sourcePosition: string;
  sourceTitle: string;
  sourceDuration: string;
} {
  switch (changeType) {
    case 'MATCH':
      return {
        container: '',
        currentPosition: 'text-zinc-500',
        currentTitle: 'text-zinc-300',
        currentDuration: 'text-zinc-500',
        sourcePosition: 'text-zinc-500',
        sourceTitle: 'text-zinc-300',
        sourceDuration: 'text-zinc-500',
      };
    case 'MODIFIED':
      return {
        container: 'bg-yellow-500/5 rounded',
        currentPosition: 'text-zinc-500',
        currentTitle: 'text-zinc-300',
        currentDuration: 'text-zinc-500',
        sourcePosition: 'text-yellow-500/70',
        sourceTitle: 'text-yellow-400',
        sourceDuration: 'text-yellow-500/70',
      };
    case 'ADDED':
      return {
        container: 'bg-green-500/5 rounded',
        currentPosition: 'text-zinc-600',
        currentTitle: 'text-zinc-600',
        currentDuration: 'text-zinc-600',
        sourcePosition: 'text-green-500/70',
        sourceTitle: 'text-green-400',
        sourceDuration: 'text-green-500/70',
      };
    case 'REMOVED':
      return {
        container: 'bg-red-500/5 rounded opacity-60',
        currentPosition: 'text-red-500/70',
        currentTitle: 'text-red-400',
        currentDuration: 'text-red-500/70',
        sourcePosition: 'text-zinc-600',
        sourceTitle: 'text-zinc-600',
        sourceDuration: 'text-zinc-600',
      };
    default:
      return {
        container: '',
        currentPosition: 'text-zinc-500',
        currentTitle: 'text-zinc-300',
        currentDuration: 'text-zinc-500',
        sourcePosition: 'text-zinc-500',
        sourceTitle: 'text-zinc-300',
        sourceDuration: 'text-zinc-500',
      };
  }
}
