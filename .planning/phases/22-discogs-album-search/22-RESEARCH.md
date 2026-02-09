# Phase 22: Discogs Album Search - Research

**Researched:** 2026-02-08
**Domain:** Discogs API integration for album search in correction modal
**Confidence:** HIGH

## Summary

This phase adds Discogs album search as a second data source for the admin correction modal. The implementation follows the established MusicBrainz pattern: queue-based search using BullMQ, GraphQL query layer, and shared UI components. The existing infrastructure (disconnect library, discogs-processor, mappers) already handles artist search, so extending to album search is straightforward.

The Discogs API provides a database search endpoint that supports filtering by type (master releases), artist name, and release title. Masters are canonical album versions that group all physical/digital variations, making them ideal for correction (cleaner results without pressing duplicates). The disconnect npm library already used for artist search provides the database.search() method needed for album search.

Rate limiting matches the existing pattern: BullMQ queue with 1 request/second (Discogs allows 60/minute authenticated, so 1/second is well within limits). The existing queue infrastructure supports both MusicBrainz and Discogs jobs, with separate job types routing to appropriate processors.

**Primary recommendation:** Extend existing Discogs infrastructure with new DISCOGS_SEARCH_ALBUM job type, reuse mapDiscogsMasterToAlbum() mapper, and integrate into correction search UI using source toggle pattern from Phase 21.

## Standard Stack

### Core

**Library** | **Version** | **Purpose** | **Why Standard**
disconnect | 1.2.2 | Discogs API client | Already integrated for artist search, provides database.search() method
BullMQ | latest | Queue/rate limiting | Existing queue infrastructure handles both MusicBrainz and Discogs
GraphQL | latest | API layer | Thin resolver pattern for correction queries
Zustand | latest | State management | Correction store already manages source selection

### Supporting

**Library** | **Version** | **Purpose** | **When to Use**
@tanstack/react-query | v5 | Data fetching | GraphQL query hooks (auto-generated)
graphql-codegen | latest | Type generation | Generate TypeScript types from schema

### Alternatives Considered

**Instead of** | **Could Use** | **Tradeoff**
disconnect | discogs-client, raw fetch | disconnect already integrated, no benefit to switching
Master releases | All releases | Masters group versions (cleaner results), decision locked in CONTEXT.md

**Installation:**
No new packages needed - all dependencies already installed.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── discogs/
│   │   ├── mappers.ts               # EXTEND: Add master search result mapper
│   │   └── album-search-service.ts  # NEW: Discogs album search logic
│   ├── correction/
│   │   └── search-service.ts        # EXTEND: Add Discogs search path
│   └── queue/
│       ├── jobs.ts                  # EXTEND: Add DISCOGS_SEARCH_ALBUM job type
│       └── processors/
│           └── discogs-processor.ts # EXTEND: Add album search handler
├── graphql/
│   └── schema.graphql               # EXTEND: Add Discogs to CorrectionSearchInput
└── components/admin/correction/
    └── search/
        └── SearchView.tsx           # EXTEND: Add Discogs search query
```

### Pattern 1: Queue-Based Discogs Search

**What:** Add DISCOGS_SEARCH_ALBUM job type to existing discogs-processor, using disconnect library's database.search() method

**When to use:** All Discogs album searches from correction modal (triggered when source=discogs)

**Example:**
```typescript
// src/lib/queue/jobs.ts
export const JOB_TYPES = {
  // ... existing types
  DISCOGS_SEARCH_ALBUM: 'discogs:search-album',
} as const;

export interface DiscogsSearchAlbumJobData {
  albumId: string;          // For logging/tracking
  albumTitle?: string;      // Album search query
  artistName?: string;      // Artist filter (optional)
  limit?: number;           // Results per page
  requestId?: string;       // Request tracking
  parentJobId?: string;     // Job chain tracking
}

