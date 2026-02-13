# Phase 9: Apply UI - Context

**Gathered:** 2026-01-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin applies a selected MusicBrainz correction with field-level control. The flow includes field selection via checkboxes, a confirmation summary showing changes, and success/error feedback. Re-enrichment triggering is handled separately (not part of this phase's apply flow).

</domain>

<decisions>
## Implementation Decisions

### Field Selection UI

- Accordion groups matching preview layout (Metadata, Tracks, External IDs sections)
- Both global and per-group select all/deselect all shortcuts
- Default state: all fields selected (admin deselects what they don't want)
- Track selection: hybrid approach — "Apply all tracks" checkbox with expandable per-track checkboxes to exclude individual tracks

### Confirmation Experience

- Step transition model — apply step shows full diff summary, "Confirm" button is final action (no separate dialog)
- Full diff summary showing compact before/after for each selected field
- Re-enrichment NOT automatic — admin uses separate action later if needed
- Subtle "back to preview" link available (not prominent, step navigation also works)

### Success Feedback

- Toast notification on success, modal auto-closes
- Brief delay (1-2 seconds) showing "Applied!" state before auto-close
- Album row in admin table gets visual highlight (flash/pulse) to show update
- Toast message includes summary: "Updated: Title, Artist, 8 tracks"

### Error Recovery

- Stay on apply step with inline error message
- No separate retry button — user re-clicks Apply to retry
- Error messages contextual with expandable technical details ("Show details")
- Closing modal after error loses selections (no preservation, no prompt)

### Claude's Discretion

- Exact accordion expand/collapse behavior on apply step
- Loading state during apply mutation
- Specific animation/transition timing
- Error detail formatting

</decisions>

<specifics>
## Specific Ideas

- Toast should match existing admin toast patterns in the codebase
- Row highlight should be subtle but noticeable (brief pulse, not jarring)
- Keep the apply step visually consistent with preview step layout

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 09-apply-ui_
_Context gathered: 2026-01-25_
