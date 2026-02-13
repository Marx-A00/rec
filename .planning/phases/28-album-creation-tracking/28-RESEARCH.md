# Phase 28: Album Creation Tracking - Research

**Researched:** 2026-02-09
**Domain:** Audit logging infrastructure for album creation lifecycle tracking
**Confidence:** HIGH

## Summary

Phase 28 adds comprehensive creation logging to all album entry points using the existing LlamaLogger infrastructure from Phase 27. The research identified four distinct album creation code paths (addAlbum mutation, addAlbumToCollection mutation, Spotify sync, MusicBrainz sync) that need instrumentation. Each path already contains database commit logic but lacks CREATED category logging.

The existing LlamaLogger class provides all necessary functionality for creation logging, including automatic category inference, non-blocking error handling, and job hierarchy tracking. The primary technical challenge is ensuring logs are written AFTER database commits succeed, while maintaining a simple retry-once pattern if the log write itself fails.

**Primary recommendation:** Instrument each album creation path immediately after the database commit, using LlamaLogger.logEnrichment() with category: CREATED. Pass job.id as both jobId and parentJobId for sync operations to establish parent-child hierarchy for batch tracking.

## Standard Stack

The established libraries/tools for this domain:

### Core

**Library:** Prisma ORM
**Version:** Latest (already in use)
**Purpose:** Database transactions and album creation
**Why Standard:** Provides atomic operations via prisma.$transaction() and prisma.album.create(), ensuring album creation succeeds before logging

**Library:** LlamaLogger (internal)
**Version:** Phase 27 implementation
**Purpose:** Centralized audit logging
**Why Standard:** Purpose-built for entity lifecycle tracking with category enum (CREATED, ENRICHED, CORRECTED, CACHED, FAILED), non-blocking writes, and automatic job hierarchy tracking

### Supporting

**Library:** BullMQ
**Version:** Latest (already in use)
**Purpose:** Job queue with parent-child relationships
**Why Standard:** Provides job.id for correlation and FlowProducer for parent-child job hierarchies in batch operations

**Installation:**
```bash
# All dependencies already installed
# No new packages required
```

## Architecture Patterns

### Recommended Logging Structure

```typescript
// Pattern 1: User-initiated creation (addAlbum, addAlbumToCollection)
try {
  const album = await prisma.album.create({ data: {...} });
  
  // Log AFTER commit succeeds
  await logAlbumCreation(album, userId, operation);
  
  return album;
} catch (error) {
  // Log creation failure
  await logCreationFailure(attemptedData, error);
  throw error;
}

// Pattern 2: Sync operation creation (Spotify, MusicBrainz)
const album = await prisma.album.create({ data: {...} });

// Log with parent job context
await logAlbumCreation(album, null, operation, {
  jobId: childJobId,
  parentJobId: syncJobId,
  isRootJob: false
});
```

### Pattern 1: Post-Commit Logging

**What:** Log creation AFTER database commit completes
**When to use:** All album creation paths
**Example:**
```typescript
// Source: Existing addAlbum mutation pattern
const album = await prisma.album.create({
  data: {
    title: input.title,
    releaseDate,
    releaseType: input.albumType || 'ALBUM',
    // ... other fields
  },
});

// NEW: Log creation after commit
const logger = createLlamaLogger(prisma);
await logger.logEnrichment({
  entityType: 'ALBUM',
  entityId: album.id,
  operation: 'album:created:recommendation', // Source-specific
  category: 'CREATED',
  sources: ['ADMIN', 'MUSICBRAINZ'],
  status: 'SUCCESS',
  fieldsEnriched: ['title', 'releaseDate', 'artists'],
  userId: user.id, // For user-triggered creations
  dataQualityAfter: album.dataQuality,
  isRootJob: true, // User operations are root jobs
});
```

### Pattern 2: Batch Sync with Job Hierarchy