// src/lib/queue/processors/discogs-processor.ts
export async function handleDiscogsSearchAlbum(
  job: Job<DiscogsSearchAlbumJobData>
): Promise<unknown> {
  const data = job.data;
  
  // Initialize disconnect client (same pattern as artist search)
  const Discogs = await import('disconnect');
  const discogsClient = new Discogs.default.Client({
    userAgent: 'RecProject/1.0 +https://rec-music.org',
    consumerKey: process.env.CONSUMER_KEY!,
    consumerSecret: process.env.CONSUMER_SECRET!,
  }).database();

  // Build search options
  const searchOptions: any = {
    type: 'master',                    // Masters only (per CONTEXT.md)
    per_page: data.limit || 10,
  };
  
  if (data.albumTitle) {
    searchOptions.release_title = data.albumTitle;
  }
  if (data.artistName) {
    searchOptions.artist = data.artistName;
  }

  // Execute search
  const searchResults = await discogsClient.search(searchOptions);
  
  // Map results to correction format
  const masters = await Promise.all(
    searchResults.results.map(async (result) => {
      // Fetch full master details (search returns minimal data)
      const master = await discogsClient.getMaster(result.id);
      return mapDiscogsMasterToCorrectionResult(master);
    })
  );

  return {
    albumId: data.albumId,
    action: 'search_complete',
    resultsCount: masters.length,
    results: masters,
  };
}
```
**Source:** Existing pattern from handleDiscogsSearchArtist() in discogs-processor.ts

### Pattern 2: Two-Step Mapping (Search → Master → CorrectionResult)

**What:** Discogs search returns minimal data, so fetch full master details before mapping to correction result format

**When to use:** Discogs album search (MusicBrainz doesn't need this - search results have all needed data)

**Example:**
```typescript
// src/lib/discogs/album-search-service.ts
async searchAlbums(
  albumTitle?: string,
  artistName?: string,
  limit = 10
): Promise<CorrectionSearchResult[]> {
  const searchOptions: any = {
    type: 'master',
    per_page: limit,
  };
  
  if (albumTitle) searchOptions.release_title = albumTitle;
  if (artistName) searchOptions.artist = artistName;

  const searchResults = await this.discogsClient.search(searchOptions);
  
  // Two-step mapping: search result → full master → correction result
  const correctionResults = await Promise.all(
    searchResults.results.map(async (searchResult) => {
      // Step 1: Fetch full master data
      const master = await this.discogsClient.getMaster(searchResult.id);
      
      // Step 2: Map to correction result format
      return this.mapMasterToCorrectionResult(master);
    })
  );
  
  return correctionResults;
}

