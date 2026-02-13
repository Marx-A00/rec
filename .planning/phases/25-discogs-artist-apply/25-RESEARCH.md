# Phase 25: Discogs Artist Apply - Research

**Researched:** 2026-02-09
**Domain:** Extending artist correction preview/apply system for Discogs data source
**Confidence:** HIGH

## Summary

This phase extends the existing artist correction preview and apply services to handle Discogs as a data source, mirroring the Phase 23 pattern for albums. The architecture is already proven: artist correction has preview-service and apply-service classes (Phase 11), and both support source-conditional routing. The work is pure extension: add Discogs code paths that fetch artist data from Discogs API, generate field diffs, and apply selected changes atomically.

The key infrastructure already exists from Phase 24: DISCOGS_GET_ARTIST job type, QueuedDiscogsService, and UnifiedArtistService.getDiscogsArtist(). The artist correction store (useArtistCorrectionStore.ts) already has correctionSource state. Preview and apply UI components are source-agnostic, requiring no changes beyond ensuring the source badge flows through.

Field mapping requires attention to Discogs-specific differences: profile text (biography), realname (store in biography if useful), members/groups arrays (append to biography as structured text), genres (Discogs doesn't separate genres/styles for artists), and discogsId storage. Cloudflare image upload follows the existing CACHE_ARTIST_IMAGE job pattern - upload on apply, store cloudflareImageId.

**Primary recommendation:** Extend artist preview-service with Discogs fetch path (via DISCOGS_GET_ARTIST job), extend apply-service with discogsId storage and image upload queue, and ensure GraphQL resolver routes Discogs preview requests to QueuedDiscogsService.

## Standard Stack

### Core

**Library** | **Version** | **Purpose** | **Why Standard**
Prisma | latest | Database ORM | All apply operations use Prisma transactions
disconnect | 1.2.2 | Discogs API client | Already integrated, provides database.getArtist()
BullMQ | latest | Queue/rate limiting | Existing QueuedDiscogsService uses BullMQ for DISCOGS_GET_ARTIST
GraphQL + Apollo | latest | API layer | Thin resolver pattern routes source to correct service
Zustand | latest | State management | useArtistCorrectionStore manages preview/apply state

### Supporting

**Library** | **Version** | **Purpose** | **When to Use**
@tanstack/react-query | v5 | Data fetching | Generated GraphQL query hooks
UnifiedArtistService | internal | Multi-source artist fetch | Fetches Discogs artist details with normalized interface
DiffEngine | internal | Field comparison | Generates diffs between current and source data

### Alternatives Considered

**Instead of** | **Could Use** | **Tradeoff**
Extend existing services | Create separate Discogs artist services | Duplication vs extension - extension wins for maintainability
Queue for getArtist | Direct API call in resolver | Queue ensures rate limiting, matches MusicBrainz pattern
Store discogsId in Artist.discogsId | Add new column | discogsId VARCHAR(20) field already exists in schema
Upload to Cloudflare on apply | Store external URL directly | Cloudflare provides optimized delivery and CDN

**Installation:**
No new packages needed - all dependencies already installed.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── correction/
│   │   ├── artist/
│   │   │   ├── preview-service.ts   # EXTEND: Add fetchDiscogsArtistData()
│   │   │   └── types.ts             # EXTEND: Add DiscogsArtistData type
│   │   └── apply/
│   │       └── apply-service.ts     # EXTEND: Add discogsId + image upload logic
│   ├── discogs/
│   │   ├── queued-service.ts        # EXTEND: Add getArtist() method (wraps DISCOGS_GET_ARTIST)
│   │   └── mappers.ts               # EXTEND: Add mapDiscogsArtistToPreviewData()
│   ├── api/
│   │   └── unified-artist-service.ts # EXISTING: getDiscogsArtist() ready
│   └── graphql/
│       └── resolvers/
│           └── queries.ts           # EXTEND: Add Discogs path in artistCorrectionPreview
├── components/admin/correction/artist/
│   ├── preview/
│   │   └── ArtistPreviewView.tsx    # READY: Source-agnostic, no changes
│   └── apply/
│       └── ArtistApplyView.tsx      # READY: Source-agnostic, no changes
└── prisma/
    └── schema.prisma                # READY: Artist.discogsId field exists
```

### Pattern 1: Source-Conditional Data Fetching in Artist Preview Service

**What:** Extend artist preview service to fetch from Discogs when source is 'discogs', routing to QueuedDiscogsService.getArtist() which wraps DISCOGS_GET_ARTIST job

**When to use:** Preview generation for Discogs artist source (triggered from GraphQL resolver)

**Example:**

```typescript
// src/lib/correction/artist/preview-service.ts

async generatePreview(
  artistId: string,
  searchResult: ArtistSearchResult,
  artistMbid: string,
  source: 'musicbrainz' | 'discogs' = 'musicbrainz'
): Promise<ArtistCorrectionPreview> {
  const currentArtist = await this.fetchCurrentArtist(artistId);
  
  // Conditional fetch based on source
  const sourceData = source === 'discogs'
    ? await this.fetchDiscogsArtistData(artistMbid) // artistMbid is actually discogsId here
    : await this.fetchMBArtistData(artistMbid);
  
  // Generate diffs (same logic for both sources)
  const fieldDiffs = this.generateFieldDiffs(currentArtist, sourceData, artistMbid, source);
  // ... rest unchanged
}

private async fetchDiscogsArtistData(
  discogsId: string
): Promise<DiscogsArtistData | null> {
  try {
    // Use UnifiedArtistService which handles Discogs API via disconnect library
    const { unifiedArtistService } = await import('@/lib/api/unified-artist-service');
    
    const discogsArtist = await unifiedArtistService.getArtistDetails(
      discogsId,
      { source: 'discogs', skipLocalCache: true }
    );
    
    // Transform to preview format
    return this.transformDiscogsArtist(discogsArtist);
  } catch (error) {
    console.error('Failed to fetch Discogs artist data:', error);
    return null;
  }
}

private transformDiscogsArtist(artist: UnifiedArtistDetails): DiscogsArtistData {
  return {
    id: artist.discogsId!,
    name: artist.name,
    // Biography: use profile if available, append realname if different
    biography: this.buildBiography(artist),
    // Discogs doesn't provide formedYear directly - would need to parse profile
    formedYear: this.parseFormedYear(artist.profile),
    // Discogs doesn't have standardized country codes
    countryCode: artist.country,
    area: undefined, // Discogs doesn't have area field
    artistType: undefined, // Discogs doesn't categorize Person/Group/Other
    // Discogs has genres array at release level, not artist level
    genres: [],
    imageUrl: artist.imageUrl,
  };
}

private buildBiography(artist: UnifiedArtistDetails): string | undefined {
  const parts: string[] = [];
  
  if (artist.profile) {
    parts.push(artist.profile);
  }
  
  if (artist.realName && artist.realName !== artist.name) {
    parts.push(`Real name: ${artist.realName}`);
  }
  
  if (artist.members && artist.members.length > 0) {
    const memberNames = artist.members.map(m => m.name || m.id).join(', ');
    parts.push(`Members: ${memberNames}`);
  }
  
  if (artist.groups && artist.groups.length > 0) {
    const groupNames = artist.groups.map(g => g.name || g.id).join(', ');
    parts.push(`Groups: ${groupNames}`);
  }
  
  return parts.length > 0 ? parts.join('\n\n') : undefined;
}
```

**Source:** Pattern from Phase 23 album preview service, adapted for artist correction

### Pattern 2: External ID Storage with Cloudflare Image Upload

**What:** Extend artist apply-service to store discogsId when source is Discogs, and queue Cloudflare image upload if imageUrl changes

**When to use:** Apply artist correction mutation, updating artist with external ID and optimized image

**Example:**

```typescript
// src/lib/correction/artist/apply-service.ts (NEW FILE - mirrors album pattern)

async applyCorrection(input: ArtistApplyInput): Promise<ArtistApplyResult> {
  const { artistId, preview, selections, expectedUpdatedAt, adminUserId } = input;
  
  // Determine source from preview
  const source = preview.sourceResult.source || 'musicbrainz';
  
  // Build artist update data
  const artistUpdateData = this.buildArtistUpdateData(preview, selections);
  
  // Add external ID based on source
  if (selections.externalIds.musicbrainzId && source === 'musicbrainz') {
    artistUpdateData.musicbrainzId = preview.sourceResult.artistMbid;
  } else if (selections.externalIds.discogsId && source === 'discogs') {
    // Store Discogs ID as string (VARCHAR(20))
    artistUpdateData.discogsId = preview.sourceResult.artistMbid;
  }
  
  // Update source field if external ID is changing
  if (selections.externalIds.musicbrainzId || selections.externalIds.discogsId) {
    artistUpdateData.source = source === 'musicbrainz' ? 'MUSICBRAINZ' : 'DISCOGS';
  }
  
  // Apply in transaction
  await this.prisma.$transaction(async tx => {
    const updatedArtist = await tx.artist.update({
      where: { id: artistId },
      data: artistUpdateData,
    });
    
    // Queue Cloudflare image upload if imageUrl changed
    if (selections.metadata.imageUrl && preview.sourceData?.imageUrl) {
      await this.queueImageUpload(artistId, preview.sourceData.imageUrl);
    }
    
    // Log enrichment
    await this.logCorrection(artistId, source, selections, adminUserId);
  });
}

private async queueImageUpload(artistId: string, imageUrl: string): Promise<void> {
  const { getMusicBrainzQueue } = await import('@/lib/queue/musicbrainz-queue');
  const queue = await getMusicBrainzQueue();
  
  await queue.addJob(
    'CACHE_ARTIST_IMAGE',
    {
      artistId,
      requestId: `artist-correction-${artistId}-${Date.now()}`,
    },
    {
      priority: 6, // Admin corrections = medium priority
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    }
  );
}
```

**Source:** Existing album apply-service pattern in src/lib/correction/apply/apply-service.ts, CACHE_ARTIST_IMAGE job handler in src/lib/queue/processors/cache-processor.ts

### Pattern 3: Source-Agnostic Field Diff Generation

**What:** DiffEngine methods work identically for MusicBrainz and Discogs - only data transformation differs

**When to use:** All field comparison logic in artist preview-service

**Example:**

```typescript
// src/lib/correction/artist/preview-service.ts

private generateFieldDiffs(
  currentArtist: Artist,
  sourceData: MBArtistData | DiscogsArtistData | null,
  sourceId: string,
  source: 'musicbrainz' | 'discogs'
): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  
  // Name (same for both sources)
  diffs.push(
    this.diffEngine.compareText('name', currentArtist.name, sourceData?.name || null)
  );
  
  // Biography (profile for Discogs, annotation for MusicBrainz)
  diffs.push(
    this.diffEngine.compareText('biography', currentArtist.biography, sourceData?.biography || null)
  );
  
  // formedYear (MusicBrainz has life-span.begin, Discogs may have it in profile)
  if (sourceData?.formedYear) {
    diffs.push(
      this.diffEngine.compareNumber('formedYear', currentArtist.formedYear, sourceData.formedYear)
    );
  }
  
  // Country code (MusicBrainz has standardized codes, Discogs has free-form country)
  if (source === 'musicbrainz' && sourceData?.countryCode) {
    diffs.push(
      this.diffEngine.compareText('countryCode', currentArtist.countryCode, sourceData.countryCode)
    );
  }
  
  // Area (MusicBrainz only)
  if (source === 'musicbrainz' && sourceData?.area) {
    diffs.push(
      this.diffEngine.compareText('area', currentArtist.area, sourceData.area)
    );
  }
  
  // Artist type (MusicBrainz only - Person/Group/Other)
  if (source === 'musicbrainz' && sourceData?.artistType) {
    diffs.push(
      this.diffEngine.compareText('artistType', currentArtist.artistType, sourceData.artistType)
    );
  }
  
  // Image URL (both sources have images)
  if (sourceData?.imageUrl) {
    diffs.push(
      this.diffEngine.compareText('imageUrl', currentArtist.imageUrl, sourceData.imageUrl)
    );
  }
  
  // External ID (conditional on source)
  if (source === 'musicbrainz') {
    diffs.push(
      this.diffEngine.compareExternalId('musicbrainzId', currentArtist.musicbrainzId, sourceId)
    );
  } else if (source === 'discogs') {
    diffs.push(
      this.diffEngine.compareExternalId('discogsId', currentArtist.discogsId, sourceId)
    );
  }
  
  return diffs;
}
```

**Source:** Existing pattern from album preview-service generateFieldDiffs() method

### Pattern 4: GraphQL Source-Aware Resolver

**What:** artistCorrectionPreview resolver switches between MusicBrainz and Discogs services based on source parameter

**When to use:** Artist correction preview with source toggle

**Example:**

```typescript
// src/lib/graphql/resolvers/queries.ts - EXTEND RESOLVER

