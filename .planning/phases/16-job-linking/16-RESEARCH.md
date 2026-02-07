# Phase 16: Job Linking - Research

**Researched:** 2026-02-06
**Domain:** BullMQ job chains, enrichment logging, parent-child job relationships
**Confidence:** HIGH

## Summary

Phase 16 requires propagating `parentJobId` through BullMQ job chains to create a queryable audit trail in the EnrichmentLog table. The research confirms that BullMQ provides native `job.id` properties that can be passed through job data payloads, and the database schema already supports parent-child relationships with the `parentJobId` field and index.

The standard approach is to pass `job.id` as `parentJobId` in child job data payloads when spawning child jobs. The flat structure (all children point to root) simplifies queries compared to deep hierarchies. Current processors (cache, discogs) lack EnrichmentLog entries entirely, requiring new logging calls with comprehensive metadata capture.

Key findings validate the architectural decisions in CONTEXT.md: flat parent structure, using native BullMQ job IDs, and adding `isRootJob` flag for easy root identification. Database schema and indexes are already in place from Phase 15.

**Primary recommendation:** Pass `job.id` from parent processors to child job data payloads, add `parentJobId` field to relevant job data interfaces, and create comprehensive EnrichmentLog entries in cache/discogs processors with detailed metadata.

## Standard Stack

The established libraries and patterns for this domain:

### Core

| Library    | Version | Purpose                                   | Why Standard                                                                                 |
| ---------- | ------- | ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| BullMQ     | v5.66+  | Job queue with parent-child relationships | Industry standard for Node.js job processing, built-in support for job hierarchies via Flows |
| Prisma     | Current | Database ORM with schema management       | Type-safe database access, migration system already in place                                 |
| PostgreSQL | Current | Database with indexes on parentJobId      | ACID compliance, excellent support for parent-child queries with indexes                     |

### Supporting

| Library          | Version   | Purpose                                        | When to Use                                                |
| ---------------- | --------- | ---------------------------------------------- | ---------------------------------------------------------- |
| Job class        | BullMQ v5 | Access job.id, job.data, job.parent properties | Every processor needs to access job.id to pass to children |
| EnrichmentLogger | Internal  | Centralized logging with metadata              | Already exists, needs parentJobId parameter added          |

### Alternatives Considered

| Instead of            | Could Use                                     | Tradeoff                                                             |
| --------------------- | --------------------------------------------- | -------------------------------------------------------------------- |
| Flat parent structure | Deep hierarchy (child → parent → grandparent) | Deep requires recursive CTEs, flat enables simple WHERE queries      |
| BullMQ job.id         | Custom UUID generation                        | Native job.id is guaranteed unique per queue, no duplication risk    |
| Database logging      | Redis-only tracking                           | Database provides persistence, queryability, and timeline UI support |

**Installation:**
No new packages needed - BullMQ and Prisma already installed.

## Architecture Patterns

### Recommended Pattern: Parent ID Flow

```
Root Job (ENRICH_ALBUM)
├── jobId: "12345"
├── parentJobId: null
├── isRootJob: true
└── Spawns children with parentJobId: "12345"
    ├── Child 1 (ENRICH_ARTIST)
    │   ├── jobId: "12346"
    │   ├── parentJobId: "12345" (points to root)
    │   └── Spawns with parentJobId: "12345" (still root)
    ├── Child 2 (DISCOGS_SEARCH_ARTIST)
    │   ├── jobId: "12347"
    │   └── parentJobId: "12345" (points to root)
    └── Child 3 (CACHE_ARTIST_IMAGE)
        ├── jobId: "12348"
        └── parentJobId: "12345" (points to root)
```

**Key insight:** Flat structure means ALL children reference the root job directly, not their immediate parent. This enables simple queries: `WHERE parentJobId = '12345'` returns entire job family.

### Pattern 1: Passing Parent ID to Child Jobs

**What:** Access `job.id` in processor, pass as `parentJobId` in child job data payload
**When to use:** Every processor that spawns child jobs (ENRICH_ALBUM, ENRICH_ARTIST)

**Example:**

