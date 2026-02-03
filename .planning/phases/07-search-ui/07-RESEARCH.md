# Phase 7: Search UI - Research

**Researched:** 2026-01-25
**Domain:** Search interface within correction modal (MusicBrainz search with match scoring)
**Confidence:** HIGH

## Summary

Phase 7 implements a search interface within the correction modal where admins can search MusicBrainz for album candidates and view results with match scores. The phase builds on existing infrastructure: Phase 2's search service (searchMusicBrainzAlbums), Phase 6's modal shell with step navigation, and TanStack Query v5 for data fetching.

The search interface consists of two separate input fields (album title and artist name) that pre-populate with current album data, a search button to trigger explicit searches, and a compact list of results showing thumbnails, detailed metadata, and match confidence scores. Results are paginated with a "Load more" button.

User decisions from CONTEXT.md lock key behaviors: explicit search triggering (button/Enter), two-field input design, no visual noise for modified values, full loading state replacement, inputs always visible, and compact list layout with numeric percentage scores sorted highest-first.

**Primary recommendation:** Use TanStack Query v5 with client-side API endpoint pattern for search execution. Create dedicated search input component with form submission handling. Build result list with clickable rows that preserve scroll position on back navigation. Implement loading skeletons that replace the entire search area during API calls.

## Standard Stack

The established libraries/tools for search UI in Next.js 15 + React 19:

### Core

| Library        | Version | Purpose                               | Why Standard                                                                                  |
| -------------- | ------- | ------------------------------------- | --------------------------------------------------------------------------------------------- |
| TanStack Query | v5      | Client-side data fetching and caching | De facto standard for server state in React; supports pagination, caching, background updates |
| React 19       | stable  | UI framework                          | Latest stable with improved form handling, useActionState for forms                           |
| Next.js        | 15      | App framework                         | Project standard; App Router with client components                                           |
| Tailwind CSS   | 3.x     | Styling                               | Project standard; existing dark theme in zinc colors                                          |
| TypeScript     | 5.x     | Type safety                           | Project standard; full type inference with TanStack Query                                     |

### Supporting

| Library                     | Version | Purpose                   | When to Use                                                |
| --------------------------- | ------- | ------------------------- | ---------------------------------------------------------- |
| use-debounce                | 10.x    | Input debouncing          | Optional - user wants explicit search, not live feedback   |
| react-intersection-observer | 9.x     | Infinite scroll detection | Alternative to "Load more" button (not needed per CONTEXT) |

### Alternatives Considered

| Instead of        | Could Use        | Tradeoff                                                                                               |
| ----------------- | ---------------- | ------------------------------------------------------------------------------------------------------ |
| TanStack Query    | SWR              | Similar features but TanStack has better infinite query support, TypeScript, and ecosystem integration |
| Client-side fetch | Server Actions   | Server Actions better for mutations, but search needs instant feedback and caching                     |
| Infinite scroll   | Load more button | User decided on Load more for explicit control (CONTEXT.md)                                            |

**Installation:**
No new packages needed - all dependencies already installed in project.

## Architecture Patterns

### Recommended Component Structure

```
src/components/admin/correction/
├── search/
│   ├── SearchInputs.tsx          # Album title + artist name inputs with validation
│   ├── SearchResults.tsx         # Results list container with pagination
│   ├── SearchResultCard.tsx      # Individual result row (clickable)
│   ├── SearchSkeleton.tsx        # Loading state skeleton
│   └── NoResultsState.tsx        # Empty state with Manual Edit link
```

### Pattern 1: Explicit Search Form with Validation

**What:** Form with two controlled inputs and explicit submission (button or Enter key)
**When to use:** When users need control over when searches execute (not live search)
**Example:**

```typescript
// Source: React 19 form patterns + user decisions
export function SearchInputs({ albumTitle, artistName, onSearch }) {
  const [titleValue, setTitleValue] = useState(albumTitle);
  const [artistValue, setArtistValue] = useState(artistName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validation: at least one field required
    if (!titleValue.trim() && !artistValue.trim()) {
      return; // Could show error toast
    }
    onSearch({ albumTitle: titleValue, artistName: artistValue });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        value={titleValue}
        onChange={(e) => setTitleValue(e.target.value)}
        placeholder="Album title"
      />
      <Input
        value={artistValue}
        onChange={(e) => setArtistValue(e.target.value)}
        placeholder="Artist name"
      />
      <Button type="submit">Search</Button>
    </form>
  );
}
```

