'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
  CorrectionSource,
} from '@/generated/graphql';
import type { CorrectionPreview } from '@/lib/correction/preview/types';
import Toast, { useToast } from '@/components/ui/toast';

import {
  ModalSkeleton,
  AppliedSuccessState,
  EmptyStepPlaceholder,
} from './shared';
import { StepIndicator } from './StepIndicator';
import { CorrectionFooter } from './CorrectionFooter';
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
import {
  ManualEditView,
  ManualPreviewApplyStep,
  UnsavedChangesDialog,
  hasUnsavedChanges,
  createInitialEditState,
} from './manual';


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
  const correctionSource = store(s => s.correctionSource);

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

  // Shared mutation success handler: show applied state, invalidate queries, auto-close
  const handleMutationSuccess = (toastMessage: string) => {
    store.getState().setShowAppliedState(true);
    showToast(toastMessage, 'success');
    queryClient.invalidateQueries({ queryKey: ['album', albumId] });
    queryClient.invalidateQueries({ queryKey: ['SearchAlbumsAdmin'] });
    queryClient.invalidateQueries({ queryKey: ['GetAlbumDetailsAdmin'] });
    setTimeout(() => {
      clearCorrectionStoreCache(albumId);
      onClose();
    }, 1500);
  };

  const handleMutationError = (error: unknown) => {
    showToast(
      error instanceof Error ? error.message : 'Failed to apply correction',
      'error'
    );
  };

  // Apply mutation (search mode)
  const applyMutation = useApplyCorrectionMutation({
    onSuccess: response => {
      if (response.correctionApply.success) {
        const changes = response.correctionApply.changes;
        let message = 'Correction applied successfully';

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

          message = `Updated: ${parts.join(', ')}`;

          if (changes.dataQualityBefore !== changes.dataQualityAfter) {
            message += ` • Data quality: ${changes.dataQualityBefore} → ${changes.dataQualityAfter}`;
          }
        }

        handleMutationSuccess(message);

        // Queue enrichment if requested
        if (shouldEnrich && albumId) {
          enrichMutation.mutate(
            { id: albumId, priority: EnrichmentPriority.High },
            {
              onSuccess: () => showToast('Enrichment queued', 'success'),
              onError: err =>
                console.error('Failed to queue enrichment:', err),
            }
          );
        }
      } else {
        const errorMsg =
          response.correctionApply.message ?? 'Failed to apply correction';
        showToast(errorMsg, 'error');
      }
    },
    onError: handleMutationError,
  });

  // Manual apply mutation
  const manualApplyMutation = useManualCorrectionApplyMutation({
    onSuccess: response => {
      if (response.manualCorrectionApply.success) {
        const changedCount = manualPreviewData?.summary.changedFields ?? 0;
        handleMutationSuccess(
          `Updated ${changedCount} field${changedCount !== 1 ? 's' : ''}`
        );
      } else {
        const errorMsg =
          response.manualCorrectionApply.message ??
          'Failed to apply correction';
        showToast(errorMsg, 'error');
      }
    },
    onError: handleMutationError,
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

    // Debug logging for correction workflow tracing
    console.log('[CorrectionModal] Applying correction:', {
      albumId,
      selectedMbid: previewData.sourceResult.releaseGroupMbid,
      correctionSource,
      shouldEnrich: triggerEnrichment ?? false,
      selections: graphqlSelections,
    });

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
        source: correctionSource.toUpperCase() as CorrectionSource,
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
      <DialogContent className='sm:!max-w-[1100px] max-h-[90vh] overflow-hidden flex flex-col gap-0 bg-zinc-900 border-zinc-800 [&>button]:text-zinc-500 [&>button]:hover:text-zinc-300'>
        <DialogHeader>
          <DialogTitle className='truncate pr-8 text-cosmic-latte'>
            {headerTitle}
          </DialogTitle>
          <DialogDescription className='sr-only'>
            Wizard to correct album metadata. Use the step indicator to navigate
            between viewing current data, searching for matches, previewing
            changes, and applying corrections.
          </DialogDescription>
        </DialogHeader>

        <StepIndicator
          currentStep={step}
          onStepClick={newStep => store.getState().setStep(newStep)}
          steps={stepLabels}
        />

        {/* Step content area */}
        <div className='min-h-[300px] py-4 flex-1 overflow-y-auto custom-scrollbar'>
          {/* Loading state */}
          {isLoading && <ModalSkeleton variant='album' />}

          {/* Error state */}
          {hasError && !isLoading && (
            <EmptyStepPlaceholder
              message='Failed to load album data'
              variant='error'
            />
          )}

          {/* Step 0: Current Data */}
          {step === 0 && !isLoading && !hasError && album && (
            <div className='space-y-6'>
              <CurrentDataView album={album} />
            </div>
          )}
          {step === 0 && !isLoading && !hasError && !album && (
            <EmptyStepPlaceholder message='No album data available' />
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
              <EmptyStepPlaceholder
                message='No result selected.'
                subtitle='Please go back and select a search result.'
              />
            )}

          {/* Step 2: Combined Preview+Apply (manual mode) */}
          {step === 2 &&
            isManualEditMode &&
            !isLoading &&
            !hasError &&
            manualPreviewData && (
              <ManualPreviewApplyStep
                previewData={manualPreviewData}
                showAppliedState={showAppliedState}
                isPending={manualApplyMutation.isPending}
                onBackToEdit={() => store.getState().setStep(1)}
                onApply={handleManualApply}
              />
            )}
          {step === 2 &&
            isManualEditMode &&
            !isLoading &&
            !hasError &&
            !manualPreviewData && (
              <EmptyStepPlaceholder
                message='No preview data available.'
                subtitle='Please go back and make some edits first.'
              />
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
                  <AppliedSuccessState />
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
              <EmptyStepPlaceholder
                message='Preview data not available.'
                subtitle='Please go back and load the preview first.'
              />
            )}
        </div>

        <CorrectionFooter
          step={step}
          maxStep={maxStepVal}
          isFirstStep={isFirstStep}
          isManualEditMode={isManualEditMode}
          showAppliedState={showAppliedState}
          hasAlbum={!!album}
          previewData={previewData}
          applySelections={applySelections}
          shouldEnrich={shouldEnrich}
          isApplyPending={applyMutation.isPending}
          onClose={handleClose}
          onBack={() => store.getState().prevStep()}
          onNext={() => store.getState().nextStep()}
          onApplyClick={handleApplyClick}
          onConfirmApply={handleApply}
          onEnterSearch={handleEnterSearch}
          onEnterManualEdit={handleEnterManualEdit}
        />

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