```typescript
// Source: Current codebase pattern + BullMQ Job API
export async function handleEnrichAlbum(
  job: Job<EnrichAlbumJobData>, // BullMQ Job object
  data: EnrichAlbumJobData
): Promise<any> {
  const rootJobId = data.parentJobId || job.id; // If already has parent, use it; else this is root

  // When spawning child artist enrichment
  const queue = await getMusicBrainzQueue();
  await queue.addJob(
    JOB_TYPES.ENRICH_ARTIST,
    {
      artistId: artist.id,
      parentJobId: rootJobId, // Pass root job ID
      requestId: `${data.requestId}-artist-${artist.id}`,
    },
    { priority: 5 }
  );
}
```

### Pattern 2: Logging with Parent Context

**What:** Create EnrichmentLog entries with parentJobId and isRootJob flag
**When to use:** Every processor operation (success and failure)

**Example:**

```typescript
// Source: Existing enrichment-logger.ts + new fields
const enrichmentLogger = createEnrichmentLogger(prisma);

await enrichmentLogger.logEnrichment({
  entityType: 'ARTIST',
  entityId: artist.id,
  operation: JOB_TYPES.CACHE_ARTIST_IMAGE,
  sources: ['CLOUDFLARE'],
  status: 'SUCCESS',
  reason: 'Cached artist image from Discogs to Cloudflare CDN',
  fieldsEnriched: ['cloudflareImageId'],
  dataQualityBefore: 'MEDIUM',
  dataQualityAfter: 'HIGH',
  durationMs: Date.now() - startTime,
  apiCallCount: 1,
  metadata: {
    sourceUrl: artist.imageUrl,
    cloudflareImageId: result.id,
    cloudflareUrl: result.url,
    imageSize: result.size,
    imageFormat: result.format,
  },
  jobId: job.id, // Current job's ID
  parentJobId: data.parentJobId || null, // Parent job ID (null if root)
  isRootJob: !data.parentJobId, // True if no parent
  triggeredBy: data.userAction || 'system',
});
```

### Pattern 3: Querying Job Chains

**What:** Simple queries enabled by flat structure
**When to use:** Timeline UI, debugging, audit trails

**Example:**

```typescript
// Find all jobs in a chain
const jobFamily = await prisma.enrichmentLog.findMany({
  where: {
    OR: [
      { jobId: rootJobId }, // The root job itself
      { parentJobId: rootJobId }, // All children
    ],
  },
  orderBy: { createdAt: 'asc' },
});

// Find all root jobs (for timeline table)
const rootJobs = await prisma.enrichmentLog.findMany({
  where: { isRootJob: true },
  orderBy: { createdAt: 'desc' },
});
```

### Pattern 4: Comprehensive Metadata Capture

**What:** Log detailed operation-specific metadata for debugging and timeline display
**When to use:** Every log entry, especially cache and discogs operations

**CACHE operations metadata:**

```typescript
metadata: {
  operation: 'cache_artist_image',
  beforeUrl: artist.imageUrl, // Original source URL
  afterUrl: result.url, // Cloudflare CDN URL
  cacheLocation: 'cloudflare_images',
  cloudflareImageId: result.id,
  imageSize: result.size, // bytes
  imageFormat: result.format, // 'jpeg', 'png', etc.
  sourceProvider: 'discogs', // where original image came from
}
```

**DISCOGS operations metadata:**

```typescript
metadata: {
  operation: 'discogs_search_artist',
  searchQuery: data.artistName,
  discogsId: bestMatch.result.id,
  discogsTitle: bestMatch.result.title,
  matchConfidence: bestMatch.score, // 0.85 = 85%
  resultsCount: searchResults.results.length,
  matchedProfile: discogsArtist.profile,
  imagesFound: discogsArtist.images?.length || 0,
  genres: discogsArtist.genres || [],
}
```

### Anti-Patterns to Avoid

