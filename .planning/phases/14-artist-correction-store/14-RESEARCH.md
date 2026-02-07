# Phase 14: Artist Correction Store - Research

**Researched:** 2026-02-04
**Domain:** Zustand state management for artist correction modal (search-only mode)
**Confidence:** HIGH

## Summary

This research covers migrating artist correction modal state from the custom hook (`useArtistCorrectionModalState`) to Zustand store pattern. Phase 13 already established the complete pattern with album correction store (`useCorrectionStore.ts`), which serves as the direct template. The artist store is **simpler** than album because it has no dual mode — search-only, no manual edit mode in v1.

**Key findings:**

- Album correction store at `src/stores/useCorrectionStore.ts` is the exact template to follow
- Artist has **search-only mode** (4 steps) vs album's dual mode (search 4 steps, manual 3 steps)
- Current hook at `src/hooks/useArtistCorrectionModalState.ts` has 157 lines vs album's 221 lines (simpler)
- Artist store will include mode field + manual edit state fields in type definition for **future expansion** but only search mode implemented in Phase 14
- Same factory pattern with Map cache, keyed by artistId (not albumId)
- Same sessionStorage persistence with partialize middleware
- Identical atomic action patterns, derived selectors, and cleanup logic

**Primary recommendation:** Copy `useCorrectionStore.ts` structure, adapt for artist domain (simpler state, search-only mode), include mode field and manual edit state types for future but only implement search mode actions. Follow Phase 13 migration pattern exactly.

## Standard Stack

### Core

| Library            | Version | Purpose                     | Why Standard                                         |
| ------------------ | ------- | --------------------------- | ---------------------------------------------------- |
| zustand            | ^5.0.8  | State management            | Already used in Phase 13 album store; proven pattern |
| zustand/middleware | (incl.) | Persist + createJSONStorage | Official middleware for sessionStorage persistence   |

### Supporting

| Library        | Version    | Purpose              | When to Use                                         |
| -------------- | ---------- | -------------------- | --------------------------------------------------- |
| react-query v5 | (existing) | Server state caching | Preview data fetching (not persisted, cached by RQ) |

### Alternatives Considered

| Instead of      | Could Use        | Tradeoff                                                              |
| --------------- | ---------------- | --------------------------------------------------------------------- |
| Zustand store   | Keep custom hook | More boilerplate, prop drilling continues, inconsistent with Phase 13 |
| Factory pattern | Single store     | Loses per-artist persistence isolation                                |
| sessionStorage  | localStorage     | Would persist across sessions (undesirable for corrections)           |

**Installation:**

```bash
# Already installed - no new dependencies needed
# Verified in Phase 13
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── stores/
│   ├── useCorrectionStore.ts         # Phase 13 - album correction (TEMPLATE)
│   └── useArtistCorrectionStore.ts   # Phase 14 - artist correction (NEW)
├── components/admin/correction/artist/
│   ├── ArtistCorrectionModal.tsx     # Refactor to use store
│   ├── search/ArtistSearchView.tsx   # Read from store (artist prop only)
│   ├── preview/ArtistPreviewView.tsx # Read from store (zero props)
│   └── apply/ArtistApplyView.tsx     # Read from store (isApplying + error only)
└── hooks/
    └── useArtistCorrectionModalState.ts # DELETE after migration
```

### Pattern 1: Store Factory with artistId Keys (Same as Phase 13)

**What:** Create isolated store instances per artistId using factory pattern with Map cache and sessionStorage keyed by `artist-correction-modal-${artistId}`.

**When to use:** When state must be isolated per entity with separate persistence (exact same as Phase 13 album store).

**Example:**