artistCorrectionPreview: async (
  _,
  { artistId, artistMbid, source },
  { user, prisma }
) => {
  // ... existing auth checks ...
  
  // Fetch source result (MusicBrainz or Discogs)
  let searchResult;
  if (source === 'DISCOGS') {
    // Discogs path: artistMbid is actually discogsId
    const { unifiedArtistService } = await import('@/lib/api/unified-artist-service');
    const discogsArtist = await unifiedArtistService.getArtistDetails(
      artistMbid,
      { source: 'discogs', skipLocalCache: true }
    );
    
    // Map to ArtistSearchResult format
    searchResult = {
      artistMbid: discogsArtist.discogsId!,
      name: discogsArtist.name,
      sortName: discogsArtist.name,
      disambiguation: undefined,
      type: undefined,
      country: discogsArtist.country,
      area: undefined,
      beginDate: undefined,
      endDate: undefined,
      ended: undefined,
      gender: undefined,
      mbScore: 100,
      topReleases: undefined,
      source: 'discogs' as const,
    };
  } else {
    // MusicBrainz path (existing)
    const searchService = getArtistCorrectionSearchService();
    searchResult = await searchService.getByMbid(artistMbid);
  }
  
  // Generate preview (service handles source differences internally)
  const previewService = getArtistCorrectionPreviewService();
  const preview = await previewService.generatePreview(
    artistId,
    searchResult,
    artistMbid,
    source?.toLowerCase() || 'musicbrainz'
  );
  
  return {
    // ... existing response mapping ...
  };
}
```

**Source:** Existing album correctionPreview resolver pattern from Phase 23

### Anti-Patterns to Avoid

- **Creating separate Discogs artist preview/apply services:** Don't duplicate service classes. Extend existing services with conditional logic based on source parameter.
- **Assuming Discogs has all MusicBrainz fields:** Discogs lacks artistType, area, standardized country codes, genres at artist level. Always null-check and provide fallbacks.
- **Storing Discogs ID in wrong format:** Artist.discogsId is VARCHAR(20), not integer. Always convert discogsId (number) to string.
- **Direct Cloudflare upload in apply transaction:** Queue CACHE_ARTIST_IMAGE job instead. Keeps transaction fast, handles retries, prevents blocking on external API.

## Don't Hand-Roll

**Problem** | **Don't Build** | **Use Instead** | **Why**
Field diff logic | New Discogs-specific diff engine | DiffEngine methods (compareText, compareNumber) | Already handles null values, change classification
Discogs artist fetch | Custom API integration | UnifiedArtistService.getDiscogsArtist() | Already implemented, handles disconnect library, normalizes response
External ID storage | New database column | Artist.discogsId field (existing) | Schema already has discogsId VARCHAR(20)
Image upload | Direct Cloudflare API call | CACHE_ARTIST_IMAGE job via queue | Handles rate limiting, retries, async upload
Biography construction | Manual string concatenation | buildBiography() helper with structured sections | Consistent formatting, handles optional fields

**Key insight:** The artist preview/apply architecture is already proven (Phase 11). Only data fetching and transformation differ between MusicBrainz and Discogs. All diff generation, UI rendering, and apply logic is shared.

## Common Pitfalls

### Pitfall 1: Discogs Artist ID Type Mismatch

**What goes wrong:** Discogs artist ID is number in API response, but Artist.discogsId is VARCHAR(20) in database. Storing number directly causes type error.

**Why it happens:** Discogs API returns JSON with numeric IDs, Prisma schema uses string for discogsId field.

**How to avoid:** Always convert Discogs ID to string before storing:

```typescript
artistUpdateData.discogsId = preview.sourceResult.artistMbid; // Already string from search result
// OR when fetching artist directly:
artistUpdateData.discogsId = discogsArtist.id.toString();
```

**Warning signs:** Prisma validation error "Expected string, received number" when applying Discogs correction.

### Pitfall 2: Profile Text Contains BBCode Formatting

**What goes wrong:** Discogs profile field contains BBCode formatting ([b], [i], [url=]) which looks ugly in UI and database.

**Why it happens:** Discogs API returns profile with BBCode unless you specify Accept header for plaintext/HTML transformation.

**How to avoid:** Use disconnect library's plaintext transformation or strip BBCode:

```typescript
// Option 1: Request plaintext via Accept header (if disconnect supports it)
const discogsClient = new Client({
  userAgent: 'RecProject/1.0',
  headers: { Accept: 'application/vnd.discogs.v2.plaintext+json' }
});

