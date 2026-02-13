# Phase 30: Existing Logging Categories - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Apply appropriate category values (ENRICHED, CORRECTED, CACHED, FAILED) to all existing LlamaLog logging operations. Make category a required parameter to ensure explicit categorization.

</domain>

<decisions>
## Implementation Decisions

### Category Boundaries
- Category reflects **outcome**, not intent
- ENRICHED = External data fetched AND applied to entity (automated)
- CORRECTED = Any admin-initiated fix, regardless of data source
- FAILED = Any operation that didn't succeed (even if intent was correction)
- CACHED = Reserved for future use (API response caching) — not actively used

### Failure Handling
- Log full error details: stack trace + error message in details field
- Include attempted params (e.g., MusicBrainz ID searched) for debugging
- Distinguish transient vs permanent failures via operation suffix:
  - `musicbrainz:get-release:timeout` (transient)
  - `musicbrainz:get-release:not-found` (permanent)

### Cache Operations
- Image uploads to Cloudflare = ENRICHED (adding cloudflareImageId field)
- CACHED category kept in enum for future use, but not applied in Phase 30

### Migration Strategy
- Direct update: Add category param to each logEnrichment() call
- Category is **required** parameter — TypeScript enforces explicit categorization
- Comprehensive audit: Update ALL existing logEnrichment() calls, not just requirement-scoped ones

### Claude's Discretion
- Exact error code naming conventions
- Order of updating files (processors first vs resolvers first)
- Whether to add helper constants for common category values

</decisions>

<specifics>
## Specific Ideas

- "Category reflects outcome, not intent" — this is the guiding principle
- Operation suffix pattern for failure types mirrors existing operation naming convention

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 30-existing-logging-categories*
*Context gathered: 2026-02-10*
