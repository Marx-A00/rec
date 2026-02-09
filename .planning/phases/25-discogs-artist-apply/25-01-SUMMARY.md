---
phase: 25-discogs-artist-apply
plan: 01
subsystem: correction-services
tags: [discogs, artist, preview, diff-engine]

dependency_graph:
  requires:
    - phase-24 (discogs artist search)
  provides:
    - ArtistCorrectionPreviewService Discogs support
    - CorrectionSource type for artist preview
    - Source-conditional field diffs
  affects:
    - 25-02 (GraphQL resolver routing)
    - 25-03 (Apply service Discogs support)

tech_stack:
  added: []
  patterns:
    - Source-conditional field comparison (from album preview pattern)
    - Biography building from Discogs metadata
    - BBCode stripping for clean text display

key_files:
  created: []
  modified:
    - src/lib/correction/artist/preview/types.ts
    - src/lib/correction/artist/preview/preview-service.ts
    - src/lib/correction/artist/preview/diff-engine.ts

decisions:
  - key: discogs-biography-composition
    choice: "Combine profile + realname + members + groups into disambiguation field"
    reason: "Discogs lacks structured disambiguation, but has rich profile data"

metrics:
  duration: "~2.5 minutes"
  completed: "2026-02-09"
---

# Phase 25 Plan 01: Artist Preview Service Discogs Support Summary

**One-liner:** Source-aware artist preview service with Discogs fetching, BBCode stripping, and source-conditional field diffs.

## What Was Built

Extended the artist correction preview service to support Discogs as a data source, following the pattern established in Phase 23 for albums.

## Tasks Completed

**Task 1: Add CorrectionSource type and update signature**
- Added `CorrectionSource` type to `types.ts`
- Updated `generatePreview()` to accept `source` parameter with 'musicbrainz' default
- Added conditional routing based on source

**Task 2: Add fetchDiscogsArtistData method**
- Calls `unifiedArtistService.getArtistDetails()` with `skipLocalCache: true`
- Transforms Discogs artist to `MBArtistData` format
- Builds biography from profile, realname, members, and groups
- Strips BBCode formatting from Discogs profile text

**Task 3: Update diff-engine for source-conditional comparison**
- `generateFieldDiffs()` now accepts `source` parameter
- MusicBrainz-only fields (artistType, area, countryCode) skipped for Discogs
- External ID uses `musicbrainzId` or `discogsId` based on source

## Technical Details

**Biography Building:**
```
profile text (BBCode stripped)
+ "Real name: {realName}"
+ "Members: {member1}, {member2}..."
+ "Groups: {group1}, {group2}..."
```

**BBCode Stripping:**
- Removes [b], [i], [u], [url=], [a=], [l=] tags
- Preserves inner text content
- Falls back to removing any remaining bracket tags

**Source-Conditional Fields:**
- MusicBrainz: name, disambiguation, countryCode, artistType, area, beginDate, endDate, gender, musicbrainzId, ipi, isni
- Discogs: name, disambiguation, beginDate, endDate, discogsId, ipi, isni

## Commits

- `6067cb2`: feat(25-01): extend artist preview service for Discogs source support

## Files Modified

- `src/lib/correction/artist/preview/types.ts` - Added CorrectionSource type
- `src/lib/correction/artist/preview/preview-service.ts` - Added Discogs fetching and transformation
- `src/lib/correction/artist/preview/diff-engine.ts` - Added source-conditional field diffs

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for 25-02 (GraphQL resolver routing). The preview service now accepts source parameter and can generate previews from either MusicBrainz or Discogs data.
