# Requirements: Admin Album Data Correction

**Defined:** 2026-01-23
**Core Value:** Admins can fix a broken album in under a minute without touching the database.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Modal & Entry Point

- [ ] **MODAL-01**: "Fix Data" button appears on album rows in admin music database page
- [ ] **MODAL-02**: Clicking "Fix Data" opens a correction modal/panel
- [ ] **MODAL-03**: Modal shows current album data prominently (title, artist, release date, track count, cover art)
- [ ] **MODAL-04**: Modal shows which external IDs are present/missing (MusicBrainz, Discogs, Spotify)
- [ ] **MODAL-05**: Modal can be closed without making changes

### Search MusicBrainz

- [ ] **SEARCH-01**: Search bar in modal to search MusicBrainz
- [ ] **SEARCH-02**: Search query pre-populated with current album title and artist
- [ ] **SEARCH-03**: Admin can modify search query freely
- [ ] **SEARCH-04**: Results displayed with source indicator [MB]
- [ ] **SEARCH-05**: Each result shows: title, artist, release date, track count, cover art thumbnail
- [ ] **SEARCH-06**: Results show match confidence score (fuzzy matching)
- [ ] **SEARCH-07**: Rate limiting respected (results may load progressively)
- [ ] **SEARCH-08**: Error states shown if MusicBrainz fails

### Preview & Comparison

- [ ] **PREVIEW-01**: Clicking a search result shows detailed preview
- [ ] **PREVIEW-02**: Preview shows side-by-side comparison: current data vs. MusicBrainz data
- [ ] **PREVIEW-03**: Changed fields are highlighted (additions in green, changes in yellow)
- [ ] **PREVIEW-04**: Preview includes track listing from MusicBrainz
- [ ] **PREVIEW-05**: Preview shows which external IDs would be linked
- [ ] **PREVIEW-06**: Admin can collapse preview and view other results

### Apply Correction

- [ ] **APPLY-01**: "Apply This Match" button on selected result
- [ ] **APPLY-02**: Confirmation dialog shows summary of changes to be made
- [ ] **APPLY-03**: Admin can choose which fields to update (checkboxes)
- [ ] **APPLY-04**: Admin can choose whether to trigger full re-enrichment
- [ ] **APPLY-05**: Changes are applied atomically (all or nothing)
- [ ] **APPLY-06**: Success message shown with summary of applied changes
- [ ] **APPLY-07**: Correction logged in enrichment_logs table with admin user ID
- [ ] **APPLY-08**: Album's data quality updated appropriately

### Manual Edit

- [ ] **MANUAL-01**: "Manual Edit" tab in the correction modal
- [ ] **MANUAL-02**: Editable fields: title, artist name(s), release date, release type
- [ ] **MANUAL-03**: Editable external IDs: MusicBrainz ID, Discogs ID, Spotify ID
- [ ] **MANUAL-04**: Validation on external IDs (format checking)
- [ ] **MANUAL-05**: Preview of changes before applying
- [ ] **MANUAL-06**: Changes logged with "manual_correction" source

### Artist Correction

- [ ] **ARTIST-01**: "Fix Data" button on artist rows in admin artist view
- [ ] **ARTIST-02**: Artist correction modal with same search/preview/apply pattern
- [ ] **ARTIST-03**: Artist search on MusicBrainz
- [ ] **ARTIST-04**: Preview shows: name, disambiguation, country, type
- [ ] **ARTIST-05**: Corrections logged with admin user ID

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Additional Sources

- **SOURCE-01**: Search Discogs for album matches
- **SOURCE-02**: Search Spotify for album matches
- **SOURCE-03**: Unified results from all sources with source badges

### Bulk Operations

- **BULK-01**: Checkbox selection on album rows in music database
- **BULK-02**: "Add to Correction Queue" action for selected albums
- **BULK-03**: Navigate between queued albums without closing modal
- **BULK-04**: Queue persists during session

### Discovery

- **DISC-01**: Filter albums by data quality (LOW, MEDIUM, HIGH)
- **DISC-02**: Filter albums by enrichment status
- **DISC-03**: Filter albums that have zero tracks
- **DISC-04**: "Needs correction" indicator on problematic albums

## Out of Scope

| Feature                      | Reason                                                            |
| ---------------------------- | ----------------------------------------------------------------- |
| Auto-correction suggestions  | v1 is manual search only; ML-based matching is future enhancement |
| Duplicate album merging      | Separate feature with different complexity                        |
| User-submitted corrections   | Admin-only for data integrity in v1                               |
| Correction history/revert UI | Audit log exists but no UI to browse/revert                       |
| Real-time collaboration      | Single admin at a time is fine for v1                             |

## Traceability

| Requirement | Phase       | Status   |
| ----------- | ----------- | -------- |
| MODAL-01    | Phase 6     | Pending  |
| MODAL-02    | Phase 6     | Pending  |
| MODAL-03    | Phase 6     | Pending  |
| MODAL-04    | Phase 6     | Pending  |
| MODAL-05    | Phase 6     | Pending  |
| SEARCH-01   | Phase 2, 7  | Partial  |
| SEARCH-02   | Phase 2, 7  | Partial  |
| SEARCH-03   | Phase 7     | Pending  |
| SEARCH-04   | Phase 2, 7  | Partial  |
| SEARCH-05   | Phase 2, 7  | Partial  |
| SEARCH-06   | Phase 2, 7  | Partial  |
| SEARCH-07   | Phase 1     | Complete |
| SEARCH-08   | Phase 1, 12 | Partial  |
| PREVIEW-01  | Phase 3, 8  | Partial  |
| PREVIEW-02  | Phase 3, 8  | Partial  |
| PREVIEW-03  | Phase 3, 8  | Partial  |
| PREVIEW-04  | Phase 3, 8  | Partial  |
| PREVIEW-05  | Phase 3, 8  | Partial  |
| PREVIEW-06  | Phase 8     | Pending  |
| APPLY-01    | Phase 4, 9  | Partial  |
| APPLY-02    | Phase 4, 9  | Partial  |
| APPLY-03    | Phase 4, 9  | Partial  |
| APPLY-04    | Phase 4, 9  | Partial  |
| APPLY-05    | Phase 4     | Complete |
| APPLY-06    | Phase 9     | Pending  |
| APPLY-07    | Phase 4     | Complete |
| APPLY-08    | Phase 4     | Complete |
| MANUAL-01   | Phase 10    | Pending  |
| MANUAL-02   | Phase 10    | Pending  |
| MANUAL-03   | Phase 10    | Pending  |
| MANUAL-04   | Phase 10    | Pending  |
| MANUAL-05   | Phase 10    | Pending  |
| MANUAL-06   | Phase 10    | Pending  |
| ARTIST-01   | Phase 11    | Pending  |
| ARTIST-02   | Phase 11    | Pending  |
| ARTIST-03   | Phase 11    | Pending  |
| ARTIST-04   | Phase 11    | Pending  |
| ARTIST-05   | Phase 11    | Pending  |

**Coverage:**

- v1 requirements: 35 total
- Mapped to phases: 35/35
- Unmapped: 0

---

_Requirements defined: 2026-01-23_
_Last updated: 2026-01-24 after Phase 4 completion_
