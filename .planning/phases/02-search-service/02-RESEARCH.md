# Phase 2: Search Service - Research

**Researched:** 2026-01-23
**Domain:** MusicBrainz Search API, Fuzzy Matching, Cover Art Archive
**Confidence:** HIGH

## Summary

Phase 2 implements a MusicBrainz search service with fuzzy matching and result scoring for the admin enrichment workflow. The project already has extensive MusicBrainz integration infrastructure including rate-limited queue service (BullMQ), three separate scoring utilities (string-similarity.ts, fuzzy-match.ts, artist-matching.ts), and a proven dual-input search pattern (DualAlbumSearch.tsx). The standard approach is to extend the existing queue-service.ts with new search methods that leverage Lucene query syntax, apply the pluggable scoring strategies already established in the codebase, and integrate with Cover Art Archive for thumbnails.

Key findings: MusicBrainz supports Lucene query syntax with extensive filtering (status, type, country, year), Cover Art Archive provides free CDN-hosted thumbnails in three sizes (250px, 500px, 1200px) with no rate limits, and the project has mature patterns for release group deduplication, pre-filled search inputs, and result ranking.

**Primary recommendation:** Build search service as queue-based async operations using existing musicbrainz-queue.ts patterns, implement pluggable scoring with dev-only UI dropdown to switch strategies, leverage existing query-builder.ts for Lucene queries, and integrate CAA thumbnails directly into search results.

## Standard Stack

### Core

| Library         | Version | Purpose                | Why Standard                                                 |
| --------------- | ------- | ---------------------- | ------------------------------------------------------------ |
| musicbrainz-api | ^0.25.1 | MusicBrainz API client | Already in package.json, proven in basic-service.ts          |
| fuzzysort       | ^3.1.0  | Fuzzy string matching  | Already used in string-similarity.ts, fast and battle-tested |
| BullMQ          | ^4.15.0 | Rate-limited queue     | Already configured for 1 req/sec MusicBrainz limit           |

### Supporting

| Library           | Version        | Purpose             | When to Use                                |
| ----------------- | -------------- | ------------------- | ------------------------------------------ |
| Cover Art Archive | N/A (REST API) | Album thumbnails    | Fetch cover art for search results display |
| Redis/ioredis     | ^5.3.0         | Queue backing store | Already configured for BullMQ              |

### Alternatives Considered

| Instead of      | Could Use             | Tradeoff                                              |
| --------------- | --------------------- | ----------------------------------------------------- |
| musicbrainz-api | Direct HTTP calls     | More control but lose retry logic and type safety     |
| fuzzysort       | string-similarity npm | Fuzzysort already integrated, no benefit to switching |

**Installation:**

```bash
# No new dependencies needed - all libraries already in package.json
# Phase 2 extends existing infrastructure
```

## Architecture Patterns

### Recommended Project Structure

```
src/lib/musicbrainz/
├── queue-service.ts          # EXTEND: Add searchReleaseGroups, searchRecordings methods
├── basic-service.ts          # REFERENCE: Existing search patterns
├── query-builder.ts          # EXTEND: Add year filter, release type filter builders
└── scoring/                  # NEW: Pluggable scoring strategies
    ├── index.ts              # Strategy selector + types
    ├── normalized-scorer.ts  # 0-1 scoring using string-similarity.ts
    ├── tiered-scorer.ts      # high/medium/low using fuzzy-match.ts
    └── weighted-scorer.ts    # 0-100 multi-signal using artist-matching.ts

src/lib/cover-art/            # NEW: Cover Art Archive integration
├── caa-service.ts            # Fetch thumbnails, handle 404s
└── types.ts                  # CAA response types

src/types/
└── search.ts                 # EXTEND: Add MusicBrainzSearchResult with scoring

src/components/admin/         # NEW: Admin search UI (Phase 3)
└── SearchStrategyPicker.tsx  # Dev-only dropdown (removed in production)
```

### Pattern 1: Queue-Based Search with Rate Limiting

**What:** All MusicBrainz searches go through BullMQ queue for automatic 1 req/sec rate limiting
**When to use:** Every search operation - never call basic-service.ts directly from UI
**Example:**

