/**
 * Compact summary display of selected changes for apply confirmation.
 *
 * Filters to show only selected fields with before → after comparisons.
 * Provides visual summary of what will be changed when applying correction.
 */

'use client';

import type {
  CorrectionPreview,
  FieldDiff,
  TextDiff,
  DateDiff,
  ArrayDiff,
  ExternalIdDiff,
  DateComponents,
} from '@/lib/correction/preview/types';
import type { UIFieldSelections } from './types';

interface DiffSummaryProps {
  preview: CorrectionPreview;
  selections: UIFieldSelections;
}

export function DiffSummary({ preview, selections }: DiffSummaryProps) {
  // Filter field diffs to only show selected fields
  const selectedFieldDiffs = preview.fieldDiffs.filter(diff => {
    if (diff.field === 'title') return selections.metadata.title;
    if (diff.field === 'releaseDate') return selections.metadata.releaseDate;
    if (diff.field === 'releaseType') return selections.metadata.releaseType;
    if (diff.field === 'releaseCountry')
      return selections.metadata.releaseCountry;
    if (diff.field === 'barcode') return selections.metadata.barcode;
    if (diff.field === 'label') return selections.metadata.label;

    // Handle external ID diffs
    if (
      diff.field === 'musicbrainzId' ||
      diff.field === 'spotifyId' ||
      diff.field === 'discogsId'
    ) {
      if (diff.field === 'musicbrainzId')
        return selections.externalIds.musicbrainzId;
      if (diff.field === 'spotifyId') return selections.externalIds.spotifyId;
      if (diff.field === 'discogsId') return selections.externalIds.discogsId;
    }

    return false;
  });

  // Count selected tracks
  const selectedTracksCount = preview.trackDiffs.filter(trackDiff => {
    const positionKey = `${trackDiff.discNumber}-${trackDiff.position}`;
    const isExcluded = selections.tracks.excludedPositions.has(positionKey);
    return selections.tracks.applyAll && !isExcluded;
  }).length;

  // Check if cover art is being updated
  const isCoverArtSelected =
    selections.coverArt === 'use_source' || selections.coverArt === 'clear';

  // Check if any changes are selected
  const hasChanges =
    selectedFieldDiffs.length > 0 ||
    selectedTracksCount > 0 ||
    isCoverArtSelected;

  if (!hasChanges) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
        <div className="text-center text-sm text-zinc-400">
          No changes selected
        </div>
      </div>
    );
  }

  // Group field diffs by category
  const metadataDiffs = selectedFieldDiffs.filter(
    diff =>
      diff.field !== 'musicbrainzId' &&
      diff.field !== 'spotifyId' &&
      diff.field !== 'discogsId'
  );

  const externalIdDiffs = selectedFieldDiffs.filter(
    diff =>
      diff.field === 'musicbrainzId' ||
      diff.field === 'spotifyId' ||
      diff.field === 'discogsId'
  ) as ExternalIdDiff[];

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
      <h3 className="mb-4 text-sm font-medium text-zinc-300">
        Summary of Changes
      </h3>

      <div className="space-y-4">
        {/* Metadata changes */}
        {metadataDiffs.length > 0 && (
          <div>
            <div className="mb-2 text-sm font-medium text-zinc-400">
              Metadata:
            </div>
            <div className="space-y-1.5 pl-2">
              {metadataDiffs.map(diff => (
                <FieldChange key={diff.field} diff={diff} />
              ))}
            </div>
          </div>
        )}

        {/* Track changes */}
        {selectedTracksCount > 0 && (
          <div>
            <div className="mb-2 text-sm font-medium text-zinc-400">
              Tracks:
            </div>
            <div className="pl-2 text-sm text-zinc-300">
              {selectedTracksCount} track{selectedTracksCount !== 1 ? 's' : ''}{' '}
              will be updated
            </div>
          </div>
        )}

        {/* External ID changes */}
        {externalIdDiffs.length > 0 && (
          <div>
            <div className="mb-2 text-sm font-medium text-zinc-400">
              External IDs:
            </div>
            <div className="space-y-1.5 pl-2">
              {externalIdDiffs.map(diff => (
                <ExternalIdChange key={diff.field} diff={diff} />
              ))}
            </div>
          </div>
        )}

        {/* Cover art change */}
        {isCoverArtSelected && (
          <div>
            <div className="mb-2 text-sm font-medium text-zinc-400">
              Cover Art:
            </div>
            <div className="pl-2 text-sm text-zinc-300">
              {selections.coverArt === 'use_source'
                ? 'Will be updated'
                : 'Will be cleared'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Type guard for DateDiff
 */
function isDateDiff(diff: FieldDiff): diff is DateDiff {
  return diff.field === 'releaseDate';
}

/**
 * Type guard for ArrayDiff
 */
function isArrayDiff(diff: FieldDiff): diff is ArrayDiff {
  return 'currentItems' in diff && 'sourceItems' in diff;
}

/**
 * Renders a single field change with before → after display.
 */
function FieldChange({ diff }: { diff: FieldDiff }) {
  const fieldLabel = formatFieldLabel(diff.field);

  // Handle DateDiff specially
  if (isDateDiff(diff)) {
    const current = formatDateComponents(diff.current);
    const source = formatDateComponents(diff.source);

    if (diff.changeType === 'ADDED') {
      return (
        <div className="text-sm">
          <span className="text-zinc-400">{fieldLabel}:</span>{' '}
          <span className="text-green-400">+ {source}</span>
        </div>
      );
    }

    if (diff.changeType === 'REMOVED') {
      return (
        <div className="text-sm">
          <span className="text-zinc-400">{fieldLabel}:</span>{' '}
          <span className="text-red-400 line-through">{current}</span>
        </div>
      );
    }

    // MODIFIED or CONFLICT
    return (
      <div className="text-sm">
        <span className="text-zinc-400">{fieldLabel}:</span>{' '}
        <span className="text-red-400 line-through">{current}</span>{' '}
        <span className="text-zinc-500">→</span>{' '}
        <span className="text-green-400">{source}</span>
      </div>
    );
  }

  // Handle ArrayDiff
  if (isArrayDiff(diff)) {
    const addedCount = diff.added.length;
    const removedCount = diff.removed.length;

    return (
      <div className="text-sm">
        <span className="text-zinc-400">{fieldLabel}:</span>{' '}
        {addedCount > 0 && (
          <span className="text-green-400">+{addedCount} added</span>
        )}
        {addedCount > 0 && removedCount > 0 && (
          <span className="text-zinc-500">, </span>
        )}
        {removedCount > 0 && (
          <span className="text-red-400">{removedCount} removed</span>
        )}
      </div>
    );
  }

  // Handle TextDiff (and generic case)
  const textDiff = diff as TextDiff;
  const current = formatValue(textDiff.currentValue);
  const source = formatValue(textDiff.sourceValue);

  if (diff.changeType === 'ADDED') {
    return (
      <div className="text-sm">
        <span className="text-zinc-400">{fieldLabel}:</span>{' '}
        <span className="text-green-400">+ {source}</span>
      </div>
    );
  }

  if (diff.changeType === 'REMOVED') {
    return (
      <div className="text-sm">
        <span className="text-zinc-400">{fieldLabel}:</span>{' '}
        <span className="text-red-400 line-through">{current}</span>
      </div>
    );
  }

  // MODIFIED or CONFLICT
  return (
    <div className="text-sm">
      <span className="text-zinc-400">{fieldLabel}:</span>{' '}
      <span className="text-red-400 line-through">{current}</span>{' '}
      <span className="text-zinc-500">→</span>{' '}
      <span className="text-green-400">{source}</span>
    </div>
  );
}

/**
 * Renders an external ID change.
 */
function ExternalIdChange({ diff }: { diff: ExternalIdDiff }) {
  const idLabel = formatIdType(diff.field);
  const current = formatId(diff.currentValue);
  const source = formatId(diff.sourceValue);

  if (diff.changeType === 'ADDED') {
    return (
      <div className="text-sm">
        <span className="text-zinc-400">{idLabel}:</span>{' '}
        <span className="text-green-400">+ {source}</span>
      </div>
    );
  }

  if (diff.changeType === 'REMOVED') {
    return (
      <div className="text-sm">
        <span className="text-zinc-400">{idLabel}:</span>{' '}
        <span className="text-red-400 line-through">{current}</span>
      </div>
    );
  }

  // MODIFIED
  return (
    <div className="text-sm">
      <span className="text-zinc-400">{idLabel}:</span>{' '}
      <span className="text-red-400 line-through">{current}</span>{' '}
      <span className="text-zinc-500">→</span>{' '}
      <span className="text-green-400">{source}</span>
    </div>
  );
}

/**
 * Formats field names for display.
 */
function formatFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    title: 'Title',
    releaseDate: 'Release Date',
    releaseType: 'Type',
    releaseCountry: 'Country',
    barcode: 'Barcode',
    label: 'Label',
    disambiguation: 'Disambiguation',
  };
  return labels[field] || field;
}

/**
 * Formats ID type names for display.
 */
function formatIdType(field: 'musicbrainzId' | 'spotifyId' | 'discogsId'): string {
  const labels = {
    musicbrainzId: 'MusicBrainz',
    spotifyId: 'Spotify',
    discogsId: 'Discogs',
  };
  return labels[field];
}

/**
 * Formats field values with truncation.
 */
function formatValue(value: string | null): string {
  if (value === null || value === undefined) return '(empty)';

  const str = String(value);

  // Truncate long values
  if (str.length > 30) {
    return str.slice(0, 27) + '...';
  }
  return str;
}

/**
 * Formats external IDs with truncation.
 */
function formatId(value: string | null): string {
  if (value === null || value === undefined) return '(none)';

  const str = String(value);

  // Show first 8 chars with ellipsis for long IDs
  if (str.length > 12) {
    return str.slice(0, 8) + '...';
  }
  return str;
}

/**
 * Formats date components for display.
 */
function formatDateComponents(components: DateComponents | null): string {
  if (!components) return '(empty)';

  const parts: string[] = [];
  if (components.year) parts.push(String(components.year));
  if (components.month) parts.push(String(components.month).padStart(2, '0'));
  if (components.day) parts.push(String(components.day).padStart(2, '0'));

  return parts.length > 0 ? parts.join('-') : '(empty)';
}
