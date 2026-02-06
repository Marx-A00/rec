# Phase 19: EnrichmentLogTable Integration - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Integrate the EnrichmentTimeline component into EnrichmentLogTable expanded rows. Admins see parent-child job hierarchies inline within the table. The table filters to show only parent/root logs as rows, with children nested inside the timeline expand view.

</domain>

<decisions>
## Implementation Decisions

### Expand row layout
- Timeline replaces FieldChangesPanel entirely — field change info moves into timeline items' expanded details
- Standalone logs (no children) show as single-item timeline for consistent experience
- Fixed max height (~300-400px) with scroll for the expand area
- View switcher (timeline/tree) included in the expand row

### Parent vs child row filtering
- Child logs (those with parentJobId) hidden from main table rows entirely — only parent/root logs appear as rows
- Children only visible inside the expand timeline
- Old logs (null parentJobId from before the migration) treated as standalone parents — show as normal rows with single-item timeline when expanded
- Row count shows both: "12 jobs (47 total logs)" to indicate nested children exist
- All rows are expandable (every row gets a chevron) since even solo logs get a single-item timeline

### Expand trigger & loading
- Lazy load children on expand — table query fetches parent-only rows, children fetched on demand when row is expanded
- Skeleton timeline (2-3 placeholder items with shimmer) while children are loading
- Error state shows error message with Retry button inside the expand area
- Polling continues while row is expanded — timeline updates live as new child jobs complete (great for watching active enrichment)

### Timeline density in table
- Compact variant for table context — not the full standalone component
- Compact view hides descriptions: shows only operation name + status + time per item
- Click-to-expand on items shows full details inline (description, reason, fields, errors)
- "View full timeline" link opens full EnrichmentTimeline in a modal/dialog for heavy inspection
- Child truncation threshold lowered to ~5 in compact variant (vs 15 in standalone)
- Full view in modal shows all children with the standard 15 threshold

### Claude's Discretion
- Exact compact variant styling (spacing, icon sizes, text sizes)
- Skeleton timeline design specifics
- Modal component choice and sizing
- How polling integrates with lazy-loaded children cache

</decisions>

<specifics>
## Specific Ideas

- User wants compact + full view approach: "if we provide a compact version, then we should give the user a way to see full details"
- Both inline expand AND full view link — click items for quick detail, "View full" link for modal with complete timeline
- Live polling during expand — admin can watch an active enrichment job's children appear in real time

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-enrichmentlogtable-integration*
*Context gathered: 2026-02-06*
