# Phase 34: Album Pool - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Curated pool of game-eligible albums with admin management. Albums have a three-state game status (eligible, excluded, neutral). Admin can manage eligibility through a dedicated page and inline toggles on the album list. Only albums with cover art and full metadata qualify. Daily challenge selection (Phase 35) pulls only from this pool.

</domain>

<decisions>
## Implementation Decisions

### Eligibility criteria
- Hybrid model: auto-suggest based on popularity, admin has final say (approve/reject)
- Auto-suggest signal will use external popularity data (e.g., Spotify) — exact mechanism TBD and will evolve
- Hard requirements for eligibility: must have cloudflareImageId (cover art) AND full metadata (artist, year, etc.)
- Explicit blocklist: albums can be force-excluded even if they meet all criteria
- Three states: eligible, excluded, neutral (not just on/off)

### Admin management UX
- Dedicated "Game Pool" page + quick toggle on existing album list
- Game Pool page shows two sections: Eligible albums and Suggested albums (not yet reviewed)
- No bulk operations to start — one-by-one management is fine
- Album list shows three-state status indicator (eligible/excluded/neutral) with ability to change inline
- Pool count displayed on Game Pool page (no low-pool warnings)

### Pool size & seeding
- Target ~50 albums for initial pool (enough for a couple months of daily challenges)
- Seed script for initial batch, then refine through admin UI
- Seed mechanism flexible — could use Spotify popularity data or a manual list of album IDs
- Auto-suggest logic kept simple and swappable since this will evolve

### Data model
- Enum field on Album: `gameStatus: ELIGIBLE / EXCLUDED / NONE`
- Default value for all existing albums: NONE (neutral)
- LlamaLog audit trail for game status changes (who changed it and when)
- GraphQL query filterable by status (admin can query ELIGIBLE, EXCLUDED, or NONE)
- Note: roadmap said "gameEligible boolean" but enum replaces this for three-state support

### Claude's Discretion
- Exact auto-suggest algorithm implementation
- Admin UI component layout and styling details
- Seed script implementation approach
- GraphQL query pagination strategy for the pool

</decisions>

<specifics>
## Specific Ideas

- Auto-suggest is a work-in-progress concept — build it swappable so the signal source can change later
- External popularity (Spotify or similar) preferred over internal rec/collection stats for suggesting albums
- User wants freedom to have final say on every album in the pool

</specifics>

<deferred>
## Deferred Ideas

- Bulk approve/reject operations — revisit when pool management becomes tedious
- Low-pool warnings/alerts — revisit if running low becomes a real problem
- Sophisticated popularity-based auto-curation — evolve as external data integrations mature

</deferred>

---

*Phase: 34-album-pool*
*Context gathered: 2026-02-15*
