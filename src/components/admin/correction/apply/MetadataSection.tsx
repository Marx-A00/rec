'use client';

import { useCallback } from 'react';

import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import type {
  FieldDiff,
  TextDiff,
  DateDiff,
} from '@/lib/correction/preview/types';

import type { UIFieldSelections } from './types';

/**
 * Props for MetadataSection component
 */
export interface MetadataSectionProps {
  /** Current field selections */
  selections: UIFieldSelections;
  /** Callback when selections change */
  onSelectionsChange: (selections: UIFieldSelections) => void;
  /** Field diffs from preview (filtered to metadata fields only) */
  fieldDiffs: FieldDiff[];
}

/**
 * Type guard to check if a FieldDiff is a TextDiff or DateDiff
 */
function isMetadataFieldDiff(diff: FieldDiff): diff is TextDiff | DateDiff {
  return (
    diff.field !== 'musicbrainzId' &&
    diff.field !== 'spotifyId' &&
    diff.field !== 'discogsId'
  );
}

/**
 * Accordion section for metadata field selection.
 *
 * Features:
 * - Master checkbox for "select all metadata" in accordion trigger
 * - Individual checkboxes for each changed field
 * - Indeterminate state when partially selected
 * - Shows current → source value preview for each field
 *
 * Only shows fields with changes (changeType !== 'UNCHANGED').
 */
export function MetadataSection({
  selections,
  onSelectionsChange,
  fieldDiffs,
}: MetadataSectionProps) {
  // Filter to only metadata fields that have changes
  const metadataFields = [
    'title',
    'releaseDate',
    'releaseType',
    'releaseCountry',
    'barcode',
    'label',
  ];
  const changedFields = fieldDiffs.filter(
    (diff): diff is TextDiff | DateDiff =>
      isMetadataFieldDiff(diff) &&
      metadataFields.includes(diff.field) &&
      diff.changeType !== 'UNCHANGED'
  );

  // Count selected fields
  const selectedCount = changedFields.filter(
    diff => selections.metadata[diff.field as keyof typeof selections.metadata]
  ).length;
  const totalCount = changedFields.length;

  // Determine checkbox state for master checkbox
  const allSelected = selectedCount === totalCount && totalCount > 0;
  const noneSelected = selectedCount === 0;
  const indeterminate = !allSelected && !noneSelected;

  // Toggle all metadata fields
  const handleToggleAll = useCallback(
    (checked: boolean) => {
      const newMetadata = { ...selections.metadata };
      changedFields.forEach(diff => {
        newMetadata[diff.field as keyof typeof newMetadata] = checked;
      });
      onSelectionsChange({
        ...selections,
        metadata: newMetadata,
      });
    },
    [selections, onSelectionsChange, changedFields]
  );

  // Toggle individual field
  const handleToggleField = useCallback(
    (field: string, checked: boolean) => {
      onSelectionsChange({
        ...selections,
        metadata: {
          ...selections.metadata,
          [field]: checked,
        },
      });
    },
    [selections, onSelectionsChange]
  );

  // Format field value for display
  const formatValue = (
    diff: TextDiff | DateDiff,
    isSource: boolean
  ): string => {
    if (diff.field === 'releaseDate') {
      const dateDiff = diff as DateDiff;
      const dateComponents = isSource ? dateDiff.source : dateDiff.current;
      if (!dateComponents) return '(none)';
      const parts = [];
      if (dateComponents.year) parts.push(dateComponents.year);
      if (dateComponents.month)
        parts.push(String(dateComponents.month).padStart(2, '0'));
      if (dateComponents.day)
        parts.push(String(dateComponents.day).padStart(2, '0'));
      return parts.length > 0 ? parts.join('-') : '(none)';
    } else {
      const textDiff = diff as TextDiff;
      const value = isSource ? textDiff.sourceValue : textDiff.currentValue;
      return value || '(none)';
    }
  };

  // Format field label for display
  const formatLabel = (field: string): string => {
    const labels: Record<string, string> = {
      title: 'Title',
      releaseDate: 'Release Date',
      releaseType: 'Release Type',
      releaseCountry: 'Country',
      barcode: 'Barcode',
      label: 'Label',
    };
    return labels[field] || field;
  };

  if (changedFields.length === 0) {
    return null; // Don't show section if no changes
  }

  return (
    <AccordionItem value='metadata' className='border-zinc-700'>
      <div className='flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50'>
        <Checkbox
          checked={allSelected}
          onCheckedChange={handleToggleAll}
          {...(indeterminate && { 'data-state': 'indeterminate' })}
          className='shrink-0'
        />
        <AccordionTrigger className='flex-1 py-0 hover:no-underline [&>svg]:ml-auto'>
          <span className='text-sm font-medium text-zinc-100'>
            Metadata ({totalCount} change{totalCount !== 1 ? 's' : ''})
          </span>
        </AccordionTrigger>
      </div>
      <AccordionContent className='px-4 pb-4 pt-2'>
        <div className='space-y-3'>
          {changedFields.map(diff => {
            const field = diff.field as keyof typeof selections.metadata;
            const isSelected = selections.metadata[field];
            const currentVal = formatValue(diff, false);
            const sourceVal = formatValue(diff, true);

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
