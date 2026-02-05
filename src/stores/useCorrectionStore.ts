/**
 * Zustand store for album correction modal state with sessionStorage persistence.
 *
 * Store is created per albumId via factory pattern. State persists across navigation
 * using sessionStorage with selective persistence (transient fields excluded).
 *
 * Supports dual-mode operation:
 * - Search mode (4 steps): Current Data → Search → Compare → Apply
 * - Manual mode (3 steps): Current Data → Edit → Apply
 *
 * Atomic actions ensure consistent state transitions with no intermediate states.
 */

import { create, type StoreApi } from 'zustand';
import type { UseBoundStore } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { ManualEditFieldState } from '@/components/admin/correction/manual/types';
import type { UIFieldSelections } from '@/components/admin/correction/apply/types';
import { createDefaultUISelections } from '@/components/admin/correction/apply/types';
import type { CorrectionPreview } from '@/lib/correction/preview/types';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Search query state for MusicBrainz search.
 */
export interface SearchQueryState {
  albumTitle: string;
  artistName: string;
}

/**
 * Correction modal state interface.
 *
 * State is divided into:
 * - Persisted fields (survive page navigation via sessionStorage)
 * - Transient fields (reset on page load, excluded from persistence)
 */
export interface CorrectionState {
  // ========== Persisted Fields ==========

  /** Current wizard step (0-3 for search mode, 0-2 for manual mode) */
  step: number;

  /** Current correction mode */
  mode: 'search' | 'manual';

  /** Search query for MusicBrainz (search mode only) */
  searchQuery: SearchQueryState | undefined;

  /** Search pagination offset (search mode only) */
  searchOffset: number;

  /** Selected MusicBrainz release group MBID (search mode only) */
  selectedMbid: string | undefined;

  /** Manual edit form state (manual mode only) */
  manualEditState: ManualEditFieldState | undefined;

  // ========== Transient Fields (NOT persisted) ==========

  /** Loaded preview data for search mode */
  previewData: CorrectionPreview | null;

  /** Field selections for apply step */
  applySelections: UIFieldSelections | null;

  /** Computed preview data for manual mode */
  manualPreviewData: CorrectionPreview | null;

  /** Enrichment checkbox state (apply step) */
  shouldEnrich: boolean;

  /** Success animation visibility flag */
  showAppliedState: boolean;

  /** Pending action closure for unsaved changes dialog (not serializable) */
  pendingAction: (() => void) | null;

  /** Unsaved changes dialog visibility */
  showUnsavedDialog: boolean;
}

/**
 * Correction modal action creators.
 */
export interface CorrectionActions {
  // ========== Step Navigation ==========

  /** Set current step (validates against maxStep for current mode) */
  setStep: (step: number) => void;

  /** Advance to next step (if not at max) */
  nextStep: () => void;

  /** Go back to previous step (if not at 0) */
  prevStep: () => void;

  // ========== Atomic Mode Switching ==========

  /** Switch to search mode (resets manual state, sets step to 1) */
  enterSearch: () => void;

  /** Switch to manual edit mode (resets search state, sets step to 1) */
  enterManualEdit: () => void;

  // ========== Search State ==========

  /** Set search query (resets offset to 0) */
  setSearchQuery: (query: SearchQueryState) => void;

  /** Set search pagination offset */
  setSearchOffset: (offset: number) => void;

  // ========== Atomic Result Selection ==========

  /** Select MusicBrainz result and advance to preview step (atomic) */
  selectResult: (mbid: string) => void;

  // ========== Atomic Preview Loading ==========

  /** Set loaded preview and initialize apply selections (atomic) */
  setPreviewLoaded: (preview: CorrectionPreview) => void;

  // ========== Manual Edit State ==========

  /** Update manual edit form state */
  setManualEditState: (state: ManualEditFieldState) => void;

  /** Set computed manual preview data */
  setManualPreviewData: (preview: CorrectionPreview | null) => void;

  /** Clear manual edit state (form data + preview) */
  clearManualEditState: () => void;

  // ========== Apply State ==========

  /** Update field selections for apply step */
  setApplySelections: (selections: UIFieldSelections) => void;

  /** Set enrichment checkbox state */
  setShouldEnrich: (value: boolean) => void;

