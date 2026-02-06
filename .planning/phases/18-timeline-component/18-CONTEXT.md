# Phase 18: Timeline Component - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Add shadcn-timeline component and create mapping utilities for EnrichmentLog. Component displays job chains (parent → children) with status, timestamps, and operation details. Integration into tables/tabs is Phase 19-20.

</domain>

<decisions>
## Implementation Decisions

### Visual Presentation
- Vertical timeline with connector line (top-to-bottom flow)
- Status shown as icon + color dot (green/yellow/red with checkmark/spinner/X)
- Parent item larger/bolder than children (size difference for hierarchy)
- Comfortable spacing between items (scannable, not cramped)
- **View switcher at top** — toggle between timeline view and plain tree view (fallback if timeline has issues)

### Item Content
- Primary info visible upfront: operation type, entity name, and timestamp
- Timestamps: relative by default ("2m ago"), absolute on hover
- Duration visible only when item is expanded
- Error details: first line of error visible inline, full error on expand

### Animation & Interaction
- Staggered fade-in on load (items animate in one by one)
- Click anywhere on item to expand (no explicit chevron)
- Parent item has collapse/expand toggle for its children
- Hover: item elevates with subtle shadow

### Empty & Edge States
- No logs: "No enrichment history" message with subtle icon
- Mixed status chains: show each item's actual status (no special treatment)
- Long chains (15+ children): truncate with "Show X more" button
- Running jobs: Claude's discretion on spinner vs static indicator

### Claude's Discretion
- Running job indicator style (spinner, pulse, static badge)
- Exact truncation threshold for long chains
- Shadow/elevation values on hover
- Animation timing and easing curves
- Tree view fallback implementation details

</decisions>

<specifics>
## Specific Ideas

- View switcher exists as a safety valve — if timeline rendering is buggy or looks bad, user can switch to a simple tree view
- Should feel like a job history log — clear sequence of what happened and when

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-timeline-component*
*Context gathered: 2026-02-06*
