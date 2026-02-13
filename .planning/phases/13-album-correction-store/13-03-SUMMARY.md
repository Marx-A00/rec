---
phase: 13-album-correction-store
plan: 03
subsystem: admin-correction-ui
completed: 2026-02-05
duration: 4 minutes
status: complete
tags:
  - zustand
  - refactor
  - child-components
  - prop-reduction
requires:
  - '13-02'
provides:
  - Minimal prop interfaces for PreviewView, ApplyView, ManualEditView
  - Store-driven state management for all child components
  - Deleted legacy useCorrectionModalState.ts hook
  - cancelManualEdit action for returning to search mode
affects:
  - '14-01' # Artist correction modal will follow same pattern
tech-stack:
  added: []
  patterns:
    - 'Child component prop reduction: album ID + error only'
    - 'Local form state for validation (ManualEditView)'
    - 'Store actions for cancel flows with unsaved changes check'
decisions:
  - id: ACHILD-02
    decision: 'PreviewView props reduced to { albumId: string } only'
    rationale: 'All other state (selectedMbid, preview callback) comes from store'
  - id: ACHILD-03
    decision: 'Preserve lastPreviewKeyRef infinite loop guard in PreviewView'
    rationale: 'Critical guard prevents useEffect from calling setPreviewLoaded in infinite loop'
  - id: ACHILD-04
    decision: 'ApplyView props reduced to { albumId: string; error?: Error | null }'
    rationale: 'Preview, selections, enrichment flag all come from store; error stays as prop for mutation result'
  - id: ACHILD-05
    decision: 'ManualEditView props reduced to { album: CurrentDataViewAlbum } only'
    rationale: 'Callbacks replaced with store actions, initial state comes from store'
  - id: ACHILD-06
    decision: 'ManualEditView internal form state stays local (formState, errors, showValidationBanner)'
    rationale: 'Validation state is transient UI-only state that should not persist or be shared'
  - id: STORE-07
    decision: 'Add cancelManualEdit action to store'
    rationale: 'Returns to search mode step 0, clearing manual edit state atomically'
  - id: CLEAN-01
    decision: 'Delete useCorrectionModalState.ts after migration complete'
    rationale: 'Zero consumers remaining after all child components migrated to store'
key-files:
  created: []
  modified:
    - src/components/admin/correction/preview/PreviewView.tsx
    - src/components/admin/correction/apply/ApplyView.tsx
    - src/components/admin/correction/manual/ManualEditView.tsx
    - src/components/admin/correction/CorrectionModal.tsx
    - src/stores/useCorrectionStore.ts
  deleted:
    - src/hooks/useCorrectionModalState.ts
---

# Phase 13 Plan 3: Child Component Migration Summary

**One-liner:** Refactored PreviewView, ApplyView, and ManualEditView to read state from Zustand store, reduced props to minimum, and deleted legacy useCorrectionModalState.ts hook with zero remaining imports.

## What Was Done

**Task 1: Refactor PreviewView and ApplyView**

PreviewView changes:

- Props interface reduced from `{ albumId, releaseGroupMbid, onPreviewLoaded }` to `{ albumId }` only
- Added store import: `getCorrectionStore(albumId)`
- Read `selectedMbid` from store instead of prop
- Replaced `onPreviewLoaded` callback with `setPreviewLoaded` store action
- **CRITICAL:** Preserved `lastPreviewKeyRef` infinite loop guard exactly as-is
- Added guard for missing `selectedMbid` (shows "No result selected" message)
- Zero any types introduced

ApplyView changes:

