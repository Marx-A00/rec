# Roadmap: Admin Album Data Correction

## Overview

This roadmap delivers an admin data correction feature that lets administrators fix problematic albums and artists directly from the admin dashboard. The journey moves from infrastructure (queue priority, MBID verification) through service layer (search, preview, apply logic), GraphQL integration, and finally UI implementation across modal entry, search results, preview comparison, manual editing, and artist correction workflows. Each phase delivers a coherent, testable capability that builds toward the complete correction system.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3...): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Foundation & Infrastructure** - Queue priority and MBID verification for reliable API calls
- [x] **Phase 2: Search Service** - MusicBrainz search with fuzzy matching and rate limiting
- [x] **Phase 3: Preview Service** - Side-by-side diff generation and field comparison logic
- [x] **Phase 4: Apply Service** - Atomic corrections with audit logging
- [ ] **Phase 5: GraphQL Integration** - Schema, resolvers, and generated hooks
- [ ] **Phase 6: Modal & Entry Point** - Correction modal structure and current data display
- [ ] **Phase 7: Search UI** - Search interface with results and match scores
- [ ] **Phase 8: Preview UI** - Side-by-side comparison with field highlighting
- [ ] **Phase 9: Apply UI** - Field selection, confirmation, and success feedback
- [ ] **Phase 10: Manual Edit** - Direct field editing without external search
- [ ] **Phase 11: Artist Correction** - Same workflow adapted for artists
- [ ] **Phase 12: Polish & Recovery** - Error handling, re-enrichment triggers, and edge cases

## Phase Details

### Phase 1: Foundation & Infrastructure

**Goal**: Admin API requests are prioritized and MBID responses are verified for stability
**Depends on**: Nothing (first phase)
**Requirements**: SEARCH-07, SEARCH-08
**Success Criteria** (what must be TRUE):

1. Admin search requests execute before background jobs in the queue
2. MBID redirects are detected and handled gracefully
3. Rate limiting is respected (1 request/second to MusicBrainz)
4. Queue position is observable for debugging
   **Plans**: 3 plans

Plans:

- [x] 01-01-PLAN.md — Queue priority tiers (ADMIN, USER, ENRICHMENT, BACKGROUND)
- [x] 01-02-PLAN.md — MBID verification utility for redirect detection
- [x] 01-03-PLAN.md — Structured error handling and queue observability

### Phase 2: Search Service

**Goal**: Admins can search MusicBrainz programmatically with match scoring
**Depends on**: Phase 1
**Requirements**: SEARCH-01, SEARCH-02, SEARCH-03, SEARCH-04, SEARCH-05, SEARCH-06
**Success Criteria** (what must be TRUE):

1. Search function accepts album title and artist, returns ranked results
2. Each result includes: title, artist, release date, track count, cover art URL
3. Results include fuzzy match confidence scores
4. Search can be pre-populated with current album data
5. Results are tagged with source indicator (MusicBrainz)
   **Plans**: 3 plans

Plans:

- [x] 02-01-PLAN.md — CorrectionSearchService with ADMIN priority and CAA URLs
- [x] 02-02-PLAN.md — Pluggable scoring strategies (normalized, tiered, weighted)
- [x] 02-03-PLAN.md — Result grouping, deduplication, and searchWithScoring integration

### Phase 3: Preview Service

**Goal**: System can generate field-by-field diffs between current and source data
**Depends on**: Phase 2
**Requirements**: PREVIEW-01, PREVIEW-02, PREVIEW-03, PREVIEW-04, PREVIEW-05, PREVIEW-06
**Success Criteria** (what must be TRUE):

1. Preview function accepts current album and MusicBrainz result, returns diff
2. Diff identifies additions, modifications, and unchanged fields
3. Track listing from source is included in preview
4. External ID changes are clearly indicated
5. Preview data is sufficient for UI rendering without additional API calls
   **Plans**: 3 plans

Plans:

- [x] 03-01-PLAN.md — Preview types and text normalization utilities
- [x] 03-02-PLAN.md — DiffEngine with field comparison methods
- [x] 03-03-PLAN.md — CorrectionPreviewService with MB data fetching

