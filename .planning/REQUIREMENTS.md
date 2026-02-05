# Requirements: Zustand Correction Modal Refactor

**Defined:** 2026-02-04
**Core Value:** Admins can fix a broken album in under a minute without touching the database.
**Milestone:** v1.1 — Pure state management refactor, zero visual changes.

## v1.1 Requirements

### Album Store

- [x] **ASTORE-01**: Zustand store created with full CorrectionState + CorrectionActions interfaces
- [x] **ASTORE-02**: Persist middleware with custom sessionStorage adapter keyed by albumId
- [x] **ASTORE-03**: Selective persistence via partialize (step, mode, query, offset, selectedMbid, manualEditState only)
- [x] **ASTORE-04**: Derived selectors exported as standalone functions (isFirstStep, isLastStep, maxStep, stepLabels, isManualEditMode)
- [x] **ASTORE-05**: Atomic action for selectResult (sets mbid + advances step in one set())
- [x] **ASTORE-06**: Atomic action for setPreviewLoaded (sets previewData + applySelections + resets shouldEnrich in one set())
- [x] **ASTORE-07**: Atomic action for enterSearch/enterManualEdit (mode + step + cleanup in one set())
- [x] **ASTORE-08**: Unsaved changes dialog actions (show, confirm discard, cancel)

### Album Modal Refactor

- [x] **AMODAL-01**: CorrectionModal reads state from useCorrectionStore instead of useState calls
- [x] **AMODAL-02**: CorrectionModal initializes store on open, resets on close
- [x] **AMODAL-03**: Mutation callbacks stay in CorrectionModal (toast + store + queryClient orchestration)

### Album Child Component Refactor

- [x] **ACHILD-01**: SearchView props reduced to `album` only — reads search state from store
- [x] **ACHILD-02**: PreviewView props reduced to zero — reads albumId, selectedResultMbid from store
- [x] **ACHILD-03**: PreviewView preserves lastPreviewKeyRef guard against useEffect loops
- [x] **ACHILD-04**: ApplyView props reduced to `error` only — reads preview, selections, enrichment from store
- [x] **ACHILD-05**: ManualEditView props reduced to `album` only — reads manualEditState from store
- [x] **ACHILD-06**: ManualEditView internal form state (formState, errors, showValidationBanner) stays as local useState

### Artist Store

- [x] **XSTORE-01**: Zustand store created with ArtistCorrectionState + ArtistCorrectionActions interfaces
- [x] **XSTORE-02**: Persist middleware with custom sessionStorage adapter keyed by artistId
- [x] **XSTORE-03**: Selective persistence via partialize (step, query, offset, selectedMbid only)
- [x] **XSTORE-04**: Atomic action for selectResult (sets mbid + advances step)
- [x] **XSTORE-05**: Atomic action for setPreviewLoaded (sets previewData)

### Artist Modal Refactor

- [x] **XMODAL-01**: ArtistCorrectionModal reads state from useArtistCorrectionStore instead of useState calls
- [x] **XMODAL-02**: ArtistCorrectionModal initializes store on open, resets on close

### Artist Child Component Refactor

- [x] **XCHILD-01**: ArtistSearchView props reduced to `artist` only
- [x] **XCHILD-02**: ArtistPreviewView props reduced to zero
- [x] **XCHILD-03**: ArtistApplyView props reduced to `isApplying` + `error` only

### Cleanup

- [x] **CLEAN-01**: useCorrectionModalState.ts deleted with zero remaining imports
- [x] **CLEAN-02**: useArtistCorrectionModalState.ts deleted with zero remaining imports
- [x] **CLEAN-03**: Zero `any` types introduced across all changes
- [x] **CLEAN-04**: StepIndicator stays prop-driven (reused by both modals)

## Out of Scope

- React Query migration — server state stays as React Query hooks
- ManualEditView internal form state — stays as local useState
- Shared store between album and artist — different state shapes warrant separate stores
- New UI features, steps, or modes — pure refactor
- Toast state migration — stays local in modals
- Component tree changes — same hierarchy, different wiring

## Traceability

**Phase 13: Album Correction Store**

Album Store Requirements:

- ASTORE-01 → Phase 13
- ASTORE-02 → Phase 13
- ASTORE-03 → Phase 13
- ASTORE-04 → Phase 13
- ASTORE-05 → Phase 13
- ASTORE-06 → Phase 13
- ASTORE-07 → Phase 13
- ASTORE-08 → Phase 13

Album Modal Refactor Requirements:

- AMODAL-01 → Phase 13
- AMODAL-02 → Phase 13
- AMODAL-03 → Phase 13

Album Child Component Refactor Requirements:

- ACHILD-01 → Phase 13
- ACHILD-02 → Phase 13
- ACHILD-03 → Phase 13
- ACHILD-04 → Phase 13
- ACHILD-05 → Phase 13
- ACHILD-06 → Phase 13

Cleanup Requirements (Album):

- CLEAN-01 → Phase 13
- CLEAN-03 → Phase 13 (enforced during album refactor)
- CLEAN-04 → Phase 13 (verified during refactor)

**Phase 14: Artist Correction Store**

Artist Store Requirements:

- XSTORE-01 → Phase 14
- XSTORE-02 → Phase 14
- XSTORE-03 → Phase 14
- XSTORE-04 → Phase 14
- XSTORE-05 → Phase 14

Artist Modal Refactor Requirements:

- XMODAL-01 → Phase 14
- XMODAL-02 → Phase 14

Artist Child Component Refactor Requirements:

- XCHILD-01 → Phase 14
- XCHILD-02 → Phase 14
- XCHILD-03 → Phase 14

Cleanup Requirements (Artist):

- CLEAN-02 → Phase 14
- CLEAN-03 → Phase 14 (enforced during artist refactor)

**Coverage Summary:**

- Total v1.1 requirements: 30
- Mapped to Phase 13: 20 requirements
- Mapped to Phase 14: 10 requirements
- Unmapped: 0

Coverage: 30/30 (100%)

**Status by Phase:**

| Phase | Requirements | Status   |
| ----- | ------------ | -------- |
| 13    | 20           | Complete |
| 14    | 10           | Complete |

---

_Requirements defined: 2026-02-04_
_Last updated: 2026-02-05 after Phase 14 completion_
