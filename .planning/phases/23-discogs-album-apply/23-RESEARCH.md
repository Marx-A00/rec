# Phase 23: Discogs Album Apply - Research

**Researched:** 2026-02-08
**Domain:** Extending album correction preview/apply system for Discogs data source
**Confidence:** HIGH

## Summary

This phase extends the existing album correction preview and apply services to handle Discogs as a data source, alongside MusicBrainz. The architecture already exists - preview-service.ts and apply-service.ts are well-structured service classes that fetch source data, generate field diffs, and apply selected changes atomically via Prisma transactions. The work is pure extension: add Discogs code paths that mirror the existing MusicBrainz logic.

The key difference is data fetching: MusicBrainz uses queue jobs to fetch release data (via QueuedMusicBrainzService), while Discogs will follow the same pattern (via QueuedDiscogsService already created in Phase 22). Both services return data in CorrectionSearchResult format, making the preview/apply logic largely source-agnostic. Field mapping requires attention to Discogs-specific differences: year-only dates, merged genres+styles, and discogsId storage instead of musicbrainzId.

The preview and apply UI components (PreviewView, ApplyView, FieldComparisonList, CoverArtComparison) are already source-agnostic - they work with generic CorrectionPreview and FieldSelections types. No UI changes needed beyond ensuring the source badge (already implemented in Phase 22) flows through to these views. The apply mutation will need conditional logic to store discogsId when source is Discogs.

**Primary recommendation:** Extend preview-service.ts with Discogs fetch path, extend apply-service.ts with discogsId storage logic, and ensure GraphQL resolver routes Discogs preview requests to new code paths. UI is ready.

## Standard Stack

### Core

**Library** | **Version** | **Purpose** | **Why Standard**
Prisma | latest | Database ORM | All apply operations use Prisma transactions
disconnect | 1.2.2 | Discogs API client | Already integrated, provides database.getMaster()
BullMQ | latest | Queue/rate limiting | Existing QueuedDiscogsService uses BullMQ
GraphQL + Apollo | latest | API layer | Thin resolver pattern routes source to correct service
Zustand | latest | State management | Correction store manages preview/apply state

### Supporting

**Library** | **Version** | **Purpose** | **When to Use**
@tanstack/react-query | v5 | Data fetching | Generated GraphQL query hooks
DiffEngine | internal | Field comparison | Generates diffs between current and source data
TrackMatcher | internal | Track alignment | Position-based track matching (works for Discogs)

### Alternatives Considered

**Instead of** | **Could Use** | **Tradeoff**
Extend existing services | Create separate Discogs services | Duplication vs extension - extension wins for maintainability
Queue for getMaster | Direct API call in resolver | Queue ensures rate limiting, matches MusicBrainz pattern
Store discogsId in externalIds | Add new column | externalIds JSON field already exists, no schema change needed

**Installation:**
No new packages needed - all dependencies already installed.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── correction/
│   │   ├── preview/
│   │   │   ├── preview-service.ts      # EXTEND: Add fetchDiscogsReleaseData()
│   │   │   └── types.ts                # EXTEND: Add DiscogsReleaseData type
│   │   └── apply/
│   │       └── apply-service.ts        # EXTEND: Add discogsId update logic
│   ├── discogs/
│   │   ├── queued-service.ts           # EXISTING: QueuedDiscogsService (Phase 22)
│   │   └── mappers.ts                  # EXTEND: Add mapMasterToPreviewData()
│   └── graphql/
│       └── resolvers/
│           └── queries.ts              # EXTEND: Add Discogs path in correctionPreview
├── components/admin/correction/
│   ├── preview/
│   │   └── PreviewView.tsx             # READY: Source-agnostic, no changes
│   └── apply/
│       └── ApplyView.tsx               # READY: Source-agnostic, no changes
└── prisma/
    └── schema.prisma                   # READY: Album.discogsId field exists
```

### Pattern 1: Source-Conditional Data Fetching in Preview Service

**What:** Extend CorrectionPreviewService.fetchMBReleaseData() to become fetchReleaseData() with source parameter, routing to QueuedDiscogsService when source is Discogs

**When to use:** Preview generation for Discogs source (triggered from GraphQL resolver)

**Example:**

```typescript
// src/lib/correction/preview/preview-service.ts