- **Deep hierarchy tracking:** Don't make children point to immediate parent then recurse to find root. Flat structure is simpler.
- **Missing parentJobId in spawned jobs:** All child jobs MUST receive parentJobId in their data payload.
- **Inconsistent logging:** Don't log success but skip failure cases - log BOTH with status field.
- **Job ID with colons:** BullMQ uses `:` as separator - don't create custom jobIds containing colons.
- **Skipping metadata:** Empty metadata makes debugging impossible - capture operation-specific details.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem               | Don't Build               | Use Instead                                   | Why                                                            |
| --------------------- | ------------------------- | --------------------------------------------- | -------------------------------------------------------------- |
| Job ID generation     | Custom UUID system        | BullMQ job.id                                 | Native, unique per queue, type-safe string                     |
| Parent-child tracking | Custom parent chain table | BullMQ job.parent + EnrichmentLog.parentJobId | BullMQ provides parent metadata, database index already exists |
| Hierarchical queries  | Manual tree traversal     | Simple WHERE clauses with flat structure      | Flat: `WHERE parentJobId = X`; Deep: recursive CTE overhead    |
| Job execution logging | Console.log only          | EnrichmentLog with metadata JSON              | Queryable, persistent, supports timeline UI                    |
| Retry tracking        | Custom retry counter      | BullMQ job.attemptsMade                       | Built-in, tracks failures and backoff                          |

**Key insight:** BullMQ already provides job relationships via `job.parent` and `job.parentKey`, but for this use case passing `job.id` in data payload is simpler because the flat structure doesn't need BullMQ's deep hierarchy features (which are designed for FlowProducer patterns).

## Common Pitfalls

### Pitfall 1: Accessing job.id Without Job Parameter

**What goes wrong:** Processors receive job data but don't accept the Job object, can't access job.id
**Why it happens:** Current processor signatures like `handleEnrichAlbum(data: EnrichAlbumJobData)` don't include the Job object
**How to avoid:** Change processor signatures to accept Job object: `handleEnrichAlbum(job: Job<EnrichAlbumJobData>)` then access `job.id` and `job.data`
**Warning signs:** TypeScript errors when trying to access `data.id` or `this.job.id`

### Pitfall 2: Not Passing parentJobId to Grandchildren

**What goes wrong:** Parent passes job.id to children, but children spawn grandchildren without passing parentJobId forward, breaking the chain
**Why it happens:** Each processor independently decides what to pass - easy to forget
**How to avoid:** Every processor checks `data.parentJobId || job.id` to determine root, always passes root to children
**Warning signs:** Database queries show broken chains where some jobs lack parentJobId

### Pitfall 3: Using job.id Type Incorrectly

**What goes wrong:** Treating job.id as number when it's string, causing type errors in database
**Why it happens:** BullMQ job IDs are strings but auto-increment pattern looks numeric
**How to avoid:** Schema has `@db.VarChar(100)` - always treat as string, use `String(job.id)` if uncertain
**Warning signs:** Prisma type errors: "Type 'number' is not assignable to type 'string'"

### Pitfall 4: Logging Only Success Cases

**What goes wrong:** Failure cases skip logging, timeline shows incomplete picture
**Why it happens:** Logging code inside success branch, error handling skips it
**How to avoid:** Use try-catch with logging in both branches, or finally block
**Warning signs:** EnrichmentLog only has SUCCESS/SKIPPED entries, no FAILED entries for known errors

### Pitfall 5: Empty Metadata JSON

**What goes wrong:** metadata: {} or metadata: null loses debugging context
**Why it happens:** Minimal logging philosophy or forgetting to capture operation details
**How to avoid:** Follow metadata templates for each operation type (cache, discogs, etc.)
**Warning signs:** Timeline UI shows "no details" for operations that should have rich context

### Pitfall 6: Missing isRootJob Flag

**What goes wrong:** Can't easily query for root jobs, have to check `WHERE parentJobId IS NULL`
**Why it happens:** Forgot to set flag when creating log entry
**How to avoid:** Always set `isRootJob: !data.parentJobId` or `isRootJob: data.parentJobId === null`
**Warning signs:** Timeline UI queries `WHERE parentJobId IS NULL` instead of `WHERE isRootJob = true`

## Code Examples

Verified patterns from official sources:

### Example 1: Processor Signature with Job Object

```typescript
// Source: BullMQ v5 Job API + current codebase pattern
import { Job } from 'bullmq';
import type { EnrichAlbumJobData } from '../jobs';

export async function handleEnrichAlbum(
  job: Job<EnrichAlbumJobData> // Full Job object, not just data
): Promise<any> {
  const data = job.data; // Extract data
  const rootJobId = data.parentJobId || job.id; // Determine root

  console.log(
    `Processing album ${data.albumId} (Job: ${job.id}, Root: ${rootJobId})`
  );

  // ... processing logic
}
```