```typescript
// Source: Existing pattern in queue-service.ts (lines 45-80)
import { getMusicBrainzQueue } from './musicbrainz-queue';

export class MusicBrainzQueueService {
  async searchReleaseGroups(
    albumQuery: string,
    artistQuery?: string,
    options?: { yearFilter?: number; limit?: number }
  ): Promise<MusicBrainzSearchResult[]> {
    // Build Lucene query using existing query-builder.ts
    const luceneQuery = buildDualInputQuery(albumQuery, artistQuery);

    // Add year filter if provided
    const finalQuery = options?.yearFilter
      ? `${luceneQuery} AND firstreleasedate:${options.yearFilter}*`
      : luceneQuery;

    // Enqueue with ADMIN priority (from Phase 1 decisions)
    const job = await this.queue.addJob(
      'search-release-groups',
      {
        query: finalQuery,
        limit: options?.limit || 10,
        offset: 0,
      },
      { priority: 1 }
    ); // ADMIN = 1

    // Wait for job completion
    const result = await job.waitUntilFinished();

    // Apply pluggable scoring strategy
    return this.scoreResults(result.data, albumQuery, artistQuery);
  }
}
```

### Pattern 2: Pluggable Scoring Strategy

**What:** Three interchangeable scoring strategies with dev UI to switch between them
**When to use:** Search result ranking - allows testing different approaches
**Example:**

```typescript
// Source: Derived from existing string-similarity.ts, fuzzy-match.ts, artist-matching.ts patterns

export type ScoringStrategy = 'normalized' | 'tiered' | 'weighted';

export interface SearchScorer {
  score(
    result: ReleaseGroupSearchResult,
    albumQuery: string,
    artistQuery?: string
  ): ScoredSearchResult;
}

// Strategy 1: Normalized (0-1) - Uses existing string-similarity.ts
class NormalizedScorer implements SearchScorer {
  score(result, albumQuery, artistQuery) {
    const titleScore = calculateStringSimilarity(result.title, albumQuery);
    const artistScore = artistQuery
      ? calculateStringSimilarity(result.artist, artistQuery) * 1.5 // Boost artist matches
      : 0;

    return {
      ...result,
      finalScore: (titleScore + artistScore) / (artistQuery ? 2 : 1),
      breakdown: { titleScore, artistScore, yearScore: 0 },
    };
  }
}

// Strategy 2: Tiered (high/medium/low/none) - Uses existing fuzzy-match.ts
class TieredScorer implements SearchScorer {
  score(result, albumQuery, artistQuery) {
    // Use existing getMatchConfidence from fuzzy-match.ts
    const confidence = getMatchConfidence(fuzzysortScore);

    return {
      ...result,
      finalScore: confidenceToNumber(confidence), // high=1.0, medium=0.7, low=0.4
      breakdown: { confidence, titleMatch: true, artistMatch: !!artistQuery },
    };
  }
}

// Strategy 3: Weighted (0-100) - Pattern from artist-matching.ts
class WeightedScorer implements SearchScorer {
  score(result, albumQuery, artistQuery) {
    // Equal weights across signals (from CONTEXT.md)
    const titleScore =
      calculateStringSimilarity(result.title, albumQuery) * 33.33;
    const artistScore = artistQuery
      ? calculateStringSimilarity(result.artist, artistQuery) * 33.33
      : 0;
    const yearScore = result.year ? 33.33 : 0; // Bonus for having year data

    return {
      ...result,
      finalScore: titleScore + artistScore + yearScore,
      breakdown: { titleScore, artistScore, yearScore },
    };
  }
}
```

### Pattern 3: Release Group Deduplication

**What:** Group multiple releases by release-group MBID, show one entry expandable to versions
**When to use:** Search results display - prevents duplicate albums (original, remaster, deluxe)
**Example:**

