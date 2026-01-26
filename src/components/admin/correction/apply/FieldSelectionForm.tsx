'use client';

import { useCallback, useMemo } from 'react';

import { Accordion } from '@/components/ui/accordion';
import type { CorrectionPreview } from '@/lib/correction/preview/types';

import type { UIFieldSelections } from './types';
import { MetadataSection } from './MetadataSection';
import { TrackSection } from './TrackSection';
import { ExternalIdSection } from './ExternalIdSection';

/**
 * Props for FieldSelectionForm component
 */
export interface FieldSelectionFormProps {
  /** Correction preview data */
  preview: CorrectionPreview;
  /** Current field selections */
  selections: UIFieldSelections;
  /** Callback when selections change */
  onSelectionsChange: (selections: UIFieldSelections) => void;
}

/**
 * Main form container for field selection in the apply workflow step.
 *
 * Features:
 * - Global "Select all" / "Deselect all" buttons at top
 * - Accordion with three sections: Metadata, Tracks, External IDs
 * - Sections auto-expand based on which have changes
 * - Visual summary at bottom showing fields selected count
 *
 * Layout:
 * - Header: Global selection buttons
 * - Body: Accordion sections (MetadataSection, TrackSection, ExternalIdSection)
 * - Footer: Selection summary with counts per category
 */
export function FieldSelectionForm({
  preview,
  selections,
  onSelectionsChange,
}: FieldSelectionFormProps) {
  // Determine default expanded sections (sections with changes)
  const defaultExpanded = useMemo(() => {
    const expanded: string[] = [];

    // Check metadata changes
    const metadataFields = [
      'title',
      'releaseDate',
      'releaseType',
      'releaseCountry',
      'barcode',
      'label',
    ];
    const hasMetadataChanges = preview.fieldDiffs.some(
      diff =>
        metadataFields.includes(diff.field) && diff.changeType !== 'UNCHANGED'
    );
    if (hasMetadataChanges) {
      expanded.push('metadata');
    }

    // Check track changes
    if (preview.summary.hasTrackChanges) {
      expanded.push('tracks');
    }

    // Check external ID changes
    const externalIdFields = ['musicbrainzId', 'spotifyId', 'discogsId'];
    const hasIdChanges = preview.fieldDiffs.some(
      diff =>
        externalIdFields.includes(diff.field) && diff.changeType !== 'UNCHANGED'
    );
    if (hasIdChanges) {
      expanded.push('external-ids');
    }

    return expanded;
  }, [preview]);

  // Handle "Select all"
  const handleSelectAll = useCallback(() => {
    onSelectionsChange({
      metadata: {
        title: true,
        releaseDate: true,
        releaseType: true,
        releaseCountry: true,
        barcode: true,
        label: true,
      },
      tracks: {
        applyAll: true,
        excludedPositions: new Set(),
      },
      externalIds: {
        musicbrainzId: true,
        spotifyId: true,
        discogsId: true,
      },
      coverArt: selections.coverArt, // Keep cover art choice unchanged
    });
  }, [onSelectionsChange, selections.coverArt]);

  // Handle "Deselect all"
  const handleDeselectAll = useCallback(() => {
    onSelectionsChange({
      metadata: {
        title: false,
        releaseDate: false,
        releaseType: false,
        releaseCountry: false,
        barcode: false,
        label: false,
      },
      tracks: {
        applyAll: false,
        excludedPositions: new Set(
          preview.trackDiffs.map(diff => `${diff.discNumber}-${diff.position}`)
        ),
      },
      externalIds: {
        musicbrainzId: false,
        spotifyId: false,
        discogsId: false,
      },
      coverArt: selections.coverArt, // Keep cover art choice unchanged
    });
  }, [onSelectionsChange, preview.trackDiffs, selections.coverArt]);

  // Calculate selection counts for summary
  const selectionCounts = useMemo(() => {
    const metadataCount = Object.values(selections.metadata).filter(
      Boolean
    ).length;
    const trackCount = preview.trackDiffs.filter(diff => {
      const positionKey = `${diff.discNumber}-${diff.position}`;
      return !selections.tracks.excludedPositions.has(positionKey);
    }).length;
    const externalIdCount = Object.values(selections.externalIds).filter(
      Boolean
    ).length;
    const totalCount = metadataCount + trackCount + externalIdCount;

    return {
      metadata: metadataCount,
      tracks: trackCount,
      externalIds: externalIdCount,
      total: totalCount,
    };
  }, [selections, preview.trackDiffs]);

  return (
    <div className='flex flex-col gap-4'>
      {/* Global selection controls */}
      <div className='flex items-center justify-between px-4 py-3 bg-zinc-800 rounded-lg'>
        <span className='text-sm font-medium text-zinc-200'>
          Select fields to apply
        </span>
        <div className='flex gap-2'>
          <button
            type='button'
            onClick={handleSelectAll}
            className='px-3 py-1.5 text-xs font-medium text-zinc-200 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors'
          >
            Select all
          </button>
          <button
            type='button'
            onClick={handleDeselectAll}
            className='px-3 py-1.5 text-xs font-medium text-zinc-200 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors'
          >
            Deselect all
          </button>
        </div>
      </div>

      {/* Accordion sections */}
      <Accordion
        type='multiple'
        defaultValue={defaultExpanded}
        className='border border-zinc-700 rounded-lg overflow-hidden'
      >
        <MetadataSection
          selections={selections}
          onSelectionsChange={onSelectionsChange}
          fieldDiffs={preview.fieldDiffs}
        />
        <TrackSection
          selections={selections}
          onSelectionsChange={onSelectionsChange}
          trackDiffs={preview.trackDiffs}
          trackSummary={preview.trackSummary}
        />
        <ExternalIdSection
          selections={selections}
          onSelectionsChange={onSelectionsChange}
          fieldDiffs={preview.fieldDiffs}
        />
      </Accordion>

      {/* Selection summary */}
      <div className='px-4 py-3 bg-zinc-800 rounded-lg'>
        <div className='flex items-center justify-between text-sm'>
          <span className='font-medium text-zinc-200'>
            {selectionCounts.total} field
            {selectionCounts.total !== 1 ? 's' : ''} selected
          </span>
          <div className='flex gap-4 text-xs text-zinc-400'>
            <span>{selectionCounts.metadata} metadata</span>
            <span>{selectionCounts.tracks} tracks</span>
            <span>{selectionCounts.externalIds} IDs</span>
          </div>
        </div>
      </div>
    </div>
  );
}
