# Admin Album Data Correction

## What This Is

A feature for rec-music.org that lets admins fix problematic albums and artists directly from the admin dashboard. Instead of database-level fixes or delete-and-reimport, admins can search MusicBrainz for the correct match, preview the data side-by-side, and apply corrections with one click.

## Core Value

Admins can fix a broken album (trackless, wrong metadata, missing IDs) in under a minute without touching the database.

## Current Milestone: v1.1 Zustand Correction Modal Refactor

**Goal:** Replace fragmented useState + manual sessionStorage persistence in both correction modals with Zustand stores — zero visual changes, cleaner state management.

**Target features:**
- Single Zustand store per modal (album + artist) with persist middleware
- Eliminate prop drilling from child components (SearchView, PreviewView, ApplyView, ManualEditView)
- Atomic state transitions (no more multi-setState cascades)
- Delete legacy useCorrectionModalState and useArtistCorrectionModalState hooks

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

### Active

- [ ] Album correction modal state managed by Zustand store
- [ ] Artist correction modal state managed by Zustand store
- [ ] Child components read state from store selectors (no prop drilling)
- [ ] Atomic state transitions for mode switches, step nav, preview load
- [ ] SessionStorage persistence via Zustand persist middleware
- [ ] Legacy state hooks deleted

### Out of Scope

- Discogs integration — MusicBrainz is the base, add other sources later
- Spotify integration — same reason
- Bulk correction queue — fix albums one at a time for now
- Auto-suggestion of corrections — v1 is manual search only
- Duplicate album merging — separate feature
- User-submitted corrections — admin-only for now
- React Query migration — server state stays as-is
- ManualEditView internal form state — stays as local useState
- Shared store between album and artist — different state shapes warrant separate stores
- New UI features — this is a pure refactor

## Context

The platform has accumulated albums with data quality issues. The correction feature (v1.0) ships and works, but both modals accumulated state management complexity:

- Album CorrectionModal: 7 useState in hook + 6 more in component, manual sessionStorage via dual useEffect
- Artist CorrectionModal: 5 useState in hook, same manual sessionStorage pattern
- Prop drilling through 4-5 child components per modal
- Multi-setState cascades causing double renders

Zustand is already in the codebase (v5.0.8) with established patterns in `useSearchStore.ts` and `useTourStore.ts`.

## Constraints

- **API Rate Limits**: MusicBrainz allows 1 request/second — use existing BullMQ queue
- **Tech Stack**: Next.js 15, GraphQL (Apollo), Prisma, React Query — follow existing patterns
- **Auth**: Only ADMIN/OWNER roles can access correction features
- **Zero Visual Changes**: UI, step flow, keyboard shortcuts, GraphQL queries all unchanged
- **No `any` types**: Fully typed stores, actions, selectors

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| MusicBrainz only for v1 | It's the base data source; Discogs/Spotify can come later | ✓ Good |
| Core flow before bulk operations | Get search/preview/apply working first | ✓ Good |
| Session-only state | No need to persist correction queue to DB | ✓ Good |
| Separate stores for album and artist | Different state shapes (dual mode vs search-only) | — Pending |
| Accept one-time sessionStorage reset | Admin-only, corrections are short-lived | — Pending |

---

*Last updated: 2026-02-04 after milestone v1.1 initialization*
