/**
 * Field comparison list component for correction preview.
 *
 * Renders all field diffs, filtering out UNCHANGED fields.
 * Also handles special artist credits diff display.
 */

import { ChangeType, type TextDiffPart } from '@/generated/graphql';
import type {
  FieldDiff,
  ArtistCreditDiff,
} from '@/lib/correction/preview/types';

import { FieldComparison } from './FieldComparison';
import { InlineTextDiff } from './InlineTextDiff';

/**
 * Props for FieldComparisonList component
 */
export interface FieldComparisonListProps {
  /** Array of field diffs from preview - comes from JSON scalar */
  fieldDiffs: FieldDiff[];
  /** Optional artist credit diff for special handling */
  artistDiff?: ArtistCreditDiff;
}

/**
 * Get change type badge content and styling for artist diff.
 */
function getArtistChangeBadge(
  changeType: string
): { label: string; className: string } | null {
  switch (changeType) {
    case 'ADDED':
      return { label: '(New)', className: 'text-green-400' };
    case 'MODIFIED':
      return { label: '(Modified)', className: 'text-yellow-400' };
    case 'REMOVED':
      return { label: '(Removed)', className: 'text-red-400' };
    case 'CONFLICT':
      return { label: '(Conflict)', className: 'text-orange-400' };
    case 'UNCHANGED':
      return null;
    default:
      return null;
  }
}

/**
 * Renders all changed fields from the preview comparison.
 *
 * Features:
 * - Filters out UNCHANGED fields (only shows actual changes)
 * - Renders each field via FieldComparison component
 * - Special handling for artist credits diff with name comparison
 * - Empty state message when no changes detected
 *
 * @example
 * ```tsx
 * <FieldComparisonList
 *   fieldDiffs={preview.fieldDiffs}
 *   artistDiff={preview.artistDiff}
 * />
 * ```
 */
export function FieldComparisonList({
  fieldDiffs,
  artistDiff,
}: FieldComparisonListProps) {
  // Filter out unchanged fields
  const changedFields = fieldDiffs.filter(
    diff => diff.changeType !== 'UNCHANGED'
  );

  // Check if artist diff has changes
  const hasArtistChanges = artistDiff && artistDiff.changeType !== 'UNCHANGED';

  // Empty state if no changes
  if (changedFields.length === 0 && !hasArtistChanges) {
    return (
      <div className='py-4 text-center'>
        <p className='text-zinc-500 text-sm'>No field changes detected</p>
      </div>
    );
  }

  return (
    <div className='space-y-1 divide-y divide-zinc-800'>
      {/* Render changed field diffs */}
      {changedFields.map(diff => (
        <FieldComparison key={diff.field} diff={diff} />
      ))}

      {/* Special artist credits display */}
      {hasArtistChanges && artistDiff && (
        <div className='py-3 border-b border-zinc-800 last:border-b-0'>
          {/* Field label with change badge */}
          <div className='flex items-center gap-2 mb-1'>
            <span className='text-sm font-medium text-zinc-300'>
              Artist Credits
            </span>
            {(() => {
              const badge = getArtistChangeBadge(artistDiff.changeType);
              return badge ? (
                <span className={`text-xs ${badge.className}`}>
                  {badge.label}
                </span>
              ) : null;
            })()}
          </div>

          {/* Current artist display */}
          <div className='text-sm'>
            <span className='text-zinc-500 text-xs mr-2'>Current:</span>
            <span className='text-zinc-400'>
              {artistDiff.currentDisplay || '—'}
            </span>
          </div>

          {/* Source artist display with optional diff */}
          <div className='text-sm mt-1'>
            <span className='text-zinc-500 text-xs mr-2'>Source:</span>
            {artistDiff.nameDiff && artistDiff.nameDiff.length > 0 ? (
              <InlineTextDiff parts={artistDiff.nameDiff as TextDiffPart[]} />
            ) : (
              <span className='text-zinc-200'>
                {artistDiff.sourceDisplay || '—'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