### Phase 4: Apply Service

**Goal**: Corrections are applied atomically with full audit trail
**Depends on**: Phase 3
**Requirements**: APPLY-01, APPLY-02, APPLY-03, APPLY-04, APPLY-05, APPLY-06, APPLY-07, APPLY-08
**Success Criteria** (what must be TRUE):

1. Apply function updates Album, AlbumArtist, and Track tables in one transaction
2. Partial field selection is supported (admin chooses which fields to update)
3. Before-state is captured in enrichment_logs before any changes
4. Correction log includes admin user ID and timestamp
5. Failed transactions leave no partial changes (atomic rollback)
   **Plans**: 3 plans

Plans:

- [x] 04-01-PLAN.md — Apply types and track matching strategy
- [x] 04-02-PLAN.md — Selective field update logic
- [x] 04-03-PLAN.md — ApplyCorrectionService with audit logging

### Phase 5: GraphQL Integration

**Goal**: All correction operations are accessible via GraphQL API
**Depends on**: Phase 4
**Requirements**: (Infrastructure - enables UI phases)
**Success Criteria** (what must be TRUE):

1. GraphQL schema includes correction types and mutations
2. Generated hooks are available for React components
3. Resolvers delegate to service layer (thin resolver pattern)
4. Admin role check is enforced on all correction operations
   **Plans**: TBD

Plans:

- [ ] 05-01: GraphQL schema definitions for correction types
- [ ] 05-02: Correction resolvers (search, preview, apply)
- [ ] 05-03: Codegen and hook generation

### Phase 6: Modal & Entry Point

**Goal**: Admin can open correction modal from album row and see current data
**Depends on**: Phase 5
**Requirements**: MODAL-01, MODAL-02, MODAL-03, MODAL-04, MODAL-05
**Success Criteria** (what must be TRUE):

1. "Fix Data" button appears on album rows in admin music database page
2. Clicking button opens a modal/panel
3. Modal displays current album data prominently (title, artist, date, tracks, cover)
4. Modal shows which external IDs are present vs. missing
5. Modal can be closed without making changes (escape, X button)
   **Plans**: TBD

Plans:

- [ ] 06-01: Fix Data button integration in admin album table
- [ ] 06-02: CorrectionModal component structure
- [ ] 06-03: Current album data display component
- [ ] 06-04: External ID status indicators

### Phase 7: Search UI

**Goal**: Admin can search MusicBrainz and see results with match scores
**Depends on**: Phase 6
**Requirements**: (UI for SEARCH-01 through SEARCH-06)
**Success Criteria** (what must be TRUE):

1. Search bar in modal accepts query input
2. Search is pre-populated with current album title and artist
3. Admin can modify search query freely
4. Results display with source badge [MB]
5. Each result shows: title, artist, date, track count, thumbnail
6. Match confidence scores are visible
   **Plans**: TBD

Plans:

- [ ] 07-01: Search input component with pre-population
- [ ] 07-02: Search results list component
- [ ] 07-03: Result card with match score display

### Phase 8: Preview UI

**Goal**: Admin can preview full comparison before applying correction
**Depends on**: Phase 7
**Requirements**: (UI for PREVIEW-01 through PREVIEW-06)
**Success Criteria** (what must be TRUE):

1. Clicking a search result shows detailed preview
2. Side-by-side comparison: current data vs. MusicBrainz data
3. Changed fields highlighted (additions green, changes yellow)
4. Track listing from MusicBrainz visible
5. External ID changes clearly shown
6. Admin can collapse preview and view other results
   **Plans**: TBD

Plans:

- [ ] 08-01: Preview panel component
- [ ] 08-02: Side-by-side comparison layout (allotment)
- [ ] 08-03: Field diff highlighting
- [ ] 08-04: Track listing display

### Phase 9: Apply UI

**Goal**: Admin can select fields and apply correction with confirmation
**Depends on**: Phase 8
**Requirements**: (UI for APPLY-01 through APPLY-08)
**Success Criteria** (what must be TRUE):

