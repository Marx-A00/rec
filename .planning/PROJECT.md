# Admin Album Data Correction

## What This Is

A feature for rec-music.org that lets admins fix problematic albums and artists directly from the admin dashboard. Instead of database-level fixes or delete-and-reimport, admins can search MusicBrainz or Discogs for the correct match, preview the data side-by-side, and apply corrections with one click.

## Core Value

Admins can fix a broken album (trackless, wrong metadata, missing IDs) in under a minute without touching the database.

## Current State

**Shipped:** v1.3 Discogs Correction Source (2026-02-09)

The correction feature is complete with dual-source support and entity lifecycle tracking:

- Album and artist correction modals with MusicBrainz/Discogs toggle
- Zustand stores with sessionStorage persistence
- Enrichment timelines showing job parent-child relationships
- 25 phases, 72 plans completed across v1.0, v1.1, v1.2, and v1.3

**Tech stack:** Next.js 15, GraphQL (Apollo), Prisma, React Query, Zustand 5.0.8

## Current Milestone: v1.4 LlamaLog - Entity Provenance & Audit System

**Goal:** Rename EnrichmentLog → LlamaLog and expand from tracking enrichment operations to tracking the complete lifecycle of entities (Albums, Artists, Tracks). Answer the question: "How did this album get into the database, and what happened to it afterward?"

**Target features:**

- 🦙 Rename `EnrichmentLog` → `LlamaLog` throughout the codebase
- 🦙 Add `category` field for broad operation classification (CREATED, ENRICHED, CORRECTED, CACHED, FAILED)
- 🦙 Log entity creation events with full context (who, why, what triggered it)
- 🦙 Track all creation paths: recommendations, collection adds, search/save, spotify sync, admin import
- 🦙 Maintain parent-child job relationships to trace cascading entity creation
- 🦙 Support Albums, Artists, and Tracks from the start
- 🦙 Add llama emoji to code comments, logger output, and admin UI

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
- ✓ Correction modal has source toggle (MusicBrainz / Discogs) — v1.3
- ✓ Admin can search Discogs for albums — v1.3
- ✓ Admin can search Discogs for artists — v1.3
- ✓ Discogs search results show in same format as MusicBrainz — v1.3
- ✓ Admin can preview Discogs album data side-by-side — v1.3
- ✓ Admin can preview Discogs artist data side-by-side — v1.3
- ✓ Admin can apply corrections from Discogs source — v1.3
- ✓ Discogs corrections use same atomic apply pattern — v1.3

### Active

- [ ] Prisma model renamed from `EnrichmentLog` to `LlamaLog`
- [ ] Database table renamed via migration preserving all data
- [ ] New `category` enum with values: CREATED, ENRICHED, CORRECTED, CACHED, FAILED
- [ ] Migration backfills existing records with appropriate categories
- [ ] Logger class renamed from `EnrichmentLogger` to `LlamaLogger`
- [ ] All codebase references updated (prisma calls, types, GraphQL, imports)
- [ ] Album creation from recommendations logged with category: CREATED
- [ ] Album creation from collection adds logged with category: CREATED
- [ ] Album creation from Spotify sync logged with category: CREATED
- [ ] Album creation from MusicBrainz sync logged with category: CREATED
- [ ] Album creation from search/save flow logged with category: CREATED
- [ ] Artist creation logged as child of album creation
- [ ] Track creation logged as child of album creation/enrichment
- [ ] Existing enrichment logging updated with category field
- [ ] Console log output uses `[🦙 LlamaLog]` prefix
- [ ] Admin UI displays llama emoji in log views
- [ ] GraphQL query for entity provenance chain

### Out of Scope

- Retroactively determining creation provenance for pre-existing albums
- Full visual tree UI for job chains (simple list is fine)
- Tracking entity deletions — future enhancement
- Tracking entity updates outside enrichment/correction flows
- Custom llama ASCII art in console output (tempting, but no 🦙)

## Context

The platform uses EnrichmentLog to track enrichment operations but doesn't track how entities (albums, artists, tracks) first entered the database. v1.4 expands the logging to cover the complete entity lifecycle — from creation through all subsequent operations.

**Current codebase:**

- `EnrichmentLog` model in Prisma schema with `parentJobId` for job linking
- `EnrichmentLogger` class in `src/lib/enrichment/enrichment-logger.ts`
- Multiple album creation paths: addAlbum, addAlbumToCollection, Spotify sync, MusicBrainz sync
- Parent-child job relationships already supported via `parentJobId` and `isRootJob`

**v1.4 context:**

- Migration must preserve all existing EnrichmentLog data
- Category backfill can use SQL CASE based on operation patterns
- Consider index on `(category, entityType)` for common queries
- LlamaLogger should remain non-blocking (errors logged but not thrown)

## Constraints

- **Tech Stack**: Next.js 15, GraphQL (Apollo), Prisma, React Query — follow existing patterns
- **Auth**: Only ADMIN/OWNER roles can access log views
- **No `any` types**: Fully typed throughout
- **Data Preservation**: Zero data loss during migration

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
| Toggle for source selection          | Pick one source, search that — simpler than combined results       | ✓ Good    |
| Reuse existing Discogs queue         | Infrastructure already exists, maintains rate limiting             | ✓ Good    |
| Rename EnrichmentLog → LlamaLog      | Reflects broader purpose beyond just enrichment                    | — Pending |
| Category enum over operation parsing | Cleaner filtering, backward-compatible with existing operation     | — Pending |

---

_Last updated: 2026-02-09 after v1.4 milestone started_