```typescript
// Source: Adapted from src/stores/useCorrectionStore.ts (Phase 13)
const createArtistCorrectionStore = (artistId: string) =>
  create<ArtistCorrectionStore>()(
    persist(
      (set, get) => ({
        // Initial state
        step: 0,
        mode: 'search', // Artist v1: search-only, but include mode for future
        searchQuery: undefined,
        searchOffset: 0,
        selectedArtistMbid: undefined,
        manualEditState: undefined, // Type defined but not used in Phase 14
        previewData: null,
        // ... actions
      }),
      {
        name: `artist-correction-modal-${artistId}`,
        storage: createJSONStorage(() => sessionStorage),
        partialize: state => ({
          step: state.step,
          mode: state.mode,
          searchQuery: state.searchQuery,
          searchOffset: state.searchOffset,
          selectedArtistMbid: state.selectedArtistMbid,
          manualEditState: state.manualEditState,
          // Exclude: previewData, pendingAction
        }),
      }
    )
  );

// Map cache prevents recreation on re-renders
const storeCache = new Map<
  string,
  ReturnType<typeof createArtistCorrectionStore>
>();

export function getArtistCorrectionStore(artistId: string) {
  const cached = storeCache.get(artistId);
  if (cached) return cached;

  const store = createArtistCorrectionStore(artistId);
  storeCache.set(artistId, store);
  return store;
}
```

### Pattern 2: Atomic Actions (Same as Phase 13)

**What:** Group related state changes into single `set()` calls to prevent intermediate states.

**When to use:** Multiple fields change together atomically (e.g., selecting result advances step).

**Example:**

```typescript
// Source: Proven pattern from Phase 13 album store
interface ArtistCorrectionActions {
  // ✅ GOOD: Atomic result selection + step advance
  selectResult: (mbid: string) => {
    set({
      selectedArtistMbid: mbid,
      step: 2, // Advance to Preview step atomically
    });
  };

  // ✅ GOOD: Atomic preview load with default selections
  setPreviewLoaded: (preview: ArtistCorrectionPreview) => {
    set({
      previewData: preview,
      applySelections: createDefaultUISelections(preview),
      shouldEnrich: false,
    });
  };
}
```

### Pattern 3: Derived Selectors as Standalone Functions (Same as Phase 13)

**What:** Export computed values as standalone selector functions instead of storing in state.

**When to use:** Values can be computed from existing state (e.g., `isFirstStep = step === 0`).

**Example:**

```typescript
// Source: Pattern from Phase 13 album store
export const isFirstStep = (state: ArtistCorrectionState) => state.step === 0;
export const isLastStep = (state: ArtistCorrectionState) => state.step === 3; // Always 3 for search-only
export const maxStep = (state: ArtistCorrectionState) => 3; // Search mode only in v1

// Usage in components
const step = useArtistCorrectionStore(s => s.step);
const isFirst = useArtistCorrectionStore(isFirstStep);
```

### Pattern 4: Future-Proofing with Mode Field

**What:** Include `mode` field and manual edit state types in state definition even though only search mode is implemented in Phase 14.

**When to use:** Anticipating future expansion to manual edit mode (like album has).

**Example:**

```typescript
// Include mode field for future manual edit expansion
export interface ArtistCorrectionState {
  step: number;
  mode: 'search' | 'manual'; // Type includes both, but only 'search' used in Phase 14
  searchQuery?: string;
  selectedArtistMbid?: string;

  // Manual edit state - typed for future but not used in Phase 14
  manualEditState?: ManualArtistEditState; // Include in persisted fields
}

// Type definition for future manual edit (not implemented in Phase 14)
interface ManualArtistEditState {
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
```

**Rationale:** Phase context states "Include full manual edit state fields in type definition" even though manual mode is not implemented. This makes future expansion cleaner.

### Anti-Patterns to Avoid (Same as Phase 13)

- **Storing closures in state:** `pendingAction: () => void` cannot be serialized. Exclude via `partialize`.
- **Persisting preview data:** Large `ArtistCorrectionPreview` objects should not be persisted. Re-fetch via GraphQL.
- **Over-subscribing:** Use selectors `(s) => s.step` not `(s) => s` to prevent unnecessary re-renders.
- **Any types:** Phase 14 success criteria explicitly requires "zero any types introduced".