1. "Apply This Match" button on selected result
2. Confirmation dialog shows summary of changes
3. Admin can select which fields to update via checkboxes
4. Option to trigger re-enrichment after correction
5. Success message shows applied changes summary
6. Album data quality indicator updates appropriately
   **Plans**: TBD

Plans:

- [ ] 09-01: Field selection checkboxes with react-hook-form
- [ ] 09-02: Confirmation dialog component
- [ ] 09-03: Apply mutation integration
- [ ] 09-04: Success feedback and data refresh

### Phase 10: Manual Edit

**Goal**: Admin can edit fields directly without external search
**Depends on**: Phase 6
**Requirements**: MANUAL-01, MANUAL-02, MANUAL-03, MANUAL-04, MANUAL-05, MANUAL-06
**Success Criteria** (what must be TRUE):

1. "Manual Edit" tab in correction modal
2. Editable fields: title, artist name(s), release date, release type
3. Editable external IDs: MusicBrainz ID, Discogs ID, Spotify ID
4. External ID format validation (UUID for MBID, numeric for Discogs)
5. Preview of changes before applying
6. Changes logged with "manual_correction" source
   **Plans**: TBD

Plans:

- [ ] 10-01: Manual edit tab component
- [ ] 10-02: Field edit form with validation (Zod)
- [ ] 10-03: External ID format validators
- [ ] 10-04: Manual correction apply flow

### Phase 11: Artist Correction

**Goal**: Same correction workflow works for artists
**Depends on**: Phase 9
**Requirements**: ARTIST-01, ARTIST-02, ARTIST-03, ARTIST-04, ARTIST-05
**Success Criteria** (what must be TRUE):

1. "Fix Data" button on artist rows in admin artist view
2. Artist correction modal with same search/preview/apply pattern
3. Artist search on MusicBrainz returns artists
4. Preview shows: name, disambiguation, country, type
5. Corrections logged with admin user ID
   **Plans**: TBD

Plans:

- [ ] 11-01: Artist search service extension
- [ ] 11-02: Artist preview service extension
- [ ] 11-03: Artist correction modal component
- [ ] 11-04: Artist apply flow with logging

### Phase 12: Polish & Recovery

**Goal**: System handles edge cases gracefully with good feedback
**Depends on**: Phase 11
**Requirements**: (Polish across all features)
**Success Criteria** (what must be TRUE):

1. Error states shown when MusicBrainz fails (SEARCH-08)
2. Loading states during search and apply operations
3. Re-enrichment trigger option works after correction
4. Keyboard shortcuts for common actions (close modal, submit)
5. Mobile-friendly comparison layout (responsive)
   **Plans**: TBD

Plans:

- [ ] 12-01: Error state components and messaging
- [ ] 12-02: Loading indicators and skeleton states
- [ ] 12-03: Re-enrichment trigger integration
- [ ] 12-04: Keyboard shortcuts and accessibility
- [ ] 12-05: Mobile responsive adjustments

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → ... → 12

| Phase                          | Plans Complete | Status      | Completed  |
| ------------------------------ | -------------- | ----------- | ---------- |
| 1. Foundation & Infrastructure | 3/3            | Complete    | 2026-01-24 |
| 2. Search Service              | 3/3            | Complete    | 2026-01-23 |
| 3. Preview Service             | 3/3            | Complete    | 2026-01-23 |
| 4. Apply Service               | 3/3            | Complete    | 2026-01-24 |
| 5. GraphQL Integration         | 0/3            | Not started | -          |
| 6. Modal & Entry Point         | 0/4            | Not started | -          |
| 7. Search UI                   | 0/3            | Not started | -          |
| 8. Preview UI                  | 0/4            | Not started | -          |
| 9. Apply UI                    | 0/4            | Not started | -          |
| 10. Manual Edit                | 0/4            | Not started | -          |
| 11. Artist Correction          | 0/4            | Not started | -          |
| 12. Polish & Recovery          | 0/5            | Not started | -          |

**Total Plans:** 43
**Total Requirements Covered:** 35/35
