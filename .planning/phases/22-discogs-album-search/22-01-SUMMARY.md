---
phase: 22-discogs-album-search
plan: 01
subsystem: correction-search
tags: [discogs, queue, bullmq, correction, album-search]
dependency-graph:
  requires: [21-source-selection-ui]
  provides: [discogs-album-search-job, queued-discogs-service]
  affects: [22-02, 22-03]
tech-stack:
  added: []
  patterns: [queue-job-handler, mapper-function, singleton-service]
key-files:
  created:
    - src/lib/discogs/queued-service.ts
  modified:
    - src/lib/queue/jobs.ts
    - src/lib/queue/processors/discogs-processor.ts
    - src/lib/correction/types.ts
    - src/lib/discogs/mappers.ts
decisions: []
metrics:
  duration: "5 min"
  completed: "2026-02-09"
---

# Phase 22 Plan 01: Discogs Album Search Infrastructure Summary

**One-liner:** Added DISCOGS_SEARCH_ALBUM queue job type, handler, shared mapper, and QueuedDiscogsService for admin correction modal.

## Completed Tasks

**Task 1 & 2: Add job type, handler, and mapper**
- Added DISCOGS_SEARCH_ALBUM to JOB_TYPES constant
- Created DiscogsSearchAlbumJobData interface with albumId, albumTitle, artistName, limit fields
- Implemented handleDiscogsSearchAlbum handler that:
  - Searches Discogs for masters by title/artist
  - Fetches full master details for each result
  - Calls shared mapper to convert to CorrectionSearchResult format
- Added mapMasterToCorrectionSearchResult to mappers.ts
- Updated CorrectionSearchResult.source to union type 'musicbrainz' | 'discogs'
- Commit: f132feb

**Task 3: Create QueuedDiscogsService**
- Created new queued-service.ts following QueuedMusicBrainzService pattern
- Implemented searchAlbums method using DISCOGS_SEARCH_ALBUM job type
- Uses PRIORITY_TIERS.ADMIN for highest priority (admin corrections)
- HMR-safe singleton via globalThis
- Exports getQueuedDiscogsService for resolver use
- Commit: c4dfc65

## Key Implementation Details

**Job Type Definition:**
```typescript
DISCOGS_SEARCH_ALBUM: 'discogs:search-album',
```

**Handler Flow:**
1. Initialize Discogs client
2. Search for masters with title/artist filters
3. Fetch full master details for each result
4. Map to CorrectionSearchResult using shared mapper
5. Return results array

**Mapper Function:**
- Maps DiscogsMaster to CorrectionSearchResult
- Combines genres + styles
- Uses first image as coverArtUrl
- Sets source: 'discogs'
- mbScore always 100 (Discogs has no relevance score)

**Service Pattern:**
- Lazy initialization of QueueEvents
- Uses waitForJobViaEvents for async job completion
- 30 second timeout per search
- Graceful shutdown support

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- pnpm type-check: PASS
- pnpm lint: PASS (only pre-existing warnings)
- JOB_TYPES.DISCOGS_SEARCH_ALBUM: DEFINED
- handleDiscogsSearchAlbum: EXISTS
- mapMasterToCorrectionSearchResult: EXPORTED
- QueuedDiscogsService: EXPORTED
- CorrectionSearchResult.source accepts 'discogs': YES

## Next Phase Readiness

Plan 22-02 can proceed. GraphQL resolver can now use QueuedDiscogsService.searchAlbums() to search Discogs for albums.