  /** Set success animation visibility */
  setShowAppliedState: (value: boolean) => void;

  // ========== Unsaved Changes Dialog ==========

  /** Set pending action closure for unsaved dialog */
  setPendingAction: (action: (() => void) | null) => void;

  /** Set unsaved changes dialog visibility */
  setShowUnsavedDialog: (show: boolean) => void;

  /** Execute pending action and clear dialog state (atomic) */
  confirmUnsavedDiscard: () => void;

  /** Cancel unsaved dialog (clear both states) */
  cancelUnsavedDialog: () => void;

  // ========== Full State Reset ==========

  /** Clear all state to defaults (removes sessionStorage entry) */
  clearState: () => void;
}

/**
 * Combined store interface (state + actions).
 */
export type CorrectionStore = CorrectionState & CorrectionActions;

// ============================================================================
// Default State Values
// ============================================================================

const DEFAULT_STATE: CorrectionState = {
  // Persisted
  step: 0,
  mode: 'search',
  searchQuery: undefined,
  searchOffset: 0,
  selectedMbid: undefined,
  manualEditState: undefined,
  // Transient
  previewData: null,
  applySelections: null,
  manualPreviewData: null,
  shouldEnrich: false,
  showAppliedState: false,
  pendingAction: null,
  showUnsavedDialog: false,
};

// ============================================================================
// Store Factory
// ============================================================================

/**
 * Create a Zustand store for correction modal state.
 *
 * Store uses persist middleware with sessionStorage, keyed by albumId.
 * Only persisted fields are saved (transient fields excluded via partialize).
 *
 * @param albumId - Album UUID to scope the store
 * @returns Zustand store instance
 */
const createCorrectionStore = (albumId: string) =>
  create<CorrectionStore>()(
    persist(
      (set, get) => ({
        // ========== Initial State ==========
        ...DEFAULT_STATE,

        // ========== Step Navigation ==========

        setStep: (step: number) => {
          const { mode } = get();
          const maxStepValue = mode === 'manual' ? 2 : 3;
          if (step >= 0 && step <= maxStepValue) {
            set({ step });
          }
        },

        nextStep: () => {
          const { step, mode } = get();
          const maxStepValue = mode === 'manual' ? 2 : 3;
          if (step < maxStepValue) {
            set({ step: step + 1 });
          }
        },

        prevStep: () => {
          const { step } = get();
          if (step > 0) {
            set({ step: step - 1 });
          }
        },

        // ========== Atomic Mode Switching ==========

        enterSearch: () => {
          set({
            mode: 'search',
            step: 1,
            manualEditState: undefined,
            manualPreviewData: null,
          });
        },

        enterManualEdit: () => {
          set({
            mode: 'manual',
            step: 1,
            searchQuery: undefined,
            selectedMbid: undefined,
          });
        },

        // ========== Search State ==========

        setSearchQuery: (query: SearchQueryState) => {
          set({
            searchQuery: query,
            searchOffset: 0, // Reset offset when query changes
          });
        },

        setSearchOffset: (offset: number) => {
          set({ searchOffset: offset });
        },

        // ========== Atomic Result Selection ==========

        selectResult: (mbid: string) => {
          set({
            selectedMbid: mbid,
            step: 2, // Advance to Compare step
          });
        },

        // ========== Atomic Preview Loading ==========

        setPreviewLoaded: (preview: CorrectionPreview) => {
          set({
            previewData: preview,
            applySelections: createDefaultUISelections(preview),
            shouldEnrich: false,
          });
        },

        // ========== Manual Edit State ==========

        setManualEditState: (state: ManualEditFieldState) => {
          set({ manualEditState: state });
        },

        setManualPreviewData: (preview: CorrectionPreview | null) => {
          set({ manualPreviewData: preview });
        },

        clearManualEditState: () => {
          set({
            manualEditState: undefined,
            manualPreviewData: null,
          });
        },

        // ========== Apply State ==========

        setApplySelections: (selections: UIFieldSelections) => {
          set({ applySelections: selections });
        },

        setShouldEnrich: (value: boolean) => {
          set({ shouldEnrich: value });
        },

        setShowAppliedState: (value: boolean) => {
          set({ showAppliedState: value });
        },

        // ========== Unsaved Changes Dialog ==========

        setPendingAction: (action: (() => void) | null) => {
          set({ pendingAction: action });
        },

        setShowUnsavedDialog: (show: boolean) => {
          set({ showUnsavedDialog: show });
        },

        confirmUnsavedDiscard: () => {
          const { pendingAction } = get();
          if (pendingAction) {
            pendingAction();
          }
          set({
            pendingAction: null,
            showUnsavedDialog: false,
          });
        },

        cancelUnsavedDialog: () => {
          set({
            pendingAction: null,
            showUnsavedDialog: false,
          });
        },

        // ========== Full State Reset ==========

        clearState: () => {
          set(DEFAULT_STATE);
        },
      }),
      {
        name: `correction-modal-${albumId}`,
        storage: createJSONStorage(() => sessionStorage),
        partialize: (state) => ({
          // Only persist these fields
          step: state.step,
          mode: state.mode,
          searchQuery: state.searchQuery,
          searchOffset: state.searchOffset,
          selectedMbid: state.selectedMbid,
          manualEditState: state.manualEditState,
          // Exclude: previewData, applySelections, manualPreviewData,
          // shouldEnrich, showAppliedState, pendingAction, showUnsavedDialog
        }),
      }
    )
  );

