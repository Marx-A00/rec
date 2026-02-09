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
import {
  getArtistCorrectionStore,
  clearArtistCorrectionStoreCache,
  isFirstStep as isFirstStepSelector,
} from '@/stores/useArtistCorrectionStore';
import {
  useGetArtistDetailsQuery,
  useApplyArtistCorrectionMutation,
  useTriggerArtistEnrichmentMutation,
  EnrichmentPriority,
  type Artist,
  type ArtistCorrectionPreview,
  CorrectionSource,
} from '@/generated/graphql';
import Toast, { useToast } from '@/components/ui/toast';

import { ModalSkeleton } from '../shared';
import { StepIndicator } from '../StepIndicator';

import { ArtistCurrentDataView } from './ArtistCurrentDataView';
import { ArtistSearchView } from './search/ArtistSearchView';
import { ArtistPreviewView } from './preview/ArtistPreviewView';
import { ArtistApplyView } from './apply/ArtistApplyView';

export interface ArtistCorrectionModalProps {
  /** Artist to correct (required - parent should conditionally render) */
  artist: { id: string; name: string };
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
 * State is persisted per artist in sessionStorage via Zustand store.
 */
export function ArtistCorrectionModal({
  artist,
  onClose,
  onSuccess,
}: ArtistCorrectionModalProps) {
  const artistId = artist.id;

  // Toast state
  const { toast, showToast, hideToast } = useToast();

  // Query client for cache invalidation
  const queryClient = useQueryClient();

  // Initialize Zustand store for this artist
  const store = getArtistCorrectionStore(artistId);

  // Subscribe to store state
  const step = store(s => s.step);
  const selectedArtistMbid = store(s => s.selectedArtistMbid);
  const correctionSource = store(s => s.correctionSource);
  const previewData = store(s => s.previewData);
  const showAppliedState = store(s => s.showAppliedState);

  // Derived selectors
  const isFirstStep = store(isFirstStepSelector);

  // Fetch artist details
  const { data, isLoading, error } = useGetArtistDetailsQuery(
    { id: artistId },
    { enabled: true }
  );

  // Enrichment mutation for re-enriching after correction
  const enrichMutation = useTriggerArtistEnrichmentMutation();

  const artistData = data?.artist;

  // Apply mutation
  const applyMutation = useApplyArtistCorrectionMutation({
    onSuccess: response => {
      if (response.artistCorrectionApply.success) {
        store.getState().setShowAppliedState(true);

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

        // Queue enrichment if requested (read from store)
        const shouldEnrich = store.getState().shouldEnrich;
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
              onError: error => {
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
          if (artistId) {
            clearArtistCorrectionStoreCache(artistId);
          }
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
  }, []);

  const handleClose = () => {
    if (artistId) {
      clearArtistCorrectionStoreCache(artistId);
    }
    onClose();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      handleClose();
    }
  };

  // Handle "Select Fields & Apply" click from PreviewView
  const handleApplyClick = () => {
    store.getState().nextStep();
  };

  // Handle apply action from ApplyView
  const handleApply = () => {
    const state = store.getState();
    if (
      !artistId ||
      !state?.previewData ||
      !state?.selectedArtistMbid ||
      !state?.applySelections
    )
      return;

    // Get expectedUpdatedAt from current artist
    const expectedUpdatedAt = artistData?.updatedAt
      ? artistData.updatedAt
      : new Date();

    applyMutation.mutate({
      input: {
        artistId,
        sourceArtistId: state.selectedArtistMbid,
        source: state.correctionSource === 'discogs' ? CorrectionSource.Discogs : CorrectionSource.Musicbrainz,
        selections: {
          metadata: {
            name: state.applySelections.metadata.name,
            disambiguation: state.applySelections.metadata.disambiguation,
            countryCode: state.applySelections.metadata.countryCode,
            artistType: state.applySelections.metadata.artistType,
            area: state.applySelections.metadata.area,
            beginDate: state.applySelections.metadata.beginDate,
            endDate: state.applySelections.metadata.endDate,
            gender: state.applySelections.metadata.gender,
          },
          externalIds: {
            musicbrainzId: state.applySelections.externalIds.musicbrainzId,
            discogsId: state.applySelections.externalIds.discogsId,
            ipi: state.applySelections.externalIds.ipi,
            isni: state.applySelections.externalIds.isni,
          },
        },
        expectedUpdatedAt,
      },
    });
  };

  const headerTitle = 'Fixing: ' + artist.name;
  const hasError = !!error;

  const stepLabels = ['Current', 'Search', 'Preview', 'Apply'];

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:!max-w-[1100px] max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 [&>button]:text-zinc-500 [&>button]:hover:text-zinc-300'>
        <DialogHeader>
          <DialogTitle className='truncate pr-8 text-cosmic-latte'>
            {headerTitle}
          </DialogTitle>
        </DialogHeader>

        <StepIndicator
          currentStep={step}
          onStepClick={(s: number) => store.getState().setStep(s)}
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
          {step === 0 && !isLoading && !hasError && artistData && (
            <div className='space-y-6'>
              <ArtistCurrentDataView artist={artistData as Artist} />

              {/* Action button for step 0 */}
              <div className='flex gap-3 pt-4 border-t border-zinc-800'>
                <Button
                  variant='outline'
                  onClick={() => store.getState().setStep(1)}
                  className='flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                >
                  <Search className='w-4 h-4 mr-2' />
                  Search MusicBrainz
                </Button>
              </div>
            </div>
          )}
          {step === 0 && !isLoading && !hasError && !artistData && (
            <div className='flex items-center justify-center h-[300px] border border-dashed border-muted-foreground/30 rounded-lg'>
              <p className='text-muted-foreground'>No artist data available</p>
            </div>
          )}

          {/* Step 1: Search */}
          {step === 1 && !isLoading && !hasError && artistData && (
            <ArtistSearchView artist={artistData as Artist} />
          )}
          {step === 1 && isLoading && (
            <div className='flex items-center justify-center h-[300px]'>
              <Loader2 className='h-6 w-6 animate-spin text-zinc-400' />
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 2 &&
            !isLoading &&
            !hasError &&
            selectedArtistMbid &&
            artistId && <ArtistPreviewView artistId={artistId} />}
          {step === 2 && !isLoading && !hasError && !selectedArtistMbid && (
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
          {step === 3 && !isLoading && !hasError && artistId && previewData && (
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
                  artistId={artistId}
                  onApply={handleApply}
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
          {step === 3 &&
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
              {!isFirstStep && step !== 3 && (
                <Button
                  variant='outline'
                  onClick={() => store.getState().prevStep()}
                >
                  Back
                </Button>
              )}
              {step === 2 && previewData && !showAppliedState && (
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