- Props interface reduced from 8 props to `{ albumId, error? }` only
- Added store import: `getCorrectionStore(albumId)`
- Read `preview`, `selections`, `shouldEnrich` from store
- Replaced callbacks with store actions: `setApplySelections`, `setShouldEnrich`, `prevStep`
- `calculateHasSelections` stays as pure function (no store dependency)
- Added guard for null preview/selections (shouldn't happen in normal flow)
- Zero any types introduced

**Task 2: Refactor ManualEditView, Update CorrectionModal, Delete Legacy Hook**

Store updates (cancelManualEdit action):

- Added `cancelManualEdit: () => void` to CorrectionActions interface
- Implementation sets `{ mode: 'search', step: 0, manualEditState: undefined, manualPreviewData: null }`
- Used by ManualEditView cancel handler for returning to search mode

ManualEditView changes:

- Props interface reduced from `{ album, onPreviewClick, onCancel, initialState }` to `{ album }` only
- Added store import: `getCorrectionStore(album.id)`
- Read `manualEditState` from store for initial form state
- **Internal form state stays local:** `formState`, `errors`, `showValidationBanner` remain as `useState` (per ACHILD-06)
- `handlePreviewClick` now uses store actions: `setManualEditState`, `setManualPreviewData`, `setStep(2)`
- `handleCancel` checks for unsaved changes, then calls `cancelManualEdit` store action or shows unsaved dialog
- Imported `computeManualPreview` from `./computeManualDiffs` for preview generation
- Zero any types introduced

CorrectionModal updates:

- PreviewView render reduced to: `<PreviewView albumId={albumId} />`
- ApplyView render reduced to: `<ApplyView albumId={albumId} error={...} />`
- ManualEditView render reduced to: `<ManualEditView album={album} />`
- Removed handler functions: `handlePreviewLoaded`, `handleManualPreview`, `handleCancelManualEdit`
- Removed unused import: `createDefaultUISelections`
- All child component state management now lives in their own implementations via store access

Legacy hook deletion:

- Deleted `src/hooks/useCorrectionModalState.ts`
- Verified zero remaining imports: `grep -rn "useCorrectionModalState" src/` returns no results

## Deviations from Plan

None. Plan executed exactly as written.

## Technical Implementation

**PreviewView Store Integration:**

```typescript
const store = getCorrectionStore(albumId);
const selectedMbid = store(s => s.selectedMbid);
const setPreviewLoaded = store.getState().setPreviewLoaded;

const { data, isLoading, error } = useGetCorrectionPreviewQuery(
  { input: { albumId, releaseGroupMbid: selectedMbid! } },
  { enabled: Boolean(albumId && selectedMbid) }
);

// Critical: lastPreviewKeyRef guard preserved
useEffect(() => {
  if (!data?.correctionPreview) return;
  const preview = data.correctionPreview;
  const previewKey = `${preview.albumId}:${preview.sourceResult?.releaseGroupMbid}:${preview.albumUpdatedAt}`;
  if (lastPreviewKeyRef.current === previewKey) return;
  lastPreviewKeyRef.current = previewKey;
  setPreviewLoaded(preview as unknown as CorrectionPreview);
}, [data?.correctionPreview, setPreviewLoaded]);
```

**ApplyView Store Integration:**

```typescript
const store = getCorrectionStore(albumId);
const preview = store(s => s.previewData);
const selections = store(s => s.applySelections);
const shouldEnrich = store(s => s.shouldEnrich);

const setApplySelections = store.getState().setApplySelections;
const setShouldEnrich = store.getState().setShouldEnrich;
const prevStep = store.getState().prevStep;

// All callback props replaced with direct store action calls
<FieldSelectionForm
  preview={preview}
  selections={selections}
  onSelectionsChange={setApplySelections}
/>
```

**ManualEditView Store Integration with Local Form State:**

```typescript
const store = getCorrectionStore(album.id);
const manualEditState = store(s => s.manualEditState);

// Local form state for validation (per ACHILD-06)
const [formState, setFormState] = useState<ManualEditFieldState>(
  () => manualEditState ?? createInitialEditState(album)
);
const [errors, setErrors] = useState<ManualEditValidationErrors>({});
const [showValidationBanner, setShowValidationBanner] = useState(false);

const handlePreviewClick = () => {
  const result = manualEditSchema.safeParse(formState);
  if (!result.success) {
    // Validation error handling
    return;
  }
  // Use store actions
  store.getState().setManualEditState(formState);
  const preview = computeManualPreview(album, formState);
  store.getState().setManualPreviewData(preview);
  store.getState().setStep(2);
};

const handleCancel = () => {
  if (
    formState &&
    hasUnsavedChanges(createInitialEditState(album), formState)
  ) {
    store.getState().setPendingAction(() => {
      store.getState().cancelManualEdit();
    });
    store.getState().setShowUnsavedDialog(true);
    return;
  }
  store.getState().cancelManualEdit();
};
```

**cancelManualEdit Action:**

```typescript
// In CorrectionActions interface:
cancelManualEdit: () => void;

// In store implementation:
cancelManualEdit: () => {
  set({
    mode: 'search',
    step: 0,
    manualEditState: undefined,
    manualPreviewData: null,
  });
}
```

## Type Safety

All changes maintain strict TypeScript typing:

- Zero `any` types introduced across all modified files
- Props interfaces simplified but remain fully typed
- Store state access uses Zustand selectors with full type inference
- Validation remains type-safe with Zod schemas

## Testing Results

**Type checking:** `pnpm type-check` passes with zero errors
**Linting:** `pnpm lint` passes (warnings are pre-existing, unrelated to this plan)
**Verification steps:**

- [x] `useCorrectionModalState.ts` deleted
- [x] Zero imports of legacy hook remain: `grep -rn "useCorrectionModalState" src/` returns no matches
- [x] PreviewView props: `{ albumId: string }` only
- [x] ApplyView props: `{ albumId: string; error?: Error | null }` only
- [x] ManualEditView props: `{ album: CurrentDataViewAlbum }` only
- [x] ManualEditView has local `useState` for `formState`, `errors`, `showValidationBanner`
- [x] PreviewView `lastPreviewKeyRef` guard preserved
- [x] Zero `any` types in modified files

## Commits

**Commit 1 (6d47ef8):** refactor(13-03): refactor PreviewView and ApplyView to read from store

- PreviewView props reduced to `{ albumId }`, reads `selectedMbid` from store
- ApplyView props reduced to `{ albumId, error? }`, reads `preview`, `selections`, `shouldEnrich` from store
- Preserved `lastPreviewKeyRef` infinite loop guard
- Zero any types introduced

**Commit 2 (e024a6b):** refactor(13-03): refactor ManualEditView, update CorrectionModal, add cancelManualEdit action, delete legacy hook

- ManualEditView props reduced to `{ album }`, internal form state stays local
- CorrectionModal passes reduced props to all child components
- Added `cancelManualEdit` action to store
- Deleted `src/hooks/useCorrectionModalState.ts` with zero remaining imports
- Zero any types introduced

## Next Phase Readiness

**Ready for Phase 14 (Artist Correction Store):**

- Same pattern applies: create useArtistCorrectionStore, migrate ArtistCorrectionModal and child components
- Artist modal is simpler (no dual mode, just search → preview → apply)
- All patterns established in Phase 13 are reusable

**What Phase 14 needs:**

1. Create `src/stores/useArtistCorrectionStore.ts` (simpler than album, no manual mode)
2. Refactor `ArtistCorrectionModal.tsx` to initialize/reset store
3. Refactor `ArtistPreviewView.tsx` and `ArtistApplyView.tsx` to read from store
4. Delete `src/hooks/useArtistCorrectionModalState.ts`

**Completion status:** Phase 13 complete. All album correction modal components now use Zustand store with minimal props and zero legacy hook dependencies. Ready for artist correction modal migration (Phase 14).
