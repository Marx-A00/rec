# Phase 13: Album Correction Store - Research

**Researched:** 2026-02-04
**Domain:** Zustand state management with persist middleware
**Confidence:** HIGH

## Summary

This research covers implementing a Zustand store to replace the current custom hook (`useCorrectionModalState`) for album correction modal state management. The existing implementation uses React hooks with manual sessionStorage persistence. The migration to Zustand will centralize state, reduce prop drilling, enable atomic state updates, and maintain the current sessionStorage-based persistence behavior with zero UI changes.

**Key findings:**

- Zustand v5.0.8 is already installed and actively used in the codebase (`useSearchStore.ts`, `useTourStore.ts`)
- Persist middleware with `partialize` and custom sessionStorage adapter is the standard pattern for selective persistence
- Atomic actions using single `set()` calls prevent intermediate states and are automatically batched by React 18+
- Derived selectors should be exported as standalone functions, not computed within the store
- The current hook manages dual-mode state (search mode: 4 steps, manual mode: 3 steps) with sessionStorage keyed by albumId

**Primary recommendation:** Create `useCorrectionStore.ts` following the established patterns in `useSearchStore.ts` and `useTourStore.ts`, using persist middleware with `partialize` to match current sessionStorage behavior, and export atomic actions + derived selectors.

## Standard Stack

### Core

| Library            | Version    | Purpose                     | Why Standard                                                                 |
| ------------------ | ---------- | --------------------------- | ---------------------------------------------------------------------------- |
| zustand            | ^5.0.8     | State management            | Already in use; lightweight, zero-boilerplate stores with middleware support |
| zustand/middleware | (included) | Persist + createJSONStorage | Official middleware for persistence with custom storage adapters             |

### Supporting

| Library        | Version    | Purpose                | When to Use                                                    |
| -------------- | ---------- | ---------------------- | -------------------------------------------------------------- |
| react-query v5 | (existing) | Server state caching   | Already used for GraphQL queries; handles preview data caching |
| jsdiff         | (existing) | Text diffs for preview | Already used in correction preview system                      |

### Alternatives Considered

| Instead of                | Could Use                  | Tradeoff                                                                 |
| ------------------------- | -------------------------- | ------------------------------------------------------------------------ |
| Zustand persist           | React Context + useEffect  | More boilerplate, manual storage sync, harder to test                    |
| sessionStorage            | localStorage               | Would persist across browser sessions (undesirable for correction state) |
| Single hook with useState | Multiple context providers | More React re-renders, harder to share state between components          |

**Installation:**

```bash
# Already installed - no new dependencies needed
# Verify: pnpm list zustand
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── stores/
│   ├── useSearchStore.ts          # Existing - localStorage persist pattern
│   ├── useTourStore.ts            # Existing - localStorage persist pattern
│   └── useCorrectionStore.ts      # NEW - sessionStorage persist with albumId key
├── components/admin/correction/
│   ├── CorrectionModal.tsx        # Refactor to use store
│   ├── search/SearchView.tsx      # Read from store (album prop only)
│   ├── preview/PreviewView.tsx    # Read from store (zero props)
│   └── apply/ApplyView.tsx        # Read from store (error prop only)
└── hooks/
    └── useCorrectionModalState.ts # DELETE after migration
```

### Pattern 1: Persist Middleware with Partialize

**What:** Use Zustand's persist middleware with `partialize` to selectively persist state fields to sessionStorage, keyed by albumId.

**When to use:** State needs to survive page navigation but not browser sessions, and only specific fields should be persisted (exclude derived/transient state).

**Example:**

```typescript
// Source: https://zustand.docs.pmnd.rs/middlewares/persist
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface CorrectionState {
  // Persisted fields
  step: number;
  mode: 'search' | 'manual';
  searchQuery?: { albumTitle: string; artistName: string };
  selectedMbid?: string;
  manualEditState?: ManualEditFieldState;

  // Transient fields (not persisted)
  previewData: CorrectionPreview | null;
  applySelections: UIFieldSelections | null;
  pendingAction: (() => void) | null; // Closures cannot be serialized
}

export const useCorrectionStore = create<CorrectionState>()(
  persist(
    set => ({
      step: 0,
      mode: 'search',
      previewData: null,
      applySelections: null,
      pendingAction: null,
      // ... actions
    }),
    {
      name: (albumId: string) => `correction-modal-${albumId}`,
      storage: createJSONStorage(() => sessionStorage),
      partialize: state => ({
        step: state.step,
        mode: state.mode,
        searchQuery: state.searchQuery,
        selectedMbid: state.selectedMbid,
        manualEditState: state.manualEditState,
        // Exclude: previewData, applySelections, pendingAction
      }),
    }
  )
);
```