### Pattern 2: TanStack Query Pagination with Load More

**What:** Manual pagination using offset-based queries with "Load more" button
**When to use:** When users want control over loading additional results
**Example:**

```typescript
// Source: TanStack Query v5 docs + Next.js 15 patterns
export function SearchResults({ query }) {
  const [offset, setOffset] = useState(0);
  const limit = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: ['search', query, offset],
    queryFn: () => searchMusicBrainz({ ...query, offset, limit }),
    enabled: !!query.albumTitle || !!query.artistName,
  });

  const handleLoadMore = () => setOffset(prev => prev + limit);

  return (
    <div>
      {data?.results.map(result => (
        <SearchResultCard key={result.releaseGroupMbid} result={result} />
      ))}
      {data?.hasMore && (
        <Button onClick={handleLoadMore}>Load more</Button>
      )}
    </div>
  );
}
```

### Pattern 3: Clickable Result Rows with Navigation

**What:** Full row click navigation with hover state and scroll position preservation
**When to use:** When results act as navigation to next step
**Example:**

```typescript
// Source: User decisions (CONTEXT.md) + web design patterns
export function SearchResultCard({ result, onClick }) {
  return (
    <button
      onClick={() => onClick(result)}
      className="w-full flex items-start gap-3 p-3 rounded-lg
                 hover:bg-zinc-800 active:bg-zinc-800
                 transition-colors duration-200"
    >
      <AlbumImage
        src={result.coverArtUrl}
        alt={result.title}
        width={48}
        height={48}
        className="rounded flex-shrink-0"
      />
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="font-medium text-cosmic-latte">{result.title}</span>
          <span className="text-sm text-emeraled-green">{result.normalizedScore}% match</span>
        </div>
        <div className="text-sm text-zinc-400">
          {result.primaryArtistName} • {result.firstReleaseDate}
        </div>
      </div>
    </button>
  );
}
```

### Pattern 4: Full Loading State Replacement

**What:** Skeleton replaces entire search area (inputs + results) during loading
**When to use:** When user wants clear visual feedback that search is executing
**Example:**

```typescript
// Source: User decisions + existing LoadingStates.tsx patterns
export function SearchSkeleton() {
  return (
    <div className="space-y-4">
      {/* Input skeletons */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
      {/* Results skeletons */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-12 w-12 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Pattern 5: Scroll Position Preservation

**What:** Browser automatically preserves scroll position when navigating back
**When to use:** Multi-step flows where users return to search results
**Example:**

```typescript
// Source: Next.js navigation behavior + user decisions
// Browser natively preserves scroll position in most cases
// If needed, can explicitly save/restore:
const handleResultClick = result => {
  // Save scroll position
  sessionStorage.setItem('search-scroll', window.scrollY.toString());
  // Navigate to preview step
  onSelectResult(result);
};

// On return to search step:
useEffect(() => {
  const savedScroll = sessionStorage.getItem('search-scroll');
  if (savedScroll) {
    window.scrollTo(0, parseInt(savedScroll));
    sessionStorage.removeItem('search-scroll');
  }
}, []);
```

### Anti-Patterns to Avoid

- **Live search as you type** — User explicitly wants explicit search triggering
- **Infinite scroll without control** — User prefers "Load more" button for control
- **Visual noise for modified fields** — No indication when values differ from original
- **Inputs collapse after search** — Keep inputs visible at top for easy refinement
- **Complex loading states** — Use full skeleton replacement for clarity
- **Color-coded confidence scores** — User wants numeric percentage only, no red/yellow/green

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                 | Don't Build                 | Use Instead                          | Why                                                            |
| ----------------------- | --------------------------- | ------------------------------------ | -------------------------------------------------------------- |
| Debounced search        | Custom debounce logic       | use-debounce library                 | Edge cases with cleanup, race conditions                       |
| Query caching           | Manual cache with useState  | TanStack Query                       | Cache invalidation, stale-while-revalidate, background updates |
| Form validation         | Custom validation functions | HTML5 validation + controlled inputs | Browser-native, accessible, well-tested                        |
| Skeleton loading        | Custom pulse animations     | Existing Skeleton component          | Already styled for dark theme, consistent                      |
| Image fallback handling | Custom error states         | AlbumImage component                 | Already handles Cover Art Archive 404s, retries, fallbacks     |

**Key insight:** Search UI has well-established patterns in React ecosystem. The existing project infrastructure (TanStack Query, Skeleton components, AlbumImage) handles most complexity. Focus on wiring existing pieces together per user decisions.

## Common Pitfalls

### Pitfall 1: Race Conditions in Search Requests

**What goes wrong:** User types fast, modifies query, and older search results overwrite newer ones
**Why it happens:** Async search responses can arrive out of order
**How to avoid:** TanStack Query automatically cancels in-flight requests when query key changes
**Warning signs:** Flickering results, wrong results showing after fast typing

```typescript
// TanStack Query handles this automatically via query key
const { data } = useQuery({
  queryKey: ['search', albumTitle, artistName, offset],
  queryFn: () => search(albumTitle, artistName, offset),
  // Previous query with old key is cancelled automatically
});
```

### Pitfall 2: Forgetting to Disable Search with Empty Inputs

**What goes wrong:** API calls execute with empty query strings, returning random results or errors
**Why it happens:** Not checking input validity before enabling query
**How to avoid:** Use `enabled` option with validation logic
**Warning signs:** Weird results on mount, error messages about invalid queries

```typescript
const shouldSearch = (titleValue.trim() || artistValue.trim()) && !isLoading;

