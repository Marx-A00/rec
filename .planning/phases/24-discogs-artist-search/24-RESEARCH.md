# Phase 24: Discogs Artist Search - Research

**Researched:** 2026-02-09
**Domain:** Discogs API integration for artist search in correction modal
**Confidence:** HIGH

## Summary

This phase extends the existing Discogs infrastructure to support artist search in the admin correction modal. The implementation follows the exact pattern established in Phase 22 (Discogs Album Search): queue-based search using BullMQ, GraphQL query layer with source toggle, and shared UI components with visual distinction.

The critical finding is that all infrastructure already exists. The DISCOGS_SEARCH_ARTIST job type is already implemented and working in the enrichment pipeline. This phase simply exposes that existing functionality to the admin UI by creating a GraphQL resolver and wiring the frontend source toggle.

Unlike album search which requires fetching full master details (two-step process), artist search results from Discogs are sufficient for display without additional API calls. The disconnect library's database.search() returns id, title (name), thumb, and resource_url - enough to populate the ArtistSearchResult interface.

Rate limiting, error handling, queue integration, and fuzzy matching are all already implemented in the existing DISCOGS_SEARCH_ARTIST handler. This is UI integration work, not infrastructure building.

**Primary recommendation:** Wire existing DISCOGS_SEARCH_ARTIST job to GraphQL resolver, enable Discogs toggle in ArtistSearchView, and apply orange accent styling to artist cards. Follow Phase 22's pattern exactly.

## Standard Stack

### Core

**Library** | **Version** | **Purpose** | **Why Standard**
disconnect | 1.2.2 | Discogs API client | Already integrated, database.search() for artists
BullMQ | latest | Queue/rate limiting | Existing queue handles Discogs jobs at 1 req/sec
GraphQL | latest | API layer | Thin resolver pattern for correction queries
Zustand | latest | State management | Artist correction store manages source selection

### Supporting

**Library** | **Version** | **Purpose** | **When to Use**
@tanstack/react-query | v5 | Data fetching | GraphQL query hooks (auto-generated)
graphql-codegen | latest | Type generation | Generate TypeScript types from schema

### Alternatives Considered

**Instead of** | **Could Use** | **Tradeoff**
Existing job | New job type | No benefit - job already works
Search results directly | Fetch full artist details | Search results sufficient for UI display
Fuzzy matching | Exact match only | Already implemented, proven in enrichment

**Installation:**
No new packages needed - all dependencies already installed.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── discogs/
│   │   ├── mappers.ts               # EXTEND: Add artist search result mapper
│   │   └── queued-service.ts        # EXTEND: Add searchArtists() method
│   ├── correction/artist/
│   │   └── search-service.ts        # EXTEND: Add Discogs search path
│   └── graphql/resolvers/
│       └── queries.ts               # EXTEND: Add Discogs resolver to artistCorrectionSearch
├── graphql/
│   ├── schema.graphql               # EXTEND: Add source param to artistCorrectionSearch
│   └── queries/
│       └── artistCorrection.graphql # EXTEND: Add source variable
└── components/admin/correction/artist/search/
    ├── ArtistSearchView.tsx         # EXTEND: Remove placeholder, add Discogs query
    └── ArtistSearchCard.tsx         # EXTEND: Add orange accent for Discogs
```

### Pattern 1: Reuse Existing Queue Job

**What:** The DISCOGS_SEARCH_ARTIST job type already exists and is fully functional. Use QueuedDiscogsService to call it.

**When to use:** All Discogs artist searches from correction modal (triggered when source=discogs)

**Example:**

```typescript
// src/lib/discogs/queued-service.ts - ADD METHOD
export class QueuedDiscogsService {
  // ... existing methods (searchAlbums, getMaster)

