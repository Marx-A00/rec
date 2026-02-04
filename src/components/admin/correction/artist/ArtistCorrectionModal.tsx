'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, Search } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useArtistCorrectionModalState } from '@/hooks/useArtistCorrectionModalState';
import {
  useGetArtistDetailsQuery,
  useApplyArtistCorrectionMutation,
  useTriggerArtistEnrichmentMutation,
  EnrichmentPriority,  type Artist,
  type ArtistCorrectionPreview,
} from '@/generated/graphql';
import Toast, { useToast } from '@/components/ui/toast';

import { ModalSkeleton } from '../shared';
import { StepIndicator } from '../StepIndicator';

import { ArtistCurrentDataView } from './ArtistCurrentDataView';
import { ArtistSearchView } from './search/ArtistSearchView';
import { ArtistPreviewView } from './preview/ArtistPreviewView';
import {
  ArtistApplyView,
  type UIArtistFieldSelections,
} from './apply/ArtistApplyView';

export interface ArtistCorrectionModalProps {
  /** Artist to correct, or null if modal should be closed */
  artist: { id: string; name: string } | null;
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when correction is successfully applied */
  onSuccess: () => void;
}

/**
 * Modal for correcting artist data using MusicBrainz.
 *
 * 4 steps:
 * 0. Current - Shows existing artist data
 * 1. Search - Search for correct MusicBrainz match
 * 2. Preview - Preview changes from selected match
 * 3. Apply - Select fields and apply corrections
 *
 * The modal fetches artist details internally using the artist ID.
 * State is persisted per artist in sessionStorage.
 */