**Critical note:** The `name` option in persist middleware is static. To support dynamic keys by albumId, we'll need to use a store factory pattern or manage multiple store instances. Alternative: Store all album states in one store with albumId as a key.

### Pattern 2: Atomic Actions for State Consistency

**What:** Group related state changes into single `set()` calls to prevent intermediate states and ensure UI consistency.

**When to use:** Multiple fields need to change together atomically (e.g., advancing step + clearing selection).

**Example:**

```typescript
// Source: https://zustand.docs.pmnd.rs/guides/flux-inspired-practice
interface CorrectionActions {
  // ❌ BAD: Two set() calls = intermediate state
  selectResultBad: (mbid: string) => {
    set({ selectedMbid: mbid });
    set({ step: 2 }); // Brief moment where step=2 but mbid is old
  };

  // ✅ GOOD: Single atomic set() call
  selectResult: (mbid: string) => {
    set({ selectedMbid: mbid, step: 2 });
  };

  // ✅ GOOD: Complex atomic update with derived values
  setPreviewLoaded: (preview: CorrectionPreview) => {
    set({
      previewData: preview,
      applySelections: createDefaultUISelections(preview),
      shouldEnrich: false, // Reset enrichment flag
    });
  };
}
```

**Why this matters:** React 18+ batches multiple `set()` calls automatically within event handlers, but atomic updates are still clearer and prevent edge cases in async contexts or effects.

### Pattern 3: Derived Selectors as Standalone Functions

**What:** Export computed values as standalone selector functions rather than storing them in state.

**When to use:** Values can be computed from existing state (e.g., `isFirstStep = step === 0`).

**Example:**

```typescript
// Source: https://github.com/pmndrs/zustand/discussions/2867
// ❌ BAD: Storing derived state (redundant, can desync)
interface BadState {
  step: number;
  isFirstStep: boolean; // Redundant - can be computed
  maxStep: number; // Redundant - can be computed
}

// ✅ GOOD: Export selectors for derived state
export const useCorrectionStore = create<CorrectionState>()(/* ... */);

// Standalone derived selectors
export const isFirstStep = (state: CorrectionState) => state.step === 0;
export const isLastStep = (state: CorrectionState) =>
  state.step === (state.mode === 'manual' ? 2 : 3);
export const maxStep = (state: CorrectionState) =>
  state.mode === 'manual' ? 2 : 3;
export const stepLabels = (state: CorrectionState) =>
  state.mode === 'manual'
    ? ['Current Data', 'Edit', 'Apply']
    : ['Current Data', 'Search', 'Preview', 'Apply'];

// Usage in components
const step = useCorrectionStore(s => s.step);
const isFirst = useCorrectionStore(isFirstStep);
const labels = useCorrectionStore(stepLabels);
```

### Pattern 4: Dynamic Storage Keys (Store Factory Pattern)

**What:** To support per-albumId sessionStorage keys, create a store factory that generates isolated store instances.

**When to use:** State must be isolated per entity (e.g., per albumId) with separate persistence.

**Example:**

```typescript
// Store factory pattern for dynamic keys
const createCorrectionStore = (albumId: string) =>
  create<CorrectionState>()(
    persist(
      set => ({
        /* ... */
      }),
      {
        name: `correction-modal-${albumId}`,
        storage: createJSONStorage(() => sessionStorage),
      }
    )
  );

// Cache stores to prevent recreation
const storeCache = new Map<string, ReturnType<typeof createCorrectionStore>>();

export const useCorrectionStore = (albumId: string | null) => {
  if (!albumId) return null; // Modal closed

  if (!storeCache.has(albumId)) {
    storeCache.set(albumId, createCorrectionStore(albumId));
  }

  return storeCache.get(albumId)!;
};
```

**Alternative:** Single store with albumId-keyed state map. Simpler but loses per-album persistence isolation.

### Anti-Patterns to Avoid