async generatePreview(
  albumId: string,
  searchResult: ScoredSearchResult,
  releaseMbid: string,
  source: 'musicbrainz' | 'discogs' = 'musicbrainz'
): Promise<CorrectionPreview> {
  const currentAlbum = await this.fetchCurrentAlbum(albumId);
  
  // Conditional fetch based on source
  const sourceData = source === 'discogs'
    ? await this.fetchDiscogsReleaseData(releaseMbid)
    : await this.fetchMBReleaseData(releaseMbid);
  
  // Generate diffs (same logic for both sources)
  const fieldDiffs = this.generateFieldDiffs(currentAlbum, sourceData, releaseMbid, source);
  // ... rest unchanged
}

private async fetchDiscogsReleaseData(
  discogsMasterId: string
): Promise<DiscogsReleaseData | null> {
  try {
    const discogsService = getQueuedDiscogsService();
    
    // Fetch master data via queue (rate limited)
    const master = await discogsService.getMaster(
      discogsMasterId,
      PRIORITY_TIERS.ADMIN
    );
    
    // Transform to common preview format
    return this.transformDiscogsMaster(master);
  } catch (error) {
    console.error('Failed to fetch Discogs master data:', error);
    return null;
  }
}

private transformDiscogsMaster(master: DiscogsMaster): DiscogsReleaseData {
  return {
    id: master.id.toString(),
    title: master.title,
    // Year-only date with Jan 1 fallback (per Phase 22 CONTEXT.md)
    date: master.year ? `${master.year}-01-01` : undefined,
    country: undefined, // Discogs masters don't have country
    barcode: undefined, // Masters don't have barcodes
    // Map tracklist to media format
    media: this.mapDiscogsTracklist(master.tracklist),
    // Map artist credits
    artistCredit: master.artists.map(a => ({
      name: a.name,
      joinphrase: a.join || '',
      artist: {
        id: a.id.toString(),
        name: a.name,
        sortName: undefined, // Discogs doesn't have sort names
        disambiguation: undefined,
      },
    })),
  };
}
```

**Source:** Existing pattern from fetchMBReleaseData() in src/lib/correction/preview/preview-service.ts

### Pattern 2: External ID Storage by Source

**What:** Extend apply-service.ts to store discogsId when source is Discogs, musicbrainzId when source is MusicBrainz

**When to use:** Apply correction mutation, updating album with external ID from source

**Example:**

```typescript
// src/lib/correction/apply/apply-service.ts

async applyCorrection(input: ApplyInput): Promise<ApplyResult> {
  const { albumId, preview, selections, expectedUpdatedAt, adminUserId } = input;
  
  // Determine source from preview
  const source = preview.sourceResult.source || 'musicbrainz';
  
  // Build album update data (existing logic)
  const albumUpdateData = buildAlbumUpdateData(preview, selections);
  
  // Add external ID based on source
  if (selections.externalIds.musicbrainzId && source === 'musicbrainz') {
    albumUpdateData.musicbrainzId = preview.sourceResult.releaseGroupMbid;
  } else if (selections.externalIds.discogsId && source === 'discogs') {
    // Store Discogs master ID
    albumUpdateData.discogsId = preview.sourceResult.releaseGroupMbid;
  }
  
  // Apply in transaction (existing logic unchanged)
  await this.prisma.$transaction(async tx => {
    await tx.album.update({
      where: { id: albumId },
      data: albumUpdateData,
    });
    // ... rest of apply logic
  });
}
```

**Source:** Existing pattern from applyCorrection() in src/lib/correction/apply/apply-service.ts, Album model schema in prisma/schema.prisma

### Pattern 3: Source-Agnostic Field Diff Generation

**What:** DiffEngine methods (compareText, compareDate, etc.) work identically for MusicBrainz and Discogs - only data transformation differs

**When to use:** All field comparison logic in preview-service.ts

**Example:**

```typescript
// src/lib/correction/preview/preview-service.ts

