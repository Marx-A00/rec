# Requirements: Discogs Correction Source

**Defined:** 2026-02-08
**Core Value:** Admins can choose MusicBrainz or Discogs when correcting album/artist data, using whichever source has better data.

## v1.3 Requirements

Requirements for Discogs Correction Source milestone.

### UI — Source Selection

- [x] **UI-01**: Correction modal shows source toggle (MusicBrainz / Discogs)
- [x] **UI-02**: Selected source persists in Zustand store
- [x] **UI-03**: Search view adapts to selected source
- [x] **UI-04**: Preview view shows source indicator

### Album Corrections — Discogs

- [x] **ALB-01**: Admin can search Discogs for albums by query
- [x] **ALB-02**: Discogs album search uses existing queue infrastructure
- [x] **ALB-03**: Discogs album results display in same format as MusicBrainz
- [x] **ALB-04**: Admin can preview Discogs album data side-by-side
- [x] **ALB-05**: Admin can apply album correction from Discogs source

### Artist Corrections — Discogs

- [x] **ART-01**: Admin can search Discogs for artists by query
- [x] **ART-02**: Discogs artist search uses existing queue infrastructure
- [x] **ART-03**: Discogs artist results display in same format as MusicBrainz
- [x] **ART-04**: Admin can preview Discogs artist data side-by-side
- [x] **ART-05**: Admin can apply artist correction from Discogs source

### Data Mapping

- [x] **MAP-01**: Discogs album fields map to Album model
- [x] **MAP-02**: Discogs artist fields map to Artist model
- [x] **MAP-03**: Discogs IDs stored as external IDs on apply

## Future Requirements

Deferred to later milestones.

### Additional Sources

- **SRC-01**: Spotify as correction source
- **SRC-02**: Search multiple sources simultaneously

### Bulk Operations

- **BULK-01**: Bulk re-enrichment for albums matching criteria
- **BULK-02**: Progress tracking for bulk operations

## Out of Scope

| Feature                                | Reason                                 |
| -------------------------------------- | -------------------------------------- |
| Spotify integration                    | Defer to future milestone              |
| Combined search (both sources at once) | Keep it simple — pick one, search that |
| Auto-suggestion of best source         | Manual selection for now               |
| Bulk corrections                       | One at a time for v1                   |

## Traceability

| Requirement | Phase | Status   |
| ----------- | ----- | -------- |
| UI-01       | 21    | Complete |
| UI-02       | 21    | Complete |
| UI-03       | 21    | Complete |
| UI-04       | 21    | Complete |
| ALB-01      | 22    | Complete |
| ALB-02      | 22    | Complete |
| ALB-03      | 22    | Complete |
| ALB-04      | 23    | Complete |
| ALB-05      | 23    | Complete |
| ART-01      | 24    | Complete |
| ART-02      | 24    | Complete |
| ART-03      | 24    | Complete |
| ART-04      | 25    | Complete |
| ART-05      | 25    | Complete |
| MAP-01      | 22    | Complete |
| MAP-02      | 24    | Complete |
| MAP-03      | 25    | Complete |

**Coverage:**

- v1.3 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0

---

_Requirements defined: 2026-02-08_
_Last updated: 2026-02-09 — Phase 25 complete (ART-04, ART-05, MAP-03) — Milestone v1.3 complete (17/17)_
