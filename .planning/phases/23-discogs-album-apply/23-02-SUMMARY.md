---
phase: 23-discogs-album-apply
plan: 02
subsystem: correction-services
tags:
  - preview-service
  - apply-service
  - discogs
  - source-agnostic
dependencies:
  requires:
    - "23-01 (QueuedDiscogsService.getMaster)"
    - "22-01 (QueuedDiscogsService pattern)"
  provides:
    - "CorrectionSource type for source parameter typing"
    - "Source-agnostic preview generation (MusicBrainz or Discogs)"
    - "Source-aware field diff generation"
    - "Source-conditional external ID storage"
    - "Source-aware enrichment log recording"
  affects:
    - "23-03 (frontend integration - will pass source to generatePreview)"
tech-stack:
  added: []
  patterns:
    - "Source routing via CorrectionSource parameter"
    - "Discogs master to MBReleaseData transformation"
    - "Source-conditional field selection"
key-files:
  created: []
  modified:
    - src/lib/correction/preview/types.ts
    - src/lib/correction/preview/preview-service.ts
    - src/lib/correction/apply/apply-service.ts
    - src/lib/correction/apply/field-selector.ts
decisions:
  - key: "discogs-tracklist-parsing"
    choice: "Parse Discogs position strings (A1, B2, 1, 2) into disc/track numbers"
    rationale: "Discogs uses various position formats (vinyl sides, disc numbers); parsing handles all cases"
  - key: "source-conditional-fields"
    choice: "Only include country/barcode diffs for MusicBrainz source"
    rationale: "Discogs masters don't have country or barcode fields"
  - key: "year-to-date"
    choice: "Convert Discogs year-only to YYYY-01-01 date format"
    rationale: "Unified date handling with MusicBrainz; Jan 1 fallback per CONTEXT.md"
metrics:
  duration: "~9 minutes"
  completed: "2026-02-09"
---

# Phase 23 Plan 02: Preview Generation Service Summary

**One-liner:** Extended preview and apply services to support Discogs as a correction source with source-aware field diffs and external ID storage.

## What Was Built

1. **CorrectionSource Type** (`src/lib/correction/preview/types.ts`)
   - Added `CorrectionSource = 'musicbrainz' | 'discogs'` type
   - Enables type-safe source parameter across the codebase

2. **Discogs Preview Generation** (`src/lib/correction/preview/preview-service.ts`)
   - Updated `generatePreview()` to accept optional `source` parameter
   - Added `fetchDiscogsReleaseData()` using `QueuedDiscogsService.getMaster()`
   - Added `transformDiscogsMaster()` to convert Discogs data to MBReleaseData format
   - Added tracklist parsing helpers:
     - `mapDiscogsTracklist()` - groups tracks by disc
     - `parseDiscNumber()` - extracts disc from position (A=1, B=2, etc.)
     - `parseTrackNumber()` - extracts track number
     - `parseDuration()` - converts MM:SS to milliseconds
   - Made `generateFieldDiffs()` source-aware:
     - Country/barcode only included for MusicBrainz
     - Correct external ID (musicbrainzId vs discogsId) based on source

3. **Source-Aware Field Selector** (`src/lib/correction/apply/field-selector.ts`)
   - Updated `buildAlbumUpdateData()` to check `preview.sourceResult.source`
   - Stores `musicbrainzId` for MB source, `discogsId` for Discogs source

4. **Source-Aware Apply Service** (`src/lib/correction/apply/apply-service.ts`)
   - Added `preview` parameter to `logCorrection()` and `buildAppliedChanges()`
   - Updated enrichment log to record actual source (`sources: [source]`)
   - Updated `buildAuditPayload()` for source-conditional external ID deltas
   - Updated `buildAppliedChanges()` for source-conditional external ID tracking

## Key Implementation Details

**Discogs Tracklist Parsing:**
```typescript
// Handles various Discogs position formats:
// "1", "2", "3" -> disc 1, tracks 1-3
// "A1", "A2", "B1" -> disc 1 (A), disc 2 (B)
// "1-1", "1-2", "2-1" -> multi-disc albums
```

**Source Routing:**
```typescript
// In generatePreview():
if (source === 'discogs') {
  mbReleaseData = await this.fetchDiscogsReleaseData(releaseMbid);
} else {
  mbReleaseData = await this.fetchMBReleaseData(releaseMbid);
}
```

**Conditional External ID:**
```typescript
// In buildAlbumUpdateData():
if (source === 'musicbrainz' && selections.externalIds.musicbrainzId) {
  data.musicbrainzId = preview.sourceResult.releaseGroupMbid;
} else if (source === 'discogs' && selections.externalIds.discogsId) {
  data.discogsId = preview.sourceResult.releaseGroupMbid;
}
```

## Verification Results

- [x] pnpm type-check passes
- [x] generatePreview accepts source parameter
- [x] fetchDiscogsReleaseData method exists
- [x] Field diffs are source-conditional (country/barcode only for MB)
- [x] buildAlbumUpdateData stores discogsId when source is discogs
- [x] Enrichment log uses correct source value

## Commits

- `1c4e951`: feat(23-02): add CorrectionSource type and Discogs preview support
- `6729620`: feat(23-02): make apply service and field-selector source-aware

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for 23-03:** Frontend integration can now:
1. Pass `source` to `generatePreview()` based on selected correction source
2. Rely on correct external ID being stored based on source
3. Expect enrichment logs to record the actual data source