## Don't Hand-Roll

(Same as Phase 13 - pattern already established)

| Problem                 | Don't Build                 | Use Instead                   | Why                                                 |
| ----------------------- | --------------------------- | ----------------------------- | --------------------------------------------------- |
| SessionStorage sync     | Custom useEffect + useState | Zustand persist middleware    | Handles serialization, rehydration, race conditions |
| Derived state           | useMemo in every component  | Standalone selector functions | Single source of truth                              |
| Multi-step wizard state | Separate useState per field | Zustand store with atomics    | Atomic updates prevent intermediate states          |

## Common Pitfalls

(All pitfalls from Phase 13 apply - patterns are identical)

### Pitfall 1: Mixing Album and Artist Store Names

**What goes wrong:** Copy-paste from Phase 13 album store but forget to change storage key from `correction-modal-${albumId}` to `artist-correction-modal-${artistId}`.

**Why it happens:** Album store is the template; easy to miss renaming.

**How to avoid:**

- Search/replace `correction-modal-` → `artist-correction-modal-` in new file
- Search/replace `albumId` → `artistId` throughout
- Test with multiple artists to verify isolation

**Warning signs:**

- Artist state persists when switching to different artist
- sessionStorage shows `correction-modal-*` keys instead of `artist-correction-modal-*`

### Pitfall 2: Including Manual Edit Actions in Phase 14

**What goes wrong:** Implementing `enterManualEdit()`, `setManualEditState()` actions when Phase 14 only requires search mode.

**Why it happens:** Album store has these actions; template includes them.

**How to avoid:**

- Phase 14 plans explicitly state: "Artist v1 is search-only"
- Include **types** for manual edit state (for future) but **not actions**
- Document in code comments: "Manual edit mode not implemented in Phase 14"

**Warning signs:**

- Actions exist but aren't used anywhere
- Tests try to enter manual edit mode and fail

### Pitfall 3: Search Query Type Mismatch

**What goes wrong:** Album uses `SearchQueryState { albumTitle, artistName }`, artist uses single `string` query.

**Why it happens:** Different search UX patterns.

**How to avoid:**

- **Current artist hook:** `searchQuery?: string` (single field)
- **Current artist component:** `Input` for artist name only
- **Artist store should use:** `searchQuery?: string` (NOT an object)

**Warning signs:**

- TypeScript errors in `ArtistSearchView` expecting `searchQuery.artistName`
- Input value comes from wrong field

### Pitfall 4: Wrong Step Count in Selectors

**What goes wrong:** Copy `isLastStep` from album store which checks `step === (mode === 'manual' ? 2 : 3)` but artist is always 3 (search-only).

**Why it happens:** Artist has no manual mode in Phase 14.

**How to avoid:**

```typescript
// ✅ CORRECT for artist (search-only in Phase 14)
export const isLastStep = (state: ArtistCorrectionState) => state.step === 3;
export const maxStep = (state: ArtistCorrectionState) => 3;

// ❌ WRONG - this is album logic (dual mode)
export const isLastStep = (state: ArtistCorrectionState) =>
  state.step === (state.mode === 'manual' ? 2 : 3);
```

**Warning signs:**

- Step navigation allows advancing past step 3
- "Apply" button doesn't show on step 3

## Code Examples

### Complete Artist Correction Store Implementation

