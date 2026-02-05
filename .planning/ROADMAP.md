# Roadmap: Admin Album Data Correction

## Overview

This roadmap spans two milestones for the admin data correction feature. Milestone v1.0 (Phases 1-12) delivered the complete correction workflow with search, preview, apply, and manual edit capabilities for both albums and artists. Milestone v1.1 (Phases 13-14) refactors state management to use Zustand stores, eliminating prop drilling and manual sessionStorage synchronization while maintaining identical UI behavior.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3...): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

**Milestone v1.0 (Complete)**

- [x] **Phase 1: Foundation & Infrastructure** - Queue priority and MBID verification for reliable API calls
- [x] **Phase 2: Search Service** - MusicBrainz search with fuzzy matching and rate limiting
- [x] **Phase 3: Preview Service** - Side-by-side diff generation and field comparison logic
- [x] **Phase 4: Apply Service** - Atomic corrections with audit logging
- [x] **Phase 5: GraphQL Integration** - Schema, resolvers, and generated hooks
- [x] **Phase 6: Modal & Entry Point** - Correction modal structure and current data display
- [x] **Phase 7: Search UI** - Search interface with results and match scores
- [x] **Phase 8: Preview UI** - Side-by-side comparison with field highlighting
- [x] **Phase 9: Apply UI** - Field selection, confirmation, and success feedback
- [x] **Phase 10: Manual Edit** - Direct field editing without external search
- [x] **Phase 11: Artist Correction** - Same workflow adapted for artists
- [x] **Phase 12: Polish & Recovery** - Error handling, re-enrichment triggers, and edge cases

**Milestone v1.1 (Zustand Refactor)**

- [ ] **Phase 13: Album Correction Store** - Replace useState chaos with Zustand for album correction modal
- [ ] **Phase 14: Artist Correction Store** - Replace useState chaos with Zustand for artist correction modal

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
   **Plans**: 4 plans

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
   **Plans**: 4 plans

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
   **Plans**: 4 plans

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
   **Plans**: 4 plans

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
   **Plans**: 4 plans

Plans:

- [x] 05-01-PLAN.md — GraphQL schema definitions for correction types and enums
- [x] 05-02-PLAN.md — Thin resolvers for search, preview, and apply operations
- [x] 05-03-PLAN.md — Client query files and hook generation

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
   **Plans**: 4 plans

Plans:

- [x] 06-01-PLAN.md — Modal shell, step navigation, and session persistence
- [x] 06-02-PLAN.md — Current data display with accordion sections
- [x] 06-03-PLAN.md — Fix Data button and modal integration

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
   **Plans**: 4 plans

Plans:

- [x] 07-01-PLAN.md — Search inputs with pre-population and loading skeleton
- [x] 07-02-PLAN.md — Search result card and results list with pagination
- [x] 07-03-PLAN.md — SearchView container and modal integration

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
   **Plans**: 4 plans

Plans:

- [x] 08-01-PLAN.md — Preview container, layout, and skeleton
- [x] 08-02-PLAN.md — Field diff highlighting components
- [x] 08-03-PLAN.md — Track comparison, cover art, and modal integration

### Phase 9: Apply UI

**Goal**: Admin can select fields and apply correction with confirmation
**Depends on**: Phase 8
**Requirements**: (UI for APPLY-01 through APPLY-08)
**Success Criteria** (what must be TRUE):

1. "Apply This Match" button on selected result
2. Confirmation summary shows changes to be made (step transition model)
3. Admin can select which fields to update via checkboxes
4. Success message with toast shows applied changes summary
5. Modal auto-closes after brief "Applied!" state
6. Album data quality indicator updates appropriately
   **Plans**: 4 plans

Plans:

- [x] 09-01-PLAN.md — Field selection form with hierarchical checkboxes
- [x] 09-02-PLAN.md — ApplyView container with diff summary
- [x] 09-03-PLAN.md — Apply mutation integration and feedback

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
   **Plans**: 4 plans

Plans:

- [x] 10-01-PLAN.md — Validation schemas, types, and modal state extension
- [x] 10-02-PLAN.md — Input components (EditableField, ArtistChips, ExternalIdInput)
- [x] 10-03-PLAN.md — ManualEditView container and modal integration

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
   **Plans**: 4 plans

Plans:

- [x] 11-01-PLAN.md — Artist search service with MusicBrainz integration
- [x] 11-02-PLAN.md — Artist preview service with field diff engine
- [x] 11-03-PLAN.md — Artist apply service and GraphQL schema extension
- [x] 11-04-PLAN.md — Artist correction modal UI and entry point

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
   **Plans**: 4 plans

Plans:

