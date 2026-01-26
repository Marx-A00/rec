---
phase: 07-search-ui
plan: 01
subsystem: correction-ui
tags: [react, components, search, form, skeleton]
dependency-graph:
  requires: [06-03]
  provides: [SearchInputs, SearchSkeleton]
  affects: [07-02, 07-03]
tech-stack:
  added: []
  patterns: [controlled-inputs, form-validation, loading-skeletons]
key-files:
  created:
    - src/components/admin/correction/search/SearchInputs.tsx
    - src/components/admin/correction/search/SearchSkeleton.tsx
    - src/components/admin/correction/search/index.ts
  modified: []
decisions: []
metrics:
  duration: 2.7min
  completed: 2026-01-25
---

# Phase 7 Plan 1: Search Inputs Summary

**One-liner:** Two-field search form with pre-populated album/artist values and loading skeleton for MusicBrainz correction search

## What Was Built

### SearchInputs Component
- Two controlled input fields (album title, artist name)
- Pre-populates with initial values from current album data
- Form validation: at least one field must have non-empty trimmed content
- Search button with MusicBrainz icon, disabled when empty or loading
- Full width button to match modal aesthetic
- Uses existing Input/Button components with dark theme styling

### SearchSkeleton Component
- Loading skeleton for search step visual feedback
- Input field skeletons (3 rows: title, artist, button)
- Result row skeletons (5 rows with 48px thumbnail + text lines)
- Matches expected search area layout

### Barrel Export
- `src/components/admin/correction/search/index.ts`
- Exports SearchInputs and SearchSkeleton

## Key Implementation Details

### Props Interface (SearchInputs)
- `initialAlbumTitle: string` - pre-populate from current album
- `initialArtistName: string` - pre-populate from primary artist
- `onSearch: (query: { albumTitle: string; artistName: string }) => void`
- `isLoading?: boolean` - disable search button during loading

### Form Behavior
- Prevents default on submit
- Trims values before validation and callback
- Button disabled when both inputs empty OR loading
- Triggers on form submit (button click or Enter key)

## Commits

- `84bd24e`: feat(07-01): create SearchInputs component for correction search
- `997b4b5`: feat(07-01): add SearchSkeleton and barrel export

## Verification Results

- pnpm type-check: PASS
- pnpm lint: PASS (no errors in new files)
- Files created in src/components/admin/correction/search/

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for 07-02 (Search Results Display):
- SearchInputs ready to call onSearch callback
- SearchSkeleton ready to show during search loading
- Barrel export set up for easy imports
