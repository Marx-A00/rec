# Phase 23: Discogs Album Apply - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin can preview Discogs album data side-by-side with current album data and apply selected corrections. This completes the Discogs album correction flow started in Phase 22.

</domain>

<decisions>
## Implementation Decisions

### Field mapping & display
- Claude decides which Discogs fields to map based on what's available (title, artist, year, genres, styles, cover art)
- Same diff UI as MusicBrainz — side-by-side with color highlighting
- Empty fields show as "empty → value" diff (highlight as addition)
- Side-by-side image comparison for cover art (current vs Discogs)

### Selection behavior
- Per-field checkboxes (same as MusicBrainz flow)
- All differing fields pre-checked by default
- Include "Select all" / "Deselect all" toggle buttons
- Show all fields, mark matching ones as "no change"

### Apply flow & feedback
- No confirmation dialog — apply immediately on button click
- Same post-apply behavior as MusicBrainz (close modal, success toast, refresh data)
- Same error handling pattern as MusicBrainz

### External ID storage
- Store Discogs master ID in externalIds JSON field (same pattern as MusicBrainz)

### Claude's Discretion
- Exact field mapping from Discogs master to Album model
- Loading states and skeleton UI
- Error message wording
- Any additional metadata worth preserving

</decisions>

<specifics>
## Specific Ideas

- "Same as MusicBrainz" is the guiding principle — consistency across sources
- Reuse existing preview/apply components and services where possible
- Extend rather than duplicate

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-discogs-album-apply*
*Context gathered: 2026-02-09*