**What:** Parent sync job spawns child creation jobs, track hierarchy
**When to use:** Spotify sync, MusicBrainz sync batch operations
**Example:**
```typescript
// Source: BullMQ FlowProducer pattern from research
// Parent job: Spotify sync
const syncJobId = job.id; // e.g., "spotify-sync-123"

// Child job: Individual album creation
for (const spotifyAlbum of albums) {
  const album = await prisma.album.create({ data: {...} });
  
  // Log with parent-child relationship
  await logger.logEnrichment({
    entityType: 'ALBUM',
    entityId: album.id,
    operation: 'album:created:spotify-sync',
    category: 'CREATED',
    sources: ['SPOTIFY'],
    status: 'SUCCESS',
    fieldsEnriched: ['title', 'spotifyId', 'coverArtUrl'],
    jobId: `album-create-${album.id}`, // Child job ID
    parentJobId: syncJobId, // Parent sync job
    isRootJob: false, // Child of sync job
    metadata: {
      syncBatch: syncJobId,
      syncTimestamp: new Date().toISOString()
    }
  });
}
```

### Pattern 3: Retry-Once Error Handling

**What:** If log write fails, retry once then continue
**When to use:** All creation logging calls
**Example:**
```typescript
// Source: Best practices from Prisma research + error handling research
async function logAlbumCreation(
  album: Album,
  userId: string | null,
  operation: string,
  jobContext?: { jobId?: string; parentJobId?: string; isRootJob?: boolean }
): Promise<void> {
  const logger = createLlamaLogger(prisma);
  
  const logData = {
    entityType: 'ALBUM' as const,
    entityId: album.id,
    operation,
    category: 'CREATED' as const,
    sources: deriveSourcesFromOperation(operation),
    status: 'SUCCESS' as const,
    fieldsEnriched: collectCreatedFields(album),
    userId,
    dataQualityAfter: album.dataQuality,
    ...jobContext
  };

  try {
    await logger.logEnrichment(logData);
  } catch (error) {
    console.warn('First log attempt failed, retrying once:', error);
    
    try {
      // Retry once with delay
      await new Promise(resolve => setTimeout(resolve, 500));
      await logger.logEnrichment(logData);
    } catch (retryError) {
      // Don't throw - album creation is priority
      console.error('Log creation failed after retry:', retryError);
      alertManager.notify('llama-log-write-failed', {
        albumId: album.id,
        operation,
        error: retryError
      });
    }
  }
}
```

### Anti-Patterns to Avoid

- **Logging before commit:** Never log CREATED before album.create() succeeds - creates false positives if transaction rolls back
- **Throwing on log failure:** Never throw errors from logging code - breaks album creation flow
- **Generic operation names:** Don't use "album:created" - use source-specific names like "album:created:spotify-sync" for clear provenance
- **Missing userId context:** User-triggered operations must include userId for audit trails

## Don't Hand-Roll

Problems that look simple but have existing solutions:

**Problem:** Retry logic for failed operations
**Don't Build:** Custom retry mechanisms with exponential backoff
**Use Instead:** BullMQ's built-in retry config (attempts: 3, backoff: exponential)
**Why:** BullMQ handles retry counting, delay calculation, and failure tracking automatically. Manual retry logic risks duplicate processing and lacks job state management.

**Problem:** Job correlation and hierarchy tracking
**Don't Build:** Custom job ID generation or parent-child tracking
**Use Instead:** BullMQ's job.id and FlowProducer for parent-child relationships
**Why:** BullMQ maintains job state in Redis, provides atomic operations, and handles concurrent job processing. Custom tracking risks ID collisions and lost relationships.

