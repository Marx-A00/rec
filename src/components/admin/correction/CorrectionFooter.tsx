'use client';

import { Loader2, Pencil, Search } from 'lucide-react';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  calculateHasSelections,
  type UIFieldSelections,
} from './apply';
import type { CorrectionPreview } from '@/lib/correction/preview/types';

interface CorrectionFooterProps {
  step: number;
  maxStep: number;
  isFirstStep: boolean;
  isManualEditMode: boolean;
  showAppliedState: boolean;
  hasAlbum: boolean;
  previewData: CorrectionPreview | null;
  applySelections: UIFieldSelections | null;
  shouldEnrich: boolean;
  isApplyPending: boolean;
  onClose: () => void;
  onBack: () => void;
  onNext: () => void;
  onApplyClick: () => void;
  onConfirmApply: (selections: UIFieldSelections, triggerEnrichment: boolean) => void;
  onEnterSearch: () => void;
  onEnterManualEdit: () => void;
}

export function CorrectionFooter({
  step,
  maxStep,
  isFirstStep,
  isManualEditMode,
  showAppliedState,
  hasAlbum,
  previewData,
  applySelections,
  shouldEnrich,
  isApplyPending,
  onClose,
  onBack,
  onNext,
  onApplyClick,
  onConfirmApply,
  onEnterSearch,
  onEnterManualEdit,
}: CorrectionFooterProps) {
  return (
    <DialogFooter className='bg-zinc-900 pt-4 border-t border-zinc-800 -mx-6 -mb-6 px-6 pb-4 flex-shrink-0'>
      <div className='flex w-full justify-between'>
        <Button variant='outline' onClick={onClose}>
          Cancel
        </Button>
        <div className='flex gap-2'>
          {/* Back button - show on steps 1+ (except manual edit apply step) */}
          {!isFirstStep &&
            !(isManualEditMode && step === 2) &&
            !showAppliedState && (
              <Button variant='outline' onClick={onBack}>
                Back
              </Button>
            )}
          {/* Next button */}
          {!isManualEditMode &&
            step !== 0 &&
            step !== 2 &&
            step < maxStep && (
              <Button variant='primary' onClick={onNext}>
                Next
              </Button>
            )}
          {!isManualEditMode &&
            step === 2 &&
            previewData &&
            !showAppliedState && (
              <Button variant='primary' onClick={onApplyClick}>
                Review & Apply
              </Button>
            )}
          {!isManualEditMode &&
            step === 3 &&
            previewData &&
            !showAppliedState && (
              <Button
                variant='success'
                onClick={() => {
                  if (!applySelections) return;
                  onConfirmApply(applySelections, shouldEnrich);
                }}
                className='text-white'
                disabled={
                  !applySelections ||
                  !calculateHasSelections(applySelections, previewData) ||
                  isApplyPending
                }
              >
                {isApplyPending ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Applying...
                  </>
                ) : (
                  'Confirm & Apply'
                )}
              </Button>
            )}
          {/* Mode-switch buttons (visible on step 0) */}
          {!showAppliedState && step === 0 && hasAlbum && (
            <>
              <Button
                size='sm'
                onClick={onEnterSearch}
                className='bg-red-600 hover:bg-red-700 text-white'
              >
                <Search className='w-3.5 h-3.5 mr-1.5' />
                Search
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={onEnterManualEdit}
                className='border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              >
                <Pencil className='w-3.5 h-3.5 mr-1.5' />
                Edit Manually
              </Button>
            </>
          )}
        </div>
      </div>
    </DialogFooter>
  );
}
