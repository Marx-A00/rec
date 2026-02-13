# Phase 4: Apply Service - Context

**Gathered:** 2026-01-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Apply corrections atomically to Album, AlbumArtist, and Track tables with full audit trail. Supports partial field selection where admin chooses which fields to update. Logs all changes with admin user ID and timestamp. Failed transactions roll back completely — no partial changes.

</domain>

<decisions>
## Implementation Decisions

### Transaction Scope

- **Full cascade**: Album + Artists + Tracks update in one atomic transaction
- **Full rollback** on any failure — all or nothing
- **Create new artists** if MB result includes artists not in database
- **Track merge strategy**: Match by position first, fall back to title similarity
- **Orphaned tracks deleted**: If track exists in DB but not in MB result, remove it
- **Artist association only**: Don't update artist records themselves, just link/unlink to album
- **Optimistic locking**: Validate album's `updatedAt` matches preview; fail if stale
- **First wins**: Concurrent corrections fail for second admin, must refresh and retry

### Field Selection Granularity

- **Hybrid approach**: Logical groups that expand to individual fields
- **Five groups**: Metadata | Artists | Tracks | External IDs | Cover Art
- **All selected by default**: Admin unchecks what to skip
- **Show all fields equally**: Unchanged fields visible, not hidden or disabled
- **Individual override**: Group checkbox is convenience, individual fields can be toggled
- **Per-track selection**: Each track has its own checkbox within Tracks group
- **Per-artist selection**: Each artist has its own checkbox within Artists group
- **Track selection updates all fields**: Title, duration, position — everything
- **External IDs based on data**: Include whatever MB returns (MBID, Spotify, Discogs if present)
- **Cover art source choice**: Use MB cover, keep current, or clear

### Audit Log Structure

- **Changed fields only**: Log deltas with old/new values, not full snapshots
- **Use enrichment_logs table**: Reuse existing infrastructure
- **Standard metadata**: Admin user ID, timestamp, album ID, changes, source ("musicbrainz"), source ID (MBID)
- **Log type**: "admin_correction" to distinguish from other enrichment_logs entries
- **Only actual changes logged**: Unchanged fields not recorded even if selected
- **Full detail for tracks/artists**: Each individual change logged, not just summaries
- **Grouped JSON structure**: `{ metadata: [...], tracks: [...], artists: [...], externalIds: [...], coverArt: [...] }`
- **No IP/session logging**: User ID and timestamp sufficient

### Post-Correction Behavior

- **No re-enrichment trigger**: Not relevant since correction already has fresh MB data
- **Recalculate data quality score**: Update automatically after correction
- **Update timestamps**: `updatedAt` on affected records
- **No rate limiting**: Admins are trusted, can correct as needed

### Claude's Discretion

- Return type on success (summary, updated album, or hybrid)
- Error response structure (code + message + context)
- Auth check location (service vs resolver layer)
- Log structure capable of future undo, but don't build undo feature now

</decisions>

<specifics>
## Specific Ideas

- "Defer to MusicBrainz" — MB is source of truth, admin corrections align data to MB
- Track matching: position-first matching makes sense for most albums; title fallback handles reordered tracklists
- Manual edits for edge cases — if admin wants something different from MB, Phase 10 handles that

</specifics>

<deferred>
## Deferred Ideas

- **Undo capability** — Log structure supports it, but feature not needed for v1
- **Artist record updates** — Updating artist metadata belongs in Phase 11 (Artist Correction)
- **Re-enrichment trigger** — Relevant for Phase 10 (Manual Edit) when MBID is fixed without full data fetch

</deferred>

---

_Phase: 04-apply-service_
_Context gathered: 2026-01-24_