```typescript
// Source: Adapted from src/stores/useCorrectionStore.ts (Phase 13)
// File: src/stores/useArtistCorrectionStore.ts
import { create, type StoreApi } from 'zustand';
import type { UseBoundStore } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ArtistCorrectionPreview } from '@/lib/correction/artist/preview/types';

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
 * UI field selections for apply step.
 */
export interface UIArtistFieldSelections {
  metadata: {
    name: boolean;
    disambiguation: boolean;
    countryCode: boolean;
    artistType: boolean;
    area: boolean;
    beginDate: boolean;
    endDate: boolean;
    gender: boolean;
  };
  externalIds: {
    musicbrainzId: boolean;
    ipi: boolean;
    isni: boolean;
  };
}

/**
 * Artist correction modal state.
 */
export interface ArtistCorrectionState {
  // ========== Persisted Fields ==========

  /** Current wizard step (0-3 for search mode) */
  step: number;

  /** Correction mode - only 'search' implemented in Phase 14 */
  mode: 'search' | 'manual';

  /** Search query (artist name) */
  searchQuery: string | undefined;

  /** Search pagination offset */
  searchOffset: number;

  /** Selected MusicBrainz artist MBID */
  selectedArtistMbid: string | undefined;

  /** Manual edit state - typed for future, not used in Phase 14 */
  manualEditState: ManualArtistEditState | undefined;

  // ========== Transient Fields (NOT persisted) ==========

  /** Loaded preview data */
  previewData: ArtistCorrectionPreview | null;

  /** Field selections for apply step */
  applySelections: UIArtistFieldSelections | null;

  /** Enrichment checkbox state */
  shouldEnrich: boolean;

  /** Success animation visibility flag */
  showAppliedState: boolean;

  /** Pending action closure (not serializable) */
  pendingAction: (() => void) | null;

  /** Unsaved changes dialog visibility */
  showUnsavedDialog: boolean;
}

/**
 * Artist correction modal actions.
 */
export interface ArtistCorrectionActions {
  // Step navigation
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;

  // Search state
  setSearchQuery: (query: string) => void;
  setSearchOffset: (offset: number) => void;
  clearSearchState: () => void;

  // Atomic: Select result and advance step
  selectResult: (mbid: string) => void;

  // Atomic: Set preview data with default selections
  setPreviewLoaded: (preview: ArtistCorrectionPreview) => void;

  // Apply selections
  setApplySelections: (selections: UIArtistFieldSelections) => void;
  setShouldEnrich: (value: boolean) => void;
  setShowAppliedState: (value: boolean) => void;

  // Unsaved changes dialog
  setPendingAction: (action: (() => void) | null) => void;
  setShowUnsavedDialog: (show: boolean) => void;
  confirmUnsavedDiscard: () => void;
  cancelUnsavedDialog: () => void;

  // Full state reset
  clearState: () => void;
}

export type ArtistCorrectionStore = ArtistCorrectionState &
  ArtistCorrectionActions;

// ============================================================================
// Default State
// ============================================================================

const DEFAULT_STATE: ArtistCorrectionState = {
  step: 0,
  mode: 'search',
  searchQuery: undefined,
  searchOffset: 0,
  selectedArtistMbid: undefined,
  manualEditState: undefined,
  previewData: null,
  applySelections: null,
  shouldEnrich: false,
  showAppliedState: false,
  pendingAction: null,
  showUnsavedDialog: false,
};

// ============================================================================
// Store Factory
// ============================================================================

const createArtistCorrectionStore = (artistId: string) =>
  create<ArtistCorrectionStore>()(
    persist(
      (set, get) => ({
        ...DEFAULT_STATE,

        setStep: (step: number) => {
          if (step >= 0 && step <= 3) {
            set({ step });
          }
        },

        nextStep: () => {
          const { step } = get();
          if (step < 3) {
            set({ step: step + 1 });
          }
        },

        prevStep: () => {
          const { step } = get();
          if (step > 0) {
            set({ step: step - 1 });
          }
        },

        setSearchQuery: (query: string) => {
          set({ searchQuery: query, searchOffset: 0 });
        },

        setSearchOffset: (offset: number) => {
          set({ searchOffset: offset });
        },

        clearSearchState: () => {
          set({
            searchQuery: undefined,
            searchOffset: 0,
            selectedArtistMbid: undefined,
          });
        },

        // Atomic: Select result and advance to preview
        selectResult: (mbid: string) => {
          set({
            selectedArtistMbid: mbid,
            step: 2,
          });
        },

        // Atomic: Set preview with default selections
        setPreviewLoaded: (preview: ArtistCorrectionPreview) => {
          const {
            createDefaultUISelections,
          } = require('@/components/admin/correction/artist/apply/ArtistApplyView');
          set({
            previewData: preview,
            applySelections: createDefaultUISelections(preview),
            shouldEnrich: false,
          });
        },

        setApplySelections: (selections: UIArtistFieldSelections) => {
          set({ applySelections: selections });
        },

        setShouldEnrich: (value: boolean) => {
          set({ shouldEnrich: value });
        },

        setShowAppliedState: (value: boolean) => {
          set({ showAppliedState: value });
        },

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

        clearState: () => {
          set(DEFAULT_STATE);
        },
      }),
      {
        name: `artist-correction-modal-${artistId}`,
        storage: createJSONStorage(() => sessionStorage),
        partialize: state => ({
          step: state.step,
          mode: state.mode,
          searchQuery: state.searchQuery,
          searchOffset: state.searchOffset,
          selectedArtistMbid: state.selectedArtistMbid,
          manualEditState: state.manualEditState,
          // Exclude: previewData, applySelections, shouldEnrich,
          // showAppliedState, pendingAction, showUnsavedDialog
        }),
      }
    )
  );

// ============================================================================
// Store Cache
// ============================================================================

const storeCache = new Map<
  string,
  UseBoundStore<StoreApi<ArtistCorrectionStore>>
>();

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

export function clearArtistCorrectionStoreCache(artistId: string): void {
  const store = storeCache.get(artistId);
  if (store) {
    store.getState().clearState();
    storeCache.delete(artistId);
  }

  sessionStorage.removeItem(`artist-correction-modal-${artistId}`);
}

// ============================================================================
// Derived Selectors
// ============================================================================

export function isFirstStep(state: ArtistCorrectionState): boolean {
  return state.step === 0;
}

export function isLastStep(state: ArtistCorrectionState): boolean {
  return state.step === 3; // Search mode only in Phase 14
}

export function maxStep(state: ArtistCorrectionState): number {
  return 3; // Search mode: Current (0), Search (1), Preview (2), Apply (3)
}

export function stepLabels(state: ArtistCorrectionState): string[] {
  return ['Current', 'Search', 'Preview', 'Apply'];
}

export function isManualEditMode(state: ArtistCorrectionState): boolean {
  return state.mode === 'manual'; // Always false in Phase 14
}
```