// Option 2: Strip BBCode manually
function stripBBCode(text: string): string {
  return text
    .replace(/\[b\](.*?)\[\/b\]/gi, '$1')
    .replace(/\[i\](.*?)\[\/i\]/gi, '$1')
    .replace(/\[u\](.*?)\[\/u\]/gi, '$1')
    .replace(/\[url=(.*?)\](.*?)\[\/url\]/gi, '$2')
    .replace(/\[url\](.*?)\[\/url\]/gi, '$1')
    .replace(/\[[^\]]+\]/g, ''); // Remove any other tags
}
```

**Warning signs:** Biography field shows [b], [url=], [artist123] tags in preview/database.

### Pitfall 3: Missing Image URL Fallback

**What goes wrong:** Discogs artists with no images crash preview rendering or show broken image tags.

**Why it happens:** Some artists have empty images array, but UI expects imageUrl to be null or valid URL.

**How to avoid:** Handle null/empty images in transformation:

```typescript
// In transformDiscogsArtist():
let imageUrl: string | undefined;
if (discogsArtist.images && discogsArtist.images.length > 0) {
  const bestImage = discogsArtist.images.reduce((best, current) => {
    if (!best) return current;
    const bestSize = (best.width || 0) * (best.height || 0);
    const currentSize = (current.width || 0) * (current.height || 0);
    return currentSize > bestSize ? current : best;
  });
  imageUrl = bestImage.uri || bestImage.uri150;
}
return {
  // ...
  imageUrl: imageUrl || null, // Not undefined, not empty string!
};
```

UI components already handle null gracefully with placeholder.

**Warning signs:** Preview crashes on Discogs artists, console error "Cannot read property 'uri' of undefined".

### Pitfall 4: Forgetting to Queue Image Upload

**What goes wrong:** Apply succeeds but imageUrl stays as external Discogs URL, not optimized Cloudflare URL. No cloudflareImageId set.

**Why it happens:** Unlike MusicBrainz flow which has CACHE_ARTIST_IMAGE in enrichment pipeline, Discogs apply needs to explicitly queue image upload.

**How to avoid:** Always queue CACHE_ARTIST_IMAGE when imageUrl is selected:

```typescript
// In apply-service applyCorrection():
if (selections.metadata.imageUrl && preview.sourceData?.imageUrl) {
  await this.queueImageUpload(artistId, preview.sourceData.imageUrl);
}
```

**Warning signs:** Applied artists have imageUrl but cloudflareImageId is null or 'none', images load from Discogs instead of Cloudflare CDN.

### Pitfall 5: Biography Overwrite Loses Structured Data

**What goes wrong:** Applying Discogs biography overwrites manually-added local data (formedYear notes, genre explanations, etc.).

**Why it happens:** Biography field is single text blob, no structured merge logic.

**How to avoid:** Two options:

1. **Append mode:** Show preview with both current and source biography, let admin review
2. **Section-based merge:** Parse sections (Profile, Real name, Members) and merge intelligently

For Phase 25, use simple overwrite with clear preview showing before/after. Future phase can add merge logic.

```typescript
// In preview-service:
diffs.push({
  field: 'biography',
  changeType: currentArtist.biography ? 'modified' : 'added',
  current: currentArtist.biography,
  source: sourceData.biography,
  // Show full text in preview so admin can review
});
```

**Warning signs:** Admin complaints about losing manually-added biography notes after Discogs apply.

## Code Examples

Verified patterns from existing codebase and official sources:

### UnifiedArtistService.getDiscogsArtist() (for preview data)

```typescript
// Source: src/lib/api/unified-artist-service.ts (EXISTING)
// Already implemented - use as-is

