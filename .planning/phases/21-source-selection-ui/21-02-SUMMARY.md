---
phase: 21
plan: 02
subsystem: admin-correction-ui
tags: [zustand, react, toggle-group, ui-component]
dependency-graph:
  requires: [21-01]
  provides: [SourceToggle-component, source-aware-search-views]
  affects: [22-discogs-album-search, 23-discogs-artist-search]
tech-stack:
  added: []
  patterns: [conditional-rendering-by-source, component-composition]
key-files:
  created:
    - src/components/admin/correction/shared/SourceToggle.tsx
  modified:
    - src/components/admin/correction/shared/index.ts
    - src/components/admin/correction/search/SearchView.tsx
    - src/components/admin/correction/artist/search/ArtistSearchView.tsx
decisions:
  - Discogs shows placeholder until Phase 22+ implements search
  - Source toggle disabled during loading to prevent race conditions
  - Consistent toggle position at top of both album and artist search views
metrics:
  duration: 3m
  completed: 2026-02-08
---

# Phase 21 Plan 02: Source Selector Toggle Summary

**One-liner:** Reusable SourceToggle component integrated into album and artist search views with MusicBrainz/Discogs options.

## What Was Built

Created the `SourceToggle` component that allows admins to switch between MusicBrainz and Discogs as the correction source. The component uses Radix UI's Toggle Group for full accessibility support (keyboard navigation, ARIA attributes, focus management).

Integrated the toggle into both search views:

- **Album SearchView:** Toggle appears at top, controls which search backend is used
- **Artist ArtistSearchView:** Same pattern, toggle at top with source-conditional content

When Discogs is selected, a placeholder message is shown indicating the feature is coming in Phase 22+. This ensures the UI framework is ready before the Discogs search implementation.

## Commits

- `315d915` - feat(21-02): create SourceToggle component
- `42a22e4` - feat(21-02): integrate SourceToggle into album SearchView
- `584d95b` - feat(21-02): integrate SourceToggle into artist ArtistSearchView

## Key Implementation Details

**SourceToggle Component:**

- Uses `ToggleGroup` with `type="single"` for radio-like behavior
- Guards against undefined on double-click (Radix behavior)
- Accepts `disabled` prop to prevent changes during search
- Clean label "Search Source" above toggle buttons

**Search View Integration:**

- Toggle appears at consistent position (top of step)
- MusicBrainz search content wrapped in `correctionSource === 'musicbrainz'`
- Discogs placeholder wrapped in `correctionSource === 'discogs'`
- GraphQL query `enabled` condition includes source check

## Files Changed

**Created:**

- `src/components/admin/correction/shared/SourceToggle.tsx` - Reusable toggle component

**Modified:**

- `src/components/admin/correction/shared/index.ts` - Added SourceToggle and CorrectionSource exports
- `src/components/admin/correction/search/SearchView.tsx` - Integrated toggle with conditional rendering
- `src/components/admin/correction/artist/search/ArtistSearchView.tsx` - Integrated toggle with conditional rendering

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Phase 21-03 (if exists) or Phase 22 can now:

- Implement Discogs search behind the `correctionSource === 'discogs'` condition
- Remove the placeholder messages when Discogs search is functional
- The toggle and state infrastructure is complete and ready