private mapMasterToCorrectionResult(
  master: DiscogsMaster
): CorrectionSearchResult {
  // Extract year from master.year (Discogs uses number, not date string)
  const year = master.year?.toString() || '';
  const firstReleaseDate = year; // Masters don't have exact dates
  
  // Merge genres + styles per CONTEXT.md decision
  const genres = [
    ...(master.genres || []),
    ...(master.styles || [])
  ];
  
  // Get primary image
  const coverImage = master.images?.[0];
  
  return {
    releaseGroupMbid: master.id.toString(),  // Use Discogs ID as identifier
    title: master.title,
    disambiguation: undefined,               // Discogs doesn't have this
    artistCredits: master.artists.map(a => ({
      mbid: a.id.toString(),
      name: a.name,
    })),
    primaryArtistName: master.artists.map(a => a.name).join(', '),
    firstReleaseDate: year,
    primaryType: 'Album',                    // Masters are always albums
    secondaryTypes: [],                      // Discogs doesn't have this
    mbScore: 100,                            // No search score from Discogs
    coverArtUrl: coverImage?.uri || null,
    source: 'discogs' as const,
  };
}
```
**Source:** Pattern derived from existing mapDiscogsMasterToAlbum() in src/lib/discogs/mappers.ts

### Pattern 3: Conditional GraphQL Query Based on Source

**What:** GraphQL query enabled conditionally based on correctionSource state value

**When to use:** Search view needs to switch between MusicBrainz and Discogs queries

**Example:**
```typescript
// src/components/admin/correction/search/SearchView.tsx
export function SearchView({ album }: SearchViewProps) {
  const store = getCorrectionStore(album.id);
  const correctionSource = store(s => s.correctionSource);
  
  // MusicBrainz query (existing)
  const mbQuery = useSearchCorrectionCandidatesQuery(
    { input: { albumId: album.id, albumTitle, artistName, limit: 10 } },
    { enabled: correctionSource === 'musicbrainz' && isSearchTriggered }
  );
  
  // Discogs query (new)
  const discogsQuery = useSearchDiscogsCorrectionCandidatesQuery(
    { input: { albumId: album.id, albumTitle, artistName, limit: 10 } },
    { enabled: correctionSource === 'discogs' && isSearchTriggered }
  );
  
  // Use appropriate query based on source
  const { data, isLoading, error } = 
    correctionSource === 'musicbrainz' ? mbQuery : discogsQuery;
  
  // Rest of component logic unchanged
}
```
**Source:** Existing pattern from SearchView.tsx with SourceToggle integration

### Anti-Patterns to Avoid

- **Mixing search and fetch in one job:** Keep search (type=master) separate from getMaster() details fetch. Search job should return search results, not trigger getMaster() calls inline. Use two job types if full master data needed.
- **Assuming Discogs data matches MusicBrainz structure:** Discogs masters lack disambiguation, secondary types, exact release dates. Map carefully to avoid null/undefined issues in UI.
- **Skipping error handling for API timeouts:** Discogs API can be slow/unreliable. Always show error toast on failure, let admin retry manually (don't auto-retry on timeout per CONTEXT.md).

## Don't Hand-Roll

**Problem** | **Don't Build** | **Use Instead** | **Why**
Rate limiting | Custom delay logic | BullMQ limiter config | Already configured for 1 req/sec in musicbrainz-queue.ts
Discogs API client | fetch() wrapper | disconnect library | Already installed, handles auth, pagination, types
Search result mapping | Custom transform | Extend existing mappers.ts | Pattern established for master/release mapping
Job type routing | If/else chains | Extend processMusicBrainzJob() router | Centralized routing in processors/index.ts

**Key insight:** All infrastructure for Discogs integration exists (queue, processor, mappers, types). This phase is extension work, not greenfield. Reuse patterns from artist search.

## Common Pitfalls

### Pitfall 1: Assuming Search Results Include All Master Data

**What goes wrong:** disconnect's database.search() returns minimal data (id, title, thumb, year). Missing genres, styles, tracklist, full artist credits needed for correction result display.

**Why it happens:** Discogs API design - search endpoint optimized for speed, full data requires separate getMaster() call.

**How to avoid:** Always follow two-step pattern: search() → extract IDs → getMaster() for each result. Don't try to use search results directly.

**Warning signs:** UI shows "undefined" for genres, missing cover art, incomplete artist names in Discogs results.

### Pitfall 2: Year-Only Dates Breaking Date Logic

**What goes wrong:** Discogs masters have year (number) but no month/day. MusicBrainz has full dates. Album model expects ISO date string. Mixing these causes date parsing errors.

**Why it happens:** CONTEXT.md specifies "year-only dates use January 1st fallback" but code might not implement this consistently.

**How to avoid:** 
```typescript
// In mapper:
const firstReleaseDate = master.year 
  ? `${master.year}-01-01`  // Fallback to Jan 1
  : '';
