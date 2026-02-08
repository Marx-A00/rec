# Milestones

## v1.2 — Job History Timeline UI

**Shipped:** 2026-02-07
**Phases:** 15–20 (15 plans)
**Branch:** `feat/admin-enrich-UI`

**What shipped:**

- `parentJobId` field in EnrichmentLog for job linking
- All processors propagate `parentJobId` through job chains
- Cache and Discogs processors now log to EnrichmentLog
- shadcn-timeline component with Framer Motion animations
- EnrichmentTimeline wrapper with compact/modal variants
- EnrichmentLogTable shows only parent logs, children in expanded timeline
- Job History tab with expandable rows showing enrichment timelines

**Key accomplishments:**

- Flat parent structure: all children point to root job (no deep nesting)
- Lazy-loaded children via parentJobId filter
- Timeline maps status to visual indicators (icons, colors)
- 15-child truncation with show more/less
- Removed FieldChangesPanel (replaced by timeline)

**Stats:**

- 6 phases, 15 plans
- 2 days (2026-02-06 to 2026-02-07)
- 20 requirements delivered

**What's next:** v1.3 Discogs Correction Source

---

## v1.1 — Zustand Correction Modal Refactor

**Shipped:** 2026-02-05
**Phases:** 13–14 (5 plans)
**Branch:** `feat/admin-enrich-UI`

**What shipped:**

- Album correction store (useCorrectionStore.ts) with Zustand factory pattern, sessionStorage persistence, and 22 atomic actions
- Artist correction store (useArtistCorrectionStore.ts) with 15 actions following identical patterns
- Prop drilling eliminated from 7 child components
- Legacy hooks deleted (useCorrectionModalState.ts and useArtistCorrectionModalState.ts)
- Net code reduction of 459 lines while improving maintainability

**Key accomplishments:**

- Single Zustand store per modal with persist middleware
- Atomic state transitions eliminating multi-setState cascades
- SearchView, PreviewView, ApplyView, ManualEditView all read from store
- Zero visual changes — pure state management refactor
- Zero any types introduced

**Stats:**

- 13 files modified
- +1,404 / -945 lines (net -459)
- 2 phases, 5 plans
- 1 day (2026-02-04 to 2026-02-05)

**Git range:** `5adcd03` → `ac3e480`

---

## v1.0 — Admin Album Data Correction

**Shipped:** 2026-02-03
**Phases:** 1–12 (37 plans)
**Branch:** `feat/admin-enrich-UI`

**What shipped:**

- MusicBrainz search with fuzzy matching, rate limiting, MBID verification
- Side-by-side preview with field diff highlighting
- Selective field apply with atomic transactions and audit logging
- GraphQL integration (schema, resolvers, generated hooks)
- Correction modal with step navigation and sessionStorage persistence
- Search UI with results, match scores, pagination
- Preview UI with field comparison and track listing
- Apply UI with field selection checkboxes, confirmation, re-enrichment trigger
- Manual edit mode for direct field/ID editing
- Artist correction workflow (search, preview, apply)
- Polish: error states, loading skeletons, keyboard shortcuts, accessibility

**Key decisions:**

- MusicBrainz only for v1 (Discogs/Spotify deferred)
- Session-only state (no DB persistence for correction queue)
- Thin resolver pattern — all business logic in services

---