export function ArtistCorrectionModal({
  artist,
  onClose,
  onSuccess,
}: ArtistCorrectionModalProps) {
  const artistId = artist?.id ?? null;
  const open = artist !== null;

  const modalState = useArtistCorrectionModalState(artistId);
  const {
    currentStep,
    setCurrentStep,
    nextStep,
    prevStep,
    clearState,
    isFirstStep,
    selectedArtistMbid,
  } = modalState;

  // Preview data state - shared between PreviewView and ApplyView
  const [previewData, setPreviewData] =
    useState<ArtistCorrectionPreview | null>(null);

  // Success animation state
  const [showAppliedState, setShowAppliedState] = useState(false);

  // Store enrichment preference from ApplyView
  const [shouldEnrich, setShouldEnrich] = useState(false);
  // Toast state
  const { toast, showToast, hideToast } = useToast();

  // Query client for cache invalidation
  const queryClient = useQueryClient();

  // Fetch artist details when modal is open
  const { data, isLoading, error } = useGetArtistDetailsQuery(
    { id: artistId! },
    { enabled: open && !!artistId }
  );

  const artistData = data?.artist;

  // Apply mutation
  // Enrichment mutation for re-enriching after correction
  const enrichMutation = useTriggerArtistEnrichmentMutation();
  const applyMutation = useApplyArtistCorrectionMutation({
    onSuccess: response => {
      if (response.artistCorrectionApply.success) {
        setShowAppliedState(true);

        const changes = response.artistCorrectionApply.changes;
        const affectedAlbums =
          response.artistCorrectionApply.affectedAlbumCount ?? 0;

        let message = 'Artist correction applied';
        if (changes) {
          const fieldCount =
            changes.metadata.length + changes.externalIds.length;
          const parts: string[] = [];
          if (fieldCount > 0) {
            parts.push(fieldCount + ' field' + (fieldCount !== 1 ? 's' : ''));
          }
          if (affectedAlbums > 0) {
            parts.push(
              affectedAlbums +
                ' album' +
                (affectedAlbums !== 1 ? 's' : '') +
                ' affected'
            );
          }
          if (parts.length > 0) {
            message = 'Updated: ' + parts.join(', ');
          }
        }

        showToast(message, 'success');

        // Queue enrichment if requested
        if (shouldEnrich && artistId) {
          enrichMutation.mutate(
            {
              id: artistId,
              priority: EnrichmentPriority.High,
            },
            {
              onSuccess: () => {
                showToast('Enrichment queued', 'success');
              },
              onError: (error) => {
                console.error('Failed to queue enrichment:', error);
                // Don't show toast - correction already succeeded
              },
            }
          );
        }
        // Invalidate artist queries
        if (artistId) {
          queryClient.invalidateQueries({ queryKey: ['artist', artistId] });
          queryClient.invalidateQueries({ queryKey: ['SearchArtistsAdmin'] });
          queryClient.invalidateQueries({ queryKey: ['GetArtistDetails'] });
        }

        // Auto-close after 1.5s
        setTimeout(() => {
          clearState();
          onSuccess();
        }, 1500);
      } else {
        const errorMsg =
          response.artistCorrectionApply.message ??
          'Failed to apply correction';
        showToast(errorMsg, 'error');
      }
    },
    onError: err => {
      showToast(
        err instanceof Error ? err.message : 'Failed to apply correction',
        'error'
      );
    },
  });

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input or textarea
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Escape closes modal (works with Radix Dialog's built-in handler)
      if (e.key === 'Escape' && !isTyping) {
        handleClose();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleClose = () => {
    clearState();
    setPreviewData(null);
    setShowAppliedState(false);
    onClose();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      handleClose();
    }
  };

  // Handle result selection from SearchView
  const handleResultSelect = (mbid: string) => {
    modalState.setSelectedResult(mbid);
    nextStep();
  };

  // Handle preview loaded callback
  const handlePreviewLoaded = (preview: ArtistCorrectionPreview) => {
    setPreviewData(preview);
  };

  // Handle "Select Fields & Apply" click from PreviewView
  const handleApplyClick = () => {
    nextStep();
  };

  // Handle apply action from ApplyView
  const handleApply = (
    selections: UIArtistFieldSelections,
    triggerEnrichment?: boolean
  ) => {
    if (!artistId || !previewData || !selectedArtistMbid) return;

    // Store enrichment preference for onSuccess callback
    setShouldEnrich(triggerEnrichment ?? false);

    // Get expectedUpdatedAt from current artist
    const expectedUpdatedAt = artistData?.updatedAt
      ? artistData.updatedAt
      : new Date();

    applyMutation.mutate({
      input: {
        artistId,
        artistMbid: selectedArtistMbid,
        selections: {
          metadata: {
            name: selections.metadata.name,
            disambiguation: selections.metadata.disambiguation,
            countryCode: selections.metadata.countryCode,
            artistType: selections.metadata.artistType,
            area: selections.metadata.area,
            beginDate: selections.metadata.beginDate,
            endDate: selections.metadata.endDate,
            gender: selections.metadata.gender,
          },
          externalIds: {
            musicbrainzId: selections.externalIds.musicbrainzId,
            ipi: selections.externalIds.ipi,
            isni: selections.externalIds.isni,
          },
        },
        expectedUpdatedAt,
      },
    });
  };

  const headerTitle = artist ? 'Fixing: ' + artist.name : 'Fixing: Artist Data';
  const hasError = !!error;

  const stepLabels = ['Current', 'Search', 'Preview', 'Apply'];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:!max-w-[1100px] max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 [&>button]:text-zinc-500 [&>button]:hover:text-zinc-300'>
        <DialogHeader>
          <DialogTitle className='truncate pr-8 text-cosmic-latte'>
            {headerTitle}
          </DialogTitle>
        </DialogHeader>

        <StepIndicator
          currentStep={currentStep}
          onStepClick={setCurrentStep}
          steps={stepLabels}
        />

        {/* Step content area */}
        <div className='min-h-[300px] py-4'>
          {/* Loading state */}
          {isLoading && <ModalSkeleton variant='artist' />}

          {/* Error state */}
          {hasError && !isLoading && (
            <div className='flex items-center justify-center h-[300px] border border-dashed border-destructive/30 rounded-lg'>
              <p className='text-destructive'>Failed to load artist data</p>
            </div>
          )}

          {/* Step 0: Current Data */}
          {currentStep === 0 && !isLoading && !hasError && artistData && (
            <div className='space-y-6'>
              <ArtistCurrentDataView artist={artistData as Artist} />

              {/* Action button for step 0 */}
              <div className='flex gap-3 pt-4 border-t border-zinc-800'>
                <Button
                  variant='outline'
                  onClick={() => setCurrentStep(1)}
                  className='flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                >
                  <Search className='w-4 h-4 mr-2' />
                  Search MusicBrainz
                </Button>
              </div>
            </div>
          )}
          {currentStep === 0 && !isLoading && !hasError && !artistData && (
            <div className='flex items-center justify-center h-[300px] border border-dashed border-muted-foreground/30 rounded-lg'>
              <p className='text-muted-foreground'>No artist data available</p>
            </div>
          )}

          {/* Step 1: Search */}
          {currentStep === 1 && !isLoading && !hasError && artistData && (
            <ArtistSearchView
              artist={artistData as Artist}
              onResultSelect={handleResultSelect}
              modalState={modalState}
            />
          )}
          {currentStep === 1 && isLoading && (
            <div className='flex items-center justify-center h-[300px]'>
              <Loader2 className='h-6 w-6 animate-spin text-zinc-400' />
            </div>
          )}

          {/* Step 2: Preview */}
          {currentStep === 2 &&
            !isLoading &&
            !hasError &&
            selectedArtistMbid &&
            artistId && (
              <ArtistPreviewView
                artistId={artistId}
                artistMbid={selectedArtistMbid}
                onPreviewLoaded={handlePreviewLoaded}
              />
            )}
          {currentStep === 2 &&
            !isLoading &&
            !hasError &&
            !selectedArtistMbid && (
              <div className='flex items-center justify-center h-[300px] border border-dashed border-muted-foreground/30 rounded-lg'>
                <div className='text-center'>
                  <p className='text-zinc-500'>No result selected.</p>
                  <p className='text-sm text-zinc-600 mt-1'>
                    Please go back and select a search result.
                  </p>
                </div>
              </div>
            )}

          {/* Step 3: Apply */}
          {currentStep === 3 &&
            !isLoading &&
            !hasError &&
            artistId &&
            previewData && (
              <>
                {showAppliedState ? (
                  <div className='flex flex-col items-center justify-center h-[300px]'>
                    <CheckCircle className='h-16 w-16 text-green-400 mb-4' />
                    <p className='text-2xl font-semibold text-green-400'>
                      Applied!
                    </p>
                  </div>
                ) : (
                  <ArtistApplyView
                    preview={previewData}
                    onApply={handleApply}
                    onBack={prevStep}
                    isApplying={applyMutation.isPending}
                    error={
                      applyMutation.error instanceof Error
                        ? applyMutation.error
                        : null
                    }
                  />
                )}
              </>
            )}
          {currentStep === 3 &&
            !isLoading &&
            !hasError &&
            (!artistId || !previewData) && (
              <div className='flex items-center justify-center h-[300px] border border-dashed border-muted-foreground/30 rounded-lg'>
                <div className='text-center'>
                  <p className='text-zinc-500'>Preview data not available.</p>
                  <p className='text-sm text-zinc-600 mt-1'>
                    Please go back and load the preview first.
                  </p>
                </div>
              </div>
            )}
        </div>

        <DialogFooter className='sticky bottom-0 bg-zinc-900 pt-4 border-t border-zinc-800'>
          <div className='flex w-full justify-between'>
            <Button variant='outline' onClick={handleClose}>
              Cancel
            </Button>
            <div className='flex gap-2'>
              {/* Back button - show on steps 1-2 (not on apply step 3) */}
              {!isFirstStep && currentStep !== 3 && (
                <Button variant='outline' onClick={prevStep}>
                  Back
                </Button>
              )}
              {currentStep === 2 && previewData && !showAppliedState && (
                <Button variant='primary' onClick={handleApplyClick}>
                  Select Fields & Apply
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>

        {/* Toast notification */}
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />
      </DialogContent>
    </Dialog>
  );
}