### Component Usage Pattern

```typescript
// ArtistCorrectionModal.tsx - Store initialization
'use client';

import {
  getArtistCorrectionStore,
  clearArtistCorrectionStoreCache,
} from '@/stores/useArtistCorrectionStore';

export function ArtistCorrectionModal({ artist, onClose }: Props) {
  const artistId = artist?.id ?? null;

  // Get store instance
  const store = artistId ? getArtistCorrectionStore(artistId) : null;
  const step = store?.(s => s.step) ?? 0;

  const handleClose = () => {
    if (artistId) {
      clearArtistCorrectionStoreCache(artistId);
    }
    onClose();
  };

  // ...rest
}

// ArtistSearchView.tsx - Zero props except artist
export function ArtistSearchView({ artist }: { artist: Artist }) {
  const store = getArtistCorrectionStore(artist.id);

  const searchQuery = store(s => s.searchQuery);
  const setSearchQuery = store(s => s.setSearchQuery);
  const selectResult = store(s => s.selectResult);

  // ...rest
}

// ArtistPreviewView.tsx - Zero props (reads artistId + mbid from store)
export function ArtistPreviewView() {
  // Get artistId from URL param or context
  const params = useParams();
  const artistId = params.artistId as string;

  const store = getArtistCorrectionStore(artistId);
  const selectedMbid = store(s => s.selectedArtistMbid);
  const setPreviewLoaded = store(s => s.setPreviewLoaded);

  // ...rest
}

// ArtistApplyView.tsx - Only isApplying + error props
export function ArtistApplyView({
  isApplying,
  error,
}: {
  isApplying: boolean;
  error: Error | null;
}) {
  const params = useParams();
  const artistId = params.artistId as string;

  const store = getArtistCorrectionStore(artistId);
  const previewData = store(s => s.previewData);
  const applySelections = store(s => s.applySelections);
  const setApplySelections = store(s => s.setApplySelections);

  // ...rest
}
```

