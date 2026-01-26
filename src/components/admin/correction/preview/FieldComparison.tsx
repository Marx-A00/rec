/**
 * Single field comparison component for correction preview.
 *
 * Displays a field diff with:
 * - Formatted field label
 * - Change type badge (Added, Modified, Removed, Conflict)
 * - Current value vs. source value with inline diff highlighting
 */

import { ChangeType, type TextDiffPart } from '@/generated/graphql';
import type {
  FieldDiff,
  TextDiff,
  DateDiff,
  ArrayDiff,
  ExternalIdDiff,
} from '@/lib/correction/preview/types';

import { InlineTextDiff } from './InlineTextDiff';

/**
 * Props for FieldComparison component
 */
export interface FieldComparisonProps {
  /** Field diff data from preview - comes from JSON scalar */
  diff: FieldDiff;
}

/**
 * Helper to format camelCase field names to human-readable labels.
 * e.g., 'releaseDate' -> 'Release Date'
 */
function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1') // Insert space before capitals
    .replace(/^./, char => char.toUpperCase()) // Capitalize first letter
    .trim();
}

/**
 * Get change type badge content and styling.
 */
function getChangeBadge(
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
      return null; // No badge for unchanged
    default:
      return null;
  }
}

/**
 * Format a value for display, showing em-dash for null/empty.
 */
function formatValue(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  return value;
}

/**
 * Type guard to check if diff is a TextDiff.
 */
function isTextDiff(diff: FieldDiff): diff is TextDiff {
  return (
    'currentValue' in diff &&
    'sourceValue' in diff &&
    !('componentChanges' in diff) &&
    !('currentItems' in diff)
  );
}

/**
 * Type guard to check if diff is a DateDiff.
 */
function isDateDiff(diff: FieldDiff): diff is DateDiff {
  return diff.field === 'releaseDate' && 'componentChanges' in diff;
}

/**
 * Type guard to check if diff is an ArrayDiff.
 */
function isArrayDiff(diff: FieldDiff): diff is ArrayDiff {
  return 'currentItems' in diff && 'sourceItems' in diff && 'added' in diff;
}

/**
 * Type guard to check if diff is an ExternalIdDiff.
 */
function isExternalIdDiff(diff: FieldDiff): diff is ExternalIdDiff {
  return (
    'currentValue' in diff &&
    'sourceValue' in diff &&
    (diff.field === 'musicbrainzId' ||
      diff.field === 'spotifyId' ||
      diff.field === 'discogsId')
  );
}

/**
 * Format date components to display string.
 */
function formatDateComponents(
  date: { year?: number; month?: number; day?: number } | null | undefined
): string {
  if (!date) return '—';
  const parts: string[] = [];
  if (date.year) parts.push(String(date.year));
  if (date.month) parts.push(String(date.month).padStart(2, '0'));
  if (date.day) parts.push(String(date.day).padStart(2, '0'));
  return parts.length > 0 ? parts.join('-') : '—';
}

/**
 * Displays a single field comparison with change badge and diff highlighting.
 *
 * Handles different field diff types:
 * - TextDiff: Shows inline character-level highlighting
 * - DateDiff: Shows date components (YYYY-MM-DD)
 * - ArrayDiff: Shows arrays with items highlighted
 * - ExternalIdDiff: Shows ID values
 *
 * Returns null for UNCHANGED fields (they should be filtered out).
 */
export function FieldComparison({ diff }: FieldComparisonProps) {
  // Skip unchanged fields - they shouldn't be rendered
  if (diff.changeType === 'UNCHANGED') {
    return null;
  }

  const badge = getChangeBadge(diff.changeType);
  const fieldLabel = formatFieldName(diff.field);

  // Render current and source values based on diff type
  let currentDisplay: React.ReactNode;
  let sourceDisplay: React.ReactNode;

  if (isDateDiff(diff)) {
    currentDisplay = formatDateComponents(diff.current);
    sourceDisplay = formatDateComponents(diff.source);
  } else if (isArrayDiff(diff)) {
    // Render array items with highlights
    currentDisplay =
      diff.currentItems.length > 0 ? diff.currentItems.join(', ') : '—';
    sourceDisplay = (
      <span>
        {diff.unchanged.map((item, i) => (
          <span key={`unchanged-${i}`} className='text-zinc-300'>
            {i > 0 && ', '}
            {item}
          </span>
        ))}
        {diff.added.map((item, i) => (
          <span
            key={`added-${i}`}
            className='bg-green-500/20 text-green-400 rounded-sm px-0.5'
          >
            {(diff.unchanged.length > 0 || i > 0) && ', '}
            {item}
          </span>
        ))}
        {diff.removed.map((item, i) => (
          <span
            key={`removed-${i}`}
            className='bg-red-500/20 text-red-400 line-through rounded-sm px-0.5'
          >
            {(diff.unchanged.length > 0 || diff.added.length > 0 || i > 0) &&
              ', '}
            {item}
          </span>
        ))}
        {diff.unchanged.length === 0 &&
          diff.added.length === 0 &&
          diff.removed.length === 0 &&
          '—'}
      </span>
    );
  } else if (isTextDiff(diff)) {
    currentDisplay = formatValue(diff.currentValue);
    // Use inline diff highlighting if parts available
    if (diff.parts && diff.parts.length > 0) {
      sourceDisplay = <InlineTextDiff parts={diff.parts as TextDiffPart[]} />;
    } else {
      sourceDisplay = formatValue(diff.sourceValue);
    }
  } else if (isExternalIdDiff(diff)) {
    currentDisplay = formatValue(diff.currentValue);
    sourceDisplay = formatValue(diff.sourceValue);
  } else {
    // Fallback for any other diff types
    currentDisplay = '—';
    sourceDisplay = '—';
  }

  return (
    <div className='py-3 border-b border-zinc-800 last:border-b-0'>
      {/* Field label with change badge */}
      <div className='flex items-center gap-2 mb-1'>
        <span className='text-sm font-medium text-zinc-300'>{fieldLabel}</span>
        {badge && (
          <span className={`text-xs ${badge.className}`}>{badge.label}</span>
        )}
      </div>

      {/* Current value */}
      <div className='text-sm'>
        <span className='text-zinc-500 text-xs mr-2'>Current:</span>
        <span className='text-zinc-400'>{currentDisplay}</span>
      </div>

      {/* Source value with diff */}
      <div className='text-sm mt-1'>
        <span className='text-zinc-500 text-xs mr-2'>Source:</span>
        <span className='text-zinc-200'>{sourceDisplay}</span>
      </div>
    </div>
  );
}