- **Storing closures in state:** Functions like `pendingAction: () => void` cannot be serialized to JSON. Exclude via `partialize`.
- **Persisting preview data:** Large objects like `CorrectionPreview` should not be persisted (expensive, stale on reload). Re-fetch from GraphQL on mount.
- **Over-subscribing:** Don't subscribe to entire store in every component. Use selectors: `useCorrectionStore((s) => s.step)`.
- **Mutating state directly:** Always use `set()`. Zustand relies on immutability for change detection.

## Don't Hand-Roll

| Problem                 | Don't Build                 | Use Instead                                                 | Why                                                                  |
| ----------------------- | --------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| SessionStorage sync     | Custom useEffect + useState | Zustand persist middleware                                  | Handles serialization, rehydration, partial updates, race conditions |
| Derived state caching   | useMemo in every component  | Standalone selector functions                               | Single source of truth, no cache invalidation bugs                   |
| Multi-step wizard state | Separate useState per field | Zustand store with atomic actions                           | Atomic updates prevent intermediate states                           |
| Deep object merging     | Custom spread operators     | Zustand's built-in shallow merge (or custom `merge` option) | Handles nested updates correctly, less error-prone                   |

**Key insight:** Custom sessionStorage hooks look simple but hide complexity: JSON serialization edge cases, concurrent tab handling, stale data after browser refresh, rehydration timing. Zustand persist middleware handles all these correctly.

## Common Pitfalls

### Pitfall 1: Persist Middleware Naming Collision

**What goes wrong:** If two stores use the same `name` in persist config, they overwrite each other's sessionStorage data.

**Why it happens:** Copy-paste error or forgetting to make keys unique when using store factories.

**How to avoid:**

- Use descriptive, unique names: `correction-modal-${albumId}` not just `modal-state`
- Test multiple instances (e.g., open two album corrections in different tabs)
- Use TypeScript to enforce albumId is always provided

**Warning signs:**

- State persists when it shouldn't (albumId changes but state doesn't reset)
- Two tabs editing different albums see each other's state

### Pitfall 2: Partialize Triggers on Every State Change

**What goes wrong:** Even if partialized fields haven't changed, persist middleware saves to storage on every `set()` call, causing performance issues.

