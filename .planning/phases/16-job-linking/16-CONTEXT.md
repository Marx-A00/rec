# Phase 16: Job Linking - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Propagate `parentJobId` through all job chains so EnrichmentLog entries form a queryable tree. Add logging to processors that don't currently create EnrichmentLog entries (cache, discogs). This enables the timeline UI in later phases.

</domain>

<decisions>
## Implementation Decisions

### Log detail level
- **Rich detail for all processors** — capture everything useful for timeline and debugging
- CACHE operations: source URL, Cloudflare ID, file size, format, dimensions, cache location, before/after URLs
- DISCOGS operations: Discogs ID, confidence score, matched name, profile, images found, genres
- **Per-processor detail shape** — each processor type logs fields specific to its domain, not a shared envelope
- **Capture duration** — log start time and duration (ms) for every operation to spot slow API calls

### Job chain structure
- **Truly flat** — every child points to the root job regardless of chain depth (ENRICH_ALBUM → ENRICH_ARTIST → CACHE_IMAGE all have same parentJobId)
- No recursive tree traversal needed; single `WHERE parentJobId = rootJobId` gets all children
- **Standalone jobs = root jobs** — any job without a parent gets `isRootJob: true` (manually triggered ENRICH_ARTIST, etc.)
- **SPOTIFY_TRACK_FALLBACK is a child** of ENRICH_ALBUM — it's part of the album enrichment chain
- **Timeline sort: chronological by start time** — shows actual execution sequence

### Root jobs
- Add `isRootJob: Boolean` field to EnrichmentLog schema (default false)
- Jobs without a parent set `isRootJob: true`
- Table query: `WHERE isRootJob = true` shows top-level entries
- Expand to see children via `WHERE parentJobId = rootJobId`
- Cleanly distinguishes roots from orphaned legacy logs

### Failure & retry behavior
- **Update existing entry on retry** — single log entry per job, updated on each retry (not one entry per attempt)
- **Track retry count and last error** — retryCount and lastError fields for debugging flaky operations
- **Root status reflects children** — if any child job fails permanently, root log gets a "partial" or "degraded" status
- No other cascading updates; timeline shows individual child statuses

### Legacy log handling
- **Show legacy logs as roots** — treat all existing logs (null parentJobId, null isRootJob) as root entries in the table
- **Backfill via migration** — data migration sets `isRootJob=true` on all existing logs for clean data
- **Separate migration** — first migration adds the isRootJob column, second migration backfills existing rows
- **Single entry timeline for legacy** — expanding a legacy row shows it as a single-item timeline (consistent UX, every row expandable)

### Claude's Discretion
- Log creation timing (on start vs on complete vs both) — pick based on existing logger patterns
- Which specific job type definitions need `parentJobId` added (based on actual job chains in code)
- Exact field names in job data payloads
- How to handle edge cases during migration

</decisions>

<specifics>
## Specific Ideas

- "In the UI we can just show every enrichment log that isRootJob" — table shows only roots, expand for children
- Flat parent structure chosen for query simplicity over hierarchical tree
- Root "partial" status provides at-a-glance signal that something in the chain went wrong

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 16-job-linking_
_Context gathered: 2026-02-06_