const { unifiedArtistService } = await import('@/lib/api/unified-artist-service');

const discogsArtist = await unifiedArtistService.getArtistDetails(
  discogsId,
  { source: 'discogs', skipLocalCache: true }
);

// Returns UnifiedArtistDetails:
// {
//   id: string;
//   source: 'discogs';
//   name: string;
//   realName?: string;
//   profile?: string;
//   imageUrl?: string;
//   urls?: string[];
//   aliases?: Array<{ name: string }>;
//   members?: any[];
//   groups?: any[];
//   discogsId?: string;
//   _discogs?: { type, uri, resource_url };
// }
```

### GraphQL Resolver Extension

```typescript
// Source: src/lib/graphql/resolvers/queries.ts (artistCorrectionPreview resolver)
// EXTEND existing resolver

artistCorrectionPreview: async (_, { artistId, artistMbid, source }, { user, prisma }) => {
  // ... existing auth checks ...
  
  // Get artist with existing data
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
  });
  
  if (!artist) {
    throw new GraphQLError('Artist not found: ' + artistId, {
      extensions: { code: 'NOT_FOUND' },
    });
  }
  
  // Fetch source result (MusicBrainz or Discogs)
  let searchResult;
  if (source === 'DISCOGS') {
    // Discogs path (new)
    const { unifiedArtistService } = await import('@/lib/api/unified-artist-service');
    const discogsArtist = await unifiedArtistService.getArtistDetails(
      artistMbid,
      { source: 'discogs', skipLocalCache: true }
    );
    searchResult = mapDiscogsArtistToSearchResult(discogsArtist);
  } else {
    // MusicBrainz path (existing)
    const searchService = getArtistCorrectionSearchService();
    searchResult = await searchService.getByMbid(artistMbid);
  }
  
  // Generate preview (service handles source differences internally)
  const previewService = getArtistCorrectionPreviewService();
  const preview = await previewService.generatePreview(
    artistId,
    searchResult,
    artistMbid,
    source?.toLowerCase() || 'musicbrainz'
  );
  
  return {
    // ... existing response mapping ...
  };
}
```

### Field Selection for Discogs External ID

```typescript
// Source: Pattern from album apply-service buildAlbumUpdateData()
// NEW for artist apply-service

