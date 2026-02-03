'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { Button } from '@/components/ui/button';

export interface Track {
  trackNumber: number;
  title: string;
  durationMs: number | null;
  discNumber?: number;
}

export interface TrackListingProps {
  tracks: Track[];
}

const AUTO_COLLAPSE_THRESHOLD = 30;
const COLLAPSED_TRACK_COUNT = 10;

/**
 * Formats duration from milliseconds to mm:ss format.
 */
function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return minutes + ':' + seconds.toString().padStart(2, '0');
}

/**
 * Displays album tracks with auto-collapse for large track lists (30+ tracks).
 * Supports multi-disc albums with disc grouping.
 */
export function TrackListing({ tracks }: TrackListingProps) {
  const shouldAutoCollapse = tracks.length >= AUTO_COLLAPSE_THRESHOLD;
  const [showAll, setShowAll] = useState(!shouldAutoCollapse);

  // Group tracks by disc number
  const discGroups = useMemo(() => {
    const groups = new Map<number, Track[]>();

    tracks.forEach(track => {
      const disc = track.discNumber ?? 1;
      if (!groups.has(disc)) {
        groups.set(disc, []);
      }
      groups.get(disc)!.push(track);
    });

    // Sort by disc number
    return Array.from(groups.entries()).sort(([a], [b]) => a - b);
  }, [tracks]);

  const hasMultipleDiscs = discGroups.length > 1;

  // Flatten and limit tracks for collapsed view
  const displayTracks = useMemo(() => {
    if (showAll) return tracks;
    return tracks.slice(0, COLLAPSED_TRACK_COUNT);
  }, [tracks, showAll]);

  const renderTrack = (track: Track) => (
    <li
      key={track.discNumber + '-' + track.trackNumber}
      className='flex justify-between items-center py-0.5 text-sm'
    >
      <span className='text-zinc-500 mr-2 tabular-nums w-6 text-right flex-shrink-0'>
        {track.trackNumber}.
      </span>
      <span className='flex-1 truncate text-zinc-300'>{track.title}</span>
      <span className='text-zinc-500 ml-2 tabular-nums'>
        {formatDuration(track.durationMs)}
      </span>
    </li>
  );

  // Render tracks without disc grouping (collapsed view or single disc)
  const renderFlatList = () => (
    <ol className='space-y-0.5'>{displayTracks.map(renderTrack)}</ol>
  );

  // Render tracks with disc grouping
  const renderGroupedList = () => (
    <div className='space-y-4'>
      {discGroups.map(([discNumber, discTracks]) => (
        <div key={discNumber}>
          <h4 className='text-sm font-medium text-zinc-400 mb-2'>
            Disc {discNumber}
          </h4>
          <ol className='space-y-0.5'>{discTracks.map(renderTrack)}</ol>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      {/* Show flat list when collapsed or single disc, grouped when expanded multi-disc */}
      {showAll && hasMultipleDiscs ? renderGroupedList() : renderFlatList()}

      {/* Expand/Collapse button for large track lists */}
      {shouldAutoCollapse && (
        <Button
          variant='ghost'
          size='sm'
          className='w-full mt-3 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
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
              Show all {tracks.length} tracks
            </>
          )}
        </Button>
      )}
    </div>
  );
}
