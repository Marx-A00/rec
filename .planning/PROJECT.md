# Admin Album Data Correction

## What This Is

A feature for rec-music.org that lets admins fix problematic albums and artists directly from the admin dashboard. Instead of database-level fixes or delete-and-reimport, admins can search MusicBrainz or Discogs for the correct match, preview the data side-by-side, and apply corrections with one click.

## Core Value

Admins can fix a broken album (trackless, wrong metadata, missing IDs) in under a minute without touching the database.

## Current State

**Shipped:** v1.2 Job History Timeline UI (2026-02-07)

The correction feature is complete with clean state management and enrichment timeline:

- Album and artist correction modals use Zustand stores with sessionStorage persistence
- All child components read state from stores (no prop drilling)
- Atomic state transitions ensure consistent UI
- Enrichment timelines show job parent-child relationships
- 20 phases, 57 plans completed across v1.0, v1.1, and v1.2

**Tech stack:** Next.js 15, GraphQL (Apollo), Prisma, React Query, Zustand 5.0.8

## Current Milestone: v1.3 Discogs Correction Source

**Goal:** Add Discogs as a second search source for corrections, giving admins the choice of MusicBrainz or Discogs when fixing album/artist data.

**Target features:**

- Source toggle (MusicBrainz / Discogs) in correction modals
- Discogs search for albums via existing queue infrastructure
- Discogs search for artists via existing queue infrastructure
- Preview and apply corrections from Discogs data
- Same field selection / atomic apply pattern as MusicBrainz
- Works for both album and artist correction workflows

## Requirements

### Validated

- ✓ Admin can open correction modal from album row — v1.0
- ✓ Admin can search MusicBrainz for matching albums — v1.0
- ✓ Search results show match confidence scores — v1.0
- ✓ Admin can preview full data from a search result — v1.0
- ✓ Preview shows side-by-side comparison (current vs. source) — v1.0
- ✓ Changed fields are highlighted (additions, modifications) — v1.0
- ✓ Preview includes track listing from the source — v1.0
- ✓ Admin can select which fields to update — v1.0
- ✓ Admin can apply correction with confirmation — v1.0
- ✓ Corrections are atomic (all or nothing) — v1.0
- ✓ Corrections are logged with admin user ID — v1.0
- ✓ Admin can optionally trigger re-enrichment after correction — v1.0
- ✓ Admin can manually edit fields without external search (typo fixes) — v1.0
- ✓ Admin can manually set/clear external IDs — v1.0
- ✓ Same correction workflow works for artists — v1.0
- ✓ Album correction modal state managed by Zustand store — v1.1
- ✓ Artist correction modal state managed by Zustand store — v1.1
- ✓ Child components read state from store selectors (no prop drilling) — v1.1
- ✓ Atomic state transitions for mode switches, step nav, preview load — v1.1
- ✓ SessionStorage persistence via Zustand persist middleware — v1.1
- ✓ Legacy state hooks deleted — v1.1
- ✓ EnrichmentLog has `parentJobId` field for job linking — v1.2
- ✓ All job processors propagate `parentJobId` through job chains — v1.2
- ✓ Cache processors (album cover, artist image) log to EnrichmentLog — v1.2
- ✓ Discogs processors (search, get) log to EnrichmentLog — v1.2
- ✓ GraphQL query fetches `jobId` and `parentJobId` — v1.2
- ✓ Timeline component displays job hierarchy on row expand — v1.2
- ✓ Child jobs hidden from main table, shown in parent's timeline — v1.2
- ✓ Job History tab shows linked job timelines — v1.2
- ✓ EnrichmentLogTable (album/artist panels) shows linked job timelines — v1.2

### Active

- [ ] Correction modal has source toggle (MusicBrainz / Discogs)
- [ ] Admin can search Discogs for albums
- [ ] Admin can search Discogs for artists
- [ ] Discogs search results show in same format as MusicBrainz
- [ ] Admin can preview Discogs album data side-by-side
- [ ] Admin can preview Discogs artist data side-by-side
- [ ] Admin can apply corrections from Discogs source
- [ ] Discogs corrections use same atomic apply pattern

### Out of Scope

- Spotify integration — defer to future milestone
- Bulk correction queue — fix albums one at a time for now
- Auto-suggestion of corrections — v1 is manual search only
- Duplicate album merging — separate feature
- User-submitted corrections — admin-only for now
- Searching both sources simultaneously — pick one, search that

## Context

The platform accumulated albums with data quality issues. The correction feature shipped in v1.0 with full functionality. v1.1 refactored state management. v1.2 added enrichment timeline visualization.

**Current codebase:**

- 2 Zustand stores: `useCorrectionStore.ts`, `useArtistCorrectionStore.ts`
- Existing Discogs infrastructure: `DISCOGS_SEARCH_ARTIST`, `DISCOGS_GET_ARTIST` processors
- Discogs service layer already exists for artist enrichment
- MusicBrainz correction services: `correction-service.ts`, `correction-preview.ts`, `apply-correction.ts`

**v1.3 context:**

- Discogs rate limits: 60 requests/minute (more generous than MusicBrainz)
- Existing Discogs queue jobs can be reused/extended
- Need to map Discogs fields to our album/artist models
- Store needs `searchSource` state to track selected source

## Constraints

- **API Rate Limits**: Discogs allows 60 requests/minute — use existing BullMQ queue
- **Tech Stack**: Next.js 15, GraphQL (Apollo), Prisma, React Query — follow existing patterns
- **Auth**: Only ADMIN/OWNER roles can access correction features
- **No `any` types**: Fully typed stores, actions, selectors

## Key Decisions

| Decision                             | Rationale                                                          | Outcome   |
| ------------------------------------ | ------------------------------------------------------------------ | --------- |
| MusicBrainz only for v1              | It's the base data source; Discogs/Spotify can come later          | ✓ Good    |
| Core flow before bulk operations     | Get search/preview/apply working first                             | ✓ Good    |
| Session-only state                   | No need to persist correction queue to DB                          | ✓ Good    |
| Separate stores for album and artist | Different state shapes (dual mode vs search-only)                  | ✓ Good    |
| Accept one-time sessionStorage reset | Admin-only, corrections are short-lived                            | ✓ Good    |
| Factory pattern with Map cache       | Per-entity store instances with proper cleanup                     | ✓ Good    |
| Atomic actions for multi-field state | Prevents intermediate states and race conditions                   | ✓ Good    |
| `parentJobId` over unified requestId | Preserves unique job IDs for debugging, adds explicit relationship | ✓ Good    |
| shadcn-timeline for UI               | Consistent with shadcn/ui patterns, Framer Motion animations       | ✓ Good    |
| Toggle for source selection          | Pick one source, search that — simpler than combined results       | — Pending |
| Reuse existing Discogs queue         | Infrastructure already exists, maintains rate limiting             | — Pending |

---

_Last updated: 2026-02-08 after v1.3 milestone started_
