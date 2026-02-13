# Phase 31: UI & Branding - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Add llama emoji and theming to console output and admin UI. This is visual branding — how the LlamaLog identity appears to developers (console logs) and admins (admin UI). No new functionality, just presentation layer updates.

</domain>

<decisions>
## Implementation Decisions

### Console Log Style
- Prefix format: `[🦙 LlamaLog]` — emoji + name
- Category appears in log line: `[🦙 LlamaLog] [ENRICHED] Album enriched...`
- Color coding by category:
  - CREATED = green
  - ENRICHED = blue
  - CORRECTED = yellow
  - FAILED = red
  - CACHED = gray
- Verbosity: Configurable via environment variable (compact vs detailed with entityId, jobId, operation type)

### Admin Table Header
- Header text: `🦙 LlamaLog` — emoji + name
- Subtitle: "Entity provenance & audit history"
- Empty state: `🦙 The llama has nothing to report`
- Llama emoji in header and empty state only, not in data rows

### Category Badges
- No emoji in badges — color-coded text only
- Pill-shaped badges (rounded-full)
- Color scheme matching console:
  - CREATED = green
  - ENRICHED = blue
  - CORRECTED = yellow
  - FAILED = red
  - CACHED = gray
  - LINKED = purple (distinct from CREATED)

### Theming Consistency
- Timeline header: Shows `🦙 LlamaLog` (same as table)
- Modal/detail view header: Shows 🦙
- Loading state: `🦙` with "Llama is thinking..." or similar
- Error states: Personality in errors — `🦙 "The llama couldn't fetch logs"`

### Claude's Discretion
- Exact Tailwind color values for each category
- Loading spinner animation style
- Typography/sizing for headers and subtitles
- Environment variable name for verbosity level

</decisions>

<specifics>
## Specific Ideas

- Consistent llama personality: playful but not unprofessional
- Empty state and error messages have character ("The llama has nothing to report", "The llama couldn't fetch logs")
- Loading state should feel alive, not static
- Color scheme should be consistent between console and UI

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 31-ui-branding*
*Context gathered: 2026-02-10*