### Example 2: Spawning Child Job with Parent ID

```typescript
// Source: Current enrichment-processor.ts pattern + new parentJobId field
const queue = await import('../musicbrainz-queue').then(m =>
  m.getMusicBrainzQueue()
);

await queue.addJob(
  JOB_TYPES.CACHE_ARTIST_IMAGE,
  {
    artistId: data.artistId,
    parentJobId: rootJobId, // NEW: pass root job ID
    requestId: `enrich-cache-artist-${data.artistId}`,
  },
  {
    priority: 5,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  }
);
```

### Example 3: Cache Processor with Comprehensive Logging

```typescript
// Source: New pattern combining cache-processor.ts + enrichment-logger.ts
export async function handleCacheArtistImage(
  job: Job<CacheArtistImageJobData>
): Promise<any> {
  const data = job.data;
  const startTime = Date.now();
  const enrichmentLogger = createEnrichmentLogger(prisma);

  try {
    const artist = await prisma.artist.findUnique({
      where: { id: data.artistId },
      select: { id: true, name: true, imageUrl: true, cloudflareImageId: true },
    });

    if (!artist) {
      await enrichmentLogger.logEnrichment({
        entityType: 'ARTIST',
        entityId: data.artistId,
        operation: JOB_TYPES.CACHE_ARTIST_IMAGE,
        sources: ['CLOUDFLARE'],
        status: 'FAILED',
        reason: 'Artist not found in database',
        fieldsEnriched: [],
        errorMessage: `Artist ${data.artistId} not found`,
        errorCode: 'ARTIST_NOT_FOUND',
        durationMs: Date.now() - startTime,
        apiCallCount: 0,
        metadata: { requestedArtistId: data.artistId },
        jobId: job.id,
        parentJobId: data.parentJobId || null,
        isRootJob: !data.parentJobId,
        triggeredBy: 'system',
      });
      throw new Error(`Artist ${data.artistId} not found`);
    }

    // Skip if already cached
    if (artist.cloudflareImageId && artist.cloudflareImageId !== 'none') {
      await enrichmentLogger.logEnrichment({
        entityType: 'ARTIST',
        entityId: artist.id,
        operation: JOB_TYPES.CACHE_ARTIST_IMAGE,
        sources: ['CLOUDFLARE'],
        status: 'SKIPPED',
        reason: 'Artist image already cached in Cloudflare',
        fieldsEnriched: [],
        durationMs: Date.now() - startTime,
        apiCallCount: 0,
        metadata: {
          artistName: artist.name,
          existingCloudflareImageId: artist.cloudflareImageId,
        },
        jobId: job.id,
        parentJobId: data.parentJobId || null,
        isRootJob: !data.parentJobId,
        triggeredBy: 'system',
      });

      return {
        success: true,
        cached: true,
        artistId: artist.id,
        cloudflareImageId: artist.cloudflareImageId,
        message: 'Already cached',
      };
    }

    // Upload to Cloudflare
    const { cacheArtistImage } = await import('@/lib/cloudflare-images');
    const result = await cacheArtistImage(
      artist.imageUrl,
      artist.id,
      artist.name
    );

    if (!result) {
      await enrichmentLogger.logEnrichment({
        entityType: 'ARTIST',
        entityId: artist.id,
        operation: JOB_TYPES.CACHE_ARTIST_IMAGE,
        sources: ['CLOUDFLARE'],
        status: 'FAILED',
        reason: 'Failed to fetch image from source (404 or invalid URL)',
        fieldsEnriched: [],
        errorMessage: 'Image fetch failed',
        errorCode: 'IMAGE_FETCH_FAILED',
        durationMs: Date.now() - startTime,
        apiCallCount: 1,
        metadata: {
          artistName: artist.name,
          sourceUrl: artist.imageUrl,
        },
        jobId: job.id,
        parentJobId: data.parentJobId || null,
        isRootJob: !data.parentJobId,
        triggeredBy: 'system',
      });

      // Mark as 'none' in database
      await prisma.artist.update({
        where: { id: artist.id },
        data: { cloudflareImageId: 'none' },
      });

      return { success: true, cached: false, cloudflareImageId: 'none' };
    }

    // Update database
    await prisma.artist.update({
      where: { id: artist.id },
      data: { cloudflareImageId: result.id },
    });

    // Log success with comprehensive metadata
    await enrichmentLogger.logEnrichment({
      entityType: 'ARTIST',
      entityId: artist.id,
      operation: JOB_TYPES.CACHE_ARTIST_IMAGE,
      sources: ['CLOUDFLARE'],
      status: 'SUCCESS',
      reason: 'Successfully cached artist image to Cloudflare CDN',
      fieldsEnriched: ['cloudflareImageId'],
      dataQualityBefore: artist.cloudflareImageId ? 'MEDIUM' : 'LOW',
      dataQualityAfter: 'HIGH',
      durationMs: Date.now() - startTime,
      apiCallCount: 1,
      metadata: {
        artistName: artist.name,
        beforeUrl: artist.imageUrl,
        afterUrl: result.url,
        cloudflareImageId: result.id,
        cacheLocation: 'cloudflare_images',
        // Add any additional fields from result
        imageSize: result.size,
        imageFormat: result.format,
      },
      jobId: job.id,
      parentJobId: data.parentJobId || null,
      isRootJob: !data.parentJobId,
      triggeredBy: 'system',
    });

    return {
      success: true,
      cached: false,
      artistId: artist.id,
      cloudflareImageId: result.id,
      cloudflareUrl: result.url,
      message: 'Successfully cached',
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    await enrichmentLogger.logEnrichment({
      entityType: 'ARTIST',
      entityId: data.artistId,
      operation: JOB_TYPES.CACHE_ARTIST_IMAGE,
      sources: ['CLOUDFLARE'],
      status: 'FAILED',
      reason: 'Unexpected error during caching operation',
      fieldsEnriched: [],
      errorMessage,
      errorCode: 'CACHE_ERROR',
      durationMs: Date.now() - startTime,
      apiCallCount: 1,
      metadata: { error: errorMessage },
      jobId: job.id,
      parentJobId: data.parentJobId || null,
      isRootJob: !data.parentJobId,
      triggeredBy: 'system',
    });

    throw error; // Re-throw for BullMQ retry
  }
}
```

