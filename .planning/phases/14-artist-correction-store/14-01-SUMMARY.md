---
phase: 14
plan: 01
subsystem: admin-correction-state
tags: [zustand, state-management, artist-correction, sessionStorage, typescript]
dependencies:
  requires: [13-03]
  provides: [artist-correction-store]
  affects: [14-02, 14-03]
tech-stack:
  added: []
  patterns: [zustand-factory, atomic-actions, persist-middleware, derived-selectors]
decisions:
  - id: ARTIST-STORE-01
    decision: "Use factory pattern with Map cache keyed by artistId"
    rationale: "Matches Phase 13 album store pattern for consistency"
  - id: ARTIST-STORE-02
    decision: "Include mode field and ManualArtistEditState type for future expansion"
    rationale: "Simplifies future manual edit implementation while keeping Phase 14 search-only"
  - id: ARTIST-STORE-03
    decision: "Search query is plain string (not object like album store)"
    rationale: "Artist search is single-field (name only) unlike album dual-field (title + artist)"
key-files:
  created:
    - src/stores/useArtistCorrectionStore.ts
  modified:
    - src/components/admin/correction/artist/apply/ArtistApplyView.tsx
metrics:
  duration: 130s
  completed: 2026-02-05
---

# Phase 14 Plan 01: Create Artist Correction Store

**One-liner:** Zustand store factory for artist correction modal with sessionStorage persistence, atomic actions, and derived selectors.

## What Was Built

### Artifacts Created

**src/stores/useArtistCorrectionStore.ts** (491 lines)
- Zustand store factory with persist middleware
- Factory creates isolated instances keyed by artistId with Map cache
- SessionStorage persistence with `artist-correction-modal-${artistId}` key
- 13 state fields: 6 persisted + 7 transient
- 15 action creators including 3 atomic actions
- 5 derived selector functions
- Zero any types

**Key Features:**
- **Persisted fields** (6): step, mode, searchQuery, searchOffset, selectedArtistMbid, manualEditState
- **Transient fields** (7): previewData, applySelections, shouldEnrich, showAppliedState, pendingAction, showUnsavedDialog, isPreviewLoading
- **Atomic actions**: selectResult (mbid + step), setPreviewLoaded (preview + selections + enrich), confirmUnsavedDiscard (action + dialog)
- **Derived selectors**: isFirstStep, isLastStep, maxStep, stepLabels, isManualEditMode

**src/components/admin/correction/artist/apply/ArtistApplyView.tsx** (modified)
- Renamed `createDefaultSelections` to `createDefaultArtistSelections`
- Exported function for use by store's setPreviewLoaded action
- Updated internal usage in useState initializer
- No logic changes

### Type Definitions

**ManualArtistEditState interface**
- 8 metadata fields: name, disambiguation, countryCode, artistType, area, beginDate, endDate, gender
- 1 nested object: externalIds with musicbrainzId, ipi, isni
- Typed for future expansion but NOT used in Phase 14