## Domain-Specific Differences: Album vs Artist

### State Shape Comparison

| Aspect               | Album Correction                                 | Artist Correction                                 |
| -------------------- | ------------------------------------------------ | ------------------------------------------------- |
| **Mode**             | Dual: 'search' (4 steps), 'manual' (3 steps)     | Single: 'search' only (4 steps) in Phase 14       |
| **Search Query**     | `{ albumTitle: string, artistName: string }`     | `string` (artist name only)                       |
| **Selected MBID**    | `selectedMbid: string` (release group)           | `selectedArtistMbid: string`                      |
| **Preview Type**     | `CorrectionPreview` (album + tracks)             | `ArtistCorrectionPreview` (artist + album count)  |
| **Apply Selections** | `UIFieldSelections` (metadata, tracks, external) | `UIArtistFieldSelections` (metadata, externalIds) |
| **Manual Edit**      | Fully implemented with ManualEditFieldState      | Type defined but NOT implemented in Phase 14      |

### Step Definitions

**Album (Dual Mode):**

- Search mode: Current (0), Search (1), Compare (2), Apply (3)
- Manual mode: Current (0), Edit (1), Apply (2)

**Artist (Search-Only in Phase 14):**

- Search mode: Current (0), Search (1), Preview (2), Apply (3)
- Manual mode: NOT IMPLEMENTED (types defined for future)

### Persistence Keys

- **Album:** `correction-modal-${albumId}`
- **Artist:** `artist-correction-modal-${artistId}`

### Current Component Props (Before Migration)

**ArtistSearchView (current):**

```typescript
interface ArtistSearchViewProps {
  artist: Artist; // ✅ Keep (current data for context)
  onResultSelect: (mbid: string) => void; // ❌ Remove (use store action)
  modalState: ReturnType<typeof useArtistCorrectionModalState>; // ❌ Remove (use store)
}
```

**ArtistPreviewView (current):**

```typescript
interface ArtistPreviewViewProps {
  artistId: string; // ❌ Remove (read from store or context)
  artistMbid: string; // ❌ Remove (read from store)
  onPreviewLoaded?: (preview: ArtistCorrectionPreview) => void; // ❌ Remove (use store action)
}
```

**ArtistApplyView (current):**

```typescript
interface ArtistApplyViewProps {
  preview: ArtistCorrectionPreview; // ❌ Remove (read from store)
  onApply: (selections, enrichment) => void; // ⚠️ Keep in parent modal (mutation callback)
  onBack: () => void; // ❌ Remove (use store.prevStep)
  isApplying?: boolean; // ✅ Keep (mutation state from parent)
  error?: Error | null; // ✅ Keep (mutation error from parent)
}
```

### Target Component Props (After Migration)

**ArtistSearchView (target):**

```typescript
interface ArtistSearchViewProps {
  artist: Artist; // Only prop needed
}
```

**ArtistPreviewView (target):**

```typescript
interface ArtistPreviewViewProps {
  // Zero props - reads everything from store
}
```

**ArtistApplyView (target):**

```typescript
interface ArtistApplyViewProps {
  isApplying: boolean; // Mutation state from parent
  error: Error | null; // Mutation error from parent
}
```

## State of the Art

| Old Approach                           | Current Approach                 | When Changed          | Impact                                      |
| -------------------------------------- | -------------------------------- | --------------------- | ------------------------------------------- |
| Custom hook with manual sessionStorage | Zustand persist middleware       | Phase 14 (this phase) | Consistent with album store (Phase 13)      |
| Props drilling through 3 layers        | Direct store subscription        | Phase 14              | Zero prop changes in child components       |
| Multiple useState in modal             | Single store with atomic actions | Phase 14              | No intermediate states, easier debugging    |
| Separate album and artist patterns     | Unified correction store pattern | Phase 14              | Easier maintenance, consistent developer UX |

