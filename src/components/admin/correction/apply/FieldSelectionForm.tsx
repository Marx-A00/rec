'use client';

import { useCallback, useMemo } from 'react';

import { Accordion } from '@/components/ui/accordion';
import type { CorrectionPreview } from '@/lib/correction/preview/types';

import type { UIFieldSelections } from './types';
import { MetadataSection } from './MetadataSection';
import { ArtistSection } from './ArtistSection';
import { TrackSection } from './TrackSection';
import { ExternalIdSection } from './ExternalIdSection';
import { CoverArtSection } from './CoverArtSection';

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

    // Check artist changes
    if (preview.artistDiff.changeType !== 'UNCHANGED') {
      expanded.push('artists');
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

    // Check cover art changes
    if (preview.coverArt.changeType !== 'UNCHANGED') {
      expanded.push('cover-art');
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
  // Only count fields that are BOTH selected AND have actual changes
  const selectionCounts = useMemo(() => {
    // Metadata: only count fields that have changes AND are selected
    const metadataFields = [
      'title',
      'releaseDate',
      'releaseType',
      'releaseCountry',
      'barcode',
      'label',
    ];
    const changedMetadataFields = preview.fieldDiffs
      .filter(
        diff =>
          metadataFields.includes(diff.field) && diff.changeType !== 'UNCHANGED'
      )
      .map(diff => diff.field);
    const metadataCount = changedMetadataFields.filter(
      field => selections.metadata[field as keyof typeof selections.metadata]
    ).length;

    // Tracks: only count tracks that have actual changes (not MATCH) and are selected
    const trackCount = preview.trackDiffs.filter(diff => {
      if (diff.changeType === 'MATCH') return false;
      const positionKey = `${diff.discNumber}-${diff.position}`;
      return !selections.tracks.excludedPositions.has(positionKey);
    }).length;

    // External IDs: only count fields that have changes AND are selected
    const externalIdFields = ['musicbrainzId', 'spotifyId', 'discogsId'];
    const changedExternalIdFields = preview.fieldDiffs
      .filter(
        diff =>
          externalIdFields.includes(diff.field) &&
          diff.changeType !== 'UNCHANGED'
      )
      .map(diff => diff.field);
    const externalIdCount = changedExternalIdFields.filter(
      field =>
        selections.externalIds[field as keyof typeof selections.externalIds]
    ).length;

    // Artists: count as 1 if there are artist changes (always applied as unit)
    const artistCount = preview.artistDiff.changeType !== 'UNCHANGED' ? 1 : 0;

    // Cover art: count as 1 if there's a change and user chose to apply it
    const coverArtCount =
      preview.coverArt.changeType !== 'UNCHANGED' &&
      selections.coverArt === 'use_source'
        ? 1
        : 0;

    const totalCount =
      metadataCount +
      trackCount +
      externalIdCount +
      artistCount +
      coverArtCount;

    return {
      metadata: metadataCount,
      tracks: trackCount,
      externalIds: externalIdCount,
      artists: artistCount,
      coverArt: coverArtCount,
      total: totalCount,
    };
  }, [selections, preview]);

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

      {/* Selection summary */}
      <div className='px-4 py-3 bg-zinc-800 rounded-lg'>
        <div className='flex items-center justify-between text-sm'>
          <span className='font-medium text-zinc-200'>
            {selectionCounts.total} change
            {selectionCounts.total !== 1 ? 's' : ''} to apply
          </span>
          <div className='flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400'>
            {selectionCounts.metadata > 0 && (
              <span>{selectionCounts.metadata} metadata</span>
            )}
            {selectionCounts.artists > 0 && (
              <span>{selectionCounts.artists} artist</span>
            )}
            {selectionCounts.tracks > 0 && (
              <span>{selectionCounts.tracks} tracks</span>
            )}
            {selectionCounts.externalIds > 0 && (
              <span>{selectionCounts.externalIds} IDs</span>
            )}
            {selectionCounts.coverArt > 0 && (
              <span>{selectionCounts.coverArt} cover</span>
            )}
          </div>
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
        <ArtistSection artistDiff={preview.artistDiff} />
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
        <CoverArtSection
          selections={selections}
          onSelectionsChange={onSelectionsChange}
          coverArt={preview.coverArt}
        />
      </Accordion>
    </div>
  );
}
