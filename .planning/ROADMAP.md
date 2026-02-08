# Roadmap: v1.3 Discogs Correction Source

**Created:** 2026-02-08
**Phases:** 21-25 (continues from v1.2)
**Requirements:** 17

## Phase Overview

| Phase | Name                    | Goal                                              | Requirements                      |
| ----- | ----------------------- | ------------------------------------------------- | --------------------------------- |
| 21    | Source Selection UI     | Admin can toggle between MusicBrainz and Discogs  | UI-01, UI-02, UI-03, UI-04        |
| 22    | Discogs Album Search    | Admin can search Discogs for album corrections    | ALB-01, ALB-02, ALB-03, MAP-01    |
| 23    | Discogs Album Apply     | Admin can preview and apply Discogs album data    | ALB-04, ALB-05                    |
| 24    | Discogs Artist Search   | Admin can search Discogs for artist corrections   | ART-01, ART-02, ART-03, MAP-02    |
| 25    | Discogs Artist Apply    | Admin can preview and apply Discogs artist data   | ART-04, ART-05, MAP-03            |

---

## Phase 21: Source Selection UI

**Goal:** Admin can toggle between MusicBrainz and Discogs as the correction source before searching.

**Depends on:** Phase 20 (v1.2 complete)

**Requirements:** UI-01, UI-02, UI-03, UI-04

**Success Criteria:**

1. Correction modal displays source toggle with MusicBrainz and Discogs options
2. Selected source persists in Zustand store across modal interactions
3. Search view header shows which source is active
4. Preview view shows source indicator badge (MusicBrainz or Discogs)
5. Switching sources clears previous search results

**Key Files:**

- `src/stores/useCorrectionStore.ts`
- `src/stores/useArtistCorrectionStore.ts`
- `src/components/admin/correction/CorrectionModal.tsx`
- `src/components/admin/correction/artist/ArtistCorrectionModal.tsx`
- `src/components/admin/correction/search/SearchView.tsx`

**Plans:** TBD

---

## Phase 22: Discogs Album Search

**Goal:** Admin can search Discogs for albums and see results in the same format as MusicBrainz.

**Depends on:** Phase 21

**Requirements:** ALB-01, ALB-02, ALB-03, MAP-01

**Success Criteria:**

1. Admin can enter album query and search Discogs
2. Search uses existing BullMQ queue infrastructure (rate-limited)
3. Discogs album results display in same card format as MusicBrainz results
4. Album data maps correctly to internal Album model fields
5. Selecting a Discogs result transitions to preview step

**Key Files:**

- `src/lib/correction/search-service.ts` (extend for Discogs)
- `src/lib/discogs/album-search-service.ts` (new)
- `src/lib/discogs/album-mappers.ts` (new)
- `src/lib/queue/processors/discogs-processor.ts` (add album search)
- `src/graphql/schema.graphql` (add Discogs album search mutation)

**Plans:** TBD

---

## Phase 23: Discogs Album Apply

**Goal:** Admin can preview Discogs album data side-by-side and apply corrections.

**Depends on:** Phase 22

**Requirements:** ALB-04, ALB-05

**Success Criteria:**

1. Preview view shows current album data alongside Discogs data
2. Field differences are highlighted (same diff UI as MusicBrainz)
3. Admin can select which fields to apply
4. Applying correction updates album in database
5. Discogs ID stored in album's external IDs on apply

**Key Files:**

- `src/lib/correction/preview/preview-service.ts` (extend for Discogs)
- `src/lib/correction/apply/apply-service.ts` (extend for Discogs)
- `src/components/admin/correction/preview/PreviewView.tsx`
- `src/components/admin/correction/apply/ApplyView.tsx`

**Plans:** TBD

---

## Phase 24: Discogs Artist Search

**Goal:** Admin can search Discogs for artists and see results in the same format as MusicBrainz.

**Depends on:** Phase 21