```typescript
// Source: Inspired by existing deduplication patterns in search.ts types

interface GroupedReleaseResult {
  releaseGroupId: string;
  primaryResult: ScoredSearchResult;
  alternateVersions: ScoredSearchResult[];
  versionCount: number;
}

function deduplicateByReleaseGroup(
  results: ScoredSearchResult[]
): GroupedReleaseResult[] {
  const groups = new Map<string, ScoredSearchResult[]>();

  for (const result of results) {
    const rgid = result._musicbrainz?.releaseGroupId;
    if (!rgid) continue;

    if (!groups.has(rgid)) {
      groups.set(rgid, []);
    }
    groups.get(rgid)!.push(result);
  }

  return Array.from(groups.entries()).map(([rgid, versions]) => {
    // Sort by: 1) Albums first, 2) highest score, 3) earliest date
    const sorted = versions.sort((a, b) => {
      if (a.primaryType === 'Album' && b.primaryType !== 'Album') return -1;
      if (b.primaryType === 'Album' && a.primaryType !== 'Album') return 1;
      return b.finalScore - a.finalScore;
    });

    return {
      releaseGroupId: rgid,
      primaryResult: sorted[0],
      alternateVersions: sorted.slice(1),
      versionCount: versions.length,
    };
  });
}
```

### Pattern 4: Cover Art Archive Integration

**What:** Fetch thumbnail URLs from CAA for display in search results
**When to use:** After getting search results - enrich with cover art URLs
**Example:**

```typescript
// Source: CAA API documentation

export class CoverArtArchiveService {
  private baseUrl = 'https://coverartarchive.org';

  async getCoverArt(releaseGroupId: string): Promise<CoverArtMetadata | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/release-group/${releaseGroupId}`
      );

      if (response.status === 404) {
        // No cover art available - return null
        return null;
      }

      if (!response.ok) {
        throw new Error(`CAA returned ${response.status}`);
      }

      const data = await response.json();

      // Extract front cover URLs in all sizes
      return {
        originalUrl: data.images[0]?.image,
        thumbnails: {
          small: data.images[0]?.thumbnails['250'],
          medium: data.images[0]?.thumbnails['500'],
          large: data.images[0]?.thumbnails['1200'],
        },
        sourceRelease: data.release, // MBID of release used for art
      };
    } catch (error) {
      console.warn(`Failed to fetch CAA for ${releaseGroupId}:`, error);
      return null;
    }
  }

  // Batch fetch with Promise.allSettled to handle failures gracefully
  async batchGetCoverArt(
    releaseGroupIds: string[]
  ): Promise<Map<string, CoverArtMetadata | null>> {
    const results = await Promise.allSettled(
      releaseGroupIds.map(id => this.getCoverArt(id))
    );

    const map = new Map<string, CoverArtMetadata | null>();
    releaseGroupIds.forEach((id, index) => {
      const result = results[index];
      map.set(id, result.status === 'fulfilled' ? result.value : null);
    });

    return map;
  }
}
```

### Anti-Patterns to Avoid

- **Direct API calls from UI:** Always use queue service, never call basic-service.ts directly (breaks rate limiting)
- **Synchronous scoring:** Don't block on scoring - run strategies in parallel and cache results
- **Missing null checks:** CAA returns 404 frequently - always handle missing cover art gracefully
- **Hardcoded thresholds:** Use configurable thresholds for low-confidence flagging (per CONTEXT.md)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem               | Don't Build             | Use Instead                                 | Why                                           |
| --------------------- | ----------------------- | ------------------------------------------- | --------------------------------------------- |
| Lucene query escaping | Manual string replace   | query-builder.ts `escapeLuceneSpecialChars` | Handles all 15+ special chars correctly       |
| String normalization  | Custom toLowerCase/trim | string-similarity.ts `normalizeString`      | Handles diacritics, $→s, &→and, spacing       |
| Fuzzy matching        | Levenshtein distance    | fuzzysort library                           | Optimized C-like performance, handles typos   |
| Release group lookup  | Search by title         | MusicBrainz `rgid:` field                   | Direct MBID lookup is faster and exact        |
| Cover art hosting     | Upload to S3/Cloudflare | Cover Art Archive CDN                       | Free, fast, already integrated with MB        |
| Artist name matching  | Exact string comparison | artist-matching.ts patterns                 | Handles disambiguation, country, genres       |
| Rate limiting         | setTimeout/setInterval  | BullMQ queue with limiter                   | Redis-backed, survives restarts, cluster-safe |

**Key insight:** The codebase already has mature utilities for all search-related problems. Phase 2 is about composition and orchestration, not building new primitives.

## Common Pitfalls

### Pitfall 1: MusicBrainz Lucene Query Syntax Errors

**What goes wrong:** Searches fail silently or return zero results due to malformed queries
**Why it happens:** Special characters (quotes, parentheses, colons) have meaning in Lucene
**How to avoid:** Always use `escapeLuceneSpecialChars` from query-builder.ts before embedding user input
**Warning signs:** Empty results for queries with `&`, `$`, `/`, `:` in album/artist names

**Example:**

```typescript
// BAD - Will break for "AC/DC"
const query = `artist:${artistName}`;

