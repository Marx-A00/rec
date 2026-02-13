# Phase 14: Artist Correction Store - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace useState + manual sessionStorage synchronization in the artist correction modal with a single Zustand store. Zero UI changes — identical behavior, cleaner internals. Follows the pattern established in Phase 13 (Album Correction Store).

</domain>

<decisions>
## Implementation Decisions

### Store shape

- Mirror the album store structure — include `mode` field (search/manualEdit) even though artist only uses search mode today
- Include full manual edit state fields in the type definition now (name, disambiguation, country, type, area, beginDate, endDate, gender, externalIds) — unused but ready for when manual edit ships for artists
- Factory pattern with Map cache, keyed by artistId (same as album store keyed by albumId)
- Persist to sessionStorage with key pattern matching album convention

### Preview data ownership

- `previewData` (ArtistCorrectionPreview) moves into the store — same as album pattern
- `showAppliedState` (success animation boolean) stays as local modal state — transient UI feedback, shouldn't persist
- `shouldEnrich` (re-enrichment checkbox preference) stays as local modal state — ephemeral per-session choice

### Prop reduction targets

- ArtistSearchView: `artistId` only (to locate store instance + fetch artist details)
- ArtistPreviewView: `artistId` only (to locate store instance; reads everything else from store)
- ArtistApplyView: `artistId`, `isApplying`, `error` (artistId for store access, mutation state from parent)
- ArtistCorrectionModal: keeps mutation callbacks (orchestrates toast + store + queryClient invalidation) — same pattern as album

### Persistence

- Same persist middleware pattern as album store (sessionStorage)
- Persisted fields: step, mode, searchQuery, searchOffset, selectedArtistMbid, manualEditState
- Transient fields (not persisted): previewData, isPreviewLoading, pendingAction, and any derived state

### Claude's Discretion

- Exact atomic action names and signatures (follow album store conventions)
- Derived selector implementations
- Store cleanup/reset logic on modal close

</decisions>

<specifics>
## Specific Ideas

- "Mirror the album store" — user wants structural consistency so manual edit can be added later without reshaping the store
- Manual edit fields for artist defined now: name, disambiguation, countryCode, artistType, area, beginDate, endDate, gender, externalIds (musicbrainzId, ipi, isni)
- Artist modal has 4 steps today: Current (0), Search (1), Preview (2), Apply (3) — manual edit will add a 5th when it ships

</specifics>

<deferred>
## Deferred Ideas

- Artist manual edit mode UI — future phase (store shape is ready for it)

</deferred>

---

_Phase: 14-artist-correction-store_
_Context gathered: 2026-02-04_
