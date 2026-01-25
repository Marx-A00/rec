'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCorrectionModalState } from '@/hooks/useCorrectionModalState';
import { StepIndicator } from './StepIndicator';

export interface CorrectionModalProps {
  /** Album ID being corrected, or null if modal should be closed */
  albumId: string | null;
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onClose: () => void;
}

/**
 * Modal shell for the 3-step album correction wizard.
 *
 * Steps:
 * 0. Current Data - Shows existing album data (placeholder)
 * 1. Search - Search for correct MusicBrainz match (placeholder)
 * 2. Apply - Preview and apply corrections (placeholder)
 *
 * State is persisted per album in sessionStorage, allowing users to
 * navigate away and return to the same step.
 */
export function CorrectionModal({ albumId, open, onClose }: CorrectionModalProps) {
  const {
    currentStep,
    setCurrentStep,
    nextStep,
    prevStep,
    clearState,
    isFirstStep,
    isLastStep,
  } = useCorrectionModalState(albumId);

  const handleClose = () => {
    clearState();
    onClose();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:!max-w-[1100px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fixing: Album Data</DialogTitle>
        </DialogHeader>

        <StepIndicator currentStep={currentStep} onStepClick={setCurrentStep} />

        {/* Step content area */}
        <div className="min-h-[300px] py-4">
          {currentStep === 0 && (
            <div className="flex items-center justify-center h-[300px] border border-dashed border-muted-foreground/30 rounded-lg">
              <p className="text-muted-foreground">Current Data content here</p>
            </div>
          )}
          {currentStep === 1 && (
            <div className="flex items-center justify-center h-[300px] border border-dashed border-muted-foreground/30 rounded-lg">
              <p className="text-muted-foreground">Search content here</p>
            </div>
          )}
          {currentStep === 2 && (
            <div className="flex items-center justify-center h-[300px] border border-dashed border-muted-foreground/30 rounded-lg">
              <p className="text-muted-foreground">Apply content here</p>
            </div>
          )}
        </div>

        <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t">
          <div className="flex w-full justify-between">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <div className="flex gap-2">
              {!isFirstStep && (
                <Button variant="outline" onClick={prevStep}>
                  Back
                </Button>
              )}
              {!isLastStep && (
                <Button variant="primary" onClick={nextStep}>
                  Next
                </Button>
              )}
              {isLastStep && (
                <Button variant="primary" disabled>
                  Apply
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
