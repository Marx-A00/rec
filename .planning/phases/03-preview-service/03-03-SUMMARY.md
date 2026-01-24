---
phase: 03
plan: 03
subsystem: correction-preview
tags: [preview, service, orchestration, musicbrainz, queue]
completed: 2026-01-23
duration: 8min

# Dependencies
requires:
  - 03-01 # TextNormalizer and preview types
  - 03-02 # DiffEngine for field comparisons
provides:
  - CorrectionPreviewService for complete preview generation
  - Single method generatePreview(albumId, searchResult, releaseMbid)
  - Full MusicBrainz release data fetching via queue
  - All diffs, track comparisons, and summary statistics
affects:
  - 03-04 # Admin UI will consume preview service

# Tech Stack
tech-stack:
  added: []
  patterns:
    - Service orchestration pattern
    - Singleton for Next.js HMR safety
    - ADMIN priority tier for queue jobs
    - Prisma relation includes for data fetching

# Key Files
key-files:
  created:
    - src/lib/correction/preview/preview-service.ts
  modified:
    - src/lib/correction/preview/index.ts
    - src/lib/correction/index.ts

# Decisions
decisions:
  - id: three-parameter-design
    choice: generatePreview(albumId, searchResult, releaseMbid)
    context: Search result has releaseGroupMbid, but preview needs specific release MBID
    reasoning: Release group can have multiple releases (deluxe, remaster). User selects specific release for track data.
  - id: admin-priority
    choice: ADMIN priority tier for MusicBrainz API calls
    context: Preview generation is admin-initiated action
    reasoning: Admin corrections should be processed immediately, not queued behind background enrichment
  - id: artist-handling
    choice: Separate artist diff from album transformation
    context: Album has relational artists via AlbumArtist table
    reasoning: DiffEngine needs CorrectionArtistCredit format, keep album transformation clean
---

# Phase 3 Plan 3: CorrectionPreviewService Summary

**One-liner:** Orchestrates complete preview generation by fetching DB album + MusicBrainz release data and delegating to DiffEngine for comparisons

## What Was Built

Implemented the CorrectionPreviewService that provides a single `generatePreview()` method to produce everything the UI needs for side-by-side album correction comparison.

**Core flow:**

1. **Fetch current album** from database with tracks and artists (Prisma include)
2. **Fetch MusicBrainz release** data via queue service with ADMIN priority
3. **Generate field diffs** for title, date, country, barcode, musicbrainzId
4. **Generate artist credit diff** using DiffEngine
5. **Generate track listing diffs** with position-based alignment
6. **Generate cover art comparison** with Cover Art Archive URLs
7. **Compute summary statistics** for all changes

**Key service methods:**

- `generatePreview(albumId, searchResult, releaseMbid): Promise<CorrectionPreview>`
  - Main entry point for preview generation
  - Returns complete preview with all diffs ready for UI rendering
- `fetchCurrentAlbum(albumId)` - Prisma query with tracks and artists
- `fetchMBReleaseData(releaseMbid)` - Queue service call with ADMIN priority
- `transformMBRelease(mbData)` - Convert API response to MBReleaseData type
- `generateFieldDiffs()` - Compare scalar fields
- `generateCoverArtDiff()` - Cover Art Archive URL comparison
- `generateSummary()` - Aggregate statistics

**Data transformations:**

- MusicBrainz API response → MBReleaseData type
- Database AlbumArtist relations → CorrectionArtistCredit[]
- API track format → MBRecording with nested structure
- Change counts → Summary statistics with hasTrackChanges flag

**Files created:**
- `src/lib/correction/preview/preview-service.ts` - CorrectionPreviewService (405 lines)

**Files modified:**
- `src/lib/correction/preview/index.ts` - Added service exports
- `src/lib/correction/index.ts` - Re-exported preview service and types

## Technical Decisions

**1. Three-parameter design (albumId, searchResult, releaseMbid)**

Why: Search results contain `releaseGroupMbid` which groups multiple releases (original, deluxe, remaster). But preview needs a specific release MBID to fetch track data. The UI will let users select which release version to compare against.

**2. ADMIN priority tier for MusicBrainz calls**

Why: Preview generation is triggered by admin action and should be processed immediately. Using PRIORITY_TIERS.ADMIN (value: 1) ensures the job jumps to the front of the queue ahead of background enrichment jobs.

**3. Separate artist diff handling**

Why: The Album model uses relational AlbumArtist table, not embedded artistCredit. Rather than pollute the album transformation, we convert artists separately and pass to DiffEngine as CorrectionArtistCredit format.

**4. MBReleaseAPIResponse type for MusicBrainz data**

Why: Avoids `any` type for API response. Documents the exact structure we expect from MusicBrainz `/release/{mbid}` endpoint with `artist-credits`, `media`, and `recordings` includes.

## Code Quality

- All methods fully typed with no `any` usage (created MBReleaseAPIResponse interface)
- ESLint passes with all auto-fixes applied
- TypeScript compilation passes
- Singleton pattern for Next.js HMR safety
- Clear separation of concerns (fetch, transform, diff, summarize)

## Deviations from Plan

None - plan executed exactly as written.

## Integration Points

**Consumes:**
- `@/lib/prisma` - Database access for current album
- `@/lib/musicbrainz/queue-service` - getQueuedMusicBrainzService for API calls
- `@/lib/queue` - PRIORITY_TIERS.ADMIN constant
- `DiffEngine` from `./diff-engine` - All comparison logic
- Types from `./types` and `../types`

**Provides:**
- `getCorrectionPreviewService(): CorrectionPreviewService` - Singleton getter
- `CorrectionPreviewService` class
- Re-exported from correction module barrel for easy import

**API surface:**

```typescript
const previewService = getCorrectionPreviewService();
const preview = await previewService.generatePreview(
  albumId,           // Internal DB ID
  searchResult,      // Selected search result (has releaseGroupMbid)
  releaseMbid        // Specific release MBID for track data
);

// preview contains:
// - currentAlbum (with tracks)
// - sourceResult (search result)
// - mbReleaseData (full MB release)
// - fieldDiffs[] (title, date, country, barcode, mbid)
// - artistDiff (name comparison)
// - trackDiffs[] (position-based alignment)
// - trackSummary (matching/modified/added/removed counts)
// - coverArt (current/source URLs + changeType)
// - summary (aggregate statistics)
```

**Next phase (03-04):**
Admin UI will call `getCorrectionPreviewService().generatePreview()` and render the CorrectionPreview in a side-by-side comparison view.

## Test Coverage

No automated tests created in this plan. Testing will be done via integration in 03-04 (Admin UI) and manual verification.

## Next Phase Readiness

**Ready for 03-04:** ✅
- Preview service fully implemented and typed
- All dependencies resolved (DiffEngine, types, queue service)
- Clean barrel exports for easy import
- ADMIN priority ensures immediate processing

**Blockers:** None

**Recommendations for 03-04:**
1. Handle MusicBrainz API errors gracefully in UI (preview.mbReleaseData can be null)
2. Consider caching previews to avoid re-fetching on navigation
3. Add loading states for queue job processing
4. Test with multi-disc albums to verify track alignment
5. Test with albums that have no MusicBrainz ID (new album linking scenario)
