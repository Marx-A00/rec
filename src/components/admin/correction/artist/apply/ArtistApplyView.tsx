'use client';

import { useState } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';

import {
  type ArtistFieldDiff,
  ChangeType,
} from '@/generated/graphql';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { getArtistCorrectionStore } from '@/stores/useArtistCorrectionStore';

export interface UIArtistFieldSelections {
  metadata: {
    name: boolean;
    disambiguation: boolean;
    countryCode: boolean;
    artistType: boolean;
    area: boolean;
    beginDate: boolean;
    endDate: boolean;
    gender: boolean;
  };
  externalIds: {
    musicbrainzId: boolean;
    ipi: boolean;
    isni: boolean;
  };
}

interface ArtistApplyViewProps {
  /** Database artist ID for store lookup */
  artistId: string;
  /** Callback to trigger apply (reads from store) */
  onApply: () => void;
  /** Apply mutation loading state */
  isApplying?: boolean;
  /** Apply mutation error state */
  error?: Error | null;
}

/**
 * Create default selections with changed fields selected.
 */
export function createDefaultArtistSelections(
  preview: { fieldDiffs: ArtistFieldDiff[] }
): UIArtistFieldSelections {
  const metadataFields = [
    'name',
    'disambiguation',
    'countryCode',
    'artistType',
    'area',
    'beginDate',
    'endDate',
    'gender',
  ];
  const externalIdFields = ['musicbrainzId', 'ipi', 'isni'];

  const metadata: UIArtistFieldSelections['metadata'] = {
    name: false,
    disambiguation: false,
    countryCode: false,
    artistType: false,
    area: false,
    beginDate: false,
    endDate: false,
    gender: false,
  };

  const externalIds: UIArtistFieldSelections['externalIds'] = {
    musicbrainzId: false,
    ipi: false,
    isni: false,
  };

  // Select fields that have changes by default
  for (const diff of preview.fieldDiffs) {
    if (diff.changeType !== ChangeType.Unchanged) {
      if (metadataFields.includes(diff.field)) {
        metadata[diff.field as keyof typeof metadata] = true;
      } else if (externalIdFields.includes(diff.field)) {
        externalIds[diff.field as keyof typeof externalIds] = true;
      }
    }
  }

  return { metadata, externalIds };
}

/**
 * Format camelCase field names to human-readable labels.
 */
function formatFieldName(field: string): string {
  const labels: Record<string, string> = {
    name: 'Name',
    disambiguation: 'Disambiguation',
    countryCode: 'Country',
    artistType: 'Type',
    area: 'Area',
    beginDate: 'Begin Date',
    endDate: 'End Date',
    gender: 'Gender',
    musicbrainzId: 'MusicBrainz ID',
    ipi: 'IPI',
    isni: 'ISNI',
  };
  return (
    labels[field] ||
    field.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())
  );
}

/**
 * Field selection checkbox with diff preview.
 */
