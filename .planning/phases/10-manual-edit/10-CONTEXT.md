# Phase 10: Manual Edit - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Direct field editing for albums when MusicBrainz search yields no good matches. Admin can edit title, artist names, release date, release type, and external IDs (MusicBrainz, Discogs, Spotify) without relying on external search. This is the fallback workflow — correcting current database state directly.

</domain>

<decisions>
## Implementation Decisions

### Entry point & navigation

- Both search and manual edit options always available from step 1 (not hidden behind "no results")
- Warn before switching if admin has unsaved edits in manual edit mode
- Manual edit fields always pre-populated with current album data from database
- Manual edit never uses search result data — if admin wants that, they apply the search result first, then do manual edit

### Field editing UX

- Inline editing — click directly on displayed values to edit in place
- Artists as tag-style chips — removable chips with + button to add new
- Release date as flexible text input — accepts "YYYY", "YYYY-MM", or "YYYY-MM-DD" with hint
- Release type as dropdown — select from predefined list (Album, EP, Single, Compilation, etc.)

### External ID validation

- Real-time format validation as admin types
- Each field enforces its expected format (MusicBrainz = UUID, Discogs = numeric, Spotify = base62)
- Format hint shown on field focus (not always visible, not only on error)
- Explicit clear button (X) on each field to set value to null — empty field alone doesn't clear
- Clear button pattern applies to all editable fields, not just external IDs

### Preview & confirmation

- Show same diff view as search flow (current vs new values side-by-side)
- Two-step flow: Manual Edit step → Preview+Apply combined step
- Same feedback as search flow: toast with field count, 1.5s delay, auto-close modal
- Validation errors show both: banner summary at top + inline highlighting on invalid fields

### Claude's Discretion

- Exact inline editing interaction pattern (click to edit, enter to confirm, escape to cancel)
- Chip component styling and animations
- Date parsing implementation details
- Field ordering within inline edit view

</decisions>

<specifics>
## Specific Ideas

- Inline editing should feel native — click on a value, it becomes editable, seamless transition
- Chips for artists should be easy to reorder if needed (drag or arrow buttons)
- Format hints should be subtle but clear (placeholder style, not heavy helper text)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 10-manual-edit_
_Context gathered: 2026-01-27_
