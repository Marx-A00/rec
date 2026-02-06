# Requirements: Job History Timeline UI

**Defined:** 2026-02-06
**Core Value:** Admins can see the full picture of what happened during enrichment — parent jobs and all their children in a linked timeline.

## v1.2 Requirements

Requirements for Job History Timeline UI milestone.

### Data Layer

- [ ] **DATA-01**: EnrichmentLog has `parentJobId` field (nullable VARCHAR)
- [ ] **DATA-02**: EnrichmentLog has index on `parentJobId` for efficient child lookups
- [ ] **DATA-03**: Existing logs without `parentJobId` treated as standalone (no migration needed)

### Job Linking

- [ ] **LINK-01**: `ENRICH_ALBUM` passes its `jobId` as `parentJobId` to child jobs
- [ ] **LINK-02**: `ENRICH_ARTIST` passes its `jobId` as `parentJobId` to child jobs
- [ ] **LINK-03**: `SPOTIFY_TRACK_FALLBACK` logs with parent's `jobId` as `parentJobId`
- [ ] **LINK-04**: `DISCOGS_SEARCH_ARTIST` logs to EnrichmentLog with `parentJobId`
- [ ] **LINK-05**: `DISCOGS_GET_ARTIST` logs to EnrichmentLog with `parentJobId`
- [ ] **LINK-06**: `CACHE_ARTIST_IMAGE` logs to EnrichmentLog with `parentJobId`
- [ ] **LINK-07**: `CACHE_ALBUM_COVER_ART` logs to EnrichmentLog with `parentJobId`

### GraphQL

- [ ] **GQL-01**: `EnrichmentLog` type includes `jobId` field
- [ ] **GQL-02**: `EnrichmentLog` type includes `parentJobId` field
- [ ] **GQL-03**: `enrichmentLogs` query supports `includeChildren` parameter
- [ ] **GQL-04**: Resolver assembles parent-child tree when `includeChildren=true`

### Timeline Component

- [ ] **UI-01**: Timeline component copied from shadcn-timeline (timeline.tsx, timeline-layout.tsx)
- [ ] **UI-02**: Timeline maps EnrichmentLog status to timeline status (completed/in-progress/pending)
- [ ] **UI-03**: Timeline shows operation-specific icons (album, artist, spotify, discogs, cache)

### EnrichmentLogTable

- [ ] **TBL-01**: Table fetches only parent logs (parentJobId = null) by default
- [ ] **TBL-02**: Rows with children show expand chevron
- [ ] **TBL-03**: Expanded row shows Timeline component with parent + children
- [ ] **TBL-04**: Child logs hidden from main table rows

### Job History Tab

- [ ] **JOB-01**: Job History tab shows linked job timelines
- [ ] **JOB-02**: Expand job row to see EnrichmentLog timeline for that job

## Future Requirements

Deferred to later milestones.

### Bulk Operations

- **BULK-01**: Bulk re-enrichment for albums matching criteria
- **BULK-02**: Progress tracking for bulk operations

### Filtering

- **FILT-01**: Filter enrichment logs by operation type
- **FILT-02**: Filter enrichment logs by status
- **FILT-03**: Filter enrichment logs by date range

## Out of Scope

| Feature | Reason |
|---------|--------|
| Recursive SQL (WITH RECURSIVE) | Overkill for shallow job chains (2-4 levels) |
| Real-time timeline updates | Polling on expand is sufficient |
| Timeline for non-admin users | Admin-only feature |
| Undo/revert from timeline | Separate feature |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 15 | Pending |
| DATA-02 | Phase 15 | Pending |
| DATA-03 | Phase 15 | Pending |
| LINK-01 | Phase 16 | Pending |
| LINK-02 | Phase 16 | Pending |
| LINK-03 | Phase 16 | Pending |
| LINK-04 | Phase 16 | Pending |
| LINK-05 | Phase 16 | Pending |
| LINK-06 | Phase 16 | Pending |
| LINK-07 | Phase 16 | Pending |
| GQL-01 | Phase 17 | Pending |
| GQL-02 | Phase 17 | Pending |
| GQL-03 | Phase 17 | Pending |
| GQL-04 | Phase 17 | Pending |
| UI-01 | Phase 18 | Pending |
| UI-02 | Phase 18 | Pending |
| UI-03 | Phase 18 | Pending |
| TBL-01 | Phase 19 | Pending |
| TBL-02 | Phase 19 | Pending |
| TBL-03 | Phase 19 | Pending |
| TBL-04 | Phase 19 | Pending |
| JOB-01 | Phase 20 | Pending |
| JOB-02 | Phase 20 | Pending |

**Coverage:**
- v1.2 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-06*
*Last updated: 2026-02-06 after initial definition*
