/**
 * Main container for the apply workflow step.
 *
 * Combines field selection form with diff summary in a two-column layout.
 * Provides step transition model where "Confirm & Apply" button initiates
 * the mutation (no separate confirmation dialog).
 */

'use client';

import { useState } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';

import type { CorrectionPreview } from '@/lib/correction/preview/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

import { FieldSelectionForm } from './FieldSelectionForm';
import { DiffSummary } from './DiffSummary';
import { createDefaultUISelections, type UIFieldSelections } from './types';

interface ApplyViewProps {
  /** Album being corrected */
  _albumId: string;
  /** Correction preview data */
  preview: CorrectionPreview;
  /** Callback when admin confirms and applies correction */
  onApply: (selections: UIFieldSelections, triggerEnrichment?: boolean) => void;
  /** Callback to return to preview step */
  onBack: () => void;
  /** Whether apply mutation is in progress */
  isApplying?: boolean;
  /** Error from apply mutation, if any */
  error?: Error | null;
}

export function ApplyView({
  _albumId,
  preview,
  onApply,
  onBack,
  isApplying = false,
  error = null,
}: ApplyViewProps) {
  // Initialize selections with all fields selected by default
  const [selections, setSelections] = useState<UIFieldSelections>(() =>
    createDefaultUISelections(preview)
  );

  // Show/hide error details
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  // Re-enrichment checkbox state
  const [triggerEnrichment, setTriggerEnrichment] = useState(false);

  // Calculate if any changes are selected
  const hasSelections = calculateHasSelections(selections, preview);

  // Handle apply button click
  const handleApply = () => {
    if (!hasSelections || isApplying) return;
    onApply(selections, triggerEnrichment);
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-xl font-semibold text-zinc-100'>
            Apply Correction
          </h2>
          <p className='mt-1 text-sm text-zinc-400'>
            Select fields to apply and review changes
          </p>
        </div>
        <button
          onClick={onBack}
          className='flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-300'
        >
          <ChevronLeft className='h-4 w-4' />
          Back to preview
        </button>
      </div>

      {/* Two-column layout (responsive) */}
      <div className='grid gap-6 lg:grid-cols-2'>
        {/* Left column: Field selection form */}
        <div>
          <FieldSelectionForm
            preview={preview}
            selections={selections}
            onSelectionsChange={setSelections}
          />
        </div>

        {/* Right column: Summary and apply button */}
        <div className='space-y-4'>
          {/* Diff summary */}
          <DiffSummary preview={preview} selections={selections} />

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
              checked={triggerEnrichment}
              onCheckedChange={checked =>
                setTriggerEnrichment(checked === true)
              }
            />
            <label
              htmlFor='trigger-enrichment'
              className='text-sm text-zinc-400 cursor-pointer'
            >
              Re-enrich from MusicBrainz after applying
            </label>
          </div>

          {/* Apply button */}
          <div className='flex justify-end'>
            <Button
              onClick={handleApply}
              disabled={!hasSelections || isApplying}
              className='min-w-[180px]'
            >
              {isApplying ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Applying...
                </>
              ) : (
                'Confirm & Apply'
              )}
            </Button>
          </div>
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
function calculateHasSelections(
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

  // Check tracks
  const selectedTracksCount = preview.trackDiffs.filter(trackDiff => {
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
