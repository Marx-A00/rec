# Phase 25: Discogs Artist Apply - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin can preview Discogs artist data side-by-side and apply corrections to artists in the database. This mirrors the album apply flow (Phase 23) but for artists. Search is already complete (Phase 24).

</domain>

<decisions>
## Implementation Decisions

### Field Mapping
- Include all fields the database can store from Discogs artist data
- Diffable fields: name, biography (from Discogs profile), formedYear, countryCode, area, artistType, genres, imageUrl
- Biography: include in diff if Discogs has profile text
- Realname: store in biography/disambiguation if useful (no dedicated field in schema)
- Genres: merge Discogs styles into genres array (styles are more specific sub-genres)

### External ID Storage
- Store Discogs artist ID in `discogsId` field on apply (same pattern as albums)
- Overwrite existing discogsId silently if user applies different Discogs artist
- Update `source` field to DISCOGS on apply
- Store discogsId as string ("123456") — matches VarChar(20) schema type

### Source-Conditional Fields
- Include formedYear if Discogs provides it
- **Research needed:** Determine which fields (artistType, area, etc.) should be MusicBrainz-only vs available from both sources

### Image Handling
- Include imageUrl in diff if Discogs has an image
- Use primary image (type: "primary") first
- Fall back to first secondary image if no primary exists
- Upload to Cloudflare on apply for optimized delivery (get cloudflareImageId)

### Claude's Discretion
- Members/groups arrays: use if there's a sensible place (could append to biography as structured text)
- Technical implementation of Cloudflare upload during apply
- Exact field comparison logic for diff generation

</decisions>

<specifics>
## Specific Ideas

- Follow same patterns as Phase 23 (Discogs Album Apply) for consistency
- Source parameter threading: UI (lowercase) → GraphQL (uppercase) → services (lowercase)
- DISCOGS_GET_ARTIST job type already exists in queue infrastructure

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 25-discogs-artist-apply*
*Context gathered: 2026-02-09*