### Example 4: Discogs Processor with Match Details

```typescript
// Source: discogs-processor.ts + new logging pattern
export async function handleDiscogsSearchArtist(
  job: Job<DiscogsSearchArtistJobData>
): Promise<any> {
  const data = job.data;
  const startTime = Date.now();
  const enrichmentLogger = createEnrichmentLogger(prisma);

  try {
    const Discogs = await import('disconnect');
    const discogsClient = new Discogs.default.Client({
      userAgent: 'RecProject/1.0',
      consumerKey: process.env.CONSUMER_KEY!,
      consumerSecret: process.env.CONSUMER_SECRET!,
    }).database();

    const searchResults = await discogsClient.search({
      query: data.artistName,
      type: 'artist',
      per_page: 10,
    });

    if (!searchResults.results || searchResults.results.length === 0) {
      await enrichmentLogger.logEnrichment({
        entityType: 'ARTIST',
        entityId: data.artistId,
        operation: JOB_TYPES.DISCOGS_SEARCH_ARTIST,
        sources: ['DISCOGS'],
        status: 'NO_DATA_AVAILABLE',
        reason: 'No Discogs results found for artist',
        fieldsEnriched: [],
        durationMs: Date.now() - startTime,
        apiCallCount: 1,
        metadata: {
          searchQuery: data.artistName,
          resultsCount: 0,
        },
        jobId: job.id,
        parentJobId: data.parentJobId || null,
        isRootJob: !data.parentJobId,
        triggeredBy: 'system',
      });

      return { artistId: data.artistId, action: 'no_results' };
    }

    const bestMatch = findBestDiscogsArtistMatch(
      data.artistName,
      searchResults.results
    );

    if (!bestMatch) {
      await enrichmentLogger.logEnrichment({
        entityType: 'ARTIST',
        entityId: data.artistId,
        operation: JOB_TYPES.DISCOGS_SEARCH_ARTIST,
        sources: ['DISCOGS'],
        status: 'NO_DATA_AVAILABLE',
        reason: 'No confident match found (confidence < 85%)',
        fieldsEnriched: [],
        durationMs: Date.now() - startTime,
        apiCallCount: 1,
        metadata: {
          searchQuery: data.artistName,
          resultsCount: searchResults.results.length,
          bestScore: Math.max(
            ...searchResults.results.map(r =>
              calculateStringSimilarity(
                data.artistName.toLowerCase(),
                r.title.toLowerCase()
              )
            )
          ),
        },
        jobId: job.id,
        parentJobId: data.parentJobId || null,
        isRootJob: !data.parentJobId,
        triggeredBy: 'system',
      });

      return { artistId: data.artistId, action: 'no_confident_match' };
    }

    // Update database with Discogs ID
    await prisma.artist.update({
      where: { id: data.artistId },
      data: { discogsId: String(bestMatch.result.id) },
    });

    // Queue fetch job
    const queue = await import('../musicbrainz-queue').then(m =>
      m.getMusicBrainzQueue()
    );
    const rootJobId = data.parentJobId || job.id; // Determine root

    await queue.addJob(
      JOB_TYPES.DISCOGS_GET_ARTIST,
      {
        artistId: data.artistId,
        discogsId: String(bestMatch.result.id),
        parentJobId: rootJobId, // Pass root ID
        requestId: data.requestId,
      },
      { priority: 6, attempts: 3 }
    );

    // Log success
    await enrichmentLogger.logEnrichment({
      entityType: 'ARTIST',
      entityId: data.artistId,
      operation: JOB_TYPES.DISCOGS_SEARCH_ARTIST,
      sources: ['DISCOGS'],
      status: 'SUCCESS',
      reason: 'Found Discogs artist match and queued fetch job',
      fieldsEnriched: ['discogsId'],
      dataQualityBefore: 'LOW',
      dataQualityAfter: 'MEDIUM',
      durationMs: Date.now() - startTime,
      apiCallCount: 1,
      metadata: {
        searchQuery: data.artistName,
        discogsId: String(bestMatch.result.id),
        discogsTitle: bestMatch.result.title,
        matchConfidence: bestMatch.score,
        resultsCount: searchResults.results.length,
        queuedJobType: JOB_TYPES.DISCOGS_GET_ARTIST,
      },
      jobId: job.id,
      parentJobId: data.parentJobId || null,
      isRootJob: !data.parentJobId,
      triggeredBy: 'system',
    });

    return {
      artistId: data.artistId,
      action: 'found_and_queued',
      discogsId: String(bestMatch.result.id),
      matchConfidence: bestMatch.score,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    await enrichmentLogger.logEnrichment({
      entityType: 'ARTIST',
      entityId: data.artistId,
      operation: JOB_TYPES.DISCOGS_SEARCH_ARTIST,
      sources: ['DISCOGS'],
      status: 'FAILED',
      reason: 'Discogs API error',
      fieldsEnriched: [],
      errorMessage,
      errorCode: 'DISCOGS_API_ERROR',
      durationMs: Date.now() - startTime,
      apiCallCount: 1,
      metadata: {
        searchQuery: data.artistName,
        error: errorMessage,
      },
      jobId: job.id,
      parentJobId: data.parentJobId || null,
      isRootJob: !data.parentJobId,
      triggeredBy: 'system',
    });

    throw error;
  }
}
```