const { data, isLoading } = useQuery({
  queryKey: ['search', titleValue, artistValue],
  queryFn: () => search(titleValue, artistValue),
  enabled: shouldSearch, // Don't execute with empty inputs
});
```

### Pitfall 3: Cover Art Archive 404 Handling

**What goes wrong:** Many MusicBrainz results don't have cover art; naive img tags show broken images
**Why it happens:** Cover Art Archive URLs return 404 for missing artwork
**How to avoid:** Use existing AlbumImage component which handles CAA 404s gracefully
**Warning signs:** Broken image icons in result list

```typescript
// DON'T do this:
<img src={result.coverArtUrl} alt={result.title} />

// DO use AlbumImage component:
<AlbumImage
  src={result.coverArtUrl}
  alt={result.title}
  width={48}
  height={48}
  showSkeleton={false} // Results already loaded
/>
```

### Pitfall 4: Not Preserving Search State Between Steps

**What goes wrong:** User searches, selects result, returns to search, and search state is lost
**Why it happens:** Modal step navigation doesn't automatically preserve search inputs/results
**How to avoid:** Store search state in sessionStorage alongside currentStep
**Warning signs:** Inputs reset when returning to search step

```typescript
// Extend existing modal state to include search state
interface ModalState {
  currentStep: number;
  searchQuery?: { albumTitle: string; artistName: string };
  searchOffset?: number;
}
```

### Pitfall 5: Loading State Flicker

**What goes wrong:** Brief flash of old results before loading state shows
**Why it happens:** Conditional rendering order and state updates
**How to avoid:** Check isLoading first, render skeleton before checking data
**Warning signs:** Visible flash of content during transitions

```typescript
// WRONG order:
{data && <Results results={data.results} />}
{isLoading && <Skeleton />}

// CORRECT order:
{isLoading ? (
  <SearchSkeleton />
) : data?.results.length > 0 ? (
  <Results results={data.results} />
) : (
  <NoResultsState />
)}
```

## Code Examples

Verified patterns from official sources and existing codebase:

### Search Query Hook Pattern

```typescript
// Source: Existing useUnifiedSearchQuery.ts + TanStack Query v5 patterns
import { useQuery } from '@tanstack/react-query';
import { getCorrectionSearchService } from '@/lib/correction/search-service';

interface SearchParams {
  albumTitle: string;
  artistName: string;
  offset?: number;
  limit?: number;
}

