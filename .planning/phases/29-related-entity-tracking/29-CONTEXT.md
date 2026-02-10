# Phase 29: Related Entity Tracking - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Log artist and track creation/linking as children of album creation jobs, establishing parent-child job relationships for complete entity provenance. This phase adds the `rootJobId` field and `LINKED` category to track both new entity creation and associations with existing entities.

</domain>

<decisions>
## Implementation Decisions

### Job hierarchy model
- Store both `parentJobId` (immediate parent) AND `rootJobId` (original album job)
- Enables quick queries via `rootJobId` while preserving full chain via `parentJobId`
- No depth limit on job chains — trust the code, revisit if chains exceed 5 levels in practice
- `rootJobId` field is optional (nullable) to accommodate legacy data

### Schema migration (included in Phase 29)
- Add `rootJobId` column to LlamaLog model (nullable varchar)
- Add `LINKED` to LlamaLogCategory enum
- Backfill strategy:
  - Root jobs (1,537): Set `rootJobId = jobId`
  - Logs with parent (30): Walk chain to find root, populate `rootJobId`
  - Orphan logs (2,485): Leave `rootJobId = NULL` — honest about missing data
  - Explicitly set `parentJobId = NULL` for root jobs for consistency

### Artist/track creation logging
- Log on DB persist only — one log per actual entity creation
- Log LINKED (new category) when associating with existing entities
- LINKED applies to both artists and tracks
- LINKED logs use full detail — same fields as CREATED for consistency
- LINKED logs point to the linked entity (entityType: ARTIST/TRACK, entityId: existing ID)
- Parent job relationship provides connection back to source album

### Granularity
- One log per artist — multiple artists = multiple logs
- One log per track — 15-track album = 15 separate logs
- Consistent granular approach for complete provenance
- **Rationale:** Tracks will be recommendable entities; their provenance matters
- **Trade-off:** ~5x more logs per album (~9 logs vs ~2). Projected ~150 MB at 10k albums — acceptable for Postgres
- **Revisit trigger:** If log table exceeds 500 MB or queries slow down, consider switching to summary logging (counts in metadata instead of per-entity logs). Change would be localized to LlamaLogger class.

### Edge case handling
- Album with no artist: Log placeholder with `artistId: NULL`
- Creation failure: Each entity gets its own FAILED log (granular failure tracking)
- Existing entity: Log as LINKED, not CREATED

### Admin UI
- Show "Origin unknown" indicator when `rootJobId` is NULL

### Claude's Discretion
- Exact migration SQL implementation
- Order of operations in backfill
- Console log formatting for new LINKED category

</decisions>

<specifics>
## Specific Ideas

- "Best of both worlds" approach for hierarchy: `parentJobId` for full chain, `rootJobId` for quick queries
- Honest data strategy: NULL means "we don't know" rather than guessing

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 29-related-entity-tracking*
*Context gathered: 2026-02-10*
