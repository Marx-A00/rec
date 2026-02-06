# Phase 16: Job Linking - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Propagate `parentJobId` through all job chains so EnrichmentLog entries form a queryable tree. Add logging to processors that don't currently create EnrichmentLog entries (cache, discogs). This enables the timeline UI in later phases.

</domain>

<decisions>
## Implementation Decisions

### Logging gaps
- All processors that don't currently log (cache, discogs) must create EnrichmentLog entries
- Log both success AND failure — every operation creates an entry
- Match existing EnrichmentLog detail level, plus any additional fields useful for timeline
- CACHE operations: capture full image info — before/after URLs, cache location, size, format, cloudflare ID, source URL
- DISCOGS operations: capture full response — Discogs ID, confidence score, matched name, profile, images found, genres

### Parent ID flow
- Use native BullMQ `job.id` as `parentJobId` value
- Pass `parentJobId` in job data payload when spawning child jobs
- **Flat structure**: all children point directly to the root job (not immediate parent)
  - Simplifies queries: `WHERE parentJobId = rootJobId` gets all related jobs
  - No recursive tree traversal needed
  - Timeline shows: root first, then all children sorted by timestamp

### Root jobs
- Add `isRootJob: Boolean` field to EnrichmentLog schema (default false)
- Any job without a parent (manually triggered, top of chain) sets `isRootJob: true`
- Table query: `WHERE isRootJob = true` shows top-level entries
- Expand to see children via `WHERE parentJobId = rootJobId`
- This cleanly distinguishes roots from orphaned legacy logs (pre-feature)

### Error scenarios
- Each log entry is independent — parent status not updated when child fails
- Timeline UI shows individual statuses; no need to cascade
- If parent log deleted, children keep their `parentJobId` reference (soft orphan)
- No cascade updates needed

### Claude's Discretion
- Which specific job type definitions need `parentJobId` added (based on actual job chains)
- Exact field names in job data payloads
- How to handle edge cases with existing logs during migration

</decisions>

<specifics>
## Specific Ideas

- "In the UI we can just show every enrichment log that isRootJob" — table shows only roots, expand for children
- Flat parent structure chosen for query simplicity over hierarchical tree

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-job-linking*
*Context gathered: 2026-02-06*