function FieldSelectionItem({
  field,
  diff,
  checked,
  onCheckedChange,
}: {
  field: string;
  diff: ArtistFieldDiff | undefined;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const hasChange = diff && diff.changeType !== ChangeType.Unchanged;

  if (!hasChange) return null;

  return (
    <div className='flex items-start gap-3 py-2'>
      <Checkbox
        id={field}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className='mt-1'
      />
      <div className='flex-1'>
        <label
          htmlFor={field}
          className='text-sm font-medium text-zinc-300 cursor-pointer'
        >
          {formatFieldName(field)}
        </label>
        <div className='text-xs mt-1'>
          <span className='text-zinc-500'>{diff.current || '—'}</span>
          <span className='text-zinc-600 mx-2'>→</span>
          <span className='text-zinc-200'>{diff.source || '—'}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Artist apply view for selecting fields and applying corrections.
 * Reads preview data and selections from store.
 */
export function ArtistApplyView({
  artistId,
  onApply,
  isApplying = false,
  error = null,
}: ArtistApplyViewProps) {
  // Get store for this artist
  const store = getArtistCorrectionStore(artistId);
  const preview = store((s) => s.previewData);
  const selections = store((s) => s.applySelections);
  const triggerEnrichment = store((s) => s.shouldEnrich);

  const [showErrorDetails, setShowErrorDetails] = useState(false);

  // Guard: preview and selections required
  if (!preview || !selections) {
    return (
      <div className='flex items-center justify-center py-12'>
        <p className='text-zinc-500'>Preview data not available</p>
      </div>
    );
  }

  // Group diffs by category
  const metadataFields = [
    'name',
    'disambiguation',
    'countryCode',
    'artistType',
    'area',
    'beginDate',
    'endDate',
    'gender',
  ];
  const externalIdFields = ['musicbrainzId', 'ipi', 'isni'];

  const getDiff = (field: string): ArtistFieldDiff | undefined =>
    preview.fieldDiffs.find(d => d.field === field);

  // Count selected fields
  const metadataCount = Object.values(selections.metadata).filter(
    Boolean
  ).length;
  const externalIdCount = Object.values(selections.externalIds).filter(
    Boolean
  ).length;
  const totalSelected = metadataCount + externalIdCount;

  const handleApply = () => {
    if (totalSelected === 0 || isApplying) return;
    onApply();
  };

  const updateMetadata = (
    field: keyof UIArtistFieldSelections['metadata'],
    value: boolean
  ) => {
    store.getState().setApplySelections({
      ...selections,
      metadata: { ...selections.metadata, [field]: value },
    });
  };

  const updateExternalId = (
    field: keyof UIArtistFieldSelections['externalIds'],
    value: boolean
  ) => {
    store.getState().setApplySelections({
      ...selections,
      externalIds: { ...selections.externalIds, [field]: value },
    });
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
          onClick={() => store.getState().prevStep()}
          className='flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-300'
        >
          <ChevronLeft className='h-4 w-4' />
          Back to preview
        </button>
      </div>

      {/* Two-column layout */}
      <div className='grid gap-6 lg:grid-cols-2'>
        {/* Left column: Field selection */}
        <div className='space-y-6'>
          {/* Metadata section */}
          <div className='rounded-lg border border-zinc-800 p-4'>
            <h3 className='text-sm font-medium text-zinc-200 mb-4'>
              Metadata {metadataCount > 0 && '(' + metadataCount + ' selected)'}
            </h3>
            <div className='divide-y divide-zinc-800'>
              {metadataFields.map(field => (
                <FieldSelectionItem
                  key={field}
                  field={field}
                  diff={getDiff(field)}
                  checked={
                    selections.metadata[
                      field as keyof typeof selections.metadata
                    ]
                  }
                  onCheckedChange={checked =>
                    updateMetadata(
                      field as keyof typeof selections.metadata,
                      checked
                    )
                  }
                />
              ))}
            </div>
          </div>

          {/* External IDs section */}
          <div className='rounded-lg border border-zinc-800 p-4'>
            <h3 className='text-sm font-medium text-zinc-200 mb-4'>
              External IDs{' '}
              {externalIdCount > 0 && '(' + externalIdCount + ' selected)'}
            </h3>
            <div className='divide-y divide-zinc-800'>
              {externalIdFields.map(field => (
                <FieldSelectionItem
                  key={field}
                  field={field}
                  diff={getDiff(field)}
                  checked={
                    selections.externalIds[
                      field as keyof typeof selections.externalIds
                    ]
                  }
                  onCheckedChange={checked =>
                    updateExternalId(
                      field as keyof typeof selections.externalIds,
                      checked
                    )
                  }
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Summary and apply button */}
        <div className='space-y-4'>
          {/* Summary box */}
          <div className='rounded-lg border border-zinc-800 p-4'>
            <h3 className='text-sm font-medium text-zinc-200 mb-2'>Summary</h3>
            <p className='text-sm text-zinc-400'>
              {totalSelected === 0
                ? 'No fields selected'
                : totalSelected +
                  ' field' +
                  (totalSelected !== 1 ? 's' : '') +
                  ' will be updated'}
            </p>
            {preview.albumCount > 0 && (
              <p className='text-sm text-amber-400 mt-2'>
                This will affect {preview.albumCount} album
                {preview.albumCount !== 1 ? 's' : ''} by this artist
              </p>
            )}
          </div>

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
          {totalSelected === 0 && (
            <div className='rounded-lg border border-amber-700 bg-amber-900/20 p-4'>
              <div className='text-sm text-amber-400'>
                Select at least one field to apply
              </div>
            </div>
          )}

          {/* Re-enrichment checkbox */}
          <div className='flex items-center gap-2'>
            <Checkbox
              id='trigger-enrichment-artist'
              checked={triggerEnrichment}
              onCheckedChange={checked =>
                store.getState().setShouldEnrich(checked === true)
              }
            />
            <label
              htmlFor='trigger-enrichment-artist'
              className='text-sm text-zinc-400 cursor-pointer'
            >
              Re-enrich from MusicBrainz after applying
            </label>
          </div>

          {/* Apply button */}
          <div className='flex justify-end'>
            <Button
              onClick={handleApply}
              disabled={totalSelected === 0 || isApplying}
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