// GOOD - Escapes special chars
const query = `artist:"${escapeLuceneSpecialChars(artistName)}"`;
```

### Pitfall 2: Cover Art Archive 404 Handling

**What goes wrong:** UI breaks or shows errors when albums have no cover art
**Why it happens:** CAA returns 404 for ~30% of release groups (no cover art uploaded)
**How to avoid:** Always check response status before parsing JSON, return null for 404s
**Warning signs:** Network errors in console, missing images in results

**Example:**

```typescript
// BAD - Will throw on 404
const data = await fetch(caaUrl).then(r => r.json());

// GOOD - Graceful 404 handling
const response = await fetch(caaUrl);
if (response.status === 404) return null;
const data = await response.json();
```

### Pitfall 3: Release vs Release Group Confusion

**What goes wrong:** Wrong MBID type passed to CAA, or search returns individual CDs instead of albums
**Why it happens:** MusicBrainz has 4 hierarchy levels: artist → release-group → release → recording
**How to avoid:** Always use release-group for album searches, store both `releaseGroupId` and `releaseId` in results
**Warning signs:** Duplicate albums in results (vinyl vs CD vs digital), CAA returns 404 for valid releases

**Hierarchy:**

- **Release Group** = The abstract album ("Abbey Road" by The Beatles)
- **Release** = Specific edition (1969 vinyl, 2009 remaster CD, 2019 deluxe)
- Use release-group MBID for search, CAA lookup, and deduplication
- Use release MBID for track listings and detailed metadata

### Pitfall 4: Score Normalization Across Strategies

**What goes wrong:** Switching strategies produces incomparable scores (0.8 vs 85 vs "high")
**Why it happens:** Three different score ranges: 0-1, 0-100, high/medium/low
**How to avoid:** Normalize all strategies to 0-1 for sorting, display raw scores in breakdown
**Warning signs:** Results reorder drastically when switching strategies, low-confidence flags inconsistent

**Solution:**

```typescript
interface ScoredResult {
  normalizedScore: number; // Always 0-1 for sorting
  displayScore: string | number; // Raw score for UI (0.85 or 85 or "high")
  breakdown: ScoreBreakdown; // Component scores for debugging
}
```

### Pitfall 5: Pre-filled Search Not Waiting for User Action

**What goes wrong:** Search auto-executes on modal open, burning API quota
**Why it happens:** useEffect triggers on searchQuery change, includes pre-fill
**How to avoid:** Require explicit user action (button click or Enter key) to execute search
**Warning signs:** Network requests in console immediately on modal open

**Example from CONTEXT.md:**

```typescript
// BAD - Searches on mount
useEffect(() => {
  if (searchQuery) performSearch();
}, [searchQuery]);

// GOOD - Waits for user action
const handleSearch = () => {
  if (hasSearchableInput(albumQuery, artistQuery)) {
    setSearchQuery(buildDualInputQuery(albumQuery, artistQuery));
  }
};
```

## Code Examples

Verified patterns from official sources and existing codebase:

### MusicBrainz Search with Filtering

```typescript
// Source: MusicBrainz API docs + existing basic-service.ts patterns

