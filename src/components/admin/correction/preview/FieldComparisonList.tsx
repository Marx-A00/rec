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
  /** Whether to show only changed fields */
  showOnlyChanges?: boolean;
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
  showOnlyChanges = true,
}: FieldComparisonListProps) {
  // Filter out unchanged fields
  const changedFields = fieldDiffs.filter(
    diff => diff.changeType !== 'UNCHANGED'
  );
  const visibleFields = showOnlyChanges ? changedFields : fieldDiffs;

  // Check if artist diff has changes
  const hasArtistChanges = artistDiff && artistDiff.changeType !== 'UNCHANGED';
  const showArtist = showOnlyChanges ? hasArtistChanges : Boolean(artistDiff);

  // Empty state if no changes
  if (showOnlyChanges && changedFields.length === 0 && !hasArtistChanges) {
    return (
      <div className='py-4 text-center'>
        <p className='text-zinc-500 text-sm'>No field changes detected</p>
      </div>
    );
  }

  return (
    <div className='space-y-1 divide-y divide-zinc-800'>
      <div className='grid grid-cols-2 gap-4 text-xs text-zinc-500 uppercase tracking-wide pb-1 border-b border-zinc-800'>
        <div>REC DATABASE</div>
        <div>MusicBrainz</div>
      </div>
      {/* Render changed field diffs */}
      {visibleFields.map(diff => (
        <FieldComparison
          key={diff.field}
          diff={diff}
          showUnchanged={!showOnlyChanges}
        />
      ))}

      {/* Special artist credits display */}
      {showArtist && artistDiff && (
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

          <div className='grid grid-cols-2 gap-4 text-sm'>
            <div className='text-zinc-400 min-w-0 break-words'>
              {artistDiff.currentDisplay || '—'}
            </div>
            <div className='text-zinc-200 min-w-0 break-words'>
              {artistDiff.nameDiff && artistDiff.nameDiff.length > 0 ? (
                <InlineTextDiff parts={artistDiff.nameDiff as TextDiffPart[]} />
              ) : (
                artistDiff.sourceDisplay || '—'
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
