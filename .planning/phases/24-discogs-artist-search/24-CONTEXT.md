# Phase 24: Discogs Artist Search - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin can search Discogs for artists and see results in the same format as MusicBrainz. This extends the existing DISCOGS_SEARCH_ARTIST queue job to the correction UI. Preview and apply functionality is a separate phase (Phase 25).

</domain>

<decisions>
## Implementation Decisions

### Follow Album Search Pattern
- All implementation follows the pattern established in Phase 22 (Discogs Album Search)
- Reuse existing `DISCOGS_SEARCH_ARTIST` queue job type (already exists)
- Same source-aware routing in GraphQL resolvers
- Same frontend integration approach

### Result Card Styling
- Orange accent for Discogs artist cards (same as album cards)
- 'DG' badge to indicate Discogs source
- Consistent visual language with album search

### Artist Field Mapping
- Map Discogs artist fields to internal Artist model
- Follow existing mapper patterns in `src/lib/discogs/mappers.ts`
- Display: name, images, profile summary

### Search Result Ranking
- Use Discogs-provided search score
- Wrap results with `normalizedScore: 1.0` as established in album search pattern

### Claude's Discretion
- Exact mapper implementation details
- Error handling specifics
- Test coverage scope

</decisions>

<specifics>
## Specific Ideas

No specific requirements — implementation follows the established album search pattern from Phase 22.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 24-discogs-artist-search*
*Context gathered: 2026-02-09*