// ============================================================================
// Store Cache Management
// ============================================================================

/**
 * Module-level cache for store instances.
 * Prevents recreation on re-renders and supports cleanup on modal close.
 */
const storeCache = new Map<
  string,
  UseBoundStore<StoreApi<CorrectionStore>>
>();

/**
 * Get or create a correction store for the given albumId.
 *
 * Returns cached instance if exists, otherwise creates new store.
 * Cache prevents store recreation on component re-renders.
 *
 * @param albumId - Album UUID to scope the store
 * @returns Store hook instance
 */
export function getCorrectionStore(
  albumId: string
): UseBoundStore<StoreApi<CorrectionStore>> {
  const cached = storeCache.get(albumId);
  if (cached) {
    return cached;
  }

  const store = createCorrectionStore(albumId);
  storeCache.set(albumId, store);
  return store;
}

/**
 * Clear store cache and sessionStorage for the given albumId.
 *
 * Called when modal closes to clean up resources.
 * Resets state to defaults and removes sessionStorage entry.
 *
 * @param albumId - Album UUID to clear
 */
export function clearCorrectionStoreCache(albumId: string): void {
  const store = storeCache.get(albumId);
  if (store) {
    // Clear state (triggers persist middleware to remove sessionStorage)
    store.getState().clearState();
    // Remove from cache
    storeCache.delete(albumId);
  }

  // Ensure sessionStorage is cleared even if no cached store
  sessionStorage.removeItem(`correction-modal-${albumId}`);
}

// ============================================================================
// Derived Selectors
// ============================================================================

/**
 * Check if current step is the first step (0).
 */
export function isFirstStep(state: CorrectionState): boolean {
  return state.step === 0;
}

/**
 * Check if current step is the last step for the current mode.
 * - Search mode: step 3 (Apply)
 * - Manual mode: step 2 (Apply)
 */
export function isLastStep(state: CorrectionState): boolean {
  return state.step === (state.mode === 'manual' ? 2 : 3);
}

/**
 * Get maximum step for current mode.
 * - Search mode: 3 (Current, Search, Compare, Apply)
 * - Manual mode: 2 (Current, Edit, Apply)
 */
export function maxStep(state: CorrectionState): number {
  return state.mode === 'manual' ? 2 : 3;
}

/**
 * Get step labels for current mode.
 * - Search mode: ['Current Data', 'Search', 'Compare', 'Apply']
 * - Manual mode: ['Current Data', 'Edit', 'Apply']
 */
export function stepLabels(state: CorrectionState): string[] {
  return state.mode === 'manual'
    ? ['Current Data', 'Edit', 'Apply']
    : ['Current Data', 'Search', 'Compare', 'Apply'];
}

/**
 * Check if current mode is manual edit.
 */
export function isManualEditMode(state: CorrectionState): boolean {
  return state.mode === 'manual';
}
