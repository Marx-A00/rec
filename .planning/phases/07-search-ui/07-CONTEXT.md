# Phase 7: Search UI - Context

**Gathered:** 2026-01-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Search interface within the correction modal where admin can search MusicBrainz and see results with match scores. Admin searches for candidate albums, views ranked results, and selects one to preview. Pre-populated with current album data. Does not include the preview comparison or apply functionality (those are Phase 8 and 9).

</domain>

<decisions>
## Implementation Decisions

### Search Input Behavior

- Wait for explicit action — Search button click or Enter key triggers search
- No live feedback while typing — clean editing experience
- Two separate input fields — album title and artist name (both pre-populated)
- No indication when values modified from original — free editing without visual noise
- Validation: at least one field required (album title OR artist must have content)
- Full loading state — skeleton replaces search area while API call runs
- Inputs always visible at top — results scroll below, inputs don't collapse
- No results state shows message + "Manual Edit" link as escape hatch

### Results Layout

- Compact list with thumbnails — list format with small album art on left side
- Detailed info per row — title, artist, year, track count, release type, label, country
- Balanced density — 5-6 results visible before scrolling
- Pagination via "Load more" button — show first 10, then load more at bottom

### Match Score Display

- Numeric percentage — "87% match" text format
- Score positioned near title — prominently visible next to album name
- Sorted by score highest first — always, no user sorting options
- No visual distinction for low scores — admin judges confidence themselves

### Result Selection

- Single click anywhere on row — selects and immediately navigates to preview
- Subtle hover state — light background change on hover
- Scroll position preserved on back — return to same position, no highlight on previously selected
- Free step navigation — can click between Search/Preview steps freely, plus Back button in preview

### Source Badge

- Subtle indicator — small gray text or icon for [MB] MusicBrainz source
- Not prominent — only one source in v1, minimal visual weight

### Claude's Discretion

- Exact skeleton loading design
- Spacing and typography details
- Thumbnail size for result rows
- "Load more" button styling
- Hover highlight color

</decisions>

<specifics>
## Specific Ideas

- "No results" state should link to Manual Edit (Phase 10) as escape hatch
- Match score should feel like a quick confidence indicator, not a dominant visual element
- Results should feel scannable — admin comparing multiple options quickly

</specifics>

<deferred>
## Deferred Ideas

- Keyboard navigation for results (arrow keys, Enter to select) — Phase 12 polish
- Sorting options (by year, title) — not needed for v1, score-sort is sufficient

</deferred>

---

_Phase: 07-search-ui_
_Context gathered: 2026-01-25_