### Example 5: Updating Job Data Interfaces

```typescript
// Source: jobs.ts pattern + new parentJobId field
export interface EnrichAlbumJobData {
  albumId: string;
  priority?: 'low' | 'medium' | 'high';
  force?: boolean;
  userAction?:
    | 'collection_add'
    | 'recommendation_create'
    | 'search'
    | 'browse'
    | 'manual'
    | 'spotify_sync'
    | 'admin_manual';
  requestId?: string;
  parentJobId?: string; // NEW: for job chain tracking
}

export interface CacheArtistImageJobData {
  artistId: string;
  priority?: 'low' | 'medium' | 'high';
  requestId?: string;
  parentJobId?: string; // NEW: for job chain tracking
}

export interface DiscogsSearchArtistJobData {
  artistId: string;
  artistName: string;
  musicbrainzData?: any;
  requestId?: string;
  parentJobId?: string; // NEW: for job chain tracking
}
```

## State of the Art

| Old Approach             | Current Approach                    | When Changed                     | Impact                                |
| ------------------------ | ----------------------------------- | -------------------------------- | ------------------------------------- |
| No parent tracking       | parentJobId field with index        | Phase 15 (migration)             | Enables job chain queries             |
| Cache/discogs no logging | Comprehensive EnrichmentLog entries | Phase 16 (implementation)        | Complete audit trail                  |
| Deep hierarchy tracking  | Flat parent structure               | Phase 16 (architecture decision) | Simpler queries, no recursive CTEs    |
| Console.log only         | Structured metadata in database     | Previous phases                  | Queryable timeline, debugging support |