export function useSearchMusicBrainz(params: SearchParams, enabled: boolean) {
  const searchService = getCorrectionSearchService();

  return useQuery({
    queryKey: ['musicbrainz-search', params],
    queryFn: () =>
      searchService.searchWithScoring({
        albumTitle: params.albumTitle,
        artistName: params.artistName,
        offset: params.offset ?? 0,
        limit: params.limit ?? 10,
      }),
    enabled: enabled && !!(params.albumTitle || params.artistName),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
```

### Result Card with Match Score

```typescript
// Source: User decisions (CONTEXT.md) + web design patterns
import AlbumImage from '@/components/ui/AlbumImage';
import { Badge } from '@/components/ui/badge';
import type { ScoredSearchResult } from '@/lib/correction/types';

interface SearchResultCardProps {
  result: ScoredSearchResult;
  onClick: (result: ScoredSearchResult) => void;
}

export function SearchResultCard({ result, onClick }: SearchResultCardProps) {
  return (
    <button
      onClick={() => onClick(result)}
      className="w-full flex items-start gap-3 p-3 rounded-lg
                 hover:bg-zinc-800/50 active:bg-zinc-800
                 transition-colors duration-150 text-left"
    >
      {/* Thumbnail - 48px size for compact list */}
      <AlbumImage
        src={result.coverArtUrl}
        alt={result.title}
        width={48}
        height={48}
        className="rounded flex-shrink-0"
        showSkeleton={false}
      />

      {/* Details */}
      <div className="flex-1 min-w-0">
        {/* Title + Score */}
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium text-cosmic-latte truncate">
            {result.title}
          </h3>
          <span className="text-sm font-semibold text-emeraled-green whitespace-nowrap">
            {Math.round(result.normalizedScore * 100)}% match
          </span>
        </div>

        {/* Artist + Year */}
        <div className="text-sm text-zinc-400 truncate mb-1">
          {result.primaryArtistName}
          {result.firstReleaseDate && (
            <> • {result.firstReleaseDate.split('-')[0]}</>
          )}
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          {result.primaryType && (
            <span>{result.primaryType}</span>
          )}
          {result.trackCount && (
            <span>• {result.trackCount} tracks</span>
          )}
          {/* Source badge - subtle gray */}
          <Badge variant="outline" className="ml-auto text-zinc-500 border-zinc-700">
            MB
          </Badge>
        </div>
      </div>
    </button>
  );
}
```

### Search Form with Validation

```typescript
// Source: React 19 form patterns + user decisions
import { useState, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

interface SearchFormProps {
  initialAlbumTitle: string;
  initialArtistName: string;
  onSearch: (query: { albumTitle: string; artistName: string }) => void;
  isLoading?: boolean;
}

export function SearchForm({
  initialAlbumTitle,
  initialArtistName,
  onSearch,
  isLoading = false,
}: SearchFormProps) {
  const [albumTitle, setAlbumTitle] = useState(initialAlbumTitle);
  const [artistName, setArtistName] = useState(initialArtistName);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // Validation: at least one field required
    const trimmedTitle = albumTitle.trim();
    const trimmedArtist = artistName.trim();

    if (!trimmedTitle && !trimmedArtist) {
      // Could show toast error here
      return;
    }

    onSearch({ albumTitle: trimmedTitle, artistName: trimmedArtist });
  };

  const canSearch = !!(albumTitle.trim() || artistName.trim());

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        type="text"
        value={albumTitle}
        onChange={(e) => setAlbumTitle(e.target.value)}
        placeholder="Album title"
        disabled={isLoading}
      />
      <Input
        type="text"
        value={artistName}
        onChange={(e) => setArtistName(e.target.value)}
        placeholder="Artist name"
        disabled={isLoading}
      />
      <Button
        type="submit"
        disabled={!canSearch || isLoading}
        className="w-full"
      >
        <Search className="h-4 w-4 mr-2" />
        Search
      </Button>
    </form>
  );
}
```

### No Results State with Manual Edit Link

```typescript
// Source: User decisions (CONTEXT.md - Manual Edit as escape hatch)
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NoResultsStateProps {
  onManualEdit: () => void;
}

export function NoResultsState({ onManualEdit }: NoResultsStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="h-12 w-12 text-zinc-600 mb-4" />
      <h3 className="text-lg font-medium text-cosmic-latte mb-2">
        No results found
      </h3>
      <p className="text-sm text-zinc-400 mb-6 max-w-sm">
        We couldn't find any matches in MusicBrainz. Try adjusting your search
        or enter the data manually.
      </p>
      <Button variant="outline" onClick={onManualEdit}>
        Manual Edit
      </Button>
    </div>
  );
}
```

## State of the Art

| Old Approach            | Current Approach              | When Changed                | Impact                                   |
| ----------------------- | ----------------------------- | --------------------------- | ---------------------------------------- |
| useQuery overloads      | Single object parameter       | TanStack Query v5 (2023)    | Simpler API, better TypeScript inference |
| isLoading state         | isPending state               | TanStack Query v5 (2023)    | More accurate lifecycle representation   |
| Infinite scroll default | Load more button option       | 2024-2025 UX trends         | Better user control, accessibility       |
| Live search always      | Explicit search gaining favor | 2024-2026                   | Reduces noise, respects user agency      |
| Color-coded confidence  | Numeric scores                | AI/ML UI patterns 2025-2026 | Reduces cognitive load, lets users judge |

**Deprecated/outdated:**

- **React Hook Form with onChange validation** — React 19's native form features cover basic needs
- **Custom debounce hooks** — use-debounce library is standard (though not needed here)
- **Manual cache invalidation** — TanStack Query handles automatically
- **URL state for modal flows** — sessionStorage better for transient multi-step flows

## Open Questions

Things that couldn't be fully resolved:

1. **API endpoint pattern for client-side search**
   - What we know: Existing search service uses getCorrectionSearchService() singleton, Phase 2 implemented searchWithScoring method
   - What's unclear: Whether to create API endpoint at /api/admin/search or call service directly from client
   - Recommendation: Call service directly from client component since CorrectionSearchService already uses ADMIN priority queue and is designed for client-side use. Creating API endpoint would add unnecessary layer.

2. **Scroll position preservation specifics**
   - What we know: User wants scroll position preserved on back from preview
   - What's unclear: Whether browser native behavior is sufficient or needs explicit implementation
   - Recommendation: Start with browser native behavior (which usually works in SPAs). If insufficient during testing, add explicit sessionStorage save/restore (example provided in Pattern 5).

3. **Match score color thresholds**
   - What we know: User wants numeric percentage without visual distinction for low scores
   - What's unclear: Whether to use semantic colors (green for high) or neutral color for all
   - Recommendation: Use emeraled-green (theme color) for all scores to indicate positive match, avoiding red/yellow which imply warnings.

## Sources

### Primary (HIGH confidence)

- **TanStack Query v5 Official Documentation** - Query patterns, pagination, enabled option
  - https://tanstack.com/query/v5/docs/framework/react/guides/queries
  - https://tanstack.com/query/v5/docs/reference/QueryClient
- **Next.js 15 Official Documentation** - App Router patterns, client components
  - https://nextjs.org/learn/dashboard-app/adding-search-and-pagination
- **Existing Codebase** - CorrectionSearchService, modal patterns, styling
  - `/src/lib/correction/search-service.ts` - searchWithScoring implementation
  - `/src/hooks/useUnifiedSearchQuery.ts` - TanStack Query usage pattern
  - `/src/components/admin/correction/CorrectionModal.tsx` - Modal structure
  - `/src/components/ui/AlbumImage.tsx` - Image handling with CAA 404 fallback
  - `/src/components/LoadingStates.tsx` - Skeleton patterns

### Secondary (MEDIUM confidence)

- **TanStack Query v5 Best Practices (2026)** - https://dev.to/inam003/tanstack-query-v5-guide-features-benefits-and-how-its-used-36nk
- **React 19 Form Handling** - https://medium.com/@omril_15649/replacing-react-hook-form-in-react-19-dd069f29d505
- **Next.js 15 Pagination Patterns** - https://strapi.io/blog/epic-next-js-15-tutorial-part-8-search-and-pagination-in-next-js
- **Search Results Design Best Practices** - https://www.smashingmagazine.com/2009/09/search-results-design-best-practices-and-design-patterns/
- **Confidence Score UI Design** - https://medium.com/design-bootcamp/designing-a-confidence-based-feedback-ui-f5eba0420c8c

### Tertiary (LOW confidence)

- **TanStack Ecosystem Guide 2026** - https://www.codewithseb.com/blog/tanstack-ecosystem-complete-guide-2026 (Community blog, not official)
- **Search UX Best Practices 2026** - https://www.designstudiouiux.com/blog/search-ux-best-practices/ (Design agency, general advice)

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All libraries already installed in project, TanStack Query v5 verified in package.json
- Architecture: HIGH - User decisions in CONTEXT.md are explicit and prescriptive, existing modal structure verified
- Pitfalls: HIGH - Based on existing codebase patterns and official documentation warnings
- Code examples: HIGH - Adapted from existing codebase patterns with official API documentation

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (30 days - stable domain with locked user decisions)
