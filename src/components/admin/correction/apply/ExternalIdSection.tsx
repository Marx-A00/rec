'use client';

import { useCallback } from 'react';

import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import type { FieldDiff, ExternalIdDiff } from '@/lib/correction/preview/types';

import type { UIFieldSelections } from './types';

/**
 * Props for ExternalIdSection component
 */
export interface ExternalIdSectionProps {
  /** Current field selections */
  selections: UIFieldSelections;
  /** Callback when selections change */
  onSelectionsChange: (selections: UIFieldSelections) => void;
  /** Field diffs from preview (filtered to external ID fields only) */
  fieldDiffs: FieldDiff[];
}

/**
 * Type guard to check if a FieldDiff is an ExternalIdDiff
 */
function isExternalIdDiff(diff: FieldDiff): diff is ExternalIdDiff {
  return (
    diff.field === 'musicbrainzId' ||
    diff.field === 'spotifyId' ||
    diff.field === 'discogsId'
  );
}

/**
 * Accordion section for external ID field selection.
 *
 * Features:
 * - Master checkbox for "select all IDs" in accordion trigger
 * - Individual checkboxes for musicbrainzId, spotifyId, discogsId
 * - Indeterminate state when partially selected
 * - Shows current → source value with ID truncation
 *
 * Only shows fields with changes (changeType !== 'UNCHANGED').
 */
export function ExternalIdSection({
  selections,
  onSelectionsChange,
  fieldDiffs,
}: ExternalIdSectionProps) {
  // Filter to only external ID fields that have changes
  const changedFields = fieldDiffs.filter(
    (diff): diff is ExternalIdDiff =>
      isExternalIdDiff(diff) && diff.changeType !== 'UNCHANGED'
  );

  // Count selected fields
  const selectedCount = changedFields.filter(
    diff =>
      selections.externalIds[diff.field as keyof typeof selections.externalIds]
  ).length;
  const totalCount = changedFields.length;

  // Determine checkbox state for master checkbox
  const allSelected = selectedCount === totalCount && totalCount > 0;
  const noneSelected = selectedCount === 0;
  const indeterminate = !allSelected && !noneSelected;

  // Toggle all external ID fields
  const handleToggleAll = useCallback(
    (checked: boolean) => {
      const newExternalIds = { ...selections.externalIds };
      changedFields.forEach(diff => {
        newExternalIds[diff.field as keyof typeof newExternalIds] = checked;
      });
      onSelectionsChange({
        ...selections,
        externalIds: newExternalIds,
      });
    },
    [selections, onSelectionsChange, changedFields]
  );

  // Toggle individual field
  const handleToggleField = useCallback(
    (field: string, checked: boolean) => {
      onSelectionsChange({
        ...selections,
        externalIds: {
          ...selections.externalIds,
          [field]: checked,
        },
      });
    },
    [selections, onSelectionsChange]
  );

  // Format ID value for display (truncate with ellipsis)
  const formatIdValue = (
    value: string | null | undefined,
    field: string
  ): string => {
    if (!value) return '(none)';

    // Truncation lengths per field type
    const truncateLength = field === 'musicbrainzId' ? 8 : 12;

    if (value.length > truncateLength) {
      return value.slice(0, truncateLength) + '...';
    }
    return value;
  };

  // Format field label for display
  const formatLabel = (field: string): string => {
    const labels: Record<string, string> = {
      musicbrainzId: 'MusicBrainz ID',
      spotifyId: 'Spotify ID',
      discogsId: 'Discogs ID',
    };
    return labels[field] || field;
  };

  if (changedFields.length === 0) {
    return null; // Don't show section if no changes
  }

  return (
    <AccordionItem value='external-ids' className='border-zinc-700'>
      <AccordionTrigger className='px-4 py-3 hover:bg-zinc-800/50'>
        <div className='flex items-center gap-3 w-full'>
          <Checkbox
            checked={allSelected}
            onCheckedChange={handleToggleAll}
            onClick={e => e.stopPropagation()}
            {...(indeterminate && { 'data-state': 'indeterminate' })}
            className='shrink-0'
          />
          <span className='text-sm font-medium text-zinc-100'>
            External IDs ({totalCount} change{totalCount !== 1 ? 's' : ''})
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className='px-4 pb-4 pt-2'>
        <div className='space-y-3'>
          {changedFields.map(diff => {
            const field = diff.field as keyof typeof selections.externalIds;
            const isSelected = selections.externalIds[field];
            const currentVal = formatIdValue(diff.currentValue, diff.field);
            const sourceVal = formatIdValue(diff.sourceValue, diff.field);

            return (
              <div
                key={diff.field}
                className='flex items-start gap-3 rounded-md bg-zinc-800 p-3'
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={checked =>
                    handleToggleField(diff.field, Boolean(checked))
                  }
                  className='mt-0.5 shrink-0'
                />
                <div className='flex-1 min-w-0'>
                  <div className='text-sm font-medium text-zinc-200 mb-1'>
                    {formatLabel(diff.field)}
                  </div>
                  <div className='text-xs text-zinc-400 font-mono space-y-1'>
                    <div className='truncate'>
                      <span className='text-red-400'>Current:</span>{' '}
                      {currentVal}
                    </div>
                    <div className='truncate'>
                      <span className='text-green-400'>Source:</span>{' '}
                      {sourceVal}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