```
Always convert year (number) to ISO string with Jan 1 fallback. Document this in mapper comments.

**Warning signs:** Date parsing errors in preview step, year display shows "NaN", sorting by date breaks.

### Pitfall 3: Forgetting to Merge Genres + Styles

**What goes wrong:** Discogs has both genres (broad: Rock, Electronic) and styles (specific: Post-Punk, House). CONTEXT.md requires merging into Album.genres array, but code only uses genres field.

**Why it happens:** Album model has single genres array, but Discogs separates genres/styles. Easy to forget styles field exists.

**How to avoid:**
```typescript
// In mapper:
const genres = [
  ...(master.genres || []),
  ...(master.styles || [])
];
```
Always merge both arrays, genres first (per CONTEXT.md).

**Warning signs:** Genre tags missing in preview (shows "Rock" but not "Post-Punk"), incomplete genre data for Discogs results.

### Pitfall 4: Rate Limit Confusion (Discogs vs MusicBrainz)

**What goes wrong:** Discogs allows 60 requests/minute (authenticated), MusicBrainz allows 1 request/second. Both use same queue, but different limits. Could optimize Discogs to be faster.

**Why it happens:** BullMQ queue configured for strictest limit (MusicBrainz 1/sec), applied to all job types including Discogs.

**How to avoid:** Accept that Discogs will run at 1 req/sec even though it could handle 60/min. Don't try to create separate queues or custom rate limiting. Simplicity > optimization for admin correction (low volume).

**Warning signs:** Admin complains Discogs search is slow. Expected behavior - queue rate limits both sources equally.

## Code Examples

Verified patterns from official sources and existing codebase:

### Discogs Database Search (disconnect library)

```typescript
// Source: src/lib/queue/processors/discogs-processor.ts (artist search pattern)
const Discogs = await import('disconnect');
const discogsClient = new Discogs.default.Client({
  userAgent: 'RecProject/1.0 +https://rec-music.org',
  consumerKey: process.env.CONSUMER_KEY!,
  consumerSecret: process.env.CONSUMER_SECRET!,
}).database();

// Search for masters by artist and release title
const searchResults = await discogsClient.search({
  type: 'master',               // Masters only
  release_title: 'OK Computer', // Album title
  artist: 'Radiohead',         // Artist name (optional filter)
  per_page: 10,                // Results limit
});

// searchResults.results = [{ id, title, thumb, year, genre, label, ... }]
// Minimal data - need getMaster(id) for full details
```

### Master Details Fetch

```typescript
// Source: src/lib/api/albums.ts (getAlbumDetails pattern)
const master = await discogsClient.getMaster(result.id);

// master includes: id, title, artists[], genres[], styles[], 
//   tracklist[], images[], year, main_release, etc.
// Full DiscogsMaster type defined in src/types/discogs/master.ts
```

### Mapping Master to CorrectionSearchResult

```typescript
// Source: Pattern derived from src/lib/discogs/mappers.ts
function mapMasterToCorrectionResult(
  master: DiscogsMaster
): CorrectionSearchResult {
  // Extract artist credits
  const artistCredits = master.artists.map(a => ({
    mbid: a.id.toString(),
    name: a.name,
  }));
  
  // Merge genres + styles (CONTEXT.md requirement)
  const mergedGenres = [
    ...(master.genres || []),
    ...(master.styles || [])
  ];
  
  // Get cover art (first image)
  const coverImage = master.images?.[0];
  
  // Year-only date with Jan 1 fallback (CONTEXT.md requirement)
  const year = master.year?.toString() || '';
  
  return {
    releaseGroupMbid: master.id.toString(),
    title: master.title,
    disambiguation: undefined,  // Discogs doesn't have this
    artistCredits,
    primaryArtistName: master.artists.map(a => a.name).join(', '),
    firstReleaseDate: year,     // Year only
    primaryType: 'Album',       // Masters are albums
    secondaryTypes: [],         // Discogs doesn't categorize
    mbScore: 100,               // No search score
    coverArtUrl: coverImage?.uri || null,
    source: 'discogs' as const,
  };
}
```

### GraphQL Schema Extension

```graphql
# Source: Pattern from src/graphql/schema.graphql (CorrectionSearchInput)
"""
Input for correction search operation.
Extended to support Discogs source.
"""
input CorrectionSearchInput {
  albumId: UUID!
  albumTitle: String
  artistName: String
  yearFilter: Int
  limit: Int
  offset: Int
  source: CorrectionSource  # NEW: 'musicbrainz' | 'discogs'
}

"""
Source for correction data.
"""
enum CorrectionSource {
  MUSICBRAINZ
  DISCOGS
}
```

### Result Card Visual Distinction

```typescript
// Source: Pattern from src/components/admin/correction/search/SearchResultCard.tsx
// CONTEXT.md requires "subtle visual distinction" for Discogs cards