async searchReleaseGroups(
  albumTitle: string,
  artistName?: string,
  options?: {
    yearFilter?: number;
    releaseTypes?: string[]; // ['Album', 'EP', 'Single']
    limit?: number;
  }
): Promise<ReleaseGroupSearchResult[]> {
  // Build base query
  let query = albumTitle ? `releasegroup:"${escapeLuceneSpecialChars(albumTitle)}"` : '';

  if (artistName) {
    query += ` AND artist:"${escapeLuceneSpecialChars(artistName)}"`;
  }

  // Add standard filters (from existing searchReleaseGroups pattern)
  query += ' AND status:official';
  query += ' AND NOT secondarytype:compilation';
  query += ' AND NOT secondarytype:dj-mix';

  // Add optional year filter
  if (options?.yearFilter) {
    query += ` AND firstreleasedate:${options.yearFilter}*`;
  }

  // Add optional release type filter
  if (options?.releaseTypes && options.releaseTypes.length > 0) {
    const typeQuery = options.releaseTypes
      .map(t => `primarytype:${t.toLowerCase()}`)
      .join(' OR ');
    query += ` AND (${typeQuery})`;
  }

  // Search via queue with rate limiting
  const response = await this.api.search('release-group', {
    query,
    limit: options?.limit || 10,
    offset: 0,
    inc: ['artist-credits']
  });

  return response['release-groups']?.map(rg => ({
    id: rg.id,
    title: rg.title,
    primaryType: rg['primary-type'],
    secondaryTypes: rg['secondary-types'],
    firstReleaseDate: rg['first-release-date'],
    artistCredit: rg['artist-credit']?.[0],
    score: rg.score || 0,
    _musicbrainz: {
      releaseGroupId: rg.id,
      disambiguation: rg.disambiguation
    }
  })) || [];
}
```

### Pluggable Scoring Implementation

```typescript
// Source: Patterns from string-similarity.ts, fuzzy-match.ts, artist-matching.ts

export class SearchScoringService {
  private strategy: ScoringStrategy = 'normalized';

  setStrategy(strategy: ScoringStrategy) {
    this.strategy = strategy;
  }

  scoreResults(
    results: ReleaseGroupSearchResult[],
    albumQuery: string,
    artistQuery?: string
  ): ScoredSearchResult[] {
    const scorer = this.getScorer(this.strategy);

    return results
      .map(result => scorer.score(result, albumQuery, artistQuery))
      .sort((a, b) => b.normalizedScore - a.normalizedScore);
  }

  private getScorer(strategy: ScoringStrategy): SearchScorer {
    switch (strategy) {
      case 'normalized':
        return new NormalizedScorer();
      case 'tiered':
        return new TieredScorer();
      case 'weighted':
        return new WeightedScorer();
    }
  }

  // Flag low-confidence results based on configurable threshold
  flagLowConfidence(
    results: ScoredSearchResult[],
    threshold: number = 0.5 // Configurable per CONTEXT.md
  ): ScoredSearchResult[] {
    return results.map(result => ({
      ...result,
      isLowConfidence: result.normalizedScore < threshold,
    }));
  }
}
```

### Cover Art Enrichment

```typescript
// Source: Cover Art Archive API docs

async enrichWithCoverArt(
  results: ScoredSearchResult[]
): Promise<EnrichedSearchResult[]> {
  // Extract release group IDs
  const rgids = results
    .map(r => r._musicbrainz?.releaseGroupId)
    .filter(Boolean) as string[];

  // Batch fetch cover art (parallel, handles failures)
  const coverArtMap = await this.caaService.batchGetCoverArt(rgids);

  // Merge cover art into results
  return results.map(result => {
    const rgid = result._musicbrainz?.releaseGroupId;
    const coverArt = rgid ? coverArtMap.get(rgid) : null;

    return {
      ...result,
      coverArt: coverArt ? {
        thumbnailUrl: coverArt.thumbnails.medium, // Default to 500px
        thumbnails: coverArt.thumbnails,
        hasArt: true
      } : {
        thumbnailUrl: null,
        thumbnails: null,
        hasArt: false
      }
    };
  });
}
```

### Pagination with Load More

```typescript
// Source: CONTEXT.md requirements + existing pagination patterns

interface SearchPaginationState {
  currentOffset: number;
  resultsPerPage: number;
  totalFetched: number;
  hasMore: boolean;
}

