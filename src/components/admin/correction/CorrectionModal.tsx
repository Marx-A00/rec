'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, Pencil, Search } from 'lucide-react';
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
  getCorrectionStore,
  clearCorrectionStoreCache,
  isFirstStep as isFirstStepSelector,
  isLastStep as isLastStepSelector,
  maxStep as maxStepSelector,
  stepLabels as stepLabelsSelector,
  isManualEditMode as isManualEditModeSelector,
} from '@/stores/useCorrectionStore';
import {
  useGetAlbumDetailsAdminQuery,
  DataQuality,
  useApplyCorrectionMutation,
  useManualCorrectionApplyMutation,
  useTriggerAlbumEnrichmentMutation,
  EnrichmentPriority,
} from '@/generated/graphql';
import type { CorrectionPreview } from '@/lib/correction/preview/types';
import Toast, { useToast } from '@/components/ui/toast';

import { ModalSkeleton } from './shared';
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
  calculateHasSelections,
  toGraphQLSelections,
  type UIFieldSelections,
} from './apply';
import {
  ManualEditView,
  UnsavedChangesDialog,
  computeManualPreview,
  hasUnsavedChanges,
  createInitialEditState,
  type ManualEditFieldState,
} from './manual';
import { FieldComparisonList } from './preview/FieldComparisonList';

export interface CorrectionModalProps {
  /** Album ID to load and correct (required - parent should conditionally render) */
  albumId: string;
  /** Callback when modal should close */
  onClose: () => void;
}

/**
 * Modal shell for the album correction wizard.
 *
 * Search Mode (4 steps):
 * 0. Current Data - Shows existing album data
 * 1. Search - Search for correct MusicBrainz match
 * 2. Preview - Preview changes from selected match
 * 3. Apply - Select fields and apply corrections
 *
 * Manual Edit Mode (3 steps):
 * 0. Current Data - Shows existing album data
 * 1. Edit - Inline edit album fields
 * 2. Apply - Preview changes and apply (combined)
 *
 * The modal fetches album details internally using the albumId.
 * State is persisted per album in sessionStorage, allowing users to
 * navigate away and return to the same step.
 */