export function SearchResultCard<T extends SearchResultDisplay>({
  result,
  onClick,
}: SearchResultCardProps<T>) {
  // Determine source badge and accent color
  const isDiscogs = result.source === 'discogs';
  const badgeText = isDiscogs ? 'DG' : 'MB';
  const accentColor = isDiscogs 
    ? 'border-orange-900/50 hover:bg-orange-950/20'  // Discogs accent
    : 'hover:bg-zinc-800/50';                        // MusicBrainz default

  return (
    <button
      className={`w-full flex gap-3 p-3 rounded-md transition-colors ${accentColor}`}
      onClick={() => onClick(result)}
    >
      {/* ... card content ... */}
      <Badge className={isDiscogs ? 'bg-orange-900/30' : ''}>
        {badgeText}
      </Badge>
    </button>
  );
}
```

## State of the Art

**Old Approach** | **Current Approach** | **When Changed** | **Impact**
MusicBrainz only | Multi-source (MB + Discogs) | Phase 21-22 (Feb 2026) | Admin can correct from multiple data sources
Manual source switching | Atomic source clearing | Phase 21 (Feb 2026) | Prevents stale data when switching sources
Separate queries per source | Unified CorrectionSearchResult type | Phase 22 (now) | Same result card component for all sources

**Deprecated/outdated:**
- Featured playlists (Spotify API restricted Nov 2024) - use `tag:new` search instead
- Direct disconnect.search() without rate limiting - use BullMQ queue (queue pattern established Phase 16)

## Open Questions

Things that couldn't be fully resolved:

1. **Should Discogs search use scoring/confidence tiers like MusicBrainz?**
   - What we know: MusicBrainz returns search scores (0-100). Discogs doesn't return relevance scores.
   - What's unclear: Should Discogs results show 100% match for all? Should we implement client-side fuzzy matching?
   - Recommendation: Show all Discogs results as 100% match initially. If admin feedback indicates poor result quality, implement client-side string similarity scoring in Phase 23+ (deferred optimization).

2. **Should we fetch full master details for all results, or lazy-load on click?**
   - What we know: search() is fast but returns minimal data. getMaster() is slower but returns full data needed for preview.
   - What's unclear: Tradeoff between upfront loading (fetch all masters on search) vs lazy loading (fetch on result click).
   - Recommendation: Fetch all masters upfront in search job (simpler, consistent with MusicBrainz pattern). Lazy loading adds complexity without clear UX benefit for 10 results.

3. **How to handle masters with no cover art (null images array)?**
   - What we know: Some Discogs masters have no images. Album model requires image object.
   - What's unclear: Fallback placeholder URL format, whether to filter out no-image results.
   - Recommendation: Use same placeholder pattern as MusicBrainz (AlbumImage component handles null gracefully). Don't filter results - missing art shouldn't disqualify a match.

## Sources

### Primary (HIGH confidence)

- Existing codebase patterns:
  - /src/lib/queue/processors/discogs-processor.ts (artist search implementation)
  - /src/lib/discogs/mappers.ts (master/release mapping functions)
  - /src/lib/correction/search-service.ts (MusicBrainz search pattern)
  - /src/types/disconnect.d.ts (disconnect library type definitions)
  - /src/types/discogs/master.ts (DiscogsMaster interface)

### Secondary (MEDIUM confidence)

- [Discogs API Database Search Documentation](https://discogs.com/developers/resources/database/search-endpoint.html) - Search parameters (type, artist, release_title)
- [Discogs Forum - Difference between Master and Release](https://www.discogs.com/forum/thread/348789) - Master vs Release concept explanation
- [Discogs API Rate Limiting](https://www.discogs.com/developers) - 60 requests/minute authenticated

### Tertiary (LOW confidence)

- [disconnect npm package](https://www.npmjs.com/package/disconnect) - Library overview (last published 4 years ago, but still functional)
- [Discogs Forum - Understanding Search Request](https://www.discogs.com/forum/thread/340775) - Search parameter usage examples

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All libraries already integrated, just extending existing patterns
- Architecture: HIGH - Clear patterns from MusicBrainz search (search service, queue job, GraphQL resolver)
- Pitfalls: HIGH - Identified from existing mapper code and API structure differences
- Code examples: HIGH - Derived from working artist search implementation

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days - stable domain, disconnect library inactive but functional)
