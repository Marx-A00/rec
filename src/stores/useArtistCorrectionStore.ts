/**
 * Zustand store for artist correction modal state with sessionStorage persistence.
 *
 * Store is created per artistId via factory pattern. State persists across navigation
 * using sessionStorage with selective persistence (transient fields excluded).
 *
 * Supports search-only mode in Phase 14 (4 steps): Current → Search → Preview → Apply
 * Mode field and manual edit types included for future expansion but not implemented.
 *
 * Supports multiple correction sources:
 * - MusicBrainz (default)
 * - Discogs
 *
 * Atomic actions ensure consistent state transitions with no intermediate states.
 */

import { create, type StoreApi } from 'zustand';
import type { UseBoundStore } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { ArtistCorrectionPreview } from '@/generated/graphql';
import {
  createDefaultArtistSelections,
  type UIArtistFieldSelections,
} from '@/components/admin/correction/artist/apply/ArtistApplyView';

import type { CorrectionSource } from './useCorrectionStore';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Manual edit state for artist correction.
 * Type defined for future expansion but NOT USED in Phase 14.
 */
export interface ManualArtistEditState {
  name?: string;
  disambiguation?: string;
  countryCode?: string;
  artistType?: string;
  area?: string;
  beginDate?: string;
  endDate?: string;
  gender?: string;
  externalIds?: {
    musicbrainzId?: string;
    ipi?: string;
    isni?: string;
  };
}

/**
 * Artist correction modal state interface.
 *
 * State is divided into:
 * - Persisted fields (survive page navigation via sessionStorage)
 * - Transient fields (reset on page load, excluded from persistence)
 */
export interface ArtistCorrectionState {
  // ========== Persisted Fields ==========

  /** Current wizard step (0-3 for search mode) */
  step: number;

  /** Current correction mode - only 'search' implemented in Phase 14 */
  mode: 'search' | 'manual';

  /** Selected correction source (MusicBrainz or Discogs) */
  correctionSource: CorrectionSource;

  /** Search query for MusicBrainz artist search */
  searchQuery: string | undefined;

  /** Search pagination offset */
  searchOffset: number;

  /** Selected MusicBrainz artist MBID */
  selectedArtistMbid: string | undefined;

  /** Manual edit form state - typed for future, not used in Phase 14 */
  manualEditState: ManualArtistEditState | undefined;

  // ========== Transient Fields (NOT persisted) ==========

  /** Loaded preview data for search mode */
  previewData: ArtistCorrectionPreview | null;

  /** Field selections for apply step */
  applySelections: UIArtistFieldSelections | null;

  /** Enrichment checkbox state (apply step) */
  shouldEnrich: boolean;

  /** Success animation visibility flag */
  showAppliedState: boolean;

  /** Pending action closure for unsaved changes dialog (not serializable) */
  pendingAction: (() => void) | null;

  /** Unsaved changes dialog visibility */
  showUnsavedDialog: boolean;

  /** Preview loading state */
  isPreviewLoading: boolean;
}

/**
 * Artist correction modal action creators.
 */
export interface ArtistCorrectionActions {
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

  /** Switch to manual edit mode (resets search state, sets step to 1) - NOT IMPLEMENTED in Phase 14 */
  enterManualEdit: () => void;

  /** Cancel manual edit and return to search mode step 0 (clears manual state) - NOT IMPLEMENTED in Phase 14 */
  cancelManualEdit: () => void;

  // ========== Source Selection ==========

  /** Set correction source and atomically clear search state */
  setCorrectionSource: (source: CorrectionSource) => void;

  // ========== Search State ==========

  /** Set search query (resets offset to 0) */
  setSearchQuery: (query: string) => void;

  /** Set search pagination offset */
  setSearchOffset: (offset: number) => void;

  // ========== Atomic Result Selection ==========

  /** Select MusicBrainz result and advance to preview step (atomic) */
  selectResult: (mbid: string) => void;

  // ========== Atomic Preview Loading ==========

  /** Set loaded preview and initialize apply selections (atomic) */
  setPreviewLoaded: (preview: ArtistCorrectionPreview) => void;

  // ========== Apply State ==========

  /** Update field selections for apply step */
  setApplySelections: (selections: UIArtistFieldSelections) => void;

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

  // ========== Preview Loading ==========

  /** Set preview loading state */
  setIsPreviewLoading: (loading: boolean) => void;

  // ========== Full State Reset ==========

  /** Clear all state to defaults (removes sessionStorage entry) */
  clearState: () => void;
}

/**
 * Combined store interface (state + actions).
 */
export type ArtistCorrectionStore = ArtistCorrectionState &
  ArtistCorrectionActions;

// Re-export UIArtistFieldSelections for convenience
export type { UIArtistFieldSelections } from '@/components/admin/correction/artist/apply/ArtistApplyView';

// Re-export CorrectionSource for components that only import from this store
export type { CorrectionSource } from './useCorrectionStore';

// ============================================================================
// Default State Values
// ============================================================================

const DEFAULT_STATE: ArtistCorrectionState = {
  // Persisted
  step: 0,
  mode: 'search',
  correctionSource: 'musicbrainz',
  searchQuery: undefined,
  searchOffset: 0,
  selectedArtistMbid: undefined,
  manualEditState: undefined,
  // Transient
  previewData: null,
  applySelections: null,
  shouldEnrich: false,
  showAppliedState: false,
  pendingAction: null,
  showUnsavedDialog: false,
  isPreviewLoading: false,
};

// ============================================================================
// Store Factory
// ============================================================================

