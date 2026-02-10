# Phase 32: Query & Provenance - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

GraphQL query that returns the complete provenance chain for any entity (Album, Artist, Track). Answers: "How did this entity get into the database, and what happened to it afterward?" Returns the root creation event plus all related operations.

</domain>

<decisions>
## Implementation Decisions

### Chain Structure
- Flat list, not nested tree — consistent with existing EnrichmentLogTable pattern
- Full log details per entry (all fields: operation, status, metadata, timestamps, etc.)
- Reverse chronological order (newest first) — most recent activity on top
- Single entity lookup only — no batch support needed yet

### Filtering & Pagination
- Optional `categories` filter parameter — filter by CREATED, ENRICHED, CORRECTED, etc.
- Optional `startDate`/`endDate` parameters — filter by date range
- Cursor-based pagination with `limit` and `cursor` params
- Default limit: 20 logs per page

### Error/Edge Cases
- Empty array for entities with no logs (not an error)
- Include orphan records (NULL rootJobId) — they're valid pre-tracking history
- Validate entity exists — throw GraphQL error "Entity not found" if entityId doesn't exist
- Error thrown for non-existent entities (not null return)

### Query Interface
- Query name: `llamaLogChain`
- EntityType as enum: `EntityType` (ALBUM, ARTIST, TRACK)
- Response includes: `{ logs: [...], totalCount: N, cursor: ... }`
- Include basic entity info (name, id) inline with each log

### Claude's Discretion
- Exact Prisma query optimization (include/select)
- Whether to add database index for `(entityType, entityId, createdAt)`
- GraphQL type naming for response wrapper

</decisions>

<specifics>
## Specific Ideas

- Keep consistent with existing LlamaLog query patterns in the codebase
- UI can build tree view from flat list using parentJobId/rootJobId if needed
- React Query can cache per (entityType, entityId) naturally
- totalCount enables pagination UI ("Showing 1-20 of 47")

</specifics>

<deferred>
## Deferred Ideas

- Batch provenance lookup (`llamaLogChains`) — add if needed later

</deferred>

---

*Phase: 32-query-provenance*
*Context gathered: 2026-02-10*