export function CorrectionModal({ albumId, onClose }: CorrectionModalProps) {
  // Toast state
  const { toast, showToast, hideToast } = useToast();

  // Query client for cache invalidation
  const queryClient = useQueryClient();

  // Initialize Zustand store for this album
  const store = getCorrectionStore(albumId);

  // Subscribe to state fields - these are hook calls, must always run
  const step = store(s => s.step);
  const mode = store(s => s.mode);
  const selectedMbid = store(s => s.selectedMbid);
  const manualEditState = store(s => s.manualEditState);
  const previewData = store(s => s.previewData);
  const applySelections = store(s => s.applySelections);
  const manualPreviewData = store(s => s.manualPreviewData);
  const shouldEnrich = store(s => s.shouldEnrich);
  const showAppliedState = store(s => s.showAppliedState);
  const showUnsavedDialog = store(s => s.showUnsavedDialog);
  const pendingAction = store(s => s.pendingAction);

  // Use derived selectors - these are also hook calls
  const isFirstStep = store(isFirstStepSelector);
  const isLastStep = store(isLastStepSelector);
  const maxStepVal = store(maxStepSelector);
  const stepLabels = store(stepLabelsSelector);
  const isManualEditMode = store(isManualEditModeSelector);

  // Fetch album details
  const { data, isLoading, error } = useGetAlbumDetailsAdminQuery(
    { id: albumId },
    { enabled: true }
  );

  // Enrichment mutation for re-enriching after correction
  const enrichMutation = useTriggerAlbumEnrichmentMutation();

  const albumData = data?.album;
  // Apply mutation (search mode)
  const applyMutation = useApplyCorrectionMutation({
    onSuccess: response => {
      if (response.correctionApply.success) {
        // Show "Applied!" state
        store.getState().setShowAppliedState(true);

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

          // Queue enrichment if requested
          if (shouldEnrich && albumId) {
            enrichMutation.mutate(
              {
                id: albumId,
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
        } else {
          showToast('Correction applied successfully', 'success');
        }

        // Invalidate album queries
        if (albumId) {
          queryClient.invalidateQueries({ queryKey: ['album', albumId] });
        }

        // Auto-close modal after 1.5s
        setTimeout(() => {
          if (albumId) clearCorrectionStoreCache(albumId);
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

  // Manual apply mutation
  const manualApplyMutation = useManualCorrectionApplyMutation({
    onSuccess: response => {
      if (response.manualCorrectionApply.success) {
        // Show "Applied!" state
        store.getState().setShowAppliedState(true);

        // Build toast message
        const changedCount = manualPreviewData?.summary.changedFields ?? 0;
        showToast(
          `Updated ${changedCount} field${changedCount !== 1 ? 's' : ''}`,
          'success'
        );

        // Invalidate album queries
        if (albumId) {
          queryClient.invalidateQueries({ queryKey: ['album', albumId] });
        }

        // Auto-close modal after 1.5s
        setTimeout(() => {
          if (albumId) clearCorrectionStoreCache(albumId);
          // Manual edit state cleared by store reset
          onClose();
        }, 1500);
      } else {
        const errorMsg =
          response.manualCorrectionApply.message ??
          'Failed to apply correction';
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
        updatedAt: albumData.updatedAt
          ? typeof albumData.updatedAt === 'string'
            ? albumData.updatedAt
            : (albumData.updatedAt as Date).toISOString()
          : new Date().toISOString(),
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
    // Check for unsaved changes in manual edit mode
    if (isManualEditMode && manualEditState && album) {
      const originalState = createInitialEditState(album);
      if (hasUnsavedChanges(originalState, manualEditState)) {
        store.getState().setPendingAction(() => () => {
          if (albumId) clearCorrectionStoreCache(albumId);
          // Manual edit state cleared by store reset
          // Preview data cleared by store reset
          // Manual preview cleared by store reset
          store.getState().setShowAppliedState(false);
          onClose();
        });
        store.getState().setShowUnsavedDialog(true);
        return;
      }
    }

    if (albumId) clearCorrectionStoreCache(albumId);
    // Manual edit state cleared by store reset
    // Preview data cleared by store reset
    // Apply selections cleared by store reset
    // Manual preview cleared by store reset
    store.getState().setShowAppliedState(false);
    store.getState().setShouldEnrich(false);
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
    store.getState().selectResult(result.releaseGroupMbid);
    // Navigate to preview step
    store.getState().nextStep();
  };

  // Handle entering manual edit mode
  const handleEnterManualEdit = () => {
    store.getState().enterManualEdit();
  };

  // Handle entering search mode
  const handleEnterSearch = () => {
    // Check for unsaved changes if switching from manual mode
    if (isManualEditMode && manualEditState && album) {
      const originalState = createInitialEditState(album);
      if (hasUnsavedChanges(originalState, manualEditState)) {
        store.getState().setPendingAction(() => () => {
          // Mode changed by store action;
          // Manual edit state cleared by store reset
          // Manual preview cleared by store reset
          store.getState().setStep(1);
        });
        store.getState().setShowUnsavedDialog(true);
        return;
      }
    }
    // Mode changed by store action;
    // Manual edit state cleared by store reset
    // Manual preview cleared by store reset
    store.getState().setStep(1);
  };

  // Handle manual edit preview click
  // Handle manual apply
  const handleManualApply = () => {
    if (!manualEditState || !album) return;

    manualApplyMutation.mutate({
      input: {
        albumId: album.id,
        title: manualEditState.title,
        artists: manualEditState.artists,
        releaseDate: manualEditState.releaseDate || undefined,
        releaseType: manualEditState.releaseType || undefined,
        musicbrainzId: manualEditState.musicbrainzId || undefined,
        spotifyId: manualEditState.spotifyId || undefined,
        discogsId: manualEditState.discogsId || undefined,
        expectedUpdatedAt: album.updatedAt
          ? new Date(album.updatedAt)
          : new Date(),
      },
    });
  };

  // Handle unsaved changes dialog confirm
  const handleUnsavedConfirm = () => {
    store.getState().setShowUnsavedDialog(false);
    if (pendingAction) {
      pendingAction();
      store.getState().setPendingAction(null);
    }
  };

  // Handle unsaved changes dialog cancel
  const handleUnsavedCancel = () => {
    store.getState().setShowUnsavedDialog(false);
    store.getState().setPendingAction(null);
  };

  // Handle preview loaded callback
  // Handle "Apply This Match" click from PreviewView
  const handleApplyClick = () => {
    store.getState().nextStep(); // Navigate from step 2 (Preview) to step 3 (Apply)
  };

  // Handle apply action from ApplyView
  const handleApply = (
    selections: UIFieldSelections,
    triggerEnrichment?: boolean
  ) => {
    if (!albumId || !previewData) return;

    // Store enrichment preference for onSuccess callback
    store.getState().setShouldEnrich(triggerEnrichment ?? false);

    // Convert UI selections to GraphQL format
    const graphqlSelections = toGraphQLSelections(selections, previewData);

    // Extract expectedUpdatedAt from preview data for optimistic locking
    // albumUpdatedAt is a GraphQL-level field added by the resolver (not in the service CorrectionPreview type)
    const albumUpdatedAtStr = (
      previewData as CorrectionPreview & { albumUpdatedAt?: string }
    ).albumUpdatedAt;
    const expectedUpdatedAt = albumUpdatedAtStr
      ? new Date(albumUpdatedAtStr)
      : (previewData.currentAlbum?.updatedAt ?? new Date());

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
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:!max-w-[1100px] max-h-[90vh] overflow-y-auto custom-scrollbar bg-zinc-900 border-zinc-800 [&>button]:text-zinc-500 [&>button]:hover:text-zinc-300'>
        <DialogHeader>
          <DialogTitle className='truncate pr-8 text-cosmic-latte'>
            {headerTitle}
          </DialogTitle>
        </DialogHeader>

        <StepIndicator
          currentStep={step}
          onStepClick={newStep => store.getState().setStep(newStep)}
          steps={stepLabels}
        />

        {/* Step content area */}
        <div className='min-h-[300px] py-4'>
          {/* Loading state */}
          {isLoading && <ModalSkeleton variant='album' />}

          {/* Error state */}
          {hasError && !isLoading && (
            <div className='flex items-center justify-center h-[300px] border border-dashed border-destructive/30 rounded-lg'>
              <p className='text-destructive'>Failed to load album data</p>
            </div>
          )}

          {/* Step 0: Current Data */}
          {step === 0 && !isLoading && !hasError && album && (
            <div className='space-y-6'>
              <CurrentDataView album={album} />
            </div>
          )}
          {step === 0 && !isLoading && !hasError && !album && (
            <div className='flex items-center justify-center h-[300px] border border-dashed border-muted-foreground/30 rounded-lg'>
              <p className='text-muted-foreground'>No album data available</p>
            </div>
          )}

          {/* Step 1: Search (search mode) */}
          {step === 1 &&
            !isManualEditMode &&
            !isLoading &&
            !hasError &&
            album && <SearchView album={album} />}

          {/* Step 1: Manual Edit (manual mode) */}
          {step === 1 &&
            isManualEditMode &&
            !isLoading &&
            !hasError &&
            album && <ManualEditView album={album} />}

          {step === 1 && isLoading && (
            <div className='flex items-center justify-center h-[300px]'>
              <Loader2 className='h-6 w-6 animate-spin text-zinc-400' />
            </div>
          )}
          {step === 1 && hasError && !isLoading && (
            <div className='p-4 text-center text-red-400'>
              Failed to load album data. Please try again.
            </div>
          )}

          {/* Step 2: Preview (search mode) */}
          {step === 2 &&
            !isManualEditMode &&
            !isLoading &&
            !hasError &&
            selectedMbid &&
            albumId && <PreviewView albumId={albumId} />}
          {step === 2 &&
            !isManualEditMode &&
            !isLoading &&
            !hasError &&
            !selectedMbid && (
              <div className='flex items-center justify-center h-[300px] border border-dashed border-muted-foreground/30 rounded-lg'>
                <div className='text-center'>
                  <p className='text-zinc-500'>No result selected.</p>
                  <p className='text-sm text-zinc-600 mt-1'>
                    Please go back and select a search result.
                  </p>
                </div>
              </div>
            )}

          {/* Step 2: Combined Preview+Apply (manual mode) */}
          {step === 2 &&
            isManualEditMode &&
            !isLoading &&
            !hasError &&
            manualPreviewData && (
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
                  // Combined preview + apply view
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
                      {manualPreviewData.fieldDiffs.length > 0 ? (
                        <FieldComparisonList
                          fieldDiffs={manualPreviewData.fieldDiffs}
                          artistDiff={manualPreviewData.artistDiff}
                        />
                      ) : (
                        <p className='text-zinc-500 text-sm'>
                          No field changes detected.
                        </p>
                      )}

                      {/* Artist changes */}
                      {manualPreviewData.artistDiff.changeType !==
                        'UNCHANGED' && (
                        <div className='mt-4 p-3 bg-zinc-800/50 rounded-md'>
                          <p className='text-sm font-medium text-zinc-300 mb-2'>
                            Artists
                          </p>
                          <div className='flex gap-4 text-sm'>
                            <div className='flex-1'>
                              <p className='text-zinc-500 text-xs mb-1'>
                                Current
                              </p>
                              <p className='text-zinc-300'>
                                {manualPreviewData.artistDiff.currentDisplay}
                              </p>
                            </div>
                            <div className='flex-1'>
                              <p className='text-zinc-500 text-xs mb-1'>New</p>
                              <p className='text-green-400'>
                                {manualPreviewData.artistDiff.sourceDisplay}
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
                        onClick={() => store.getState().setStep(1)}
                        className='border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                      >
                        Back to Edit
                      </Button>
                      <Button
                        onClick={handleManualApply}
                        disabled={manualApplyMutation.isPending}
                        className='bg-blue-600 hover:bg-blue-700 text-white'
                      >
                        {manualApplyMutation.isPending
                          ? 'Applying...'
                          : 'Apply Changes'}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          {step === 2 &&
            isManualEditMode &&
            !isLoading &&
            !hasError &&
            !manualPreviewData && (
              <div className='flex items-center justify-center h-[300px] border border-dashed border-muted-foreground/30 rounded-lg'>
                <div className='text-center'>
                  <p className='text-zinc-500'>No preview data available.</p>
                  <p className='text-sm text-zinc-600 mt-1'>
                    Please go back and make some edits first.
                  </p>
                </div>
              </div>
            )}

          {/* Step 3: Apply (search mode only) */}
          {step === 3 &&
            !isManualEditMode &&
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
                    albumId={albumId}
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
            !isManualEditMode &&
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
              {/* Back button - show on steps 1+ but not on apply steps */}
              {!isFirstStep &&
                !(isManualEditMode && step === 2) &&
                !(!isManualEditMode && step === 3) && (
                  <Button
                    variant='outline'
                    onClick={() => store.getState().prevStep()}
                  >
                    Back
                  </Button>
                )}
              {/* Next button - only on step 0 (handled by action buttons now) or step 2 in search mode */}
              {!isManualEditMode &&
                step !== 0 &&
                step !== 2 &&
                step < maxStepVal && (
                  <Button
                    variant='primary'
                    onClick={() => store.getState().nextStep()}
                  >
                    Next
                  </Button>
                )}
              {!isManualEditMode &&
                step === 2 &&
                previewData &&
                !showAppliedState && (
                  <Button variant='primary' onClick={handleApplyClick}>
                    Apply This Match
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
                      handleApply(applySelections, shouldEnrich);
                    }}
                    className='text-white'
                    disabled={
                      !applySelections ||
                      !calculateHasSelections(applySelections, previewData) ||
                      applyMutation.isPending
                    }
                  >
                    Confirm & Apply
                  </Button>
                )}
              {/* Persistent mode-switch buttons (visible on all steps except apply/success) */}
              {!showAppliedState && step === 0 && album && (
                <>
                  <Button
                    size='sm'
                    onClick={handleEnterSearch}
                    className='bg-red-600 hover:bg-red-700 text-white'
                  >
                    <Search className='w-3.5 h-3.5 mr-1.5' />
                    Go To Search
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleEnterManualEdit}
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

        {/* Toast notification */}
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />

        {/* Unsaved changes dialog */}
        <UnsavedChangesDialog
          open={showUnsavedDialog}
          onConfirm={handleUnsavedConfirm}
          onCancel={handleUnsavedCancel}
        />
      </DialogContent>
    </Dialog>
  );
}