**Deprecated/outdated:**

- **Console-only logging**: Previous approach had console.log but no database persistence - replaced by EnrichmentLog system
- **BullMQ FlowProducer**: Advanced BullMQ feature for complex parent-child workflows - overkill for this use case, flat structure with data payload passing is simpler

## Open Questions

1. **SPOTIFY_TRACK_FALLBACK logging**
   - What we know: Requirement LINK-03 says this job should log with parentJobId
   - What's unclear: Current codebase doesn't show this job type being processed - may be deprecated or not yet implemented
   - Recommendation: Search codebase for SPOTIFY_TRACK_FALLBACK processor, add logging if found, or flag as missing implementation

2. **EnrichmentLogger interface update**
   - What we know: Current logEnrichment method doesn't have isRootJob parameter in interface
   - What's unclear: Whether to add to interface or calculate from parentJobId presence
   - Recommendation: Calculate automatically in logEnrichment: `isRootJob: !data.parentJobId`

3. **Job ID string length**
   - What we know: Schema has `@db.VarChar(100)` for jobId and parentJobId
   - What's unclear: BullMQ job IDs are auto-increment strings, typical length ~10 chars, but custom IDs could be longer
   - Recommendation: 100 chars is safe, but could reduce to VarChar(50) if storage matters

## Sources

### Primary (HIGH confidence)

- [BullMQ Job IDs Documentation](https://docs.bullmq.io/guide/jobs/job-ids) - Official docs on job ID generation and uniqueness
- [BullMQ Job API v5.66](https://api.docs.bullmq.io/classes/v5.Job.html) - Job class properties including id, parent, parentKey
- [BullMQ Flows Documentation](https://docs.bullmq.io/guide/flows) - Parent-child job relationships and FlowProducer patterns
- Current codebase: `src/lib/queue/processors/enrichment-processor.ts` - Existing enrichment logging patterns
- Current codebase: `src/lib/enrichment/enrichment-logger.ts` - EnrichmentLogger interface and implementation
- Current codebase: `prisma/schema.prisma` - EnrichmentLog model with parentJobId field and index

### Secondary (MEDIUM confidence)

- [LearnSQL: Query Parent-Child Tree](https://learnsql.com/blog/query-parent-child-tree/) - SQL patterns for hierarchical queries
- [Start Data Engineering: Logging Best Practices](https://www.startdataengineering.com/post/de_best_practices_log/) - Metadata fields for pipeline logging
- [Better Stack: Logging Best Practices](https://betterstack.com/community/guides/logging/logging-best-practices/) - Structured logging standards
- [Dash0: 9 Logging Best Practices](https://www.dash0.com/guides/logging-best-practices) - Context enrichment and metadata capture

### Tertiary (LOW confidence)

- Web search results for "PostgreSQL parent-child flat structure" - General database patterns, not specific to this use case
- Web search results for "TypeScript logging patterns job chains" - General logging patterns, need verification against actual implementation

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - BullMQ and Prisma already in use, patterns verified in codebase
- Architecture: HIGH - Flat structure decision documented, database schema confirmed with migration
- Pitfalls: MEDIUM - Based on common patterns and TypeScript/BullMQ experience, needs validation during implementation
- Code examples: HIGH - Based on actual codebase patterns combined with BullMQ official API

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days for stable BullMQ library)
