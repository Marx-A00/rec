# Phase 6: Modal & Entry Point - Context

**Gathered:** 2026-01-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin can open correction modal from album row and see current album data. The modal is the container for the entire correction workflow (search, preview, apply). This phase delivers the entry point and initial data display — search UI, preview comparison, and apply flow are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Entry Point Placement

- Icon-only button (wrench icon) positioned below the current data in album row
- Tooltip on hover: "Fix album data"
- Icon changes color when album has data quality issues (incomplete data)
- Color scheme: Claude decides based on existing admin color patterns
- Icon visible on ALL album rows (not just flagged ones)
- Keyboard shortcut support: Claude decides based on what makes sense

### Modal Structure

- Centered modal (not slide-over panel) — comparison clarity prioritized over list context
- Extra large size (~1000px+ wide) — maximum space for side-by-side comparison in later phases
- Header shows: "Fixing: [Album Name] by [Artist]"
- Close methods: X button + Escape key (no click-outside)
- Unsaved changes warning: custom styled dialog matching app design
- Linear step indicator (Step 1 → 2 → 3) for guided workflow
- Steps are clickable — admin can jump between steps freely
- Sticky footer bar with consistent navigation buttons (Cancel/Next, etc.)
- Step 1 footer: "Cancel" and "Next" buttons
- Session persistence: reopening modal for same album picks up where admin left off

### Current Data Layout (Step 1)

- Read-only display — no inline editing (manual edits happen in admin database table)
- Cover art: medium thumbnail (100-150px), balanced with text
- Generic placeholder shown when no cover image
- Metadata organized in grouped sections: "Basic Info", "Tracks", "External IDs"
- All available album fields displayed (everything from database)
- Empty fields shown with "—" or "Not set" (visible, not hidden)
- All sections collapsible — admin controls focus
- Section state resets to expanded on each modal open (no persistence)

### Track Listing

- Show all tracks unless 30+ tracks (then collapsed with "Show all" option)
- Track info: number, title, duration

### Data Quality Indicator

- Quality badge at top of current data section (standalone, prominent)
- Four levels: Excellent / Good / Fair / Poor
- Clickable — expands tooltip/popover showing breakdown of what's contributing to rating

### Claude's Discretion

- Exact color for "needs attention" icon state (match admin patterns)
- Keyboard shortcut implementation (if any)
- Quality badge color scheme per level
- Exact placeholder image design

</decisions>

<specifics>
## Specific Ideas

- Wrench icon for "fix" connotation rather than generic pencil
- Manual inline editing will be built into the admin database table itself, not this modal — keep modal focused on MusicBrainz lookup flow

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

## External ID Status Display

### Layout & Display

- Section header: "External IDs"
- Horizontal row layout: [MB ✓] [Discogs ✓] [Spotify ✗]
- All possible external IDs shown (MusicBrainz, Discogs, Spotify, any others in schema)
- Order by importance: MusicBrainz first (primary correction source), then others

### Status Indicators

- Two states only: present (✓) or missing (✗)
- Truncated ID shown inline: [MB: abc12...]
- Hover tooltip or click to expand shows full ID
- Present IDs are clickable — opens external source page in new tab
- Missing IDs show ✗ only (no call-to-action hint — the whole flow is the CTA)

---

_Phase: 06-modal-entry-point_
_Context gathered: 2026-01-24_
