# Admin Album Data Correction

## What This Is

A feature for rec-music.org that lets admins fix problematic albums and artists directly from the admin dashboard. Instead of database-level fixes or delete-and-reimport, admins can search MusicBrainz for the correct match, preview the data side-by-side, and apply corrections with one click.

## Core Value

Admins can fix a broken album (trackless, wrong metadata, missing IDs) in under a minute without touching the database.

## Current State

**Shipped:** v1.1 Zustand Correction Modal Refactor (2026-02-05)

The correction feature is complete with clean state management:
- Album and artist correction modals use Zustand stores with sessionStorage persistence
- All child components read state from stores (no prop drilling)
- Atomic state transitions ensure consistent UI
- 14 phases, 42 plans completed across v1.0 and v1.1

**Tech stack:** Next.js 15, GraphQL (Apollo), Prisma, React Query, Zustand 5.0.8

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

### Active

(None — planning next milestone)

### Out of Scope

- Discogs integration — MusicBrainz is the base, add other sources later
- Spotify integration — same reason
- Bulk correction queue — fix albums one at a time for now
- Auto-suggestion of corrections — v1 is manual search only
- Duplicate album merging — separate feature
- User-submitted corrections — admin-only for now

## Context

The platform accumulated albums with data quality issues. The correction feature shipped in v1.0 with full functionality. v1.1 refactored state management from fragmented useState + manual sessionStorage to clean Zustand stores.

**Current codebase:**
- 2 Zustand stores: `useCorrectionStore.ts` (487 lines), `useArtistCorrectionStore.ts` (491 lines)
- 7 child components migrated to store consumption
- Legacy hooks deleted: `useCorrectionModalState.ts`, `useArtistCorrectionModalState.ts`

## Constraints

- **API Rate Limits**: MusicBrainz allows 1 request/second — use existing BullMQ queue
- **Tech Stack**: Next.js 15, GraphQL (Apollo), Prisma, React Query — follow existing patterns
- **Auth**: Only ADMIN/OWNER roles can access correction features
- **No `any` types**: Fully typed stores, actions, selectors

## Key Decisions

| Decision                             | Rationale                                                 | Outcome |
| ------------------------------------ | --------------------------------------------------------- | ------- |
| MusicBrainz only for v1              | It's the base data source; Discogs/Spotify can come later | ✓ Good  |
| Core flow before bulk operations     | Get search/preview/apply working first                    | ✓ Good  |
| Session-only state                   | No need to persist correction queue to DB                 | ✓ Good  |
| Separate stores for album and artist | Different state shapes (dual mode vs search-only)         | ✓ Good  |
| Accept one-time sessionStorage reset | Admin-only, corrections are short-lived                   | ✓ Good  |
| Factory pattern with Map cache       | Per-entity store instances with proper cleanup            | ✓ Good  |
| Atomic actions for multi-field state | Prevents intermediate states and race conditions          | ✓ Good  |

---

_Last updated: 2026-02-05 after v1.1 milestone completion_
