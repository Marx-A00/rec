---
phase: 21
plan: 03
subsystem: admin-correction
tags: [preview, badge, zustand, ui]
dependency-graph:
  requires:
    - 21-01 (correctionSource in stores)
  provides:
    - Source indicator badges in preview views
  affects:
    - Future preview enhancements
tech-stack:
  added: []
  patterns:
    - Store-driven badge display
key-files:
  created: []
  modified:
    - src/components/admin/correction/preview/PreviewView.tsx
    - src/components/admin/correction/artist/preview/ArtistPreviewView.tsx
decisions:
  - Badge placed in header next to title (not per-field)
  - Uses outline variant with muted zinc styling
  - Dynamic text based on correctionSource state
metrics:
  duration: 8min
  completed: 2026-02-08
---

# Phase 21 Plan 03: Source Preview Badges Summary

Source indicator badges show MusicBrainz/Discogs in preview headers using store-driven correctionSource state with consistent outline styling.

## What Was Done

### Task 1: Album PreviewView Badge
- Imported Badge component from UI library
- Added `correctionSource` read from album correction store
- Placed badge in header section next to album title
- Badge displays "MusicBrainz" or "Discogs" based on store state

### Task 2: Artist ArtistPreviewView Badge
- Imported Badge component from UI library
- Added `correctionSource` read from artist correction store
- Placed badge in header section next to artist name
- Updated "Comparing with" text to dynamically show source name
- Consistent styling with album preview badge

## Key Changes

**PreviewView.tsx:**
- Line 17: Import Badge component
- Line 62: Read correctionSource from store
- Lines 246-254: Badge in header with conditional text

**ArtistPreviewView.tsx:**
- Line 18: Import Badge component
- Line 132: Read correctionSource from store
- Lines 298-308: Badge in header with conditional text
- Line 308: Dynamic source name in comparison text

## Verification Results

- TypeScript: Passes
- ESLint: Clean (files modified)
- Badge import: Present in both files
- correctionSource read: Present in both files
- Badge renders with correct conditional text

## Deviations from Plan

None - plan executed exactly as written.

## Commits

- 7c8a796: feat(21-03): add source badge to album preview view
- 29fad57: feat(21-03): add source badge to artist preview view

## Next Phase Readiness

Plan 21-03 complete. Ready for 21-04 (Discogs album search integration).
