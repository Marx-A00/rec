# Milestones

## v1.0 — Admin Album Data Correction

**Shipped:** 2026-02-03
**Phases:** 1–12 (37 plans)
**Branch:** `feat/admin-enrich-UI`

**What shipped:**
- MusicBrainz search with fuzzy matching, rate limiting, MBID verification
- Side-by-side preview with field diff highlighting
- Selective field apply with atomic transactions and audit logging
- GraphQL integration (schema, resolvers, generated hooks)
- Correction modal with step navigation and sessionStorage persistence
- Search UI with results, match scores, pagination
- Preview UI with field comparison and track listing
- Apply UI with field selection checkboxes, confirmation, re-enrichment trigger
- Manual edit mode for direct field/ID editing
- Artist correction workflow (search, preview, apply)
- Polish: error states, loading skeletons, keyboard shortcuts, accessibility

**Key decisions:**
- MusicBrainz only for v1 (Discogs/Spotify deferred)
- Session-only state (no DB persistence for correction queue)
- Thin resolver pattern — all business logic in services

---
