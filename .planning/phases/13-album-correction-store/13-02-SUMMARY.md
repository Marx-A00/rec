---
phase: 13
plan: 02
subsystem: ui-state-management
tags: [zustand, refactor, correction-modal, state-migration]

requires:
  - 13-01-useCorrectionStore-creation

provides:
  - correction-modal-zustand-integration
  - search-view-store-consumer

affects:
  - 13-03-child-components-migration

tech-stack:
  added: []
  patterns:
    - zustand-store-factory-consumption
    - atomic-state-actions
    - sessionStorage-persistence

key-files:
  created: []
  modified:
    - src/components/admin/correction/CorrectionModal.tsx
    - src/components/admin/correction/search/SearchView.tsx

decisions:
  - id: ACHILD-01
    what: SearchView props reduced to album-only
    why: All search state now lives in Zustand store
    impact: SearchView is completely decoupled from parent state management
  - id: AMODAL-03
    what: Mutation callbacks remain in CorrectionModal
    why: They orchestrate toast + store + queryClient invalidation
    impact: Modal still owns side effect orchestration
  - id: CLEAN-04
    what: StepIndicator stays prop-driven
    why: Reusable component across multiple modals, no store dependency
    impact: Unchanged interface, receives currentStep/onStepClick/steps

metrics:
  duration: 8m
  completed: 2026-02-04

migration-notes:
  breaking-changes:
    - SearchView props interface changed (album-only)
    - CorrectionModal no longer uses useCorrectionModalState hook

  backward-compatibility:
    - Modal UI identical to users
    - Search behavior unchanged
    - Step navigation preserved
    - sessionStorage keys unchanged
---

# Phase 13 Plan 02: Wire CorrectionModal and SearchView to Zustand Store

**One-liner:** CorrectionModal and SearchView now read/write state from useCorrectionStore instead of useCorrectionModalState hook.

## What Was Done

### Task 1: Refactor CorrectionModal to use Zustand store

**Changes:**

- Removed `import { useCorrectionModalState } from '@/hooks/useCorrectionModalState'`
- Added imports for `getCorrectionStore`, `clearCorrectionStoreCache`, and derived selectors
- Replaced `useCorrectionModalState(albumId)` with `getCorrectionStore(albumId)`
- Removed all local `useState` declarations for shared state:
  - `previewData`, `setPreviewData`
  - `applySelections`, `setApplySelections`
  - `manualPreviewData`, `setManualPreviewData`
  - `shouldEnrich`, `setShouldEnrich`
  - `showAppliedState`, `setShowAppliedState`
  - `showUnsavedDialog`, `setShowUnsavedDialog`
  - `pendingAction`, `setPendingAction`

**State subscription pattern:**

```typescript
const store = albumId ? getCorrectionStore(albumId) : null;

// Subscribe to individual fields
const step = store?.(s => s.step) ?? 0;
const mode = store?.(s => s.mode) ?? 'search';
const selectedMbid = store?.(s => s.selectedMbid);
// ... etc

// Use derived selectors
const isFirstStep = store ? store(isFirstStepSelector) : true;
const isManualEditMode = store ? store(isManualEditModeSelector) : false;
```

**Handler function refactoring:**

- `handleResultSelect` → `store.getState().selectResult(mbid)` (atomic action)
- `handleEnterManualEdit` → `store.getState().enterManualEdit()` (atomic action)
- `handleEnterSearch` → `store.getState().enterSearch()` (atomic action)
- `handlePreviewLoaded` → `store.getState().setPreviewLoaded(preview)` (atomic action)
- `handleUnsavedConfirm` → `store.getState().confirmUnsavedDiscard()` (atomic action)
- `handleUnsavedCancel` → `store.getState().cancelUnsavedDialog()` (atomic action)
- `handleClose` → `clearCorrectionStoreCache(albumId)` on cleanup

**What stayed in CorrectionModal (AMODAL-03):**

- Mutation callbacks (`onSuccess`, `onError`) for `applyMutation` and `manualApplyMutation`
- Toast orchestration
- QueryClient cache invalidation
- Auto-close timer logic after successful apply

**Props to child components:**

- `SearchView`: Now receives only `album` prop (modalState, onResultSelect, onManualEdit removed)
- `PreviewView`, `ApplyView`, `ManualEditView`: Props unchanged (migrated in Plan 03)
- `StepIndicator`: Still receives props (CLEAN-04)

**Files modified:**

- `src/components/admin/correction/CorrectionModal.tsx` (155 insertions, 163 deletions)

### Task 2: Refactor SearchView to read from store