/**
 * Create a Zustand store for artist correction modal state.
 *
 * Store uses persist middleware with sessionStorage, keyed by artistId.
 * Only persisted fields are saved (transient fields excluded via partialize).
 *
 * @param artistId - Artist UUID to scope the store
 * @returns Zustand store instance
 */
const createArtistCorrectionStore = (artistId: string) =>
  create<ArtistCorrectionStore>()(
    persist(
      (set, get) => ({
        // ========== Initial State ==========
        ...DEFAULT_STATE,

        // ========== Step Navigation ==========

        setStep: (step: number) => {
          const { mode } = get();
          // TODO: Update when manual mode implemented - currently search-only
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
          });
        },

        enterManualEdit: () => {
          // Not implemented in Phase 14 - included for future expansion
          set({
            mode: 'manual',
            step: 1,
            searchQuery: undefined,
            selectedArtistMbid: undefined,
          });
        },

        cancelManualEdit: () => {
          // Not implemented in Phase 14 - included for future expansion
          set({
            mode: 'search',
            step: 0,
            manualEditState: undefined,
          });
        },

        // ========== Source Selection ==========

        setCorrectionSource: (source: CorrectionSource) => {
          const current = get().correctionSource;
          if (current === source) return; // No-op if same source

          set({
            correctionSource: source,
            // Clear search state atomically
            searchQuery: undefined,
            searchOffset: 0,
            selectedArtistMbid: undefined,
            previewData: null,
            applySelections: null,
          });
        },

        // ========== Search State ==========

        setSearchQuery: (query: string) => {
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
            selectedArtistMbid: mbid,
            step: 2, // Advance to Preview step
          });
        },

        // ========== Atomic Preview Loading ==========

        setPreviewLoaded: (preview: ArtistCorrectionPreview) => {
          set({
            previewData: preview,
            applySelections: createDefaultArtistSelections(preview),
            shouldEnrich: false,
          });
        },

        // ========== Apply State ==========

        setApplySelections: (selections: UIArtistFieldSelections) => {
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

        // ========== Preview Loading ==========

        setIsPreviewLoading: (loading: boolean) => {
          set({ isPreviewLoading: loading });
        },

        // ========== Full State Reset ==========

        clearState: () => {
          set(DEFAULT_STATE);
        },
      }),
      {
        name: `artist-correction-modal-${artistId}`,
        storage: createJSONStorage(() => sessionStorage),
        partialize: state => ({
          // Only persist these fields
          step: state.step,
          mode: state.mode,
          correctionSource: state.correctionSource,
          searchQuery: state.searchQuery,
          searchOffset: state.searchOffset,
          selectedArtistMbid: state.selectedArtistMbid,
          manualEditState: state.manualEditState,
          // Exclude: previewData, applySelections, shouldEnrich,
          // showAppliedState, pendingAction, showUnsavedDialog, isPreviewLoading
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
  UseBoundStore<StoreApi<ArtistCorrectionStore>>
>();

/**
 * Get or create an artist correction store for the given artistId.
 *
 * Returns cached instance if exists, otherwise creates new store.
 * Cache prevents store recreation on component re-renders.
 *
 * @param artistId - Artist UUID to scope the store
 * @returns Store hook instance
 */
export function getArtistCorrectionStore(
  artistId: string
): UseBoundStore<StoreApi<ArtistCorrectionStore>> {
  const cached = storeCache.get(artistId);
  if (cached) {
    return cached;
  }

  const store = createArtistCorrectionStore(artistId);
  storeCache.set(artistId, store);
  return store;
}

/**
 * Clear store cache and sessionStorage for the given artistId.
 *
 * Called when modal closes to clean up resources.
 * Resets state to defaults and removes sessionStorage entry.
 *
 * @param artistId - Artist UUID to clear
 */
export function clearArtistCorrectionStoreCache(artistId: string): void {
  const store = storeCache.get(artistId);
  if (store) {
    // Clear state (triggers persist middleware to remove sessionStorage)
    store.getState().clearState();
    // Remove from cache
    storeCache.delete(artistId);
  }

  // Ensure sessionStorage is cleared even if no cached store
  sessionStorage.removeItem(`artist-correction-modal-${artistId}`);
}

// ============================================================================
// Derived Selectors
// ============================================================================

/**
 * Check if current step is the first step (0).
 */
export function isFirstStep(state: ArtistCorrectionState): boolean {
  return state.step === 0;
}

/**
 * Check if current step is the last step for the current mode.
 * - Search mode: step 3 (Apply)
 * - Manual mode: step 2 (Apply) - NOT IMPLEMENTED in Phase 14
 */
export function isLastStep(state: ArtistCorrectionState): boolean {
  return state.step === (state.mode === 'manual' ? 2 : 3);
}

/**
 * Get maximum step for current mode.
 * - Search mode: 3 (Current, Search, Preview, Apply)
 * - Manual mode: 2 (Current, Edit, Apply) - NOT IMPLEMENTED in Phase 14
 */
export function maxStep(state: ArtistCorrectionState): number {
  return state.mode === 'manual' ? 2 : 3;
}

/**
 * Get step labels for current mode.
 * - Search mode: ['Current', 'Search', 'Preview', 'Apply']
 * - Manual mode: ['Current', 'Edit', 'Apply'] - NOT IMPLEMENTED in Phase 14
 */
export function stepLabels(state: ArtistCorrectionState): string[] {
  return state.mode === 'manual'
    ? ['Current', 'Edit', 'Apply']
    : ['Current', 'Search', 'Preview', 'Apply'];
}

/**
 * Check if current mode is manual edit.
 * Always returns false in Phase 14 (manual mode not implemented).
 */
export function isManualEditMode(state: ArtistCorrectionState): boolean {
  return state.mode === 'manual';
}
