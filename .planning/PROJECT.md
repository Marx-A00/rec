# Admin Album Data Correction

## What This Is

A feature for rec-music.org that lets admins fix problematic albums and artists directly from the admin dashboard. Instead of database-level fixes or delete-and-reimport, admins can search MusicBrainz for the correct match, preview the data side-by-side, and apply corrections with one click.

## Core Value

Admins can fix a broken album (trackless, wrong metadata, missing IDs) in under a minute without touching the database.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Admin can open a correction modal from an album row
- [ ] Admin can search MusicBrainz for matching albums
- [ ] Search results show match confidence scores
- [ ] Admin can preview full data from a search result
- [ ] Preview shows side-by-side comparison (current vs. source)
- [ ] Changed fields are highlighted (additions, modifications)
- [ ] Preview includes track listing from the source
- [ ] Admin can select which fields to update
- [ ] Admin can apply correction with confirmation
- [ ] Corrections are atomic (all or nothing)
- [ ] Corrections are logged with admin user ID
- [ ] Admin can optionally trigger re-enrichment after correction
- [ ] Admin can manually edit fields without external search (typo fixes)
- [ ] Admin can manually set/clear external IDs
- [ ] Same correction workflow works for artists

### Out of Scope

- Discogs integration — MusicBrainz is the base, add other sources later
- Spotify integration — same reason
- Bulk correction queue — fix albums one at a time for now
- Filtering/indicators for finding problem albums — use existing admin views
- Auto-suggestion of corrections — v1 is manual search only
- Duplicate album merging — separate feature
- User-submitted corrections — admin-only for now

## Context

The platform has accumulated albums with data quality issues:
- Trackless albums imported from Discogs that couldn't match MusicBrainz
- Artist name corruption (e.g., "Mama Cass*")
- Missing or incorrect external IDs
- Failed automatic enrichment edge cases

Existing infrastructure to leverage:
- MusicBrainz service at `/src/lib/musicbrainz/musicbrainz-service.ts`
- BullMQ queue system for rate limiting and re-enrichment
- GraphQL API with codegen
- Admin dashboard with album/artist views
- `enrichment_logs` table for tracking corrections

## Constraints

- **API Rate Limits**: MusicBrainz allows 1 request/second — use existing BullMQ queue
- **Tech Stack**: Next.js 15, GraphQL (Apollo), Prisma, React Query — follow existing patterns
- **Auth**: Only ADMIN/OWNER roles can access correction features

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| MusicBrainz only for v1 | It's the base data source; Discogs/Spotify can come later | — Pending |
| Core flow before bulk operations | Get search/preview/apply working first | — Pending |
| Session-only state | No need to persist correction queue to DB | — Pending |

---
*Last updated: 2026-01-23 after initialization*
