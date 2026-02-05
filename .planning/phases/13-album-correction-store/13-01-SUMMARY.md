---
phase: 13-album-correction-store
plan: 01
subsystem: admin-correction-ui
tags: [zustand, state-management, sessionStorage, persistence]
requires:
  - "12-03 (enrichment mutation and existing correction infrastructure)"
provides:
  - "useCorrectionStore - Zustand store with persist middleware for album correction modal"
  - "Typed store factory pattern with per-albumId instances"
  - "Atomic action creators preventing inconsistent state transitions"
  - "Derived selectors for computed state"
affects:
  - "13-02 (CorrectionModal refactor will consume this store)"
  - "13-03 (child views will read from store)"
tech-stack:
  added: []
  patterns:
    - "Zustand store factory with cache management"
    - "Selective sessionStorage persistence via partialize"
    - "Atomic actions with single set() calls"
decisions:
  - id: STORE-PERSIST
    choice: "Persist only navigation-critical fields (step, mode, searchQuery, searchOffset, selectedMbid, manualEditState) to sessionStorage"
    reasoning: "Transient UI state (previewData, applySelections, pendingAction) doesn't need to survive page navigation and closures aren't serializable"
  - id: STORE-FACTORY
    choice: "Factory pattern with Map cache instead of singleton"
    reasoning: "Supports multiple concurrent correction modals (though UI only shows one) and proper cleanup on modal close"
  - id: ATOMIC-ACTIONS
    choice: "Actions like selectResult, setPreviewLoaded use single set() call for multiple fields"
    reasoning: "Prevents intermediate states that could cause race conditions or inconsistent renders"
key-files:
  created:
    - src/stores/useCorrectionStore.ts
  modified: []
metrics:
  duration: "1 minute 51 seconds"
  completed: 2026-02-04
---

# Phase 13 Plan 01: Album Correction Store Summary

**One-liner:** Zustand store with sessionStorage persistence for album correction modal state management.

## What Was Built

Created `src/stores/useCorrectionStore.ts` - a fully-typed Zustand store implementing the foundation for album correction modal state management with sessionStorage persistence.

**Key components:**

1. **CorrectionState interface** (13 fields total):
   - **6 persisted fields** (survive navigation): step, mode, searchQuery, searchOffset, selectedMbid, manualEditState
   - **7 transient fields** (reset on load): previewData, applySelections, manualPreviewData, shouldEnrich, showAppliedState, pendingAction, showUnsavedDialog

2. **CorrectionActions interface** (22 actions):
   - Step navigation: setStep, nextStep, prevStep
   - Atomic mode switching: enterSearch, enterManualEdit
   - Search state: setSearchQuery, setSearchOffset
   - Atomic transitions: selectResult, setPreviewLoaded
   - Manual edit: setManualEditState, setManualPreviewData, clearManualEditState
   - Apply state: setApplySelections, setShouldEnrich, setShowAppliedState
   - Unsaved dialog: setPendingAction, setShowUnsavedDialog, confirmUnsavedDiscard, cancelUnsavedDialog
   - Reset: clearState

3. **Store factory with cache**:
   - `getCorrectionStore(albumId)` - get or create store for albumId
   - `clearCorrectionStoreCache(albumId)` - cleanup on modal close
   - Map-based cache prevents store recreation

4. **5 derived selectors**:
   - `isFirstStep`, `isLastStep`, `maxStep`, `stepLabels`, `isManualEditMode`

5. **Persist middleware**:
   - sessionStorage keyed by `correction-modal-${albumId}`
   - partialize excludes transient fields
   - Follows existing pattern from useSearchStore.ts

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

**STORE-PERSIST: Selective persistence strategy**
- Decided to persist only 6 fields: step, mode, searchQuery, searchOffset, selectedMbid, manualEditState
- Excluded 7 transient fields: previewData, applySelections, manualPreviewData, shouldEnrich, showAppliedState, pendingAction, showUnsavedDialog
- **Rationale:** Only navigation-critical state needs to survive page refresh; preview data can be refetched; closures aren't serializable
- **Impact:** Cleaner sessionStorage, no serialization errors from closures

**STORE-FACTORY: Factory pattern vs singleton**
- Chose factory function returning new store instance per albumId with Map cache
- **Alternative considered:** Single global store with albumId as state field
- **Rationale:** Better encapsulation, proper cleanup, supports future multi-modal scenarios
- **Impact:** Each modal gets isolated state; cache cleanup prevents memory leaks

**ATOMIC-ACTIONS: Multi-field updates in single set()**
- Actions like `selectResult`, `setPreviewLoaded`, `confirmUnsavedDiscard` update multiple fields atomically
- **Example:** `selectResult` sets both `selectedMbid` and `step: 2` in one call
- **Rationale:** Prevents race conditions where components see inconsistent intermediate state
- **Impact:** Safer state transitions, simpler component logic

## Type Safety

**Zero `any` types achieved:**
- All state fields explicitly typed
- All action parameters and returns typed
- Type-only imports for external types (ManualEditFieldState, CorrectionPreview, UIFieldSelections)
- Store hook type: `UseBoundStore<StoreApi<CorrectionStore>>`

## Testing Evidence

Type checking passes with zero errors:
```bash
pnpm type-check
# ✓ tsc --noEmit (no output = success)
```

File verification:
```bash
grep -n "any" src/stores/useCorrectionStore.ts
# (no output - zero 'any' types found)
```

Export verification:
```bash
grep -n "^export" src/stores/useCorrectionStore.ts
# 11 exports found:
# - SearchQueryState, CorrectionState, CorrectionActions, CorrectionStore types
# - getCorrectionStore, clearCorrectionStoreCache functions
# - isFirstStep, isLastStep, maxStep, stepLabels, isManualEditMode selectors
```

## Next Phase Readiness

**Phase 13 Plan 02 ready to start:**
- Store is fully typed and exported
- No consumers yet (zero imports of useCorrectionStore)
- Ready to refactor CorrectionModal to initialize store on open

**No blockers identified.**

## Commits

- `09af728`: feat(13-01): create useCorrectionStore with persist middleware
  - Full state interface (6 persisted + 7 transient)
  - 22 action creators with atomic updates
  - Store factory with Map cache
  - 5 derived selectors
  - Persist middleware with partialize
  - Zero 'any' types

## Files Changed

**Created:**
- `src/stores/useCorrectionStore.ts` (478 lines)
  - Store factory function with persist middleware
  - Typed interfaces for state and actions
  - Cache management utilities
  - Derived selector functions

## Knowledge for Future Sessions

**Store usage pattern for consumers:**
```typescript
// In CorrectionModal or child components:
const useCorrectionStore = getCorrectionStore(albumId);
const { step, mode, nextStep, setSearchQuery } = useCorrectionStore();

// On modal close:
clearCorrectionStoreCache(albumId);
```

**Atomic action pattern:**
All atomic actions (selectResult, setPreviewLoaded, enterSearch, enterManualEdit, confirmUnsavedDiscard) update multiple fields in a single `set()` call to prevent intermediate states.

**Persistence behavior:**
- Store automatically saves to sessionStorage on every state change
- Only 6 fields persist (see STORE-PERSIST decision)
- clearState() removes sessionStorage entry
- Store factory caches instances per albumId

**Type imports:**
Use `import type` for ManualEditFieldState, CorrectionPreview, UIFieldSelections to avoid circular dependencies and reduce bundle size.
