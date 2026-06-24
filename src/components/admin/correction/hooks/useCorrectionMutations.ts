import { useQueryClient } from '@tanstack/react-query';

import {
  useApplyCorrectionMutation,
  useManualCorrectionApplyMutation,
  useTriggerAlbumEnrichmentMutation,
  EnrichmentPriority,
} from '@/generated/graphql';
import {
  getCorrectionStore,
  clearCorrectionStoreCache,
} from '@/stores/useCorrectionStore';

type CorrectionStoreApi = ReturnType<typeof getCorrectionStore>;

interface UseCorrectionMutationsParams {
  albumId: string;
  store: CorrectionStoreApi;
  showToast: (message: string, type: 'success' | 'error') => void;
  onClose: () => void;
}

export function useCorrectionMutations({
  albumId,
  store,
  showToast,
  onClose,
}: UseCorrectionMutationsParams) {
  const queryClient = useQueryClient();
  const enrichMutation = useTriggerAlbumEnrichmentMutation();

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

        // Queue enrichment if requested (read latest value from store)
        const shouldEnrich = store.getState().shouldEnrich;
        if (shouldEnrich && albumId) {
          enrichMutation.mutate(
            { id: albumId, priority: EnrichmentPriority.High },
            {
              onSuccess: () => showToast('Enrichment queued', 'success'),
              onError: err => console.error('Failed to queue enrichment:', err),
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

  const manualApplyMutation = useManualCorrectionApplyMutation({
    onSuccess: response => {
      if (response.manualCorrectionApply.success) {
        const manualPreviewData = store.getState().manualPreviewData;
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

  return { applyMutation, manualApplyMutation };
}