**ArtistCorrectionState interface**
- 13 total fields split into persisted and transient categories
- Search query is `string | undefined` (differs from album's object type)
- Added `isPreviewLoading` field for loading state tracking

**UIArtistFieldSelections interface**
- Re-exported from ArtistApplyView for convenience
- 2 categories: metadata (8 fields), externalIds (3 fields)

## Decisions Made

**ARTIST-STORE-01: Factory Pattern with artistId Keys**
- Store instances isolated per artistId using Map cache
- Follows Phase 13 album store pattern exactly
- Cleanup via clearArtistCorrectionStoreCache on modal close
- Alternative considered: Singleton store with artistId in state (rejected - loses persistence isolation)

**ARTIST-STORE-02: Include Mode Field for Future Expansion**
- Mode field typed as `'search' | 'manual'` even though only search implemented
- ManualArtistEditState type defined but not used in Phase 14
- Actions enterManualEdit/cancelManualEdit included but documented as not implemented
- Rationale: Simplifies future manual edit implementation, maintains consistency with album store structure

**ARTIST-STORE-03: Plain String Search Query**
- Artist search uses `searchQuery: string | undefined`
- Album store uses `SearchQueryState { albumTitle, artistName }`
- Rationale: Artist search is single-field (name only), simpler than album's dual-field search

**ARTIST-STORE-04: Step Count Hard-Coded for Search Mode**
- maxStep = 3, isLastStep checks `step === 3`
- Manual mode logic included but always evaluates to search mode (4 steps)
- TODO comment added for future manual mode implementation
- Rationale: Keep code simple for current scope, refactor when manual mode added

## Deviations from Plan

None - plan executed exactly as written.

## Testing Evidence

**Type Safety:**
```bash
pnpm type-check
# Output: Zero errors
```

**Zero Any Types:**
```bash
grep -c "any" src/stores/useArtistCorrectionStore.ts
# Output: 0
```

**Exports Verified:**
```bash
grep -n "^export" src/stores/useArtistCorrectionStore.ts
# Output: 12 exports
# - ManualArtistEditState (type)
# - ArtistCorrectionState (type)
# - ArtistCorrectionActions (type)
# - ArtistCorrectionStore (type)
# - UIArtistFieldSelections (type re-export)
# - getArtistCorrectionStore (function)
# - clearArtistCorrectionStoreCache (function)
# - isFirstStep (function)
# - isLastStep (function)
# - maxStep (function)
# - stepLabels (function)
# - isManualEditMode (function)
```

**SessionStorage Key Prefix:**
```bash
grep "artist-correction-modal" src/stores/useArtistCorrectionStore.ts
# Output: 
# - name: `artist-correction-modal-${artistId}`
# - sessionStorage.removeItem(`artist-correction-modal-${artistId}`)
```

**Zero Consumers (Expected):**
```bash
grep -r "useArtistCorrectionStore" src/
# Output: No matches (Plan 02 will wire it up)
```

## Tech Patterns Applied

**Zustand Factory Pattern**
- Store creation function per entityId
- Map cache prevents recreation on re-renders
- Cleanup function removes cache entry and sessionStorage

**Persist Middleware**
- Selective persistence via partialize function
- SessionStorage for session-only state
- Automatic rehydration on page load

**Atomic Actions**
- Multi-field updates in single set() call
- Prevents intermediate states and race conditions
- Example: selectResult sets mbid + step atomically

**Derived Selectors**
- Computed values as standalone functions
- Prevent unnecessary re-renders via selector optimization
- Single source of truth pattern

## Integration Points

**Upstream Dependencies:**
- Phase 13-03: Album correction store pattern (template)
- `@/generated/graphql`: ArtistCorrectionPreview type
- `@/components/admin/correction/artist/apply/ArtistApplyView`: createDefaultArtistSelections function, UIArtistFieldSelections type

**Downstream Consumers (Plan 02 will wire up):**
- ArtistCorrectionModal: Store initialization and cleanup
- ArtistSearchView: Read/write search state
- ArtistPreviewView: Read selectedArtistMbid, write previewData
- ArtistApplyView: Read/write apply selections

**External APIs:**
- SessionStorage: Persistence layer
- Zustand: State management core

## Next Phase Readiness

**Plan 02 Prerequisites Met:**
- ✅ Store factory exported and ready for component consumption
- ✅ All action creators typed and implemented
- ✅ Derived selectors available for component use
- ✅ Zero type errors, zero any types
- ✅ createDefaultArtistSelections exported from ArtistApplyView

**Plan 03 Prerequisites Met:**
- ✅ Store cleanup function exported for modal close handler
- ✅ Atomic actions ensure no intermediate states during transitions

**Known Limitations:**
- Manual edit mode typed but not implemented (future phase)
- No validation on search query format (handled by component layer)
- Store doesn't validate artistId format (UUID expected, not enforced)

**Blockers:** None

## Commit History

**Task 1: Export createDefaultArtistSelections**
- Commit: 81820e1
- Files: src/components/admin/correction/artist/apply/ArtistApplyView.tsx
- Changes: Renamed createDefaultSelections to createDefaultArtistSelections, exported function, updated internal usage

**Task 2: Create useArtistCorrectionStore**
- Commit: 24a34cf
- Files: src/stores/useArtistCorrectionStore.ts (created)
- Changes: Zustand store with factory pattern, persist middleware, 13 state fields, 15 actions, 5 selectors

## Performance Notes

- Store creation is lazy (only when first accessed)
- Map cache prevents duplicate store creation
- Persist middleware uses sessionStorage (synchronous, fast)
- Derived selectors optimize re-renders (only re-run when dependencies change)
- No performance concerns identified

## Documentation Impact

- Store JSDoc comments mirror album store for consistency
- Code comments explain future expansion fields
- TODO comments mark manual mode as not implemented

## Related Files

**Phase 13 Template:**
- src/stores/useCorrectionStore.ts (album correction store)

**Phase 14 Research:**
- .planning/phases/14-artist-correction-store/14-RESEARCH.md

**Next Plans:**
- 14-02-PLAN.md: Wire store to ArtistCorrectionModal and child components
- 14-03-PLAN.md: Delete useArtistCorrectionModalState hook after migration complete