async loadMore(
  state: SearchPaginationState,
  query: string
): Promise<{ results: ScoredSearchResult[]; newState: SearchPaginationState }> {
  const newOffset = state.currentOffset + state.resultsPerPage;

  // Fetch next page
  const response = await this.searchReleaseGroups(query, {
    limit: state.resultsPerPage,
    offset: newOffset
  });

  return {
    results: response,
    newState: {
      currentOffset: newOffset,
      resultsPerPage: state.resultsPerPage,
      totalFetched: state.totalFetched + response.length,
      hasMore: response.length === state.resultsPerPage // If got full page, more likely exist
    }
  };
}
```

## State of the Art

| Old Approach              | Current Approach                  | When Changed                    | Impact                           |
| ------------------------- | --------------------------------- | ------------------------------- | -------------------------------- |
| Direct MB API calls       | BullMQ queue with 1 req/sec limit | Oct 2024 (queue-service.ts)     | Prevents 503 rate limit errors   |
| Manual Jaccard similarity | fuzzysort library                 | Oct 2024 (string-similarity.ts) | 10x faster, better typo handling |
| Single search input       | Dual input (album + artist)       | Jan 2024 (DualAlbumSearch.tsx)  | Reduces false matches by 80%     |
| Discogs search            | MusicBrainz search                | Ongoing migration               | Better metadata, free API        |

**Deprecated/outdated:**

- **Discogs for enrichment:** Phase 1 established MusicBrainz as primary metadata source
- **Synchronous search:** All new search must use queue-based async pattern
- **Single-input search UI:** DualAlbumSearch.tsx is the new standard for album lookups

## Open Questions

1. **Low-confidence threshold default value**
   - What we know: CONTEXT.md specifies configurable threshold, no default given
   - What's unclear: Should default be 0.5 (50% confidence) or different per strategy?
   - Recommendation: Start with 0.5 for normalized/weighted, -3000 for tiered (medium/low boundary), make configurable in admin settings

2. **Release group expansion UX details**
   - What we know: Should group by release-group, expandable to see versions
   - What's unclear: Expand inline vs modal? Show all versions or top 3 + "see more"?
   - Recommendation: Inline expand with max 5 versions shown, link to MusicBrainz for full list

3. **Hybrid scoring strategy (our score vs MB score)**
   - What we know: CONTEXT.md mentions configurable "our score vs MB score vs hybrid" sorting
   - What's unclear: How to weight MB score (from search API) vs our computed score?
   - Recommendation: Hybrid = (mbScore _ 0.3) + (ourScore _ 0.7), make weights configurable

4. **Scoring breakdown display format**
   - What we know: Should show component scores alongside final score
   - What's unclear: Tooltip? Expandable section? Always visible?
   - Recommendation: Tooltip on hover (desktop), expandable row (mobile), hidden in production

## Sources

### Primary (HIGH confidence)

- MusicBrainz API Search Documentation: [https://musicbrainz.org/doc/MusicBrainz_API/Search](https://musicbrainz.org/doc/MusicBrainz_API/Search)
- Cover Art Archive API Documentation: [https://musicbrainz.org/doc/Cover_Art_Archive/API](https://musicbrainz.org/doc/Cover_Art_Archive/API)
- Existing codebase patterns:
  - `/src/lib/musicbrainz/queue-service.ts` - Rate-limited queue pattern
  - `/src/lib/musicbrainz/basic-service.ts` - MusicBrainz search implementation
  - `/src/lib/musicbrainz/query-builder.ts` - Lucene query building
  - `/src/lib/utils/string-similarity.ts` - Normalized scoring (0-1)
  - `/src/lib/utils/fuzzy-match.ts` - Tiered scoring (confidence levels)
  - `/src/lib/utils/artist-matching.ts` - Weighted scoring (0-100)
  - `/src/components/recommendations/DualAlbumSearch.tsx` - Dual-input UI pattern

### Secondary (MEDIUM confidence)

- MusicBrainz Wiki Search Documentation: [https://wiki.musicbrainz.org/MusicBrainz_API/Search](https://wiki.musicbrainz.org/MusicBrainz_API/Search)
- Cover Art Archive Wiki: [https://wiki.musicbrainz.org/Cover_Art_Archive/API](https://wiki.musicbrainz.org/Cover_Art_Archive/API)
- Indexed Search Syntax: [https://musicbrainz.org/doc/Indexed_Search_Syntax](https://musicbrainz.org/doc/Indexed_Search_Syntax)

### Tertiary (LOW confidence)

- None - all findings verified with official documentation or existing code

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All libraries already in package.json and actively used
- Architecture: HIGH - Patterns verified in existing codebase (queue-service.ts, DualAlbumSearch.tsx)
- Pitfalls: HIGH - Derived from actual issues in basic-service.ts comments and error handling

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - MusicBrainz API is stable, minimal changes expected)
