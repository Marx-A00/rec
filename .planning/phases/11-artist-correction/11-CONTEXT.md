# Phase 11: Artist Correction - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Same correction workflow (search → preview → apply) adapted for artists. Admin can fix artist data by searching MusicBrainz for artists and applying corrections. This phase reuses patterns established in album correction but applies them to the Artist entity.

</domain>

<decisions>
## Implementation Decisions

### Entry point & access

- "Fix Data" button appears in BOTH locations: artist rows in admin table AND artist detail page
- Uses existing admin artist table (similar to album table in `/admin/music-database`)
- Modal uses identical styling to album correction: same width, step navigation, dark zinc theme

### Preview fields

- Include ALL available MusicBrainz artist fields: name, disambiguation, country, type, begin/end dates, gender, IPI codes, ISNIs, area
- Artist type displayed as plain text label (Person, Group, Orchestra, Choir, Character, Other)
- Partial dates shown as-is — preserve MusicBrainz precision ("1965" or "1965-03" or "1965-03-21")
- Show "X albums in database by this artist" count for admin context

### Search behavior

- Search pre-populated with current artist name (same pattern as albums)
- Disambiguation shown as subtitle: name on first line, disambiguation below in smaller text
- Search results show 2-3 top releases to help identify the right artist

### Apply scope

- Corrections cascade to related albums (AlbumArtist records get updated)
- Selective field checkboxes — same pattern as albums, admin chooses which fields to apply
- MBID is a selectable field — admin can choose to link/update the MusicBrainz ID
- After applying, offer option: "Re-enrich X albums by this artist?"

### Claude's Discretion

- Quality indicator styling for artist "Fix Data" button (whether to show quality-based icon colors)
- Artist images in search results (no images, placeholder avatar, or other approach)

</decisions>

<specifics>
## Specific Ideas

- Modal should feel identical to album correction for consistent admin experience
- Top releases in search results help disambiguate artists with common names (like "John Smith")
- Re-enrichment trigger after artist correction connects this phase to future enrichment workflows

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 11-artist-correction_
_Context gathered: 2026-01-27_