**Requirements:** ART-01, ART-02, ART-03, MAP-02

**Success Criteria:**

1. Admin can enter artist query and search Discogs
2. Search uses existing BullMQ queue infrastructure (existing DISCOGS_SEARCH_ARTIST)
3. Discogs artist results display in same card format as MusicBrainz results
4. Artist data maps correctly to internal Artist model fields
5. Selecting a Discogs result transitions to preview step

**Key Files:**

- `src/lib/correction/artist/search-service.ts` (extend for Discogs)
- `src/lib/discogs/mappers.ts` (may need extension)
- `src/graphql/schema.graphql` (add Discogs artist search mutation)

**Plans:** TBD

---

## Phase 25: Discogs Artist Apply

**Goal:** Admin can preview Discogs artist data side-by-side and apply corrections.

**Depends on:** Phase 24

**Requirements:** ART-04, ART-05, MAP-03

**Success Criteria:**

1. Preview view shows current artist data alongside Discogs data
2. Field differences are highlighted (same diff UI as MusicBrainz)
3. Admin can select which fields to apply
4. Applying correction updates artist in database
5. Discogs ID stored in artist's external IDs on apply

**Key Files:**

- `src/lib/correction/artist/preview/preview-service.ts` (extend for Discogs)
- `src/lib/correction/artist/apply/apply-service.ts` (extend for Discogs)
- `src/components/admin/correction/artist/preview/ArtistPreviewView.tsx`
- `src/components/admin/correction/artist/apply/ArtistApplyView.tsx`

**Plans:** TBD

---

## Dependency Graph

```
Phase 21 (Source Selection UI)
    ├──→ Phase 22 (Discogs Album Search)
    │         ↓
    │    Phase 23 (Discogs Album Apply)
    │
    └──→ Phase 24 (Discogs Artist Search)
              ↓
         Phase 25 (Discogs Artist Apply)
```

**Critical Path:** 21 → 22 → 23 (for album corrections)

**Parallelization:** After Phase 21, album (22-23) and artist (24-25) tracks can run in parallel.

---

## Risk Mitigation

| Risk                                   | Mitigation                                           |
| -------------------------------------- | ---------------------------------------------------- |
| Discogs API rate limits stricter       | Already using BullMQ queue — same pattern            |
| Album search not in existing processor | Add new job type, follow existing pattern            |
| Different data shapes between sources  | Abstract behind common interface in services         |
| UI complexity with source switching    | Keep toggle simple, clear results on switch          |

---

## Requirement Coverage

| Requirement | Phase | Description                                      |
| ----------- | ----- | ------------------------------------------------ |
| UI-01       | 21    | Correction modal shows source toggle             |
| UI-02       | 21    | Selected source persists in Zustand store        |
| UI-03       | 21    | Search view adapts to selected source            |
| UI-04       | 21    | Preview view shows source indicator              |
| ALB-01      | 22    | Admin can search Discogs for albums              |
| ALB-02      | 22    | Discogs album search uses queue infrastructure   |
| ALB-03      | 22    | Discogs album results display like MusicBrainz   |
| ALB-04      | 23    | Admin can preview Discogs album data side-by-side|
| ALB-05      | 23    | Admin can apply album correction from Discogs    |
| ART-01      | 24    | Admin can search Discogs for artists             |
| ART-02      | 24    | Discogs artist search uses queue infrastructure  |
| ART-03      | 24    | Discogs artist results display like MusicBrainz  |
| ART-04      | 25    | Admin can preview Discogs artist data side-by-side|
| ART-05      | 25    | Admin can apply artist correction from Discogs   |
| MAP-01      | 22    | Discogs album fields map to Album model          |
| MAP-02      | 24    | Discogs artist fields map to Artist model        |
| MAP-03      | 25    | Discogs IDs stored as external IDs on apply      |

**Coverage:** 17/17 requirements mapped

---

_Roadmap created: 2026-02-08_
_Last updated: 2026-02-08_