**Deprecated/outdated:**

- `useArtistCorrectionModalState.ts` hook: Will be deleted in Phase 14
- Props `modalState`, `onResultSelect`, `onPreviewLoaded` in child components: Replaced by direct store access

## Open Questions

### 1. Should artist store include mode field even though only search mode implemented?

**What we know:**

- Phase context states: "Include full manual edit state fields in type definition"
- Album store has dual mode fully implemented
- Artist manual edit likely coming in future phase

**What's unclear:**

- Exact timeline for artist manual edit implementation
- Whether type-only definition adds confusion

**Recommendation:** YES, include mode field and ManualArtistEditState type definition but document clearly in code comments that manual mode is not implemented in Phase 14. This makes future expansion cleaner and maintains consistency with album store structure.

### 2. How to handle createDefaultUISelections import in setPreviewLoaded action?

**What we know:**

- Album store uses `require()` to avoid circular dependency
- Function lives in ArtistApplyView.tsx (needs to be exported)
- Atomic action needs to call this function

**What's unclear:**

- Whether to move function to separate file or keep in component

**Recommendation:** Extract `createDefaultUISelections` to separate file (e.g., `src/components/admin/correction/artist/apply/utils.ts` or `types.ts`) to avoid circular dependency and make it easier to import in store. This is cleaner than `require()` pattern.

### 3. Should step navigation validate mode in Phase 14?

**What we know:**

- Album store validates: `maxStep = mode === 'manual' ? 2 : 3`
- Artist only has search mode in Phase 14
- Future may add manual mode

**What's unclear:**

- Whether to hard-code step 3 or check mode field for future-proofing

**Recommendation:** Hard-code step 3 in Phase 14 since manual mode is not implemented. Add TODO comment: "// TODO: Update when manual mode implemented". Keep code simple for current scope, refactor when manual mode added.

## Sources

### Primary (HIGH confidence)

- Local codebase: `src/stores/useCorrectionStore.ts` (Phase 13 template)
- Local codebase: `src/hooks/useArtistCorrectionModalState.ts` (current implementation)
- Local codebase: `src/components/admin/correction/artist/*` (component structure)
- `.planning/phases/13-album-correction-store/13-RESEARCH.md` (Phase 13 patterns)
- Phase 14 context from `/gsd:discuss-phase` (user decisions)

### Secondary (MEDIUM confidence)

- [Zustand Official Docs — Persisting Store Data](https://zustand.docs.pmnd.rs/integrations/persisting-store-data)
- [GitHub — pmndrs/zustand v5.0.8](https://github.com/pmndrs/zustand)

### Tertiary (LOW confidence)

- None - all findings based on local codebase analysis

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Phase 13 established pattern, zero unknowns
- Architecture: HIGH - Direct template exists, differences documented
- Pitfalls: HIGH - Based on Phase 13 experience and domain analysis

**Research date:** 2026-02-04
**Valid until:** 2026-03-04 (30 days - stable pattern, minimal change expected)

---

## Next Steps for Planning

The planner should create PLAN.md files that:

1. **Plan 1: Create useArtistCorrectionStore** — Implement store following Phase 13 template, adapted for artist domain (simpler state, search-only mode, include mode field for future)
2. **Plan 2: Refactor ArtistCorrectionModal + ArtistSearchView** — Update modal to use store, migrate SearchView to artist-only prop
3. **Plan 3: Refactor ArtistPreviewView + ArtistApplyView, Delete Legacy Hook** — Migrate preview to zero props, apply to isApplying+error only, delete `useArtistCorrectionModalState.ts`, verify zero UI changes

Each plan should reference code examples from this research and Phase 13 template, and verify against success criteria (especially "zero visual changes", "zero any types", and "search query persists via sessionStorage").
