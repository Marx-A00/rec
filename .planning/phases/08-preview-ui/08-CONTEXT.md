# Phase 8: Preview UI - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Display side-by-side comparison of current album data vs. MusicBrainz source data when admin selects a search result. Show field-level diff highlighting so admin can see exactly what will change before applying corrections.

</domain>

<decisions>
## Implementation Decisions

### Comparison Layout

- Side-by-side columns: Left = current data, Right = MusicBrainz source
- Follows existing 1100px modal width (plenty of room for two columns)
- Consistent with admin dashboard patterns

### Diff Highlighting

- Color-coded inline highlighting within field values
- Green for additions (new data from MB)
- Yellow/amber for modifications (value changed)
- Red for removals (data exists in current but not in source)
- Applied at the text level, not just row-level backgrounds

### Track Comparison

- Matched pairs display: current track alongside its matched MB track
- Highlight differences between matched tracks (title, duration, ISRC)
- Uses existing track matching logic from Phase 4 (position-first, similarity-fallback)

### Navigation Flow

- Preview replaces search step (step 2 in modal wizard)
- "Back" button returns to search with state preserved
- Fits existing modal step navigation pattern from Phase 6

### Claude's Discretion

- Exact column widths and responsive breakpoints
- Field ordering within each column
- Collapse/expand behavior for long track lists
- Loading state while fetching MB preview data

</decisions>

<specifics>
## Specific Ideas

- Leverage existing DiffEngine from Phase 3 for field comparisons
- Use GetCorrectionPreview GraphQL query (already implemented in Phase 5)
- Dark zinc color scheme consistent with Phase 6/7 modal components

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 08-preview-ui_
_Context gathered: 2026-01-26_
