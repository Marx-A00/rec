# Phase 28: Album Creation Tracking - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Log album creation from all entry points with category: CREATED. Every way an album enters the database gets recorded in LlamaLog with full context. This phase is about logging infrastructure — not changing how albums are created.

</domain>

<decisions>
## Implementation Decisions

### Entry Points (3 code paths)
- `addAlbum` mutation — covers recommendations, admin adds, and search→add flows (CREATE-01, CREATE-05, CREATE-06, CREATE-07)
- Spotify sync (`src/lib/spotify/mappers.ts`) — automated sync creates albums (CREATE-03)
- MusicBrainz processor (`src/lib/queue/processors/musicbrainz-processor.ts`) — automated sync creates albums (CREATE-04)

**Clarification:** `addAlbumToCollection` does NOT create albums. It takes an existing albumId and creates a collectionAlbum link record. See mutations.ts lines 1257-1270 — it uses `tx.collectionAlbum.create()` with `albumId: input.albumId`. Therefore CREATE-02 is not applicable — that mutation is a linking operation, not a creation operation.

Note: Corrections only update existing albums — no creation logging needed there.

### Operation Naming
- Use source-specific operation names for clear provenance:
  - `album:created:recommendation`
  - `album:created:admin`
  - `album:created:spotify-sync`
  - `album:created:musicbrainz-sync`

### Logging Context
- User-triggered creations: `userId` is sufficient (no need for recommendation/collection IDs)
- Sync operations: Include sync batch identifier or timestamp in `details` field
- All creations: Use existing LlamaLog fields (`jobId`, `parentJobId`, etc.)

### Failure Handling
- Log all creation failures with category: FAILED for debugging/audit
- Failed creations: `entityId` is null (album doesn't exist yet)
- Use existing `errorMessage` and `errorCode` fields for error info
- Store attempted album data (title, artist, external IDs) in `metadata` field

### Timing & Atomicity
- Log AFTER database commit — only log confirmed creations
- If log write fails: retry once, then continue (album creation is priority)
- Batch syncs: one log entry per album (granular tracking)
- Sync job hierarchy: sync job as parent (`parentJobId`), each album creation as child

### Claude's Discretion
- Exact retry implementation for failed log writes
- How to generate/pass batch identifiers for sync operations
- Error code taxonomy for creation failures

</decisions>

<specifics>
## Specific Ideas

- Operations follow existing pattern: `entity:action:source` (e.g., `album:created:spotify-sync`)
- Sync jobs should have clear parent-child hierarchy in LlamaLog for provenance queries
- Failed creation logs help debug why albums didn't make it into the database

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 28-album-creation-tracking*
*Context gathered: 2026-02-10*