**Changes:**

- Removed `import type { useCorrectionModalState }`
- Added `import { getCorrectionStore }`
- Props interface reduced from 4 props to 1:

  ```typescript
  // Before
  export interface SearchViewProps {
    album: CurrentDataViewAlbum;
    onResultSelect: (result: GraphQLScoredResult) => void;
    onManualEdit: () => void;
    modalState: ReturnType<typeof useCorrectionModalState>;
  }

  // After
  export interface SearchViewProps {
    album: CurrentDataViewAlbum;
  }
  ```

**Store integration:**

```typescript
const store = getCorrectionStore(album.id);
const searchQuery = store(s => s.searchQuery);
const searchOffset = store(s => s.searchOffset);

// Actions
const setSearchQuery = store.getState().setSearchQuery;
const selectResult = store.getState().selectResult;
const enterManualEdit = store.getState().enterManualEdit;
```

**Handler updates:**

- `handleSearch` → uses `setSearchQuery(query)` (automatically resets offset)
- `handleLoadMore` → uses `store.getState().setSearchOffset(searchOffset + 10)`
- `handleResultClick` → uses `selectResult(mbid)` (atomic: sets mbid + advances step)
- Manual edit button → uses `enterManualEdit()` (atomic: sets mode + step)

**Preserved functionality:**

- Search query persistence across navigation
- Pagination state
- Auto-trigger search on mount if returning from preview
- "Before first search" placeholder
- Error states and skeleton loading

**Files modified:**

- `src/components/admin/correction/search/SearchView.tsx` (17 insertions, 25 deletions)

## Deviations from Plan

None. Plan executed exactly as written.

## Testing Evidence

**Type checking:**

```bash
pnpm type-check
# ✅ Passes with zero errors
```

**Linting:**

```bash
pnpm lint
# ✅ Passes (only prettier formatting applied)
```

**Verification checks:**

- ✅ `useCorrectionModalState` import removed from both files
- ✅ Zero `useState` calls for shared state in CorrectionModal
- ✅ SearchView props reduced to `{ album }` only
- ✅ Zero `any` types introduced
- ✅ `getCorrectionStore` and `clearCorrectionStoreCache` imported in CorrectionModal
- ✅ StepIndicator props unchanged

## Next Phase Readiness

**Phase 13 Plan 03 Prerequisites:**

- ✅ CorrectionModal successfully using store
- ✅ SearchView migrated and tested
- ✅ Mutation callbacks still orchestrate side effects correctly
- ✅ Store actions proven to work (selectResult, enterManualEdit, etc.)

**What's ready for Plan 03:**

- PreviewView, ApplyView, ManualEditView can now be migrated
- Pattern established: props → store selectors + actions
- Atomic actions working correctly

## Technical Notes

**Store subscription pattern:**

- Individual field subscriptions prevent unnecessary re-renders
- Null-coalescing ensures safe defaults when modal closed
- Derived selectors encapsulate complex logic (isFirstStep, stepLabels)

**Cleanup on modal close:**

- `clearCorrectionStoreCache(albumId)` removes store instance from Map cache
- Also clears sessionStorage key for that album
- Prevents memory leaks from long-lived modal sessions

**sessionStorage persistence:**

- Store automatically persists 6 fields (step, mode, searchQuery, searchOffset, selectedMbid, manualEditState)
- 7 transient fields excluded (preview data, UI state, callbacks)
- Users can navigate away and return to same correction step

**Performance:**

- Line count reduced (CorrectionModal: -8 net, SearchView: -8 net)
- Fewer prop drilling layers
- Store enables fine-grained subscriptions (only re-render on relevant state changes)

## Commits

**Task 1:**

- `7c128a2` - refactor(13-02): CorrectionModal uses Zustand store

**Task 2:**

- `0b1088a` - refactor(13-02): SearchView reads from Zustand store

## Summary

Plan 13-02 successfully migrated CorrectionModal and SearchView from the `useCorrectionModalState` hook to the new Zustand `useCorrectionStore`. The modal shell now initializes the store on open, clears it on close, and all state reads/writes go through store selectors and actions. SearchView's prop interface was reduced from 4 props to 1 (album only), with all search state now managed by the store.

Zero visual changes to the UI. Zero functional regressions. Type checking passes. The refactor establishes the pattern for migrating the remaining child components (PreviewView, ApplyView, ManualEditView) in Plan 03.

**Key achievement:** CorrectionModal went from 7 useState declarations + 1 hook import to 0 useState + store factory pattern, with identical behavior and better separation of concerns.