export function buildArtistUpdateData(
  preview: ArtistCorrectionPreview,
  selections: UIArtistFieldSelections
): Prisma.ArtistUpdateInput {
  const data: Prisma.ArtistUpdateInput = {};
  const source = preview.sourceResult.source || 'musicbrainz';
  
  // Metadata fields
  if (selections.metadata.name) {
    data.name = preview.sourceData.name;
  }
  
  if (selections.metadata.biography) {
    data.biography = preview.sourceData.biography;
  }
  
  if (selections.metadata.formedYear && preview.sourceData.formedYear) {
    data.formedYear = preview.sourceData.formedYear;
  }
  
  if (selections.metadata.countryCode && preview.sourceData.countryCode) {
    data.countryCode = preview.sourceData.countryCode;
  }
  
  if (selections.metadata.area && preview.sourceData.area) {
    data.area = preview.sourceData.area;
  }
  
  if (selections.metadata.artistType && preview.sourceData.artistType) {
    data.artistType = preview.sourceData.artistType;
  }
  
  if (selections.metadata.imageUrl && preview.sourceData.imageUrl) {
    data.imageUrl = preview.sourceData.imageUrl;
  }
  
  // External IDs (conditional on source)
  if (source === 'musicbrainz' && selections.externalIds.musicbrainzId) {
    data.musicbrainzId = preview.sourceResult.artistMbid;
    data.source = 'MUSICBRAINZ';
  } else if (source === 'discogs' && selections.externalIds.discogsId) {
    data.discogsId = preview.sourceResult.artistMbid; // Already string from search result
    data.source = 'DISCOGS';
  }
  
  return data;
}
```

### Cloudflare Image Upload Queue Job

```typescript
// Source: src/lib/queue/processors/cache-processor.ts (handleCacheArtistImage)
// EXISTING - just queue the job

