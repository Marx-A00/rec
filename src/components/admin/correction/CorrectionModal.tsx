'use client';

import { useState } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCorrectionModalState } from '@/hooks/useCorrectionModalState';
import {
  useGetAlbumDetailsAdminQuery,
  DataQuality,
  useApplyCorrectionMutation,
} from '@/generated/graphql';
import type { CorrectionPreview } from '@/lib/correction/preview/types';
import Toast, { useToast } from '@/components/ui/toast';

import { StepIndicator } from './StepIndicator';
import {
  CurrentDataView,
  type CurrentDataViewAlbum,
  type AlbumArtist,
} from './CurrentDataView';
import { SearchView } from './search';
import { PreviewView } from './preview';
import {
  ApplyView,
  toGraphQLSelections,
  type UIFieldSelections,
} from './apply';

export interface CorrectionModalProps {
  /** Album ID to load and correct */
  albumId: string | null;
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onClose: () => void;
}

/**
 * Modal shell for the 4-step album correction wizard.
 *
 * Steps:
 * 0. Current Data - Shows existing album data
 * 1. Search - Search for correct MusicBrainz match
 * 2. Preview - Preview changes from selected match
 * 3. Apply - Select fields and apply corrections
 *
 * The modal fetches album details internally using the albumId.
 * State is persisted per album in sessionStorage, allowing users to
 * navigate away and return to the same step.
 */
