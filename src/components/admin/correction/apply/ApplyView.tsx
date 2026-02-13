/**
 * Main container for the apply workflow step.
 *
 * Combines field selection form with diff summary.
 * Provides step transition model where "Confirm & Apply" button initiates
 * the mutation (no separate confirmation dialog).
 */

'use client';

import { useState, useEffect } from 'react';

import type { CorrectionPreview } from '@/lib/correction/preview/types';
import { Checkbox } from '@/components/ui/checkbox';
import { getCorrectionStore } from '@/stores/useCorrectionStore';

import { FieldSelectionForm } from './FieldSelectionForm';
import { DiffSummary } from './DiffSummary';
import { type UIFieldSelections } from './types';

interface ApplyViewProps {
  /** Album being corrected (for store access) */
  albumId: string;
  /** Error from apply mutation, if any */
  error?: Error | null;
}

export function ApplyView({ albumId, error = null }: ApplyViewProps) {
  // Show/hide error details
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  // Read state from Zustand store
  const store = getCorrectionStore(albumId);
  const preview = store(s => s.previewData);
  const selections = store(s => s.applySelections);
  const shouldEnrich = store(s => s.shouldEnrich);

  const setApplySelections = store.getState().setApplySelections;
  const setShouldEnrich = store.getState().setShouldEnrich;

  // Debug logging for correction workflow tracing
  useEffect(() => {
    if (preview && selections) {
      console.log('[ApplyView] Rendering with:', {
        preview: {
          fieldDiffs: preview.fieldDiffs.map(d => ({
            field: d.field,
            changeType: d.changeType,
            hasChange: d.changeType !== 'UNCHANGED',
          })),
          artistDiff: {
            changeType: preview.artistDiff.changeType,
            current: preview.artistDiff.currentDisplay,
            source: preview.artistDiff.sourceDisplay,
          },
          trackSummary: preview.trackSummary,
        },
        selections,
      });
    }
  }, [preview, selections]);

  // Guard for null preview/selections (shouldn't happen in normal flow)
  if (!preview || !selections) {
    return (
      <div className='flex items-center justify-center py-12'>
        <p className='text-zinc-500'>Preview data not available</p>
      </div>
    );
  }

  // Calculate if any changes are selected
  const hasSelections = calculateHasSelections(selections, preview);

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-xl font-semibold text-zinc-100'>
            Review & Apply
          </h2>
          <p className='mt-1 text-sm text-zinc-400'>
            Select fields to apply and review changes
          </p>
        </div>
      </div>

      {/* Field selection form */}
      <FieldSelectionForm
        preview={preview}
        selections={selections}
        onSelectionsChange={setApplySelections}
      />

      {/* Summary of changes - at bottom */}
      <DiffSummary preview={preview} selections={selections} />

      {/* Status messages */}
      <div className='space-y-4'>
        {/* Error display */}
        {error && (
          <div className='rounded-lg border border-red-800 bg-red-900/20 p-4'>
            <div className='text-sm font-medium text-red-400'>
              Failed to apply correction
            </div>
            <div className='mt-1 text-sm text-red-300'>{error.message}</div>
            {error.stack && (
              <div className='mt-2'>
                <button
                  onClick={() => setShowErrorDetails(!showErrorDetails)}
                  className='text-xs text-red-400 underline hover:text-red-300'
                >
                  {showErrorDetails ? 'Hide' : 'Show'} details
                </button>
                {showErrorDetails && (
                  <pre className='mt-2 overflow-x-auto rounded bg-red-950/50 p-2 text-xs text-red-300'>
                    {error.stack}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* Empty selection warning */}
        {!hasSelections && (
          <div className='rounded-lg border border-amber-700 bg-amber-900/20 p-4'>
            <div className='text-sm text-amber-400'>
              Select at least one field to apply
            </div>
          </div>
        )}

        {/* Re-enrichment checkbox */}
        <div className='flex items-center gap-2'>
          <Checkbox
            id='trigger-enrichment'
            checked={shouldEnrich}
            onCheckedChange={checked => setShouldEnrich(checked === true)}
          />
          <label
            htmlFor='trigger-enrichment'
            className='text-sm text-zinc-400 cursor-pointer'
          >
            Re-enrich from MusicBrainz after applying
          </label>
        </div>
      </div>
    </div>
  );
}

/**
 * Calculates if any fields are selected for application.
 *
 * Returns false if no changes are selected across all categories:
 * - Metadata fields
 * - Tracks
 * - External IDs
 * - Cover art
 */
export function calculateHasSelections(
  selections: UIFieldSelections,
  preview: CorrectionPreview
): boolean {
  // Check metadata fields
  const hasMetadata =
    selections.metadata.title ||
    selections.metadata.releaseDate ||
    selections.metadata.releaseType ||
    selections.metadata.releaseCountry ||
    selections.metadata.barcode ||
    selections.metadata.label;

  // Check tracks - only count tracks that actually have changes (not MATCH)
  const selectedTracksCount = preview.trackDiffs.filter(trackDiff => {
    if (trackDiff.changeType === 'MATCH') return false;

    const positionKey = `${trackDiff.discNumber}-${trackDiff.position}`;
    const isExcluded = selections.tracks.excludedPositions.has(positionKey);
    return selections.tracks.applyAll && !isExcluded;
  }).length;
  const hasTracks = selectedTracksCount > 0;

  // Check external IDs
  const hasExternalIds =
    selections.externalIds.musicbrainzId ||
    selections.externalIds.spotifyId ||
    selections.externalIds.discogsId;

  // Check cover art
  const hasCoverArt =
    selections.coverArt === 'use_source' || selections.coverArt === 'clear';

  return hasMetadata || hasTracks || hasExternalIds || hasCoverArt;
}
