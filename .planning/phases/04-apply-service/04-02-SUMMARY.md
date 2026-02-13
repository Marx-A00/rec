---
phase: '04'
plan: '02'
subsystem: apply-service
tags: [prisma, field-selection, partial-updates, typescript]

dependency-graph:
  requires: ['04-01']
  provides: [field-selector, album-update-builder, track-update-builder]
  affects: ['04-03', '04-04']

tech-stack:
  added: []
  patterns: [conditional-update-objects, three-way-choice]

key-files:
  created:
    - src/lib/correction/apply/field-selector.ts
  modified:
    - src/lib/correction/apply/index.ts

decisions:
  - id: field-selector-pattern
    choice: Build Prisma update objects conditionally
    rationale: Undefined fields mean no change in Prisma, enabling partial updates

metrics:
  duration: 2.2min
  completed: 2026-01-24
---

# Phase 04 Plan 02: Field Selector Summary

**One-liner:** Conditional Prisma update builders that only include selected fields, enabling partial corrections.

## What Was Built

**Field selector functions** that construct Prisma update/create objects based on admin field selections:

1. **Album Update Builder** (`buildAlbumUpdateData`)
   - Takes CorrectionPreview and FieldSelections
   - Only populates fields where selection is true
   - Handles metadata (title, releaseDate, releaseType, releaseCountry, barcode)
   - Handles external IDs (musicbrainzId)
   - Handles cover art three-way choice

2. **Track Update Builder** (`buildTrackUpdateData`)
   - Returns null if track not selected (Map lookup by track ID)
   - Updates title, trackNumber, durationMs, musicbrainzId
   - Sets lastEnriched timestamp

3. **Track Create Builder** (`buildTrackCreateData`)
   - Creates complete TrackCreateInput for new tracks
   - Sets dataQuality: 'HIGH' (admin-verified)
   - Sets source: 'MUSICBRAINZ', enrichmentStatus: 'COMPLETED'

4. **Utilities**
   - `parseReleaseDate`: Handles YYYY, YYYY-MM, YYYY-MM-DD formats
   - `hasAnyMetadataSelected`: Checks if any album-level update needed
   - `getTrackIdsToDelete`: Filters orphaned tracks by selection

## Key Decisions Made

**1. Undefined = No Change**

- Prisma treats undefined fields as "no update"
- buildAlbumUpdateData only sets fields when selected
- This enables true partial updates without explicit null handling

**2. Cover Art Three-Way Choice**

- `use_source`: Set coverArtUrl from preview.sourceResult
- `keep_current`: Don't touch coverArtUrl (undefined)
- `clear`: Set both coverArtUrl and cloudflareImageId to null

**3. Track Selection by ID**

- tracks Map uses track database ID as key (not position)
- buildTrackUpdateData returns null for unselected tracks
- getTrackIdsToDelete only deletes explicitly selected orphans

**4. Date Parsing Safety**

- UTC dates to avoid timezone issues
- Returns null for invalid formats (not throw)
- Defaults to January 1st for partial dates

## Files Changed

**Created:**

- `src/lib/correction/apply/field-selector.ts` (435 lines)

**Modified:**

- `src/lib/correction/apply/index.ts` (+10 lines)

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] `pnpm type-check` passes
- [x] `buildAlbumUpdateData` returns partial Prisma.AlbumUpdateInput
- [x] `buildTrackUpdateData` returns null for unselected tracks
- [x] `buildTrackCreateData` creates complete track with proper defaults
- [x] Cover art three-way choice implemented correctly
- [x] Date parsing handles YYYY, YYYY-MM, YYYY-MM-DD formats

## Commits

- 679827d: feat(04-02): implement album field selector
- 1017010: feat(04-02): implement track field selectors
- aaebb92: feat(04-02): export field selectors from apply module

## Next Phase Readiness

**Ready for 04-03:** applyCorrection service function can now:

1. Use buildAlbumUpdateData for Prisma album.update()
2. Use buildTrackUpdateData/Create for track operations
3. Use getTrackIdsToDelete to safely remove orphans
4. All functions are exported and ready for integration
