---
phase: 11-artist-correction
plan: 02
subsystem: artist-correction
tags: [preview, diff-engine, musicbrainz, types]
dependency-graph:
  requires: ["11-01"]
  provides: ["artist-preview-types", "artist-diff-engine", "artist-preview-service"]
  affects: ["11-03"]
tech-stack:
  added: []
  patterns: ["singleton-factory", "diff-engine", "text-normalization"]
key-files:
  created:
    - src/lib/correction/artist/preview/types.ts
    - src/lib/correction/artist/preview/diff-engine.ts
    - src/lib/correction/artist/preview/preview-service.ts
  modified: []
decisions:
  - key: gender-field-person-only
    choice: Only show gender diff when MB type is Person
    reason: Gender is meaningless for Group/Orchestra/Choir artist types
  - key: partial-date-strings
    choice: Store begin/end dates as strings (YYYY, YYYY-MM, YYYY-MM-DD)
    reason: MusicBrainz partial dates don't map cleanly to Date objects
  - key: first-ipi-isni-only
    choice: Compare only first IPI/ISNI code from arrays
    reason: Database stores single values, flattening per RESEARCH.md
metrics:
  duration: 2.7min
  completed: 2026-01-27
---

# Phase 11 Plan 02: Artist Preview Service Summary

Artist preview service generates field-by-field diffs between current database artist and MusicBrainz data with album impact count.

## One-liner

ArtistCorrectionPreviewService compares 11 artist fields with MusicBrainz data and counts affected albums using AlbumArtist join table.

## What Was Built

**Task 1: Artist preview types and diff engine**

Created type definitions mirroring album preview pattern:
- `MBArtistData`: Full MusicBrainz artist response including lifeSpan, area, aliases, ipis, isnis
- `ArtistFieldDiff`: Field-level comparison with ChangeType (ADDED/MODIFIED/REMOVED/UNCHANGED)
- `ArtistCorrectionPreview`: Complete preview with currentArtist, mbArtistData, fieldDiffs, albumCount, summary

Implemented `ArtistDiffEngine` class:
- `classifyChange()`: Determines change type using TextNormalizer for semantic comparison
- `generateFieldDiffs()`: Compares 11 fields (name, disambiguation, countryCode, artistType, area, beginDate, endDate, gender, musicbrainzId, ipi, isni)
- `generateSummary()`: Counts changes by type
- Gender field only compared when MB type is "Person" (per RESEARCH.md decision)

**Task 2: Artist preview service**

Created `ArtistCorrectionPreviewService`:
- Constructor accepts optional PrismaClient for testing
- `generatePreview(artistId, artistMbid)`: Main entry point
  - Fetches current artist via `prisma.artist.findUnique`
  - Counts albums via `prisma.albumArtist.count`
  - Fetches full MB artist via `mbService.getArtist` with ADMIN priority
  - Uses ArtistDiffEngine to generate field diffs
  - Returns complete ArtistCorrectionPreview

Included helper methods:
- `fetchMBArtistData()`: Queue-based fetch with error handling
- `transformMBArtist()`: Converts MB API response to MBArtistData shape

## Commits

- `14d1eb5`: feat(11-02): add artist preview types and diff engine
- `c0db26a`: feat(11-02): add artist correction preview service

## Verification

- pnpm type-check: PASSED - All types and services compile without errors
- Preview types cover all 11 artist fields from research
- Diff engine compares all fields with proper change classification
- Album count query uses albumArtist join table correctly

## Decisions Made

- **Gender field Person-only**: Only show gender diff when MB type is "Person" - meaningless for bands/orchestras
- **Partial date strings**: Store begin/end dates as strings to preserve MusicBrainz precision (YYYY, YYYY-MM, YYYY-MM-DD)
- **First IPI/ISNI only**: Compare only first value from arrays since database stores single values

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for 11-03 (Artist Apply Service)**

Prerequisites met:
- ArtistCorrectionPreview type defined with all necessary fields
- ArtistFieldDiff covers all updatable fields
- Album count available for impact messaging

No blockers identified.