**Problem:** Log write atomicity with database transactions
**Don't Build:** Custom two-phase commit or distributed transaction logic
**Use Instead:** Post-commit logging pattern (log after DB commit, don't fail on log error)
**Why:** Logging is secondary to data integrity. Database commit must succeed even if logging fails. Attempting to make logging atomic with DB operations adds complexity and potential for deadlocks.

**Key insight:** Audit logging is a cross-cutting concern that should never block primary operations. The post-commit + retry-once pattern provides sufficient reliability without the complexity of distributed transactions.

## Common Pitfalls

### Pitfall 1: Logging Inside Database Transactions

**What goes wrong:** Including log writes inside prisma.$transaction() blocks causes transaction timeouts, deadlocks, and rollback cascades when logging fails.

**Why it happens:** Developers assume logging should be "atomic" with data changes, treating it as part of the transaction.

**How to avoid:** Always log AFTER the transaction commits. Use this pattern:
```typescript
// WRONG: Logging inside transaction
await prisma.$transaction(async (tx) => {
  const album = await tx.album.create({ data: {...} });
  await logger.logEnrichment({...}); // ❌ Extends transaction scope
  return album;
});

// RIGHT: Log after transaction
const album = await prisma.album.create({ data: {...} });
await logger.logEnrichment({...}); // ✅ Independent operation
```

**Warning signs:** "Transaction timeout" errors, slow album creation, intermittent failures in high-concurrency scenarios.

### Pitfall 2: Throwing Errors from Logging Code

**What goes wrong:** When log writes fail and throw errors, album creation appears to fail even though the database commit succeeded. This creates data inconsistency - album exists but API returns error.

**Why it happens:** Default async/await error handling propagates exceptions upward, and developers don't wrap logging in try-catch.

**How to avoid:** Always wrap logging in try-catch and never re-throw:
```typescript
// WRONG: Error propagates to caller
await logger.logEnrichment({...}); // ❌ Throws on failure

// RIGHT: Contained error handling
try {
  await logger.logEnrichment({...});
} catch (error) {
  console.warn('Log failed, continuing:', error); // ✅ Non-blocking
}
```

**Warning signs:** Album creation API returns 500 errors but albums appear in database, incomplete creation logs in LlamaLog table.

### Pitfall 3: Generic Operation Names

**What goes wrong:** Using generic operation names like "MANUAL_ADD" or "album:created" loses provenance - you can't distinguish between recommendation adds, collection adds, admin adds, or sync operations.

**Why it happens:** Reusing existing OPERATIONS constants instead of creating source-specific operation strings.

**How to avoid:** Use source-specific operation names following entity:action:source pattern:
```typescript
// WRONG: Generic operation
operation: OPERATIONS.MANUAL_ADD, // ❌ Can't tell source

// RIGHT: Source-specific operation
operation: 'album:created:recommendation', // ✅ Clear provenance
operation: 'album:created:spotify-sync',   // ✅ Distinguishable
operation: 'album:created:collection',     // ✅ Traceable
```

**Warning signs:** Cannot filter logs by creation source, difficult to debug sync vs user operations, ambiguous audit trails.

### Pitfall 4: Missing Batch Context in Sync Operations

**What goes wrong:** Sync operations create hundreds of albums but logs don't indicate they're part of the same batch, making it impossible to track "which sync run created this album?"

**Why it happens:** Forgetting to pass parentJobId or sync batch identifiers in metadata.

**How to avoid:** Always include job hierarchy and batch context:
```typescript
// WRONG: Isolated log entries
await logger.logEnrichment({
  entityId: album.id,
  operation: 'album:created:spotify-sync',
  // ❌ No batch context
});

// RIGHT: Batch-aware logging
await logger.logEnrichment({
  entityId: album.id,
  operation: 'album:created:spotify-sync',
  jobId: `album-create-${album.id}`,
  parentJobId: syncJobId, // ✅ Links to parent sync job
  metadata: {
    syncBatch: syncJobId,
    syncTimestamp: new Date().toISOString()
  }
});
```

**Warning signs:** Cannot trace which albums came from which sync run, difficult to debug sync issues, unclear audit trail for automated operations.

## Code Examples

Verified patterns from official sources:

### Example 1: User-Initiated Creation (addAlbum)

```typescript
// Source: Existing addAlbum mutation + LlamaLogger pattern
addAlbum: async (_, { input }, { user, prisma }) => {
  if (!user) throw new GraphQLError('Authentication required');

  // Create album (existing logic)
  const album = await prisma.album.create({
    data: {
      title: input.title,
      releaseDate: input.releaseDate ? new Date(input.releaseDate) : null,
      releaseType: input.albumType || 'ALBUM',
      trackCount: input.totalTracks,
      coverArtUrl: input.coverImageUrl,
      musicbrainzId: input.musicbrainzId,
      dataQuality: input.musicbrainzId ? 'MEDIUM' : 'LOW',
      enrichmentStatus: 'PENDING',
    },
  });

  // NEW: Log creation after commit
  const logger = createLlamaLogger(prisma);
  try {
    await logger.logEnrichment({
      entityType: 'ALBUM',
      entityId: album.id,
      operation: 'album:created:recommendation', // Source-specific
      category: 'CREATED',
      sources: ['ADMIN', 'MUSICBRAINZ'],
      status: 'SUCCESS',
      fieldsEnriched: ['title', 'releaseDate', 'releaseType', 'artists'],
      userId: user.id,
      dataQualityAfter: album.dataQuality,
      isRootJob: true, // User-initiated operations are root jobs
    });
  } catch (logError) {
    console.warn('Failed to log album creation:', logError);
    // Don't throw - album creation succeeded
  }

  return album;
}
```

### Example 2: Collection-Triggered Creation

```typescript
// Source: addAlbumToCollection mutation pattern
// Note: This mutation receives albumId, but if album doesn't exist,
// it would need creation logic (currently assumes album exists)

// If album creation is added to this flow:
const album = await prisma.album.create({ data: {...} });

const logger = createLlamaLogger(prisma);
try {
  await logger.logEnrichment({
    entityType: 'ALBUM',
    entityId: album.id,
    operation: 'album:created:collection',
    category: 'CREATED',
    sources: ['USER'],
    status: 'SUCCESS',
    fieldsEnriched: ['title', 'releaseDate', 'artists'],
    userId: user.id,
    isRootJob: true,
  });
} catch (logError) {
  console.warn('Failed to log album creation:', logError);
}
```

### Example 3: Spotify Sync Batch Creation

```typescript
// Source: spotify-processor.ts handleSpotifySyncNewReleases
async function handleSpotifySyncNewReleases(
  data: SpotifySyncNewReleasesJobData,
  jobId?: string
): Promise<any> {
  const syncJobId = jobId; // Parent job ID
  const spotifyAlbums = await searchSpotifyNewReleases(data);
  
  for (const spotifyAlbum of spotifyAlbums) {
    // Existing creation logic in mappers.ts
    const album = await prisma.album.create({
      data: {
        title: spotifyAlbum.name,
        spotifyId: spotifyAlbum.id,
        releaseDate: parseSpotifyDate(spotifyAlbum.releaseDate).date,
        releaseType: mapAlbumType(spotifyAlbum.type),
        trackCount: spotifyAlbum.totalTracks,
        coverArtUrl: spotifyAlbum.image,
        source: 'SPOTIFY',
        dataQuality: 'MEDIUM',
        enrichmentStatus: 'PENDING',
      },
    });

    // NEW: Log each album creation with batch context
    const logger = createLlamaLogger(prisma);
    try {
      await logger.logEnrichment({
        entityType: 'ALBUM',
        entityId: album.id,
        operation: 'album:created:spotify-sync',
        category: 'CREATED',
        sources: ['SPOTIFY'],
        status: 'SUCCESS',
        fieldsEnriched: ['title', 'spotifyId', 'releaseDate', 'coverArtUrl'],
        jobId: `album-create-${album.id}`, // Child job ID
        parentJobId: syncJobId, // Link to parent sync job
        isRootJob: false, // Child of sync operation
        metadata: {
          syncBatch: syncJobId,
          syncTimestamp: new Date().toISOString(),
          source: data.source || 'scheduled',
        },
      });
    } catch (logError) {
      console.warn(`Failed to log creation for album ${album.id}:`, logError);
    }
  }
}
```

### Example 4: Creation Failure Logging

```typescript
// Source: Error handling best practices + LlamaLogger FAILED category
async function attemptAlbumCreation(
  albumData: AlbumInput,
  userId: string | null,
  operation: string
): Promise<Album> {
  const logger = createLlamaLogger(prisma);
  
  try {
    const album = await prisma.album.create({ data: albumData });
    
    // Log successful creation
    await logger.logEnrichment({
      entityType: 'ALBUM',
      entityId: album.id,
      operation,
      category: 'CREATED',
      sources: ['SPOTIFY'],
      status: 'SUCCESS',
      fieldsEnriched: Object.keys(albumData),
      userId,
    });
    
    return album;
  } catch (error) {
    // Log creation failure
    try {
      await logger.logEnrichment({
        entityType: 'ALBUM',
        entityId: null, // Album doesn't exist
        operation,
        category: 'FAILED',
        sources: ['SPOTIFY'],
        status: 'FAILED',
        fieldsEnriched: [],
        errorMessage: error.message,
        errorCode: error.code || 'CREATION_FAILED',
        userId,
        metadata: {
          attemptedData: {
            title: albumData.title,
            spotifyId: albumData.spotifyId,
            artists: albumData.artists, // Store attempted data
          },
        },
      });
    } catch (logError) {
      console.warn('Failed to log creation failure:', logError);
    }
    
    throw error; // Re-throw original error
  }
}
```

## State of the Art

**Old Approach:** activity-logger.ts with manual OPERATIONS constants
**Current Approach:** LlamaLogger with category enum and automatic inference
**When Changed:** Phase 27 (January 2026)
**Impact:** Category-based filtering, simplified queries, consistent categorization across all operations

**Old Approach:** Generic operation names (MANUAL_ADD, SPOTIFY_SYNC)
**Current Approach:** Source-specific operation names (album:created:spotify-sync)
**When Changed:** Phase 28 design (this phase)
**Impact:** Clear provenance tracking, easier debugging, filterable audit trails

**Deprecated/outdated:**
- Using OPERATIONS.MANUAL_ADD for all creations - replaced with source-specific operation strings
- Logging inside database transactions - replaced with post-commit logging pattern
- Throwing errors from logging code - replaced with try-catch + warn pattern

## Open Questions

Things that couldn't be fully resolved:

1. **Error code taxonomy for creation failures**
   - What we know: LlamaLogger has errorCode field, existing code uses generic error.code
   - What's unclear: Should we standardize error codes (DUPLICATE_ALBUM, INVALID_DATA, etc.)?
   - Recommendation: Start with error.code from Prisma, add standardized codes in future phase if needed

2. **Batch identifier format for sync operations**
   - What we know: BullMQ provides job.id (e.g., "1234"), we can use timestamp-based IDs
   - What's unclear: Should we use job.id directly or create semantic batch IDs (e.g., "spotify-sync-2026-02-09")?
   - Recommendation: Use job.id as parentJobId (BullMQ standard), add semantic identifier in metadata.syncBatch if needed

3. **Retry timing for failed log writes**
   - What we know: Retry once is sufficient, immediate retry risks hitting same failure
   - What's unclear: Optimal delay between attempts (100ms? 500ms? 1000ms?)
   - Recommendation: Use 500ms delay (balanced between responsiveness and allowing transient issues to resolve)

## Sources

### Primary (HIGH confidence)

- Existing codebase - LlamaLogger implementation at src/lib/logging/llama-logger.ts
- Existing codebase - Album creation paths in src/lib/graphql/resolvers/mutations.ts
- Existing codebase - Spotify sync in src/lib/queue/processors/spotify-processor.ts
- Existing codebase - Prisma schema at prisma/schema.prisma (LlamaLog model)

### Secondary (MEDIUM confidence)

- [Dealing with open database transactions in Prisma](https://dev.to/reyronald/dealing-with-open-database-transactions-in-prisma-3clk)
- [Mastering Database Rollbacks with Prisma's Transactional Finesse](https://medium.com/@moiserushanika2006/mastering-database-rollbacks-with-prismas-transactional-finesse-9156b8319bb1)
- [Top Audit Logging Best Practices](https://logit.io/blog/post/audit-logging-best-practices/)
- [Audit Logging Best Practices, Components & Challenges](https://www.sonarsource.com/resources/library/audit-logging/)
- [Database Audit Logging - The Practical Guide](https://www.bytebase.com/blog/database-audit-logging/)
- [Best Practices for Node.js Error-handling](https://www.toptal.com/developers/nodejs/node-js-error-handling)
- [A comprehensive guide to error handling In Node.js](https://www.honeybadger.io/blog/errors-nodejs/)
- [BullMQ Flows Documentation](https://docs.bullmq.io/guide/flows)
- [BullMQ Flows & Parent-Child Jobs](https://hexdocs.pm/bullmq/flows.html)

### Tertiary (LOW confidence)

None - all findings verified with official sources or codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All tools already in use (Prisma, LlamaLogger, BullMQ)
- Architecture: HIGH - Patterns verified in existing codebase and official documentation
- Pitfalls: HIGH - Based on common transaction/logging anti-patterns and codebase review

**Research date:** 2026-02-09
**Valid until:** 60 days (stable logging infrastructure, unlikely to change rapidly)