private generateFieldDiffs(
  currentAlbum: Album,
  sourceData: MBReleaseData | DiscogsReleaseData | null,
  sourceId: string,
  source: 'musicbrainz' | 'discogs'
): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  
  // Title (same for both sources)
  diffs.push(
    this.diffEngine.compareText('title', currentAlbum.title, sourceData?.title || null)
  );
  
  // Release date (Discogs is year-only, but DiffEngine handles this)
  diffs.push(
    this.diffEngine.compareDate(currentAlbum.releaseDate, sourceData?.date || null)
  );
  
  // Country (only MusicBrainz has this)
  if (source === 'musicbrainz') {
    diffs.push(
      this.diffEngine.compareText('country', currentAlbum.releaseCountry, sourceData?.country || null)
    );
  }
  
  // External ID (conditional on source)
  if (source === 'musicbrainz') {
    diffs.push(
      this.diffEngine.compareExternalId('musicbrainzId', currentAlbum.musicbrainzId, sourceId)
    );
  } else if (source === 'discogs') {
    diffs.push(
      this.diffEngine.compareExternalId('discogsId', currentAlbum.discogsId, sourceId)
    );
  }
  
  return diffs;
}
```

**Source:** Existing pattern from generateFieldDiffs() in src/lib/correction/preview/preview-service.ts

### Pattern 4: Tracklist Mapping from Discogs Format

**What:** Discogs tracklist uses position strings ("1", "2", "A1", "B2") instead of structured disc/track numbers

**When to use:** Transforming Discogs master tracklist to MBMedium[] format for preview

**Example:**

```typescript
// src/lib/correction/preview/preview-service.ts

private mapDiscogsTracklist(tracklist: DiscogsMaster['tracklist']): MBMedium[] {
  // Group tracks by disc (parse position strings)
  const discMap = new Map<number, Array<{
    position: string;
    title: string;
    duration: string;
  }>>();
  
  tracklist.forEach(track => {
    // Parse disc from position (e.g., "A1" -> disc 1, "B2" -> disc 2)
    const disc = this.parseDiscNumber(track.position);
    const trackNum = this.parseTrackNumber(track.position);
    
    if (!discMap.has(disc)) {
      discMap.set(disc, []);
    }
    discMap.get(disc)!.push({
      position: track.position,
      title: track.title,
      duration: track.duration,
    });
  });
  
  // Convert to MBMedium format
  return Array.from(discMap.entries()).map(([discNum, tracks]) => ({
    position: discNum,
    format: 'Digital', // Discogs masters don't specify format
    trackCount: tracks.length,
    tracks: tracks.map((track, idx) => ({
      position: idx + 1,
      recording: {
        id: '', // Discogs tracks don't have IDs
        title: track.title,
        length: this.parseDuration(track.duration), // Convert "MM:SS" to milliseconds
        position: idx + 1,
      },
    })),
  }));
}

private parseDiscNumber(position: string): number {
  // Discogs positions: "1", "2" = disc 1, "A1" = disc 1, "B1" = disc 2, etc.
  const match = position.match(/^([A-Z])?(\d+)/);
  if (!match) return 1;
  
  if (match[1]) {
    // Letter prefix (A=1, B=2, C=3, etc.)
    return match[1].charCodeAt(0) - 64;
  }
  return 1; // No letter = disc 1
}