export function CorrectionModal({
  albumId,
  open,
  onClose,
}: CorrectionModalProps) {
  const modalState = useCorrectionModalState(albumId);
  const {
    currentStep,
    setCurrentStep,
    nextStep,
    prevStep,
    clearState,
    isFirstStep,
    isLastStep,
    selectedResultMbid,
  } = modalState;

  // Preview data state - shared between PreviewView and ApplyView
  const [previewData, setPreviewData] = useState<CorrectionPreview | null>(
    null
  );

  // Success animation state
  const [showAppliedState, setShowAppliedState] = useState(false);

  // Toast state
  const { toast, showToast, hideToast } = useToast();

  // Query client for cache invalidation
  const queryClient = useQueryClient();

  // Fetch album details when modal is open and albumId is provided
  const { data, isLoading, error } = useGetAlbumDetailsAdminQuery(
    { id: albumId! },
    { enabled: open && !!albumId }
  );

  const albumData = data?.album;

  // Apply mutation
  const applyMutation = useApplyCorrectionMutation({
    onSuccess: response => {
      if (response.correctionApply.success) {
        // Show "Applied!" state
        setShowAppliedState(true);

        // Build toast message from changes
        const changes = response.correctionApply.changes;
        if (changes) {
          const fieldCount =
            changes.metadata.length + changes.externalIds.length;
          const trackCount =
            changes.tracks.added +
            changes.tracks.modified +
            changes.tracks.removed;

          const parts = [];
          if (fieldCount > 0) {
            parts.push(`${fieldCount} field${fieldCount !== 1 ? 's' : ''}`);
          }
          if (trackCount > 0) {
            parts.push(`${trackCount} track${trackCount !== 1 ? 's' : ''}`);
          }

          let message = `Updated: ${parts.join(', ')}`;

          // Add data quality change if applicable
          if (changes.dataQualityBefore !== changes.dataQualityAfter) {
            message += ` • Data quality: ${changes.dataQualityBefore} → ${changes.dataQualityAfter}`;
          }

          showToast(message, 'success');
        } else {
          showToast('Correction applied successfully', 'success');
        }

        // Invalidate album queries
        if (albumId) {
          queryClient.invalidateQueries({ queryKey: ['album', albumId] });
        }

        // Auto-close modal after 1.5s
        setTimeout(() => {
          clearState();
          onClose();
        }, 1500);
      } else {
        // Show error toast
        const errorMsg =
          response.correctionApply.message ?? 'Failed to apply correction';
        showToast(errorMsg, 'error');
      }
    },
    onError: error => {
      showToast(
        error instanceof Error ? error.message : 'Failed to apply correction',
        'error'
      );
    },
  });

  // Transform fetched data to CurrentDataViewAlbum format
  const album: CurrentDataViewAlbum | null = albumData
    ? {
        id: albumData.id,
        title: albumData.title,
        // Convert Date to ISO string if needed
        releaseDate: albumData.releaseDate
          ? typeof albumData.releaseDate === 'string'
            ? albumData.releaseDate
            : (albumData.releaseDate as Date).toISOString()
          : null,
        releaseType: albumData.releaseType ?? null,
        coverArtUrl: albumData.coverArtUrl ?? null,
        cloudflareImageId: albumData.cloudflareImageId ?? null,
        musicbrainzId: albumData.musicbrainzId ?? null,
        spotifyId: null, // Not exposed in GraphQL schema
        discogsId: null, // Not exposed in GraphQL schema
        dataQuality: (albumData.dataQuality as DataQuality) ?? null,
        label: albumData.label ?? null,
        barcode: albumData.barcode ?? null,
        tracks: (albumData.tracks ?? []).map(track => ({
          id: track.id,
          title: track.title,
          trackNumber: track.trackNumber,
          discNumber: track.discNumber,
          durationMs: track.durationMs ?? null,
          isrc: track.isrc ?? null,
        })),
        artists: (albumData.artists ?? []).map(
          (ac, index): AlbumArtist => ({
            artist: {
              id: ac.artist.id,
              name: ac.artist.name,
            },
            role: ac.role ?? 'primary',
            position: ac.position ?? index,
          })
        ),
      }
    : null;

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
  const handleResultSelect = (result: { releaseGroupMbid: string }) => {
    // Store selected result MBID for preview step
    modalState.setSelectedResult(result.releaseGroupMbid);
    // Navigate to preview step
    nextStep();
  };

  // Handle manual edit request (no good results)
  const handleManualEdit = () => {
    // Navigate to manual edit (step 4 in future, for now just log)
    console.log('Manual edit requested - Phase 10');
  };

  // Handle preview loaded callback
  const handlePreviewLoaded = (preview: CorrectionPreview) => {
    setPreviewData(preview);
  };

  // Handle "Apply This Match" click from PreviewView
  const handleApplyClick = () => {
    nextStep(); // Navigate from step 2 (Preview) to step 3 (Apply)
  };

  // Handle apply action from ApplyView
  const handleApply = (selections: UIFieldSelections) => {
    if (!albumId || !previewData) return;

    // Convert UI selections to GraphQL format
    const graphqlSelections = toGraphQLSelections(selections, previewData);

    // Extract expectedUpdatedAt from preview data for optimistic locking
    const expectedUpdatedAt = previewData.currentAlbum.updatedAt;

    // Call mutation
    applyMutation.mutate({
      input: {
        albumId,
        releaseGroupMbid: previewData.sourceResult.releaseGroupMbid,
        selections: graphqlSelections,
        expectedUpdatedAt,
      },
    });
  };

  // Get primary artist name for header
  const primaryArtist = album?.artists.find(
    ac => ac.role === 'primary' || ac.position === 0
  );
  const primaryArtistName = primaryArtist?.artist.name ?? 'Unknown Artist';
  const headerTitle = album
    ? 'Fixing: ' + album.title + ' by ' + primaryArtistName
    : 'Fixing: Album Data';

  const hasError = !!error;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:!max-w-[1100px] max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 [&>button]:text-zinc-500 [&>button]:hover:text-zinc-300'>
        <DialogHeader>
          <DialogTitle className='truncate pr-8 text-cosmic-latte'>
            {headerTitle}
          </DialogTitle>
        </DialogHeader>

        <StepIndicator currentStep={currentStep} onStepClick={setCurrentStep} />

        {/* Step content area */}
        <div className='min-h-[300px] py-4'>
          {/* Loading state */}
          {isLoading && (
            <div className='flex flex-col items-center justify-center h-[300px]'>
              <Loader2 className='h-8 w-8 animate-spin text-muted-foreground mb-4' />
              <p className='text-muted-foreground'>Loading album data...</p>
            </div>
          )}

          {/* Error state */}
          {hasError && !isLoading && (
            <div className='flex items-center justify-center h-[300px] border border-dashed border-destructive/30 rounded-lg'>
              <p className='text-destructive'>Failed to load album data</p>
            </div>
          )}

          {/* Step 0: Current Data */}
          {currentStep === 0 && !isLoading && !hasError && album && (
            <CurrentDataView album={album} />
          )}
          {currentStep === 0 && !isLoading && !hasError && !album && (
            <div className='flex items-center justify-center h-[300px] border border-dashed border-muted-foreground/30 rounded-lg'>
              <p className='text-muted-foreground'>No album data available</p>
            </div>
          )}

          {/* Step 1: Search */}
          {currentStep === 1 && !isLoading && !hasError && album && (
            <SearchView
              album={album}
              onResultSelect={handleResultSelect}
              onManualEdit={handleManualEdit}
              modalState={modalState}
            />
          )}
          {currentStep === 1 && isLoading && (
            <div className='flex items-center justify-center h-[300px]'>
              <Loader2 className='h-6 w-6 animate-spin text-zinc-400' />
            </div>
          )}
          {currentStep === 1 && hasError && !isLoading && (
            <div className='p-4 text-center text-red-400'>
              Failed to load album data. Please try again.
            </div>
          )}

          {/* Step 2: Preview */}
          {currentStep === 2 &&
            !isLoading &&
            !hasError &&
            selectedResultMbid &&
            albumId && (
              <PreviewView
                albumId={albumId}
                releaseGroupMbid={selectedResultMbid}
                onApplyClick={handleApplyClick}
                onPreviewLoaded={handlePreviewLoaded}
              />
            )}
          {currentStep === 2 &&
            !isLoading &&
            !hasError &&
            !selectedResultMbid && (
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
            albumId &&
            previewData && (
              <>
                {showAppliedState ? (
                  // Success state - show "Applied!" with checkmark
                  <div className='flex flex-col items-center justify-center h-[300px]'>
                    <CheckCircle className='h-16 w-16 text-green-400 mb-4' />
                    <p className='text-2xl font-semibold text-green-400'>
                      Applied!
                    </p>
                  </div>
                ) : (
                  // Normal apply view
                  <ApplyView
                    _albumId={albumId}
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
            (!albumId || !previewData) && (
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
              {!isFirstStep && currentStep !== 3 && (
                <Button variant='outline' onClick={prevStep}>
                  Back
                </Button>
              )}
              {!isLastStep && currentStep !== 2 && (
                <Button variant='primary' onClick={nextStep}>
                  Next
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