**Why it happens:** `partialize` filters what to save, not when to save. [Per GitHub Discussion #1273](https://github.com/pmndrs/zustand/discussions/1273), this is intended behavior.

**How to avoid:**

- Accept the behavior - sessionStorage writes are fast
- If truly problematic, debounce writes using custom storage adapter
- Don't over-subscribe to non-persisted fields (each subscription triggers persist check)

**Warning signs:**

- Excessive sessionStorage writes in DevTools (Performance > Storage events)
- Input lag in forms that update store frequently

### Pitfall 3: Infinite Loops with Derived Selectors

**What goes wrong:** Selector returns new object reference every call, causing infinite re-renders in React 18+.

**Why it happens:** Zustand v5 uses referential equality by default. Selectors like `(s) => [s.a, s.b]` create new arrays.

**How to avoid:**

- Use primitive selectors: `(s) => s.step`
- Use `useShallow` for multi-value selectors: `useShallow((s) => [s.a, s.b])`
- Export standalone selectors and memoize in components if needed

**Warning signs:**

- "Maximum update depth exceeded" errors
- DevTools showing repeated renders for same state
- Component re-renders on every keystroke despite no relevant state changes

### Pitfall 4: Lost State on Album Switch

**What goes wrong:** Opening correction modal for Album A, then Album B, both show same state or state is cleared unexpectedly.

**Why it happens:** Store factory cache not keyed correctly, or using single store without albumId isolation.

**How to avoid:**

- Use store factory pattern with Map cache keyed by albumId
- Clear cache when modal closes: `storeCache.delete(albumId)`
- Test rapid album switching in the UI

**Warning signs:**

- Search query from Album A appears when opening Album B
- sessionStorage shows multiple album keys but state doesn't match

### Pitfall 5: Rehydration Timing in Server Components

**What goes wrong:** Store reads persisted state before sessionStorage is available (SSR/SSG contexts).

**Why it happens:** sessionStorage is browser-only. Server-rendered components access undefined storage.

**How to avoid:**

- Mark store-consuming components as `'use client'`
- Use `skipHydration: false` (default) to let middleware handle rehydration
- Guard store access: `if (typeof window === 'undefined') return defaultState;`

**Warning signs:**

- "sessionStorage is not defined" errors in server logs
- Hydration mismatches between server and client HTML
- State resets on page refresh despite persistence

## Code Examples

### Complete Correction Store Implementation

```typescript
// Source: Combining patterns from useSearchStore.ts and official docs
// src/stores/useCorrectionStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ManualEditFieldState } from '@/components/admin/correction/manual/types';
import type { CorrectionPreview } from '@/lib/correction/preview/types';
import type { UIFieldSelections } from '@/components/admin/correction/apply/types';

// ============================================================================
// State Interface
// ============================================================================

interface SearchQuery {
  albumTitle: string;
  artistName: string;
}

export interface CorrectionState {
  // Persisted fields
  step: number;
  mode: 'search' | 'manual';
  searchQuery?: SearchQuery;
  searchOffset: number;
  selectedMbid?: string;
  manualEditState?: ManualEditFieldState;

  // Transient fields (not persisted)
  previewData: CorrectionPreview | null;
  applySelections: UIFieldSelections | null;
  shouldEnrich: boolean;
  pendingAction: (() => void) | null; // Unsaved changes dialog
}

export interface CorrectionActions {
  // Step navigation
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;

  // Mode switching
  enterSearch: () => void;
  enterManualEdit: () => void;

  // Search state
  setSearchQuery: (query: SearchQuery) => void;
  setSearchOffset: (offset: number) => void;

  // Atomic: Select result and advance step
  selectResult: (mbid: string) => void;

  // Atomic: Set preview data with default selections
  setPreviewLoaded: (preview: CorrectionPreview) => void;

  // Manual edit state
  setManualEditState: (state: ManualEditFieldState) => void;

  // Apply selections
  setApplySelections: (selections: UIFieldSelections) => void;
  setShouldEnrich: (value: boolean) => void;

  // Unsaved changes dialog
  setPendingAction: (action: (() => void) | null) => void;

  // Reset actions
  clearState: () => void;
  clearManualEditState: () => void;
  clearSearchState: () => void;
}

type CorrectionStore = CorrectionState & CorrectionActions;

// ============================================================================
// Store Factory (per albumId isolation)
// ============================================================================

const createCorrectionStore = (albumId: string) =>
  create<CorrectionStore>()(
    persist(
      (set, get) => ({
        // Initial state
        step: 0,
        mode: 'search',
        searchOffset: 0,
        previewData: null,
        applySelections: null,
        shouldEnrich: false,
        pendingAction: null,

        // Actions
        setStep: step => {
          const maxStep = get().mode === 'manual' ? 2 : 3;
          if (step >= 0 && step <= maxStep) {
            set({ step });
          }
        },

        nextStep: () => {
          const { step, mode } = get();
          const maxStep = mode === 'manual' ? 2 : 3;
          if (step < maxStep) {
            set({ step: step + 1 });
          }
        },

        prevStep: () => {
          const step = get().step;
          if (step > 0) {
            set({ step: step - 1 });
          }
        },

        enterSearch: () => {
          set({
            mode: 'search',
            step: 1,
            manualEditState: undefined,
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

        setSearchQuery: query => {
          set({ searchQuery: query, searchOffset: 0 });
        },

        setSearchOffset: offset => {
          set({ searchOffset: offset });
        },

        // Atomic: Select result and advance to preview step
        selectResult: mbid => {
          set({ selectedMbid: mbid, step: 2 });
        },

        // Atomic: Set preview data with default selections and reset enrichment
        setPreviewLoaded: preview => {
          const {
            createDefaultUISelections,
          } = require('@/components/admin/correction/apply/types');
          set({
            previewData: preview,
            applySelections: createDefaultUISelections(preview),
            shouldEnrich: false,
          });
        },

        setManualEditState: state => {
          set({ manualEditState: state });
        },

        setApplySelections: selections => {
          set({ applySelections: selections });
        },

        setShouldEnrich: value => {
          set({ shouldEnrich: value });
        },

        setPendingAction: action => {
          set({ pendingAction: action });
        },

        clearState: () => {
          set({
            step: 0,
            mode: 'search',
            searchQuery: undefined,
            searchOffset: 0,
            selectedMbid: undefined,
            manualEditState: undefined,
            previewData: null,
            applySelections: null,
            shouldEnrich: false,
            pendingAction: null,
          });
        },

        clearManualEditState: () => {
          set({ manualEditState: undefined });
        },

        clearSearchState: () => {
          set({
            searchQuery: undefined,
            searchOffset: 0,
            selectedMbid: undefined,
          });
        },
      }),
      {
        name: `correction-modal-${albumId}`,
        storage: createJSONStorage(() => sessionStorage),
        partialize: state => ({
          step: state.step,
          mode: state.mode,
          searchQuery: state.searchQuery,
          searchOffset: state.searchOffset,
          selectedMbid: state.selectedMbid,
          manualEditState: state.manualEditState,
          // Excluded: previewData, applySelections, shouldEnrich, pendingAction
        }),
      }
    )
  );

// ============================================================================
// Store Cache (prevent recreation on re-renders)
// ============================================================================

const storeCache = new Map<string, ReturnType<typeof createCorrectionStore>>();

export const useCorrectionStore = (albumId: string | null) => {
  if (!albumId) {
    // Modal closed - return null or throw error
    throw new Error('useCorrectionStore requires albumId');
  }

  if (!storeCache.has(albumId)) {
    storeCache.set(albumId, createCorrectionStore(albumId));
  }

  return storeCache.get(albumId)!;
};

// Cleanup function to remove cached store when modal closes
export const clearCorrectionStoreCache = (albumId: string) => {
  const store = storeCache.get(albumId);
  if (store) {
    // Clear state before removing from cache
    store.getState().clearState();
    storeCache.delete(albumId);
  }
};

// ============================================================================
// Derived Selectors (exported as standalone functions)
// ============================================================================

export const isFirstStep = (state: CorrectionState) => state.step === 0;
export const isLastStep = (state: CorrectionState) =>
  state.step === (state.mode === 'manual' ? 2 : 3);
export const maxStep = (state: CorrectionState) =>
  state.mode === 'manual' ? 2 : 3;
export const stepLabels = (state: CorrectionState) =>
  state.mode === 'manual'
    ? ['Current Data', 'Edit', 'Apply']
    : ['Current Data', 'Search', 'Preview', 'Apply'];
export const isManualEditMode = (state: CorrectionState) =>
  state.mode === 'manual';
```

### Component Usage Pattern

```typescript
// CorrectionModal.tsx - Store initialization and cleanup
'use client';

import { useCorrectionStore, clearCorrectionStoreCache } from '@/stores/useCorrectionStore';

export function CorrectionModal({ albumId, open, onClose }: CorrectionModalProps) {
  // Get store instance for this album
  const store = albumId ? useCorrectionStore(albumId) : null;

  // Subscribe to specific fields
  const step = store?.((s) => s.step) ?? 0;
  const mode = store?.((s) => s.mode) ?? 'search';
  const nextStep = store?.((s) => s.nextStep);

  // Cleanup on close
  const handleClose = () => {
    if (albumId) {
      clearCorrectionStoreCache(albumId);
    }
    onClose();
  };

  // ...rest of component
}

// SearchView.tsx - No more modal state props
export function SearchView({ album }: { album: CurrentDataViewAlbum }) {
  const store = useCorrectionStore(album.id);

  const searchQuery = store((s) => s.searchQuery);
  const setSearchQuery = store((s) => s.setSearchQuery);
  const selectResult = store((s) => s.selectResult);

  // ...rest of component
}

// PreviewView.tsx - Zero props except callbacks
export function PreviewView() {
  const albumId = /* get from context or URL param */;
  const store = useCorrectionStore(albumId);

  const selectedMbid = store((s) => s.selectedMbid);
  const setPreviewLoaded = store((s) => s.setPreviewLoaded);

  // ...rest of component
}
```

## State of the Art

| Old Approach                         | Current Approach                   | When Changed          | Impact                                                  |
| ------------------------------------ | ---------------------------------- | --------------------- | ------------------------------------------------------- |
| Custom useEffect + sessionStorage    | Zustand persist middleware         | Phase 13 (this phase) | Less boilerplate, automatic rehydration, atomic updates |
| Props drilling through 4 layers      | Direct store subscription          | Phase 13              | Reduced re-renders, cleaner component APIs              |
| Multiple useState calls in modal     | Single store with atomic actions   | Phase 13              | No intermediate states, easier debugging                |
| Manual sessionStorage key management | Persist middleware with partialize | Phase 13              | No JSON parse/stringify errors, automatic typing        |

**Deprecated/outdated:**

- `useCorrectionModalState.ts` hook: Will be deleted in Phase 13, replaced by `useCorrectionStore.ts`
- Props `modalState`, `onResultSelect`, `onPreviewLoaded` in child components: Replaced by direct store access

## Open Questions

### 1. Should we use store factory or single store with albumId keys?

**What we know:**

- Store factory: Isolated persistence per album, cleaner mental model, matches current hook behavior
- Single store: Simpler implementation, easier to debug (one store instance), requires manual albumId filtering

**What's unclear:**

- Performance implications of Map cache with 50+ albums
- Whether multiple tabs editing different albums will conflict (needs testing)

**Recommendation:** Use store factory pattern (as shown in examples above) since it matches current behavior exactly and provides better isolation. Document cache cleanup strategy.

### 2. How to handle unsaved changes dialog state?

**What we know:**

- `pendingAction` is a closure (cannot be serialized)
- Current implementation uses local useState in modal
- Dialog should show before navigation away from manual edit with changes

**What's unclear:**

- Should dialog state live in store at all, or stay in component?
- How to trigger dialog from child components (ManualEditView) without prop drilling

**Recommendation:** Keep `pendingAction` in store but exclude from `partialize`. Components can set/clear it via actions. This centralizes logic while avoiding serialization issues.

### 3. Should preview data be cached or re-fetched?

**What we know:**

- Current implementation re-fetches on every preview step load
- React Query caches for 5 minutes (staleTime)
- Preview data is large (~5-50KB depending on track count)

**What's unclear:**

- Whether stale preview data could cause apply errors if album updated externally
- Performance impact of re-fetching vs. persisting large objects

**Recommendation:** Do NOT persist preview data. Rely on React Query cache. This prevents stale data bugs and keeps sessionStorage lightweight. Document in PLAN.md that `previewData` is transient.

## Sources

### Primary (HIGH confidence)

- [Zustand Official Docs — Persisting Store Data](https://zustand.docs.pmnd.rs/integrations/persisting-store-data)
- [Zustand Official Docs — persist middleware](https://zustand.docs.pmnd.rs/middlewares/persist)
- [GitHub — pmndrs/zustand v5.0.8](https://github.com/pmndrs/zustand)
- [GitHub Discussion #1273 — partialize behavior](https://github.com/pmndrs/zustand/discussions/1273)
- [GitHub Discussion #2867 — v5 selectors best practices](https://github.com/pmndrs/zustand/discussions/2867)
- Local codebase: `src/stores/useSearchStore.ts`, `src/stores/useTourStore.ts`

### Secondary (MEDIUM confidence)

- [Zustand v5 and v4 context example with persist](https://gist.github.com/mahbubmaruf178/48c53bd70e551d28c61dd84b7a46ccf0)
- [TkDodo's blog — Working with Zustand](https://tkdodo.eu/blog/working-with-zustand)
- [GitHub Discussion #1583 — Two actions, single state update](https://github.com/pmndrs/zustand/discussions/1583)

### Tertiary (LOW confidence)

- [Medium — Zustand Middleware Guide](https://beyondthecode.medium.com/zustand-middleware-the-architectural-core-of-scalable-state-management-d8d1053489ac) — General overview, not v5-specific

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Zustand is already in use, patterns established
- Architecture: HIGH - Official docs + local codebase examples confirm patterns
- Pitfalls: MEDIUM - Based on GitHub discussions and common Zustand issues, not all tested in this specific context

**Research date:** 2026-02-04
**Valid until:** 2026-03-04 (30 days - Zustand is stable, minimal API churn)

---

## Next Steps for Planning

The planner should create PLAN.md files that:

1. **Plan 1: Create Store** — Implement `useCorrectionStore.ts` following the factory pattern with persist middleware
2. **Plan 2: Refactor Modal + SearchView** — Update CorrectionModal to use store, migrate SearchView to zero-prop API
3. **Plan 3: Refactor Preview/Apply/Manual** — Migrate remaining child components, delete legacy hook, verify zero UI changes

Each plan should reference code examples from this research and verify against success criteria (especially "zero visual changes" and "zero any types").