- [x] 12-01-PLAN.md — Error state components and messaging
- [x] 12-02-PLAN.md — Loading indicators and skeleton states
- [x] 12-03-PLAN.md — Re-enrichment trigger integration
- [x] 12-04-PLAN.md — Keyboard shortcuts and accessibility

---

## Milestone v1.1: Zustand Refactor

### Phase 13: Album Correction Store

**Goal**: Album correction modal state managed by single Zustand store with zero UI changes
**Depends on**: Phase 12 (v1.0 complete)
**Requirements**: ASTORE-01, ASTORE-02, ASTORE-03, ASTORE-04, ASTORE-05, ASTORE-06, ASTORE-07, ASTORE-08, AMODAL-01, AMODAL-02, AMODAL-03, ACHILD-01, ACHILD-02, ACHILD-03, ACHILD-04, ACHILD-05, ACHILD-06, CLEAN-01, CLEAN-03, CLEAN-04
**Success Criteria** (what must be TRUE):

1. Admin opens correction modal and sees same UI as before (zero visual changes)
2. Search query persists across page navigations via sessionStorage keyed by albumId
3. Selected result and preview data persist across page navigations
4. Manual edit mode and unsaved changes state persist correctly
5. Step navigation works identically (mode switches, preview loading, atomic transitions)
6. Child components receive minimal props (SearchView gets album only, PreviewView gets zero props, ApplyView gets error only, ManualEditView gets album only)
7. useCorrectionModalState.ts deleted with zero remaining imports
8. Zero any types introduced

**Plans**: 3 plans

Plans:

- [x] 13-01-PLAN.md — Create useCorrectionStore Zustand store with persist middleware, atomic actions, and derived selectors
- [x] 13-02-PLAN.md — Refactor CorrectionModal and SearchView to consume store, remove useCorrectionModalState import
- [x] 13-03-PLAN.md — Refactor PreviewView, ApplyView, ManualEditView to read from store, delete legacy hook

### Phase 14: Artist Correction Store

**Goal**: Artist correction modal state managed by single Zustand store with zero UI changes
**Depends on**: Phase 13
**Requirements**: XSTORE-01, XSTORE-02, XSTORE-03, XSTORE-04, XSTORE-05, XMODAL-01, XMODAL-02, XCHILD-01, XCHILD-02, XCHILD-03, CLEAN-02, CLEAN-03
**Success Criteria** (what must be TRUE):

1. Admin opens artist correction modal and sees same UI as before (zero visual changes)
2. Search query persists across page navigations via sessionStorage keyed by artistId
3. Selected result and preview data persist correctly
4. Step navigation works identically (search → preview → apply)
5. Child components receive minimal props (ArtistSearchView gets artist only, ArtistPreviewView gets zero props, ArtistApplyView gets isApplying + error only)
6. useArtistCorrectionModalState.ts deleted with zero remaining imports
7. Zero any types introduced

**Plans**: 2 plans

Plans:

- [ ] 14-01-PLAN.md — Create useArtistCorrectionStore with persist middleware and atomic actions
- [ ] 14-02-PLAN.md — Refactor artist modal + child components, delete legacy hook

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → ... → 14

**Milestone v1.0 (Complete - 2026-02-03)**

| Phase                          | Plans Complete | Status   | Completed  |
| ------------------------------ | -------------- | -------- | ---------- |
| 1. Foundation & Infrastructure | 3/3            | Complete | 2026-01-24 |
| 2. Search Service              | 3/3            | Complete | 2026-01-23 |
| 3. Preview Service             | 3/3            | Complete | 2026-01-23 |
| 4. Apply Service               | 3/3            | Complete | 2026-01-24 |
| 5. GraphQL Integration         | 3/3            | Complete | 2026-01-24 |
| 6. Modal & Entry Point         | 3/3            | Complete | 2026-01-25 |
| 7. Search UI                   | 3/3            | Complete | 2026-01-26 |
| 8. Preview UI                  | 3/3            | Complete | 2026-01-26 |
| 9. Apply UI                    | 3/3            | Complete | 2026-01-26 |
| 10. Manual Edit                | 3/3            | Complete | 2026-01-27 |
| 11. Artist Correction          | 4/4            | Complete | 2026-02-03 |
| 12. Polish & Recovery          | 4/4            | Complete | 2026-02-03 |

**Milestone v1.1 (In Progress - Started 2026-02-04)**

| Phase                       | Plans Complete | Status      | Completed |
| --------------------------- | -------------- | ----------- | --------- |
| 13. Album Correction Store  | 3/3            | Complete    | 2026-02-05 |
| 14. Artist Correction Store | 0/2            | Not Started | —          |

**Total Plans (v1.0):** 37
**Total Plans (v1.1):** 5
**Total Requirements Covered (v1.0):** 35/35
**Total Requirements Covered (v1.1):** 30/30
