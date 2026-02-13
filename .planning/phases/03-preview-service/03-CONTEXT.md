# Phase 3: Preview Service - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Generate field-by-field diffs between current album data and a selected MusicBrainz search result. The preview service produces structured comparison data that the UI (Phase 8) will render. This phase builds on the search service (Phase 2) — admin selects a result, preview generates the diff.

</domain>

<decisions>
## Implementation Decisions

### Diff Granularity

- Character-level highlighting for text differences (e.g., "The Dark Side of The Moon" vs "The Dark Side of the Moon" — highlight the "T" vs "t")
- Date component highlighting — show which part changed (year/month/day)
- Array diffs show added/removed/changed items individually (e.g., `+art rock`, `~progressive→progressive rock`)
- Empty/null values shown explicitly: `(empty) → "value"` — clear that data was missing

### Track Matching

- Position-based alignment — Track 1 vs Track 1, Track 2 vs Track 2, etc.
- Extra tracks in MusicBrainz shown as additions at the end
- Extra tracks in current album shown as removals (red/strikethrough)
- Normalize before comparing — ignore case/whitespace, only flag meaningful title differences
- Show any duration difference (even 1 second) — admin decides what matters

### Field Coverage

- Claude decides which fields based on what MusicBrainz provides
- Cover art: side-by-side thumbnails (current vs Cover Art Archive)
- Artist info: full details including names, MBIDs, disambiguation, country
- Show ALL fields in preview — unchanged fields marked as "match" or grayed out

### Change Classification

- Five states: Added, Modified, Removed, Conflict, Unchanged
- Conflict = both sources have different non-null values
- No preference suggested for conflicts — admin sees both, decides themselves
- Equal visual weight for all change types, only unchanged is dimmed
- Track changes: summarized view ("8 match, 2 modified, 2 added") with expand option

### Claude's Discretion

- Exact diff algorithm implementation (character-level library choice)
- Field list based on MusicBrainz response structure
- How to handle edge cases in normalization (accents, special characters)
- Data structure for the diff output

</decisions>

<specifics>
## Specific Ideas

- Existing `EnrichmentFieldDiff` pattern in `src/lib/enrichment/preview-enrichment.ts` can be extended
- Preview is for admin correction flow, not automatic enrichment — admin explicitly selected the MB result
- Must produce enough data for UI to render without additional API calls (per success criteria)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 03-preview-service_
_Context gathered: 2026-01-23_
