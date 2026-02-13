---
phase: 21
plan: 01
subsystem: correction
tags: [zustand, ui-primitives, state-management, discogs]
requires: []
provides: [toggle-group-component, correction-source-state, source-switching]
affects: [21-02, 21-03, 22-xx]
tech-stack:
  added: ['@radix-ui/react-toggle-group']
  patterns: [atomic-state-clearing, type-reexport]
key-files:
  created:
    - src/components/ui/toggle-group.tsx
  modified:
    - src/stores/useCorrectionStore.ts
    - src/stores/useArtistCorrectionStore.ts
    - package.json
    - pnpm-lock.yaml
decisions:
  - id: d21-01-01
    decision: 'Import CorrectionSource type from album store into artist store (single source of truth)'
    reason: 'Avoid duplicate type definitions, ensure consistency'
  - id: d21-01-02
    decision: 'Re-export CorrectionSource from artist store for convenience'
    reason: "Components using artist store don't need to import from both stores"
  - id: d21-01-03
    decision: 'Use context pattern in ToggleGroup for variant inheritance'
    reason: 'Matches shadcn/ui pattern in tabs.tsx, enables clean API'
metrics:
  duration: '4m'
  completed: '2026-02-08'
---

# Phase 21 Plan 01: Source Selection State Summary

Source selection state infrastructure with Toggle Group component and correctionSource field in both Zustand stores.

## One-liner

Toggle Group UI primitive + correctionSource state with atomic clearing in both album and artist correction stores.

## What Was Built

**1. Toggle Group Component (`src/components/ui/toggle-group.tsx`)**

- Radix UI primitive with shadcn/ui styling
- ToggleGroup and ToggleGroupItem exports
- Size variants (default, sm) and outline variant
- Context pattern for variant inheritance to items
- Focus ring and dark theme compatible

**2. Album Correction Store Updates (`src/stores/useCorrectionStore.ts`)**

- Added `CorrectionSource` type: `'musicbrainz' | 'discogs'`
- Added `correctionSource` field to state (default: 'musicbrainz')
- Added `correctionSource` to partialize (persists in sessionStorage)
- Added `setCorrectionSource` action with atomic state clearing:
  - Clears searchQuery, searchOffset, selectedMbid
  - Clears previewData, applySelections
  - No-op if source unchanged

**3. Artist Correction Store Updates (`src/stores/useArtistCorrectionStore.ts`)**

- Imports CorrectionSource type from album store
- Added `correctionSource` field to state (default: 'musicbrainz')
- Added `correctionSource` to partialize (persists in sessionStorage)
- Added `setCorrectionSource` action with atomic state clearing:
  - Clears searchQuery, searchOffset, selectedArtistMbid
  - Clears previewData, applySelections
  - No-op if source unchanged
- Re-exports CorrectionSource for convenience

## Key Implementation Details

**Atomic State Clearing Pattern:**

When correctionSource changes, all search-related state is cleared in a single `set()` call. This prevents stale MusicBrainz data from showing when Discogs is selected (and vice versa).

```typescript
setCorrectionSource: (source: CorrectionSource) => {
  const current = get().correctionSource;
  if (current === source) return; // No-op if same source

  set({
    correctionSource: source,
    searchQuery: undefined,
    searchOffset: 0,
    selectedMbid: undefined, // or selectedArtistMbid for artist store
    previewData: null,
    applySelections: null,
  });
};
```

**State Persistence:**

correctionSource is included in partialize, so it persists across navigation in sessionStorage. This means if an admin selects Discogs, closes the modal, and reopens it, Discogs will still be selected.

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- TypeScript compiles cleanly (pnpm type-check passes)
- Lint passes (only pre-existing warnings)
- All success criteria verified:
  - ToggleGroup and ToggleGroupItem exported
  - Both stores have correctionSource with 'musicbrainz' default
  - Both stores persist correctionSource in sessionStorage
  - setCorrectionSource clears search state atomically

## Commits

- `59b9947`: feat(21-01): add Toggle Group UI component
- `7415225`: feat(21-01): add correctionSource to album store
- `a4b9ce9`: feat(21-01): add correctionSource to artist store

## Next Phase Readiness

**Ready for 21-02 (Source Selector Toggle):**

- Toggle Group component available for source selector UI
- Both stores have correctionSource state ready to bind
- setCorrectionSource action ready to call on toggle change

**No blockers identified.**