private parseDuration(duration: string): number | undefined {
  // Convert "MM:SS" to milliseconds
  if (!duration) return undefined;
  
  const parts = duration.split(':');
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    return (minutes * 60 + seconds) * 1000;
  }
  return undefined;
}
```

**Source:** Pattern from mapDiscogsMasterToAlbum() in src/lib/discogs/mappers.ts, adapted for preview system

### Anti-Patterns to Avoid

- **Creating separate Discogs preview/apply services:** Don't duplicate service classes. Extend existing services with conditional logic based on source parameter.
- **Assuming Discogs has all MusicBrainz fields:** Discogs lacks disambiguation, secondary types, release country, barcode (for masters). Always null-check and provide fallbacks.
- **Storing Discogs ID in wrong format:** Album.discogsId is VARCHAR(20), not integer. Always convert master.id (number) to string.
- **Direct API calls instead of queue:** Always use QueuedDiscogsService for rate limiting consistency, even in preview (ADMIN priority tier = fast response).

## Don't Hand-Roll

**Problem** | **Don't Build** | **Use Instead** | **Why**
Field diff logic | New Discogs-specific diff engine | DiffEngine methods (compareText, compareDate) | Already handles null values, change classification
Track matching | Custom Discogs track matcher | TrackMatcher (position-based) | Works for both MusicBrainz and Discogs tracklists
External ID storage | New database column | Album.discogsId field (existing) | Schema already has discogsId VARCHAR(20)
Rate limiting | Custom Discogs rate limiter | QueuedDiscogsService via BullMQ | Matches MusicBrainz pattern, 1 req/sec limit

**Key insight:** The preview/apply architecture is designed to be source-agnostic. Only data fetching and transformation differ between MusicBrainz and Discogs. All diff generation, UI rendering, and apply logic is shared.

## Common Pitfalls

### Pitfall 1: Discogs Master ID Type Mismatch

**What goes wrong:** Discogs master.id is number in API response, but Album.discogsId is VARCHAR(20) in database. Storing number directly causes type error.

**Why it happens:** Discogs API returns JSON with numeric IDs, Prisma schema uses string for discogsId field.

**How to avoid:** Always convert Discogs ID to string before storing:

```typescript
albumUpdateData.discogsId = preview.sourceResult.releaseGroupMbid; // Already string from search result
// OR when fetching master directly:
albumUpdateData.discogsId = master.id.toString();
```

**Warning signs:** Prisma validation error "Expected string, received number" when applying Discogs correction.

### Pitfall 2: Year-Only Date Creates Invalid Date Objects

**What goes wrong:** Discogs returns year as number (e.g., 2007), not ISO date string. Passing "2007" to Date() creates invalid date.

**Why it happens:** Phase 22 CONTEXT.md specifies "year-only dates use January 1st fallback" but transformation might be inconsistent.

**How to avoid:** Always convert year to full ISO date with Jan 1 fallback in transformation:

```typescript
// In transformDiscogsMaster():
date: master.year ? `${master.year}-01-01` : undefined
```

**Warning signs:** Preview shows "Invalid Date", date comparison fails, sorting by date breaks.

### Pitfall 3: Missing Genres/Styles Merge

**What goes wrong:** Preview shows no genres for Discogs albums, even though master has genres and styles arrays.

**Why it happens:** Album model has single genres array, but Discogs separates genres (broad) and styles (specific). Forgetting to merge loses style data.

**How to avoid:** Always merge both arrays in transformation (per Phase 22 research):

```typescript
// In transformDiscogsMaster() or field diff logic:
const mergedGenres = [...(master.genres || []), ...(master.styles || [])];
```

**Warning signs:** Genre tags missing in preview, Discogs albums show fewer genres than search results.

### Pitfall 4: Tracklist Position Parsing Errors

**What goes wrong:** Discogs uses letter prefixes for multi-disc albums ("A1", "B1"). Parsing fails, all tracks assigned to disc 1.

**Why it happens:** MusicBrainz uses structured disc/track numbers, Discogs uses free-form position strings.

**How to avoid:** Implement robust position parser that handles:
- Numeric positions: "1", "2" (disc 1)
- Letter prefixes: "A1" (disc 1), "B1" (disc 2), "C1" (disc 3)
- Non-standard formats: "Side A", "1-1" (fallback to disc 1)

```typescript
// In parseDiscNumber():
const match = position.match(/^([A-Z])?(\d+)/);
if (match && match[1]) {
  return match[1].charCodeAt(0) - 64; // A=1, B=2, etc.
}
return 1; // Default to disc 1
```

**Warning signs:** All tracks show disc 1 in preview, multi-disc albums have wrong track counts.

### Pitfall 5: Missing Cover Art URL Fallback

**What goes wrong:** Discogs masters with no images crash preview rendering or show broken image tags.

**Why it happens:** Some masters have empty images array, but UI expects coverArtUrl to be null or valid URL.

**How to avoid:** Handle null/empty images in transformation:

```typescript
// In transformDiscogsMaster():
const coverImage = master.images?.[0];
const coverArtUrl = coverImage?.uri || null; // Not empty string!
```

UI component (CoverArtComparison) already handles null gracefully with placeholder.

**Warning signs:** Preview crashes on Discogs albums, console error "Cannot read property 'uri' of undefined".

## Code Examples

Verified patterns from official sources and existing codebase:

### QueuedDiscogsService.getMaster() (for preview data)

```typescript
// Source: Pattern from QueuedMusicBrainzService.getRelease() in queue-service.ts
// NEW METHOD to add to queued-service.ts

