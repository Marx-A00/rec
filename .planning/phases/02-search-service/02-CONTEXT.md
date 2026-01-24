# Phase 2: Search Service - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

MusicBrainz search service with fuzzy matching and result scoring. Admins can search programmatically, results are ranked with confidence scores. This is service-layer only — UI is Phase 7.

</domain>

<decisions>
## Implementation Decisions

### Search Parameters

- Pre-fill from current album data (title + artist), but wait for explicit admin action to search
- Structured fields: separate inputs for album title and artist name
- Either field sufficient — can search by title alone or artist alone
- Optional release year filter (no release type filtering)
- Trim whitespace, require at least one non-empty field
- Prefer exact artist name matches (boost score), but still show other variants

### Result Scoring

- Pluggable scoring strategy — switchable between approaches for dev testing:
  - 0-1 normalized (string-similarity.ts pattern)
  - Confidence tiers: high/medium/low/none (fuzzy-match.ts pattern)
  - 0-100 weighted with multiple signals (artist-matching.ts pattern)
- Dev-only UI dropdown to select scoring strategy (removed in production)
- Show scoring breakdown (component scores) alongside final score
- Equal weights across all signals (title match, artist match, year match)

### Result Limits

- Default 10 results per search
- Return all results but flag low-confidence ones for UI treatment (grayed out)
- Configurable threshold for low-confidence flagging
- Configurable sorting strategy (our score vs MB score vs hybrid) — dev dropdown
- "Load more" pagination: fetches another 10 results
- No cap on total results

### Data Normalization

- Prioritize albums in sort order, then other release types
- Clearly label each result with its release type (Album, EP, Single, Compilation, etc.)
- Group by release group — one entry per album, expandable to see individual versions
- Normalize artist names for matching (use existing string-similarity.ts), display MusicBrainz canonical name
- Extract primary artist from credits, store featured/collaborating artists separately
- Include disambiguation in title when showing individual versions (e.g., "Abbey Road (2019 remaster)")
- Return nulls for missing data, UI indicates incomplete data visually
- Include CAA URL only — UI handles loading/fallback for cover art
- Include all MBIDs in results: release group, release, artist(s)

### Claude's Discretion

- Exact implementation of pluggable scoring strategy pattern
- Specific thresholds for low-confidence flagging defaults
- How to structure the scoring breakdown display
- Release group expansion UX details

</decisions>

<specifics>
## Specific Ideas

- Leverage existing scoring implementations: `string-similarity.ts` (0-1), `fuzzy-match.ts` (tiers), `artist-matching.ts` (0-100 weighted)
- Dev testing UI to compare scoring strategies side-by-side
- "The admin can deal with it" philosophy for edge cases like missing cover art

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 02-search-service_
_Context gathered: 2026-01-23_
