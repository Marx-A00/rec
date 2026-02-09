# Phase 22: Discogs Album Search - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin can search Discogs for albums and see results in the same format as MusicBrainz. This enables selecting a Discogs album for correction. Applying the correction is Phase 23.

</domain>

<decisions>
## Implementation Decisions

### Search behavior
- Two separate input fields: album title (required) + artist name (optional)
- Artist field pre-fills with the current album's artist name (admin can edit)
- Result count matches MusicBrainz (same limit)
- Search targets **master releases only** — canonical versions, cleaner results without pressing duplicates

### Result mapping
- Merge Discogs genres + styles into Album.genres array (genres first, then styles)
- Year-only release dates use January 1st fallback (e.g., "1985" → "1985-01-01")
- Map label and catalogNumber fields from Discogs data

### Result display
- Same info as MusicBrainz cards: cover, title, artist, year, country
- Show Discogs cover art in result cards
- No version count indicator (using master releases, versions don't matter)
- Subtle visual distinction from MusicBrainz cards (different accent color or border)

### Queue integration
- Add new `DISCOGS_SEARCH_ALBUM` job type to existing `discogs-processor.ts`
- Use `disconnect` library's `db.search()` for album search (already used for artist search)
- On API error/timeout: show error toast, let admin retry manually (no auto-retry)

### Claude's Discretion
- Exact border/accent color for Discogs result cards
- Search input layout (side-by-side vs stacked)
- Loading state presentation

</decisions>

<specifics>
## Specific Ideas

- Existing `mapDiscogsMasterToAlbum()` mapper in `src/lib/discogs/mappers.ts` already handles master releases — reuse and extend as needed
- `disconnect` library already initialized in `src/lib/api/albums.ts` — follow same pattern for search

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 22-discogs-album-search*
*Context gathered: 2026-02-08*
