'use client';

import { Button } from '@/components/ui/button';
import { AppliedSuccessState } from '../shared';
import { FieldComparisonList } from '../preview/FieldComparisonList';
import type { CorrectionPreview } from '@/lib/correction/preview/types';

interface ManualPreviewApplyStepProps {
  previewData: CorrectionPreview;
  showAppliedState: boolean;
  isPending: boolean;
  onBackToEdit: () => void;
  onApply: () => void;
}

export function ManualPreviewApplyStep({
  previewData,
  showAppliedState,
  isPending,
  onBackToEdit,
  onApply,
}: ManualPreviewApplyStepProps) {
  if (showAppliedState) {
    return <AppliedSuccessState />;
  }

  return (
    <div className='space-y-6'>
      {/* Preview section */}
      <div className='border border-zinc-800 rounded-lg p-6 bg-zinc-900/50'>
        <h3 className='text-lg font-semibold text-zinc-100 mb-4'>
          Preview Changes
        </h3>
        <p className='text-sm text-zinc-400 mb-4'>
          Review the changes before applying them to the album.
        </p>

        {/* Field diffs */}
        {previewData.fieldDiffs.length > 0 ? (
          <FieldComparisonList
            fieldDiffs={previewData.fieldDiffs}
            artistDiff={previewData.artistDiff}
          />
        ) : (
          <p className='text-zinc-500 text-sm'>No field changes detected.</p>
        )}

        {/* Artist changes */}
        {previewData.artistDiff.changeType !== 'UNCHANGED' && (
          <div className='mt-4 p-3 bg-zinc-800/50 rounded-md'>
            <p className='text-sm font-medium text-zinc-300 mb-2'>Artists</p>
            <div className='flex gap-4 text-sm'>
              <div className='flex-1'>
                <p className='text-zinc-500 text-xs mb-1'>Current</p>
                <p className='text-zinc-300'>
                  {previewData.artistDiff.currentDisplay}
                </p>
              </div>
              <div className='flex-1'>
                <p className='text-zinc-500 text-xs mb-1'>New</p>
                <p className='text-green-400'>
                  {previewData.artistDiff.sourceDisplay}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Apply section */}
      <div className='flex justify-between gap-3 pt-4 border-t border-zinc-800'>
        <Button
          variant='outline'
          onClick={onBackToEdit}
          className='border-zinc-700 text-zinc-300 hover:bg-zinc-800'
        >
          Back to Edit
        </Button>
        <Button
          onClick={onApply}
          disabled={isPending}
          className='bg-blue-600 hover:bg-blue-700 text-white'
        >
          {isPending ? 'Applying...' : 'Apply Changes'}
        </Button>
      </div>
    </div>
  );
}