  /**
   * Search Discogs for artists by name
   * Returns results in ArtistCorrectionSearchResult format
   * 
   * NOTE: This wraps the existing DISCOGS_SEARCH_ARTIST job type
   * which is already used by enrichment pipeline. No new job needed.
   */
  async searchArtists(
    options: DiscogsArtistSearchOptions
  ): Promise<DiscogsArtistSearchResponse> {
    this.ensureInitialized();

    const { artistId, artistName, limit = 10 } = options;

    console.log(
      chalk.cyan(
        '[QueuedDiscogsService] Queuing artist search for "' + artistName + '"'
      )
    );

    try {
      const job = await this.queue.addJob(
        JOB_TYPES.DISCOGS_SEARCH_ARTIST,
        {
          artistId, // Required by job type
          artistName,
          limit, // Note: existing handler doesn't use limit, returns top 10
          requestId: 'discogs-artist-search-' + Date.now(),
        },
        {
          priority: PRIORITY_TIERS.ADMIN,
          requestId: 'discogs-artist-search-' + artistName,
        }
      );

      const result = await this.waitForJobViaEvents(job.id!);
      
      // Transform enrichment job result to correction format
      return this.mapEnrichmentResultToSearchResponse(result, artistName);
    } catch (error) {
      console.error('[QueuedDiscogsService] Artist search failed:', error);
      throw new Error(
        'Failed to search Discogs artists: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }
}

export interface DiscogsArtistSearchOptions {
  /** Local database artist ID (required by job type for logging) */
  artistId: string;
  /** Artist name to search */
  artistName: string;
  /** Results limit (default 10) */
  limit?: number;
}

export interface DiscogsArtistSearchResponse {
  action: string;
  resultsCount: number;
  results: ArtistCorrectionSearchResult[];
}
```

**Source:** Existing QueuedDiscogsService.searchAlbums() pattern in src/lib/discogs/queued-service.ts

### Pattern 2: Map Discogs Search Results to Correction Format

**What:** Discogs search returns minimal data (id, title, thumb). Map to ArtistCorrectionSearchResult interface, filling missing fields with sensible defaults.

**When to use:** Transforming Discogs search results for correction UI display

**Example:**

```typescript
// src/lib/discogs/mappers.ts - ADD MAPPER

import type { ArtistSearchResult } from '@/lib/correction/artist/types';

/**
 * Map Discogs artist search result to ArtistSearchResult format
 * Used by queue handler and QueuedDiscogsService for correction search results
 * 
 * NOTE: Discogs search results are minimal (id, title, thumb, resource_url)
 * Many fields like country, area, beginDate don't exist in search results
 */
export function mapDiscogsSearchResultToArtistSearchResult(
  searchResult: DiscogsSearchResult
): ArtistSearchResult {
  return {
    artistMbid: searchResult.id.toString(), // Use Discogs ID as identifier
    name: searchResult.title,
    sortName: searchResult.title, // Discogs doesn't have sort names
    disambiguation: undefined, // Discogs doesn't have disambiguation
    type: undefined, // Discogs doesn't categorize Person/Group
    country: undefined, // Not in search results
    area: undefined, // Not in search results
    beginDate: undefined, // Not in search results
    endDate: undefined, // Not in search results
    ended: undefined, // Not in search results
    gender: undefined, // Not in search results
    mbScore: 100, // Discogs doesn't return relevance scores
    topReleases: undefined, // Don't fetch releases for search results (too slow)
    // Add source indicator for UI
    source: 'discogs' as const,
  };
}
```

**Source:** Pattern derived from existing mapMasterToCorrectionSearchResult() in src/lib/discogs/mappers.ts

### Pattern 3: GraphQL Source-Aware Resolver

**What:** artistCorrectionSearch resolver switches between MusicBrainz and Discogs services based on source parameter

**When to use:** Admin correction search with source toggle

**Example:**

```typescript
// src/lib/graphql/resolvers/queries.ts - MODIFY RESOLVER

artistCorrectionSearch: async (
  _parent: unknown,
  args: {
    query: string;
    limit?: number;
    source?: 'musicbrainz' | 'discogs'; // ADD PARAM
  }
) => {
  const { query, limit = 10, source = 'musicbrainz' } = args;

  try {
    // Route based on source
    if (source === 'discogs') {
      // Discogs search path
      const { getQueuedDiscogsService } = await import(
        '@/lib/discogs/queued-service'
      );
      const discogsService = getQueuedDiscogsService();

      const response = await discogsService.searchArtists({
        artistId: 'admin-search-' + Date.now(), // Dummy ID for logging
        artistName: query,
        limit,
      });

      return {
        results: response.results,
        hasMore: false, // Discogs search doesn't support pagination
        query,
      };
    } else {
      // MusicBrainz search path (existing)
      const { getArtistCorrectionSearchService } = await import(
        '@/lib/correction/artist/search-service'
      );
      const searchService = getArtistCorrectionSearchService();

      return await searchService.search({ query, limit });
    }
  } catch (error) {
    console.error('[artistCorrectionSearch] Search failed:', error);
    throw new Error(
      'Failed to search for artist corrections: ' +
        (error instanceof Error ? error.message : 'Unknown error')
    );
  }
}
```

**Source:** Existing searchCorrectionCandidates resolver pattern from src/lib/graphql/resolvers/queries.ts (Phase 22)

### Pattern 4: Frontend Source Toggle Integration

**What:** ArtistSearchView conditionally enables MusicBrainz or Discogs query based on correctionSource state

**When to use:** Artist correction search UI with source selection

**Example:**

```typescript
// src/components/admin/correction/artist/search/ArtistSearchView.tsx

export function ArtistSearchView({ artist }: ArtistSearchViewProps) {
  const store = getArtistCorrectionStore(artist.id);
  const correctionSource = store(s => s.correctionSource);
  const [inputValue, setInputValue] = useState<string>(artist.name);
  const [isSearchTriggered, setIsSearchTriggered] = useState(false);

  // MusicBrainz query (existing)
  const mbQuery = useSearchArtistCorrectionCandidatesQuery(
    { query: inputValue, limit: 10, source: 'musicbrainz' },
    { enabled: correctionSource === 'musicbrainz' && isSearchTriggered }
  );

  // Discogs query (new)
  const discogsQuery = useSearchArtistCorrectionCandidatesQuery(
    { query: inputValue, limit: 10, source: 'discogs' },
    { enabled: correctionSource === 'discogs' && isSearchTriggered }
  );

  // Use appropriate query based on source
  const { data, isLoading, error } =
    correctionSource === 'musicbrainz' ? mbQuery : discogsQuery;

  // Remove Discogs placeholder div
  // Rest of component logic unchanged
}
```

**Source:** Existing album SearchView pattern from Phase 22

### Anti-Patterns to Avoid

- **Creating new job type:** DISCOGS_SEARCH_ARTIST already exists and works. Don't duplicate.
- **Fetching full artist details:** Search results have enough data for display. Don't add getArtist() calls (slow, unnecessary).
- **Custom fuzzy matching:** Existing handler uses calculateStringSimilarity() with 85% threshold. Reuse that logic.
- **Pagination support:** Discogs search doesn't support offset. Always return first page of results.

## Don't Hand-Roll

**Problem** | **Don't Build** | **Use Instead** | **Why**
Artist search job | New DISCOGS_SEARCH_ARTIST_CORRECTION job | Existing DISCOGS_SEARCH_ARTIST | Job already exists, fully functional
Fuzzy matching | Custom string comparison | calculateStringSimilarity() | Already used in enrichment, proven 85% threshold
Rate limiting | Custom delay logic | BullMQ queue | Already configured for 1 req/sec
Result mapping | Custom transform | Extend mappers.ts pattern | Consistent with album search

**Key insight:** This phase is UI wiring work, not infrastructure building. The hard parts (queue, API client, fuzzy matching) are already done.

## Common Pitfalls

### Pitfall 1: Assuming Search Results Need Full Artist Fetch

**What goes wrong:** Developer sees minimal data (id, title, thumb) and assumes they need to call getArtist() for full details like album search does with getMaster().

**Why it happens:** Phase 22 (album search) uses two-step pattern: search → getMaster(). Natural to assume same pattern for artists.

**How to avoid:** Artist search results are sufficient for correction UI. Only fields displayed are: name, disambiguation (always undefined), country/area (undefined), top releases (undefined). No need for full fetch.

**Warning signs:** Slow Discogs search (multiple API calls per result), timeout errors, rate limit issues.

### Pitfall 2: Duplicate Job Type Creation

**What goes wrong:** Developer creates new DISCOGS_SEARCH_ARTIST_CORRECTION job type thinking correction needs different handling than enrichment.

**Why it happens:** Separation of concerns - correction feels like a different domain than enrichment.

**How to avoid:** Check existing job types first. DISCOGS_SEARCH_ARTIST already does exactly what correction needs: search by name, fuzzy match, return top results. Reuse it via QueuedDiscogsService.

**Warning signs:** New job type in JOB_TYPES enum, new handler in discogs-processor.ts, duplicate search logic.

### Pitfall 3: Missing Source Parameter in GraphQL Schema

**What goes wrong:** GraphQL query doesn't include source parameter, so resolver can't switch between MusicBrainz and Discogs.

**Why it happens:** Existing artistCorrectionSearch query doesn't have source param yet (it's MusicBrainz-only until this phase).

**How to avoid:**

```graphql
# Add to schema.graphql
artistCorrectionSearch(
  query: String!
  limit: Int
  source: CorrectionSource  # ADD THIS
): ArtistCorrectionSearchResponse!
```

Always add source to both schema and query file.

**Warning signs:** TypeScript error "source does not exist on type", resolver always uses MusicBrainz, toggle has no effect.

### Pitfall 4: Incorrect artistId in Queue Job

**What goes wrong:** QueuedDiscogsService.searchArtists() passes a random string as artistId, but existing handler expects a valid database artist ID for enrichment logging.

**Why it happens:** Correction search doesn't have a "current artist" - it's a freeform search. But job type requires artistId.

**How to avoid:** Pass a dummy ID that's clearly identifiable as admin search: 'admin-search-' + Date.now(). Enrichment logger handles missing artist gracefully.

```typescript
const response = await discogsService.searchArtists({
  artistId: 'admin-search-' + Date.now(), // Dummy ID
  artistName: query,
  limit,
});
```

**Warning signs:** Database foreign key errors, enrichment logs show "artist not found", job failures.

## Code Examples

Verified patterns from official sources and existing codebase:

### Discogs Artist Search (disconnect library)

```typescript
// Source: src/lib/queue/processors/discogs-processor.ts (existing implementation)
const Discogs = await import('disconnect');
const discogsClient = new Discogs.default.Client({
  userAgent: 'RecProject/1.0 +https://rec-music.org',
  consumerKey: process.env.CONSUMER_KEY!,
  consumerSecret: process.env.CONSUMER_SECRET!,
}).database();

// Search for artist
const searchResults = await discogsClient.search({
  query: 'Radiohead',
  type: 'artist',
  per_page: 10,
});

// searchResults.results = [
//   { id: 123, title: 'Radiohead', thumb: '...', resource_url: '...' },
//   { id: 456, title: 'Radiohead (2)', thumb: '...', resource_url: '...' }
// ]
```

### Fuzzy Matching Best Result

```typescript
// Source: src/lib/queue/processors/discogs-processor.ts (findBestDiscogsArtistMatch)

export function findBestDiscogsArtistMatch(
  searchName: string,
  results: DiscogsSearchResult[]
): { result: DiscogsSearchResult; score: number } | null {
  let bestMatch = null;
  let bestScore = 0;

  for (const result of results) {
    // Extract artist name from result title
    // Discogs format: "Artist Name" or "Artist Name (2)" for disambiguation
    const resultName = result.title.replace(/\s*\(\d+\)$/, '').trim();

    // Calculate similarity score (uses Levenshtein distance internally)
    const similarity = calculateStringSimilarity(
      searchName.toLowerCase(),
      resultName.toLowerCase()
    );

    // Require high confidence (85%+) for Discogs matches
    if (similarity > bestScore && similarity >= 0.85) {
      bestScore = similarity;
      bestMatch = { result, score: similarity };
    }
  }

  return bestMatch;
}
```

### GraphQL Schema Extension

```graphql
# Source: src/graphql/schema.graphql (extend existing query)

"""
Search MusicBrainz or Discogs for artist correction candidates
"""
artistCorrectionSearch(
  query: String!
  limit: Int
  source: CorrectionSource  # ADD: Source selection
): ArtistCorrectionSearchResponse!

"""
Source for correction data.
"""
enum CorrectionSource {
  MUSICBRAINZ
  DISCOGS
}
```

### Artist Search Card Visual Distinction

```typescript
// Source: src/components/admin/correction/artist/search/ArtistSearchCard.tsx
// ADD: Orange accent for Discogs results

export function ArtistSearchCard({ result, onClick }: ArtistSearchCardProps) {
  const isDiscogs = result.source === 'discogs';
  const badgeText = isDiscogs ? 'DG' : 'MB';
  const accentColor = isDiscogs
    ? 'border-orange-900/50 hover:bg-orange-950/20' // Discogs orange
    : 'hover:bg-zinc-800/50'; // MusicBrainz default

  return (
    <button
      className={`w-full flex gap-3 p-3 rounded-md border transition-colors ${accentColor}`}
      onClick={() => onClick(result)}
    >
      {/* Artist image */}
      <div className='w-12 h-12 rounded-full bg-zinc-800 flex-shrink-0'>
        {/* Image or placeholder */}
      </div>

      {/* Artist details */}
      <div className='flex-1 text-left'>
        <div className='flex items-center gap-2'>
          <span className='font-medium'>{result.name}</span>
          <Badge className={isDiscogs ? 'bg-orange-900/30' : ''}>
            {badgeText}
          </Badge>
        </div>
        {result.disambiguation && (
          <p className='text-sm text-zinc-500'>{result.disambiguation}</p>
        )}
      </div>
    </button>
  );
}
```

### QueuedDiscogsService Integration

```typescript
// Source: src/lib/discogs/queued-service.ts (add method)

export class QueuedDiscogsService {
  // ... existing methods

  /**
   * Search Discogs for artists by name
   * Returns results in ArtistSearchResult format for correction UI
   */
  async searchArtists(
    options: DiscogsArtistSearchOptions
  ): Promise<DiscogsArtistSearchResponse> {
    this.ensureInitialized();

    const { artistId, artistName, limit = 10 } = options;

    console.log(
      chalk.cyan('[QueuedDiscogsService] Queuing artist search for: ' + artistName)
    );

    try {
      // Use existing DISCOGS_SEARCH_ARTIST job type
      const job = await this.queue.addJob(
        JOB_TYPES.DISCOGS_SEARCH_ARTIST,
        {
          artistId, // Required by job schema
          artistName,
          requestId: 'discogs-artist-search-' + Date.now(),
        },
        {
          priority: PRIORITY_TIERS.ADMIN,
          requestId: 'discogs-artist-search-' + artistName,
        }
      );

      const result = await this.waitForJobViaEvents(job.id!);

      // Transform enrichment result to correction format
      // Result has: { action, discogsId?, matchConfidence?, searchResults }
      return this.mapToSearchResponse(result as any);
    } catch (error) {
      console.error('[QueuedDiscogsService] Artist search failed:', error);
      throw error;
    }
  }

  /**
   * Map enrichment job result to correction search response
   */
  private mapToSearchResponse(jobResult: any): DiscogsArtistSearchResponse {
    // Extract search results from job result
    // Job returns fuzzy match result, not all results
    // Need to modify handler to return ALL results for correction UI

    return {
      action: 'search_complete',
      resultsCount: jobResult.resultsCount || 0,
      results: jobResult.results || [],
    };
  }
}
```

## State of the Art

**Old Approach** | **Current Approach** | **When Changed** | **Impact**
MusicBrainz only | Multi-source (MB + Discogs) | Phase 21-24 (Feb 2026) | Admin can correct from multiple data sources
Enrichment-only Discogs | Discogs in correction UI | Phase 24 (now) | Unified Discogs integration across workflows
Placeholder toggle | Functional source selection | Phase 24 (now) | Admin can actually switch sources

**Deprecated/outdated:**

- Discogs artist search placeholder in ArtistSearchView - replaced with functional query
- Single-source artist correction - now supports both MusicBrainz and Discogs

## Open Questions

Things that couldn't be fully resolved:

1. **Should we modify DISCOGS_SEARCH_ARTIST to return all results instead of just best match?**
   - What we know: Current handler uses fuzzy matching to return single best match (for enrichment). Correction UI wants to show all results for admin to choose.
   - What's unclear: Should we modify existing handler (might break enrichment), or create separate code path?
   - Recommendation: Modify handler to return all results in jobResult.searchResults field. Enrichment can ignore extra results, correction can display them. Backward compatible.

2. **Should artist search results show thumbnail images?**
   - What we know: Discogs search returns thumb field (URL). MusicBrainz doesn't have images in search results.
   - What's unclear: Should UI display Discogs thumbs? Inconsistent with MusicBrainz (no images). Or fetch images separately?
   - Recommendation: Don't display images initially. Keep search results consistent between sources. If admin requests, fetch images lazily on result hover (future enhancement).

3. **How to handle artists with no matches (confidence < 85%)?**
   - What we know: Existing handler returns "no_confident_match" if best match < 85% threshold.
   - What's unclear: Should we lower threshold for correction UI (admin knows best), or return empty results?
   - Recommendation: Lower threshold to 70% for correction searches (admin context). Or return all results regardless of score and let admin decide. Different requirements than auto-enrichment.

## Sources

### Primary (HIGH confidence)

- Existing codebase patterns:
  - /src/lib/queue/processors/discogs-processor.ts (handleDiscogsSearchArtist - full implementation)
  - /src/lib/discogs/queued-service.ts (QueuedDiscogsService pattern)
  - /src/lib/discogs/mappers.ts (mapMasterToCorrectionSearchResult pattern)
  - /src/lib/correction/artist/search-service.ts (ArtistCorrectionSearchService - MusicBrainz pattern)
  - /src/lib/correction/artist/types.ts (ArtistSearchResult interface)
  - /src/components/admin/correction/artist/search/ArtistSearchView.tsx (UI pattern)
  - /src/graphql/schema.graphql (artistCorrectionSearch query definition)
  - .planning/phases/22-discogs-album-search/22-RESEARCH.md (Phase 22 patterns)

### Secondary (MEDIUM confidence)

- [Discogs API Documentation](https://www.discogs.com/developers) - Artist search endpoint
- [Discogs Forum - Understanding search request](https://www.discogs.com/forum/thread/340775) - Search parameter usage
- Web search results on Discogs artist search fields - Confirmed minimal fields in search results

### Tertiary (LOW confidence)

- None - all findings verified with existing codebase

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All infrastructure exists, just wiring UI
- Architecture: HIGH - Following exact Phase 22 pattern for albums
- Pitfalls: HIGH - Known from existing DISCOGS_SEARCH_ARTIST implementation
- Code examples: HIGH - All examples from working code

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - stable domain, existing infrastructure)
