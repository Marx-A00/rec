---
phase: 11-artist-correction
plan: 01
subsystem: backend-services
tags: [artist, search, musicbrainz, correction]
depends:
  requires:
    - phase-01 (queue infrastructure with ADMIN priority)
  provides:
    - ArtistSearchResult type with full MusicBrainz artist fields
    - ArtistCorrectionSearchService for artist search
  affects:
    - 11-02 (preview service needs search result types)
    - 11-03 (apply service uses same artist types)
tech-stack:
  added: []
  patterns:
    - ADMIN priority tier for responsive admin UI
    - HMR-safe singleton for service instances
    - Top releases for artist disambiguation
key-files:
  created:
    - src/lib/correction/artist/types.ts
    - src/lib/correction/artist/search-service.ts
  modified: []
decisions:
  - id: "11-01-types"
    decision: "Store artistType as string, not enum"
    rationale: "MusicBrainz may add new artist types (Person, Group, Orchestra, Choir, Character, Other)"
  - id: "11-01-dates"
    decision: "Preserve partial dates as-is from MusicBrainz"
    rationale: "Dates can be '1965', '1965-03', or '1965-03-21' - no parsing needed"
  - id: "11-01-releases"
    decision: "Fetch top 3 releases per artist for disambiguation"
    rationale: "Multiple artists share common names - releases help identify correct artist"
metrics:
  duration: "3min"
  completed: "2026-01-28"
---

# Phase 11 Plan 01: Artist Search Service Summary

**One-liner:** Artist correction search service with MusicBrainz integration and top releases for disambiguation.

## What Was Built

Created the foundational types and search service for artist correction, mirroring the established album correction patterns.

**Types (`src/lib/correction/artist/types.ts`):**
- `ArtistSearchResult` - Full MusicBrainz artist fields (name, sortName, disambiguation, type, country, area, beginDate, endDate, ended, gender, mbScore)
- `ArtistTopRelease` - Release info for disambiguation (title, year, type)
- `ArtistCorrectionSearchOptions` - Query, limit, offset
- `ArtistCorrectionSearchResponse` - Results array with pagination info

**Search Service (`src/lib/correction/artist/search-service.ts`):**
- `ArtistCorrectionSearchService` class with `search()` method
- Uses `PRIORITY_TIERS.ADMIN` for responsive admin UI
- Fetches top 3 release groups per artist via `browseReleaseGroupsByArtist`
- Graceful error handling (returns artist without releases on failure)
- HMR-safe singleton pattern via `getArtistCorrectionSearchService()`

## Decisions Made

- **artistType as string:** MusicBrainz artist types stored as VARCHAR, not enum, for flexibility when new types are added
- **Partial dates preserved:** Dates like "1965" or "1965-03" stored as-is without parsing to Date objects
- **Top releases for disambiguation:** Each search result includes up to 3 top releases to help admins identify the correct artist among common names

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- TypeScript compiles without errors
- `ArtistSearchResult` type exports all MusicBrainz artist fields
- Search service uses `PRIORITY_TIERS.ADMIN` (verified via grep)
- `getQueuedMusicBrainzService` import verified

## Commit Log

- `8cfe4f0` - feat(11-01): create artist correction types
- `ed043cb` - feat(11-01): create artist correction search service

## Next Phase Readiness

**Ready for 11-02 (Preview Service):**
- Types are exported and ready for import
- Search result structure matches what preview will consume
- No blockers identified