async getMaster(
  masterId: string,
  priority: number = PRIORITY_TIERS.DEFAULT
): Promise<DiscogsMaster> {
  this.ensureInitialized();
  
  console.log(chalk.cyan(`[QueuedDiscogsService] Queuing master fetch for ID ${masterId}`));
  
  try {
    const job = await this.queue.addJob(
      JOB_TYPES.DISCOGS_GET_MASTER,
      {
        masterId,
        requestId: `discogs-master-${masterId}-${Date.now()}`,
      },
      {
        priority,
        requestId: `discogs-master-${masterId}`,
      }
    );
    
    const result = await this.waitForJobViaEvents(job.id!);
    return result as DiscogsMaster;
  } catch (error) {
    console.error('[QueuedDiscogsService] Master fetch failed:', error);
    throw new Error(
      `Failed to fetch Discogs master: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
```

### Discogs Master Fetch Job Handler

```typescript
// Source: Pattern from discogs-processor.ts (artist fetch)
// NEW HANDLER to add to discogs-processor.ts

export async function handleDiscogsGetMaster(
  job: Job<DiscogsGetMasterJobData>
): Promise<unknown> {
  const data = job.data;
  
  console.log(`🎵 Fetching Discogs master details for ID: ${data.masterId}`);
  
  try {
    const Discogs = await import('disconnect');
    const discogsClient = new Discogs.default.Client({
      userAgent: 'RecProject/1.0 +https://rec-music.org',
      consumerKey: process.env.CONSUMER_KEY!,
      consumerSecret: process.env.CONSUMER_SECRET!,
    }).database();
    
    const master = await discogsClient.getMaster(parseInt(data.masterId, 10));
    
    console.log(`✅ Fetched Discogs master: "${master.title}" (${master.year || 'unknown year'})`);
    
    return master; // Return full DiscogsMaster object
  } catch (error) {
    console.error(`❌ Failed to fetch Discogs master ${data.masterId}:`, error);
    throw error;
  }
}
```

### GraphQL Resolver Extension

```typescript
// Source: src/lib/graphql/resolvers/queries.ts (correctionPreview resolver)
// EXTEND existing resolver

correctionPreview: async (_, { input }, { user, prisma }) => {
  // ... existing auth checks ...
  
  const { albumId, releaseGroupMbid, source } = input;
  
  // Get album with tracks
  const album = await prisma.album.findUnique({
    where: { id: albumId },
    include: {
      tracks: { orderBy: [{ discNumber: 'asc' }, { trackNumber: 'asc' }] },
      artists: { include: { artist: true }, orderBy: { position: 'asc' } },
    },
  });
  
  if (!album) {
    throw new GraphQLError('Album not found: ' + albumId, {
      extensions: { code: 'NOT_FOUND' },
    });
  }
  
  // Fetch source result (MusicBrainz or Discogs)
  let scoredResult;
  if (source === 'discogs') {
    // Discogs path (new)
    const discogsService = getQueuedDiscogsService();
    const master = await discogsService.getMaster(releaseGroupMbid, PRIORITY_TIERS.ADMIN);
    scoredResult = mapMasterToCorrectionSearchResult(master);
  } else {
    // MusicBrainz path (existing)
    const searchService = getCorrectionSearchService();
    scoredResult = await searchService.getByMbid(releaseGroupMbid);
  }
  
  // Generate preview (service handles source differences internally)
  const previewService = getCorrectionPreviewService();
  const preview = await previewService.generatePreview(
    albumId,
    scoredResult,
    releaseGroupMbid,
    source || 'musicbrainz'
  );
  
  return {
    // ... existing response mapping ...
  };
}
```

### Field Selection for Discogs External ID

```typescript
// Source: src/lib/correction/apply/field-selector.ts
// EXTEND buildAlbumUpdateData()

export function buildAlbumUpdateData(
  preview: CorrectionPreview,
  selections: FieldSelections
): Prisma.AlbumUpdateInput {
  const data: Prisma.AlbumUpdateInput = {};
  const source = preview.sourceResult.source || 'musicbrainz';
  
  // ... existing metadata field logic ...
  
  // External IDs (conditional on source)
  if (source === 'musicbrainz' && selections.externalIds.musicbrainzId) {
    data.musicbrainzId = preview.sourceResult.releaseGroupMbid;
  } else if (source === 'discogs' && selections.externalIds.discogsId) {
    data.discogsId = preview.sourceResult.releaseGroupMbid;
  }
  
  return data;
}
```

## State of the Art

**Old Approach** | **Current Approach** | **When Changed** | **Impact**
MusicBrainz only | Multi-source (MB + Discogs) | Phase 21-23 (Feb 2026) | Admin can correct from multiple data sources
Source-specific services | Unified service with source param | Phase 23 (now) | Less duplication, easier maintenance
musicbrainzId only | musicbrainzId + discogsId | Phase 23 (now) | Tracks both external IDs independently

**Deprecated/outdated:**

- externalIds JSON field (old approach) - now using dedicated discogsId column (exists in schema)
- Separate Discogs preview service - unified CorrectionPreviewService with source parameter

## Open Questions

Things that couldn't be fully resolved:

1. **Should preview show Discogs-specific fields (label, catalog number)?**
   - What we know: Album model has label and catalogNumber fields. Discogs masters don't have these (releases do).
   - What's unclear: Should preview attempt to fetch main release for label/catalog data?
   - Recommendation: Skip label/catalogNumber for Discogs masters (masters don't have this data). Only show if fetching specific releases (deferred to Phase 24+).

2. **How to handle Discogs tracklist positions like "Video" or "Side A"?**
   - What we know: Discogs allows non-numeric positions for special tracks (videos, bonus material).
   - What's unclear: Should these be included in track comparison, or filtered out?
   - Recommendation: Parse numeric positions only, skip non-numeric (log warning). Prevents invalid track matching.

3. **Should apply log differentiate between MusicBrainz and Discogs sources?**
   - What we know: enrichment_logs table records sources array. Current code hardcodes ['musicbrainz'].
   - What's unclear: Should log show ['discogs'] when applying Discogs correction?
   - Recommendation: Yes - update logCorrection() to use source from preview. Improves audit trail accuracy.

## Sources

### Primary (HIGH confidence)

- Existing codebase patterns:
  - /src/lib/correction/preview/preview-service.ts (MusicBrainz preview implementation)
  - /src/lib/correction/apply/apply-service.ts (Apply atomic transaction pattern)
  - /src/lib/discogs/queued-service.ts (QueuedDiscogsService from Phase 22)
  - /src/lib/discogs/mappers.ts (Discogs master/release mapping)
  - /prisma/schema.prisma (Album.discogsId field definition)
  - /src/lib/queue/processors/discogs-processor.ts (Discogs job handlers)

### Secondary (MEDIUM confidence)

- Phase 22 RESEARCH.md - Discogs API patterns, master data structure, year-only dates, genres+styles merge
- [Discogs API Master Endpoint](https://discogs.com/developers/resources/database/master-endpoint.html) - Master data structure, tracklist format

### Tertiary (LOW confidence)

None - all patterns verified in existing codebase or official Discogs API docs.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All libraries already integrated, extension work only
- Architecture: HIGH - Clear patterns from MusicBrainz preview/apply services
- Pitfalls: HIGH - Identified from Phase 22 research and Album schema analysis
- Code examples: HIGH - Derived from working MusicBrainz implementation

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days - stable domain, extension of existing patterns)