// In apply-service after artist update:
if (selections.metadata.imageUrl && preview.sourceData?.imageUrl) {
  const { getMusicBrainzQueue } = await import('@/lib/queue/musicbrainz-queue');
  const queue = await getMusicBrainzQueue();
  
  await queue.addJob(
    'CACHE_ARTIST_IMAGE',
    {
      artistId,
      requestId: `artist-correction-${artistId}-${Date.now()}`,
    },
    {
      priority: 6, // Admin corrections = medium priority
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    }
  );
}

// Job handler (EXISTING) will:
// 1. Fetch artist from database
// 2. Skip if cloudflareImageId already set
// 3. Upload imageUrl to Cloudflare via cacheArtistImage()
// 4. Update artist with cloudflareImageId
// 5. Log enrichment
```

## State of the Art

**Old Approach** | **Current Approach** | When Changed | **Impact**
MusicBrainz only | Multi-source (MB + Discogs) | Phase 21-25 (Feb 2026) | Admin can correct from multiple data sources
musicbrainzId only | musicbrainzId + discogsId | Phase 23 (albums), Phase 25 (artists) | Tracks both external IDs independently
Direct image URLs | Cloudflare CDN caching | Phase 16 (infrastructure), Phase 25 (artist apply) | Optimized delivery, consistent URLs

**Deprecated/outdated:**

- Manual biography fields in separate columns - now using single biography text field
- Synchronous image upload in apply - now using async queue jobs

## Open Questions

Things that couldn't be fully resolved:

1. **Should preview parse formedYear from Discogs profile text?**
   - What we know: Discogs doesn't have structured formedYear field. Some profiles mention formation year ("formed in 1995").
   - What's unclear: Is regex parsing worth the false positives? How reliable is profile text?
   - Recommendation: Skip formedYear for Discogs in Phase 25. Add manual parsing in future phase if admins request it.

2. **How to handle Discogs members/groups arrays?**
   - What we know: Artist model has biography text field. Members/groups are arrays of objects with id, name, active status.
   - What's unclear: Should members be appended to biography as "Members: A, B, C"? Should there be separate structured storage?
   - Recommendation: Append to biography with clear section headers (per CONTEXT.md decision). Future phase can add structured member tracking if needed.

3. **Should apply log differentiate between MusicBrainz and Discogs sources?**
   - What we know: enrichment_logs table records sources array. Current code uses ['MUSICBRAINZ'] or ['DISCOGS'].
   - What's unclear: Should log show source explicitly, or is it implied by discogsId presence?
   - Recommendation: Yes - update logCorrection() to use source from preview. Improves audit trail accuracy.

4. **Should Discogs artist corrections include genres?**
   - What we know: Artist.genres field exists (array). Discogs has genres at release level, not artist level.
   - What's unclear: Should we aggregate genres from artist's releases? Skip genres entirely?
   - Recommendation: Skip genres for Discogs artists in Phase 25 (Discogs API doesn't provide artist-level genres). Future phase can aggregate from releases if valuable.

## Sources

### Primary (HIGH confidence)

- Existing codebase patterns:
  - /src/lib/correction/apply/apply-service.ts (Album apply atomic transaction pattern)
  - /src/lib/api/unified-artist-service.ts (getDiscogsArtist implementation)
  - /src/stores/useArtistCorrectionStore.ts (correctionSource state management)
  - /prisma/schema.prisma (Artist model with discogsId VARCHAR(20))
  - /src/lib/queue/processors/cache-processor.ts (CACHE_ARTIST_IMAGE job handler)
  - /src/lib/queue/processors/discogs-processor.ts (DISCOGS_GET_ARTIST job handler)

### Secondary (MEDIUM confidence)

- Phase 23 RESEARCH.md - Discogs album apply patterns, external ID storage, image upload queue
- Phase 24 RESEARCH.md - Discogs artist search, data structure, existing job types
- Phase 11 documentation - Artist correction preview/apply architecture
- [Discogs API Documentation](https://www.discogs.com/developers) - Artist endpoint fields (profile, realname, members, images)

### Tertiary (LOW confidence)

- [Discogs Forum - API useage to get artist and record label images](https://www.discogs.com/forum/thread/789112) - Community discussion on image handling
- [Discogs Forum - Web API - how to parse label profile](https://www.discogs.com/forum/thread/401446) - Profile text formatting patterns

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All libraries already integrated, extension work only
- Architecture: HIGH - Clear patterns from Phase 23 (album apply) and Phase 11 (artist correction)
- Pitfalls: HIGH - Identified from Phase 23/24 research, Artist schema analysis, and UnifiedArtistService implementation
- Code examples: HIGH - Derived from working album apply implementation and existing Discogs integration

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - stable domain, extension of existing patterns)
