# Phase 29: Related Entity Tracking - Research

**Researched:** 2026-02-10
**Domain:** Job hierarchy tracking for related entity creation (artists, tracks)
**Confidence:** HIGH

## Summary

Phase 29 extends the album creation tracking from Phase 28 to include related entity creation (artists, tracks) with proper parent-child job relationships. The research identified a dual-hierarchy pattern combining parentJobId (immediate parent for chain walking) with rootJobId (original album job for quick queries). 

The existing codebase has 8 locations where artists are created and 3 where tracks are created, all within album creation/enrichment flows. The LlamaLogger infrastructure from Phase 27 is already in place and the LlamaLogCategory enum needs extension to add LINKED for associating with existing entities. The primary technical challenge is migrating the existing LlamaLog table to add the rootJobId field while backfilling 4,052 existing log entries (1,537 root jobs, 30 with parents, 2,485 orphans).

The phase decisions call for granular logging (one log per artist/track) rather than summary logging, trading database size (~150 MB projected at 10k albums) for complete provenance tracking, since tracks will become recommendable entities.

**Primary recommendation:** Add nullable rootJobId column to LlamaLog, backfill using recursive CTEs to walk parent chains, add LINKED category to enum, and instrument all 8 artist creation + 3 track creation paths with post-commit logging following Phase 28 patterns.

## Standard Stack

The established libraries/tools for this domain:

### Core

**Library:** PostgreSQL Recursive CTEs
**Version:** PostgreSQL 12+ (already in use)
**Purpose:** Parent chain traversal for rootJobId backfill
**Why Standard:** Native SQL feature for hierarchical queries, superior performance to application-level traversal, handles arbitrary depth chains without code changes

**Library:** Prisma Migrations
**Version:** Latest (already in use)
**Purpose:** Schema changes and data backfill
**Why Standard:** Provides version-controlled migration files, transaction safety, rollback capability, and direct SQL execution for complex backfills

**Library:** LlamaLogger (internal)
**Version:** Phase 27/28 implementation
**Purpose:** Entity lifecycle tracking with job hierarchy
**Why Standard:** Already handles parentJobId, isRootJob, category inference, non-blocking writes. Extending to rootJobId requires minimal changes.

### Supporting

**Library:** BullMQ FlowProducer
**Version:** Latest (already in use)
**Purpose:** Parent-child job relationships
**Why Standard:** Manages job.id generation, parent-child dependencies, waiting-children state, and recursive failure propagation

**Installation:**
```bash
# All dependencies already installed
# No new packages required
```

## Architecture Patterns

### Recommended Schema Structure

```sql
-- Migration: Add rootJobId and LINKED category
ALTER TABLE "LlamaLog" ADD COLUMN "root_job_id" VARCHAR(100);

-- Extend LlamaLogCategory enum
ALTER TYPE "LlamaLogCategory" ADD VALUE 'LINKED';

-- Create index for rootJobId queries (critical for timeline performance)
CREATE INDEX "LlamaLog_root_job_id_idx" ON "LlamaLog"("root_job_id");
```

### Pattern 1: Dual-Hierarchy Job Tracking

**What:** Store both parentJobId (immediate parent) and rootJobId (ultimate ancestor)
**When to use:** All child job logging (artist, track creation)
**Example:**
```typescript
// Album creation (root job)
await llamaLogger.logEnrichment({
  entityType: 'ALBUM',
  entityId: album.id,
  operation: 'album:created:recommendation',
  jobId: albumJobId,
  parentJobId: null,
  rootJobId: albumJobId, // Self-reference for root jobs
  isRootJob: true,
});

// Artist creation (child of album)
await llamaLogger.logEnrichment({
  entityType: 'ARTIST',
  entityId: artist.id,
  operation: 'artist:created:album-child',
  jobId: artistJobId,
  parentJobId: albumJobId, // Immediate parent
  rootJobId: albumJobId,   // Root album job (enables fast queries)
  isRootJob: false,
});

// Track creation (grandchild - created during enrichment)
await llamaLogger.logEnrichment({
  entityType: 'TRACK',
  entityId: track.id,
  operation: 'track:created:enrichment',
  jobId: trackJobId,
  parentJobId: enrichmentJobId, // Immediate parent
  rootJobId: albumJobId,        // Root album job (2+ levels up)
  isRootJob: false,
});
```

**Why both fields:**
- parentJobId: Enables walking full chain for debugging ("what triggered this?")
- rootJobId: Enables fast queries for timelines ("show all work for this album")
- Single-index query performance vs recursive CTE joins
- Denormalized but worth it for query speed

### Pattern 2: Recursive CTE Backfill

**What:** Walk parentJobId chains to find rootJobId for existing logs
**When to use:** One-time migration to populate rootJobId on existing data
**Example:**
```sql
-- Recursive CTE to find root job for each log entry
WITH RECURSIVE job_chain AS (
  -- Base case: Start with logs that have parents
  SELECT 
    id,
    "job_id",
    "parent_job_id",
    "job_id" as current_job_id,
    0 as depth
  FROM "LlamaLog"
  WHERE "parent_job_id" IS NOT NULL
  
  UNION ALL
  
  -- Recursive case: Walk up the chain
  SELECT 
    jc.id,
    jc."job_id",
    parent."parent_job_id",
    parent."job_id" as current_job_id,
    jc.depth + 1
  FROM job_chain jc
  JOIN "LlamaLog" parent ON parent."job_id" = jc."parent_job_id"
  WHERE parent."parent_job_id" IS NOT NULL
    AND jc.depth < 10 -- Safety limit to prevent infinite loops
)
-- Update: Set rootJobId to the topmost job in chain
UPDATE "LlamaLog" ll
SET "root_job_id" = (
  SELECT current_job_id
  FROM job_chain
  WHERE job_chain.id = ll.id
  ORDER BY depth DESC
  LIMIT 1
)
WHERE ll."parent_job_id" IS NOT NULL;

-- Root jobs: Set rootJobId = jobId (self-reference)
UPDATE "LlamaLog"
SET "root_job_id" = "job_id"
WHERE "parent_job_id" IS NULL AND "job_id" IS NOT NULL;
```

**Why recursive CTE:**
- Handles arbitrary chain depth (album → enrichment → track artist creation)
- Single SQL statement vs N queries
- Transaction-safe backfill
- Depth limit prevents infinite loops from circular references

### Pattern 3: LINKED vs CREATED Logging

**What:** Use LINKED category when associating with existing entities, CREATED for new ones
**When to use:** All artist/track creation paths that check for existing entities first
**Example:**
```typescript
// Check if artist exists (standard pattern in codebase)
let dbArtist = await prisma.artist.findFirst({
  where: {
    OR: [
      { musicbrainzId: mbArtist.id },
      { name: { equals: artistName, mode: 'insensitive' } }
    ]
  }
});

const logger = createLlamaLogger(prisma);

if (!dbArtist) {
  // Create new artist
  dbArtist = await prisma.artist.create({
    data: {
      name: artistName,
      musicbrainzId: mbArtist.id || null,
      dataQuality: 'MEDIUM',
      enrichmentStatus: 'PENDING',
    }
  });
  
  // Log CREATED
  await logger.logEnrichment({
    entityType: 'ARTIST',
    entityId: dbArtist.id,
    operation: 'artist:created:album-child',
    category: 'CREATED',
    sources: ['MUSICBRAINZ'],
    status: 'SUCCESS',
    fieldsEnriched: ['name', 'musicbrainzId'],
    parentJobId: albumJobId,
    rootJobId: albumJobId,
    isRootJob: false,
  });
} else {
  // Existing artist - log the association
  await logger.logEnrichment({
    entityType: 'ARTIST',
    entityId: dbArtist.id, // Existing artist ID
    operation: 'artist:linked:album-association',
    category: 'LINKED',
    sources: ['MUSICBRAINZ'],
    status: 'SUCCESS',
    fieldsEnriched: [], // No fields created/modified
    parentJobId: albumJobId,
    rootJobId: albumJobId,
    isRootJob: false,
    metadata: {
      albumId: album.id,
      associationType: 'album-artist',
      existingEntity: true,
    }
  });
}

// Link artist to album (happens in both cases)
await prisma.albumArtist.create({
  data: {
    albumId: album.id,
    artistId: dbArtist.id,
    role: 'PRIMARY',
  }
});
```

**Why LINKED category:**
- Distinguishes creation from association
- Complete provenance for all entity relationships
- Enables queries like "when was this artist first used?" vs "when was it created?"
- Tracks entity reuse across albums

### Pattern 4: Granular Per-Entity Logging

**What:** One log entry per artist, one per track (not summary counts)
**When to use:** All artist and track creation/linking operations
**Example:**
```typescript
// Album enrichment creates 15 tracks
for (const mbTrack of mbRecording.tracks) {
  const track = await prisma.track.create({ data: {...} });
  
  // Log each track individually
  await logger.logEnrichment({
    entityType: 'TRACK',
    entityId: track.id, // Specific track ID
    operation: 'track:created:enrichment',
    category: 'CREATED',
    sources: ['MUSICBRAINZ'],
    status: 'SUCCESS',
    fieldsEnriched: ['title', 'trackNumber', 'durationMs'],
    parentJobId: enrichmentJobId,
    rootJobId: albumJobId,
    isRootJob: false,
    metadata: {
      trackNumber: track.trackNumber,
      discNumber: track.discNumber,
    }
  });
}

// NOT THIS (summary logging):
// await logger.logEnrichment({
//   operation: 'tracks:created:enrichment',
//   metadata: { trackCount: 15 } // ❌ Loses individual track provenance
// });
```

**Why granular:**
- Tracks will be recommendable entities (per phase context)
- Complete provenance per entity
- Enables "show me the timeline for this track"
- Consistent with album/artist logging granularity

**Trade-off:**
- ~5x more logs per album (~9 logs vs ~2)
- Projected ~150 MB at 10k albums
- Worth it for complete provenance
- Revisit if log table exceeds 500 MB

### Pattern 5: Edge Case Handling

**What:** Handle missing artists, failures, and orphan data
**When to use:** All creation paths
**Example:**
```typescript
// Edge case: Album with no artist data
if (!artistData || artistData.length === 0) {
  await logger.logEnrichment({
    entityType: 'ARTIST',
    entityId: null, // No artist created
    operation: 'artist:missing:album-child',
    category: 'FAILED',
    sources: ['MUSICBRAINZ'],
    status: 'NO_DATA_AVAILABLE',
    fieldsEnriched: [],
    errorMessage: 'Album has no artist data',
    parentJobId: albumJobId,
    rootJobId: albumJobId,
    isRootJob: false,
    metadata: {
      albumId: album.id,
      albumTitle: album.title,
    }
  });
}

// Edge case: Track creation failure
try {
  const track = await prisma.track.create({ data: {...} });
  // ... success logging
} catch (error) {
  await logger.logEnrichment({
    entityType: 'TRACK',
    entityId: null, // Track doesn't exist
    operation: 'track:failed:enrichment',
    category: 'FAILED',
    sources: ['MUSICBRAINZ'],
    status: 'FAILED',
    fieldsEnriched: [],
    errorMessage: error.message,
    errorCode: error.code || 'TRACK_CREATION_FAILED',
    parentJobId: enrichmentJobId,
    rootJobId: albumJobId,
    isRootJob: false,
    metadata: {
      attemptedData: {
        title: trackData.title,
        trackNumber: trackData.trackNumber,
      }
    }
  });
}
```

**Why granular failure logging:**
- Per-entity failures visible in timeline
- Debugging: "which tracks failed to create?"
- Consistent with success logging granularity

### Anti-Patterns to Avoid

- **Walking chains in application code:** Use rootJobId for queries, not recursive joins - O(1) vs O(depth)
- **Inconsistent granularity:** Don't log tracks as summary but artists granularly - makes provenance incomplete
- **Forgetting rootJobId on child logs:** Always pass rootJobId from parent context, even if multiple levels deep
- **Using CREATED for existing entities:** LINKED is for associations, CREATED is for new entities only

## Don't Hand-Roll

Problems that look simple but have existing solutions:

**Problem:** Finding root job in a parent-child chain
**Don't Build:** Application-level recursive traversal walking parentJobId
**Use Instead:** Store rootJobId denormalized field, query with single index lookup
**Why:** PostgreSQL recursive CTEs are powerful but slow for repeated queries. Denormalized rootJobId trades 100 bytes per log for O(1) query performance. With 4,000+ logs, the trade-off is worth it.

**Problem:** Hierarchical data in relational databases
**Don't Build:** Nested JSON structures or custom path encoding
**Use Instead:** Adjacency list (parentJobId) + denormalized ancestor (rootJobId)
**Why:** Adjacency list is simple, space-efficient, and handles arbitrary depth. Denormalized ancestor enables fast queries. "Best of both worlds" approach per PostgreSQL hierarchy best practices.

**Problem:** Backfilling nullable columns
**Don't Build:** Application-level loop reading and updating each row
**Use Instead:** Recursive CTE in migration SQL
**Why:** PostgreSQL recursive CTEs handle the entire backfill in one statement, within a transaction, with proper depth limits. Application-level code risks partial completion and requires connection pooling management.

**Key insight:** Job hierarchy is a well-solved problem in database systems. The pattern of "store immediate parent + denormalized root" appears in DevOps systems (work items), job queues (BullMQ flows), and enterprise audit logs. Don't reinvent it.

## Common Pitfalls

### Pitfall 1: Circular References in Parent Chains

**What goes wrong:** If logs accidentally reference each other as parents (A → B → A), recursive CTEs loop infinitely and the backfill hangs or times out.

**Why it happens:** Job ID generation bugs, race conditions in concurrent job creation, or manual database edits create circular references.

**How to avoid:** 
- Add depth limit to recursive CTE (e.g., `WHERE depth < 10`)
- Validate parent exists before logging: `IF parentJobId THEN check it exists`
- Add database constraint (optional): CHECK to prevent self-reference

```sql
-- Depth limit in CTE (from Pattern 2)
WHERE parent."parent_job_id" IS NOT NULL
  AND jc.depth < 10 -- Safety limit

-- Optional constraint to prevent self-reference
ALTER TABLE "LlamaLog" 
ADD CONSTRAINT "prevent_self_reference" 
CHECK ("job_id" != "parent_job_id");
```

**Warning signs:** Migration hangs during backfill, recursive CTE queries timeout, admin UI timeline shows infinite loops.

### Pitfall 2: Orphan Logs with NULL rootJobId

**What goes wrong:** Logs created before Phase 28/29 have no jobId/parentJobId. After migration, their rootJobId stays NULL. Queries filtering by rootJobId exclude these orphans, hiding historical data.

**Why it happens:** Legacy data predates job tracking infrastructure. Pre-Phase 28 logs (2,485 entries per context) lack job context.

**How to avoid:**
- Leave rootJobId NULL for orphans (honest about missing data)
- Admin UI shows "Origin unknown" indicator when rootJobId IS NULL
- Queries include OR condition: `WHERE rootJobId = ? OR (rootJobId IS NULL AND createdAt < migration_date)`
- Document in migration: "NULL rootJobId = pre-tracking era"

```typescript
// Timeline query pattern
const logs = await prisma.llamaLog.findMany({
  where: {
    OR: [
      { rootJobId: albumJobId }, // Tracked jobs
      { 
        rootJobId: null,
        albumId: albumId, // Orphans linked by entity
        createdAt: { lt: PHASE_29_MIGRATION_DATE }
      }
    ]
  },
  orderBy: { createdAt: 'desc' }
});
```

**Warning signs:** Historical logs missing from timeline, inconsistent log counts before/after migration, user reports "missing album creation logs."

### Pitfall 3: Forgetting rootJobId on Nested Children

**What goes wrong:** Album creation (root) logs correctly, artist creation (child) includes rootJobId, but track-artist creation (grandchild) loses rootJobId. Timeline shows incomplete hierarchy.

**Why it happens:** rootJobId not passed down through multiple levels of job context. Developer forgets to thread it through intermediate steps.

**How to avoid:**
- Pass rootJobId explicitly in job data: `{ albumJobId, enrichmentJobId, rootJobId: albumJobId }`
- Document in job types: `rootJobId: string // Original album job ID`
- Validation in LlamaLogger: warn if isRootJob=false but no rootJobId
- Code review checklist: "All child logs include rootJobId?"

```typescript
// Job data structure
interface EnrichmentJobData {
  albumId: string;
  jobId: string;       // This enrichment job
  parentJobId: string; // Album creation job
  rootJobId: string;   // Album creation job (same as parent in this case)
}

// Validation in LlamaLogger
if (!data.isRootJob && !data.rootJobId) {
  console.warn(`Child job log missing rootJobId: ${data.operation}`);
  // Auto-compute from parentJobId if possible
}
```

**Warning signs:** Timeline shows some children but not others, logs have parentJobId but no rootJobId, inconsistent hierarchy depth.

### Pitfall 4: Summary Logging for Tracks

**What goes wrong:** Logging "15 tracks created" as single entry loses per-track provenance. Later when tracks become recommendable, no creation log exists for individual tracks.

**Why it happens:** Developer assumes track creation is "too granular" and summarizes to reduce log volume.

**How to avoid:**
- Follow phase decision: granular logging for all entities
- Document rationale: tracks will be recommendable, provenance matters
- Accept trade-off: ~5x logs for complete provenance
- Set threshold: revisit if log table exceeds 500 MB

```typescript
// WRONG: Summary logging
await logger.logEnrichment({
  operation: 'tracks:created:enrichment',
  category: 'CREATED',
  metadata: { trackCount: 15, trackIds: [...] } // ❌
});

// RIGHT: Granular logging
for (const track of createdTracks) {
  await logger.logEnrichment({
    entityType: 'TRACK',
    entityId: track.id, // ✅ Individual track
    operation: 'track:created:enrichment',
    category: 'CREATED',
    // ... full track context
  });
}
```

**Warning signs:** Track count in metadata but no individual track logs, timeline shows album/artists but not tracks, recommendation flow can't find track creation provenance.

## Code Examples

Verified patterns from official sources:

### Example 1: Artist Creation with Dual Hierarchy

```typescript
// Source: mutations.ts addAlbum mutation pattern + dual hierarchy
// Location: src/lib/graphql/resolvers/mutations.ts (line 794)

// Album created (root job)
const album = await prisma.album.create({ data: {...} });
const albumJobId = `album-create-${album.id}`;

await logger.logEnrichment({
  entityType: 'ALBUM',
  entityId: album.id,
  operation: 'album:created:recommendation',
  jobId: albumJobId,
  parentJobId: null,
  rootJobId: albumJobId, // Self-reference for root
  isRootJob: true,
  userId: user.id,
});

// Artist creation (child of album)
for (const artistInput of input.artists) {
  let dbArtist = await prisma.artist.findFirst({
    where: { name: { equals: artistInput.artistName, mode: 'insensitive' } }
  });

  const artistJobId = `artist-create-${Date.now()}`;

  if (!dbArtist) {
    dbArtist = await prisma.artist.create({
      data: {
        name: artistInput.artistName,
        dataQuality: 'LOW',
        enrichmentStatus: 'PENDING',
      }
    });

    // Log CREATED with parent/root hierarchy
    await logger.logEnrichment({
      entityType: 'ARTIST',
      entityId: dbArtist.id,
      operation: 'artist:created:album-child',
      category: 'CREATED',
      sources: ['ADMIN', 'MUSICBRAINZ'],
      status: 'SUCCESS',
      fieldsEnriched: ['name'],
      jobId: artistJobId,
      parentJobId: albumJobId,    // Immediate parent
      rootJobId: albumJobId,      // Root album job
      isRootJob: false,
      userId: user.id,
    });
  } else {
    // Log LINKED for existing artist
    await logger.logEnrichment({
      entityType: 'ARTIST',
      entityId: dbArtist.id,
      operation: 'artist:linked:album-association',
      category: 'LINKED',
      sources: ['ADMIN'],
      status: 'SUCCESS',
      fieldsEnriched: [],
      jobId: artistJobId,
      parentJobId: albumJobId,
      rootJobId: albumJobId,
      isRootJob: false,
      userId: user.id,
      metadata: {
        albumId: album.id,
        existingEntity: true,
      }
    });
  }

  // Create album-artist relationship
  await prisma.albumArtist.create({
    data: {
      albumId: album.id,
      artistId: dbArtist.id,
      role: artistInput.role || 'PRIMARY',
    }
  });
}
```

### Example 2: Track Creation During Enrichment

```typescript
// Source: enrichment-processor.ts bulk track processing
// Location: src/lib/queue/processors/enrichment-processor.ts (line 2300+)

async function handleAlbumEnrichment(
  data: EnrichAlbumJobData,
  jobId?: string
): Promise<void> {
  const enrichmentJobId = jobId;
  
  // Get album and its root job ID
  const album = await prisma.album.findUnique({
    where: { id: data.albumId },
    include: {
      LlamaLog: {
        where: { category: 'CREATED' },
        orderBy: { createdAt: 'asc' },
        take: 1,
      }
    }
  });

  // Extract rootJobId from album creation log
  const rootJobId = album.LlamaLog[0]?.jobId || `album-${album.id}`;

  // Process MusicBrainz recordings
  for (const mbRecording of mbRelease.media[0].tracks) {
    const trackNumber = mbRecording.position;
    
    // Create track
    const track = await prisma.track.create({
      data: {
        albumId: album.id,
        title: mbRecording.title,
        trackNumber,
        discNumber: 1,
        durationMs: mbRecording.length ? mbRecording.length * 1000 : null,
        musicbrainzId: mbRecording.id,
        dataQuality: 'HIGH',
        enrichmentStatus: 'COMPLETED',
        lastEnriched: new Date(),
      }
    });

    const trackJobId = `track-create-${track.id}`;
    const logger = createLlamaLogger(prisma);

    // Log track creation with full hierarchy
    await logger.logEnrichment({
      entityType: 'TRACK',
      entityId: track.id,
      operation: 'track:created:enrichment',
      category: 'CREATED',
      sources: ['MUSICBRAINZ'],
      status: 'SUCCESS',
      fieldsEnriched: ['title', 'trackNumber', 'durationMs', 'musicbrainzId'],
      jobId: trackJobId,
      parentJobId: enrichmentJobId,  // Enrichment job
      rootJobId: rootJobId,           // Original album creation job
      isRootJob: false,
      dataQualityAfter: 'HIGH',
      metadata: {
        trackNumber,
        discNumber: 1,
        mbRecordingId: mbRecording.id,
      }
    });

    // Create track-artist relationships
    if (mbRecording['artist-credit']) {
      for (let i = 0; i < mbRecording['artist-credit'].length; i++) {
        const mbArtist = mbRecording['artist-credit'][i];
        const artistName = mbArtist.name || mbArtist.artist?.name;

        if (artistName) {
          let dbArtist = await prisma.artist.findFirst({
            where: {
              OR: [
                { musicbrainzId: mbArtist.artist?.id },
                { name: { equals: artistName, mode: 'insensitive' } }
              ]
            }
          });

          const artistJobId = `artist-track-${Date.now()}-${i}`;

          if (!dbArtist) {
            // Create artist for track
            dbArtist = await prisma.artist.create({
              data: {
                name: artistName,
                musicbrainzId: mbArtist.artist?.id || null,
                dataQuality: 'MEDIUM',
                enrichmentStatus: 'PENDING',
              }
            });

            // Log artist creation (grandchild of album)
            await logger.logEnrichment({
              entityType: 'ARTIST',
              entityId: dbArtist.id,
              operation: 'artist:created:track-child',
              category: 'CREATED',
              sources: ['MUSICBRAINZ'],
              status: 'SUCCESS',
              fieldsEnriched: ['name', 'musicbrainzId'],
              jobId: artistJobId,
              parentJobId: trackJobId,    // Track creation job
              rootJobId: rootJobId,       // Album creation job (2 levels up!)
              isRootJob: false,
              dataQualityAfter: 'MEDIUM',
            });
          } else {
            // Log artist linking to track
            await logger.logEnrichment({
              entityType: 'ARTIST',
              entityId: dbArtist.id,
              operation: 'artist:linked:track-association',
              category: 'LINKED',
              sources: ['MUSICBRAINZ'],
              status: 'SUCCESS',
              fieldsEnriched: [],
              jobId: artistJobId,
              parentJobId: trackJobId,
              rootJobId: rootJobId,
              isRootJob: false,
              metadata: {
                trackId: track.id,
                existingEntity: true,
              }
            });
          }

          await prisma.trackArtist.create({
            data: {
              trackId: track.id,
              artistId: dbArtist.id,
              role: i === 0 ? 'primary' : 'featured',
              position: i,
            }
          });
        }
      }
    }
  }
}
```

### Example 3: Migration with Recursive CTE Backfill

```sql
-- Source: PostgreSQL recursive CTE documentation + backfill pattern
-- Migration: Add rootJobId and backfill existing data

BEGIN;

-- 1. Add rootJobId column (nullable for legacy data)
ALTER TABLE "LlamaLog" ADD COLUMN "root_job_id" VARCHAR(100);

-- 2. Add LINKED to LlamaLogCategory enum
ALTER TYPE "LlamaLogCategory" ADD VALUE IF NOT EXISTS 'LINKED';

-- 3. Create index for fast queries
CREATE INDEX "LlamaLog_root_job_id_idx" ON "LlamaLog"("root_job_id");

-- 4. Backfill root jobs (parentJobId IS NULL)
UPDATE "LlamaLog"
SET "root_job_id" = "job_id"
WHERE "parent_job_id" IS NULL AND "job_id" IS NOT NULL;

-- Log: Updated 1,537 root jobs

-- 5. Backfill jobs with parent (walk chain to find root)
WITH RECURSIVE job_chain AS (
  -- Base case: Logs with parents
  SELECT 
    id,
    "job_id",
    "parent_job_id",
    "parent_job_id" as root_candidate,
    1 as depth
  FROM "LlamaLog"
  WHERE "parent_job_id" IS NOT NULL
  
  UNION ALL
  
  -- Recursive case: Walk up to find root
  SELECT 
    jc.id,
    jc."job_id",
    parent."parent_job_id",
    COALESCE(parent."parent_job_id", jc.root_candidate) as root_candidate,
    jc.depth + 1
  FROM job_chain jc
  JOIN "LlamaLog" parent ON parent."job_id" = jc.root_candidate
  WHERE parent."parent_job_id" IS NOT NULL
    AND jc.depth < 10 -- Safety limit
),
root_jobs AS (
  -- Get the topmost job for each log
  SELECT DISTINCT ON (id)
    id,
    root_candidate as root_job_id
  FROM job_chain
  ORDER BY id, depth DESC
)
UPDATE "LlamaLog" ll
SET "root_job_id" = rj.root_job_id
FROM root_jobs rj
WHERE ll.id = rj.id;

-- Log: Updated 30 jobs with parents

-- 6. Verify backfill
SELECT 
  COUNT(*) FILTER (WHERE "root_job_id" IS NOT NULL) as filled,
  COUNT(*) FILTER (WHERE "root_job_id" IS NULL) as orphans,
  COUNT(*) as total
FROM "LlamaLog";

-- Expected: filled=1,567, orphans=2,485, total=4,052

-- 7. Add comment for NULL rootJobId
COMMENT ON COLUMN "LlamaLog"."root_job_id" IS 
  'Root job ID for hierarchy queries. NULL indicates pre-Phase 29 orphan data.';

-- 8. Set explicit NULL for root jobs' parentJobId (consistency)
UPDATE "LlamaLog"
SET "parent_job_id" = NULL
WHERE "is_root_job" = true AND "parent_job_id" IS NOT NULL;

COMMIT;
```

### Example 4: Admin UI Timeline Query

```typescript
// Source: Timeline query pattern with rootJobId + orphan handling
// Location: src/lib/graphql/resolvers/queries.ts

async function getAlbumTimeline(
  albumId: string,
  includeOrphans: boolean = true
): Promise<LlamaLog[]> {
  // Get album's creation log to find rootJobId
  const albumCreationLog = await prisma.llamaLog.findFirst({
    where: {
      albumId,
      category: 'CREATED',
      entityType: 'ALBUM',
    },
    orderBy: { createdAt: 'asc' },
    select: { jobId: true, rootJobId: true },
  });

  const rootJobId = albumCreationLog?.rootJobId || albumCreationLog?.jobId;

  if (!rootJobId && !includeOrphans) {
    return [];
  }

  // Query: All logs in this job hierarchy + orphans
  const logs = await prisma.llamaLog.findMany({
    where: {
      OR: [
        // Tracked job hierarchy
        { rootJobId: rootJobId },
        // Orphan logs (pre-tracking)
        ...(includeOrphans ? [
          {
            rootJobId: null,
            albumId,
          }
        ] : [])
      ]
    },
    orderBy: [
      { createdAt: 'asc' },
      // Root first, then children
      { isRootJob: 'desc' },
    ],
    include: {
      artist: { select: { id: true, name: true } },
      album: { select: { id: true, title: true } },
      track: { select: { id: true, title: true, trackNumber: true } },
    }
  });

  return logs;
}

// Admin UI component
function TimelineEntry({ log }: { log: LlamaLog }) {
  const isOrphan = !log.rootJobId;
  
  return (
    <div className={isOrphan ? 'opacity-60' : ''}>
      {isOrphan && <Badge>Origin Unknown</Badge>}
      
      {/* Show hierarchy level */}
      <div style={{ paddingLeft: `${getHierarchyDepth(log) * 20}px` }}>
        {log.category === 'CREATED' && '✨ Created'}
        {log.category === 'LINKED' && '🔗 Linked'}
        {log.category === 'ENRICHED' && '📊 Enriched'}
        
        {log.entityType} {log.entityId}
      </div>
    </div>
  );
}

function getHierarchyDepth(log: LlamaLog): number {
  if (log.isRootJob) return 0;
  if (!log.parentJobId) return 0;
  
  // Use parentJobId for display hierarchy (actual chain)
  // rootJobId is for filtering, not depth calculation
  // Depth would require recursive query or caching
  // For now, show all children at depth=1 (good enough)
  return 1;
}
```

## State of the Art

**Old Approach:** Flat parentJobId with no root tracking
**Current Approach:** Dual hierarchy with parentJobId + rootJobId
**When Changed:** Phase 29 (February 2026)
**Impact:** O(1) timeline queries instead of recursive CTEs, clear separation of "chain walking" (parentJobId) vs "filter all related" (rootJobId)

**Old Approach:** CREATED for all entity operations
**Current Approach:** CREATED for new entities, LINKED for associations
**When Changed:** Phase 29 (February 2026)
**Impact:** Distinguishes entity creation from relationship creation, tracks entity reuse across albums, enables "when was this first used?" queries

**Old Approach:** Summary logging for bulk operations
**Current Approach:** Granular per-entity logging
**When Changed:** Phase 29 (February 2026)
**Impact:** Complete provenance for recommendable tracks, ~5x log volume, database grows to ~150 MB at 10k albums

**Deprecated/outdated:**
- Recursive CTE queries for timeline display - replaced with rootJobId index lookups
- Single parentJobId field for hierarchy - supplemented with rootJobId for performance
- Ignoring orphan data in queries - orphans now shown with "Origin unknown" indicator

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal depth limit for recursive CTE**
   - What we know: Typical chains are 2-3 levels (album → enrichment → track), safety limit needed to prevent infinite loops
   - What's unclear: Should limit be 5, 10, or 20? What happens if legitimate chain exceeds limit?
   - Recommendation: Use 10 (3x typical depth), add monitoring to alert if any chain reaches depth 8+

2. **Performance impact of 5x log growth**
   - What we know: Granular logging creates ~9 logs per album (1 album + 2 artists + 6 tracks average), projected 150 MB at 10k albums
   - What's unclear: At what scale does this impact query performance? When should we consider summary logging?
   - Recommendation: Monitor log table size and query times, revisit if table exceeds 500 MB or queries slow to >100ms

3. **Handling circular references in legacy data**
   - What we know: Migration safety limit prevents infinite loops, but circular refs might exist
   - What's unclear: Should we detect and fix circular refs, or just let them remain with NULL rootJobId?
   - Recommendation: Add pre-migration check to detect circles, log warnings but don't block migration, manual fix if found

4. **Timeline depth calculation UI**
   - What we know: Showing hierarchy depth in UI requires either recursive query or caching parent chain
   - What's unclear: Should we compute depth on-demand, cache it in metadata, or simplify to "root vs child"?
   - Recommendation: Start with simple "root (depth 0) vs child (depth 1)" display, add full depth later if users request it

## Sources

### Primary (HIGH confidence)

- Existing codebase - LlamaLogger at src/lib/logging/llama-logger.ts
- Existing codebase - Artist creation in src/lib/graphql/resolvers/mutations.ts (8 locations)
- Existing codebase - Track creation in src/lib/queue/processors/enrichment-processor.ts
- Existing codebase - Prisma schema at prisma/schema.prisma (LlamaLog model)
- [BullMQ Flows Documentation](https://docs.bullmq.io/guide/flows) - Parent-child job relationships
- [BullMQ Continue Parent](https://docs.bullmq.io/guide/flows/continue-parent) - Failure propagation

### Secondary (MEDIUM confidence)

- [How to Query a Parent-Child Tree in SQL | LearnSQL.com](https://learnsql.com/blog/query-parent-child-tree/) - Recursive CTE patterns
- [How to run hierarchical queries in Oracle and PostgreSQL | EDB](https://www.enterprisedb.com/postgres-tutorials/how-run-hierarchical-queries-oracle-and-postgresql) - PostgreSQL hierarchy techniques
- [Trees in PostgreSQL | MadeCurious](https://madecurious.com/curiosities/trees-in-postgresql/) - Adjacency list + denormalized ancestor pattern
- [Using the expand and contract pattern | Prisma's Data Guide](https://www.prisma.io/dataguide/types/relational/expand-and-contract-pattern) - Nullable column migration pattern
- [Backward compatible database changes — PlanetScale](https://planetscale.com/blog/backward-compatible-databases-changes) - Backfill best practices
- [Logging vs. Auditing | Medium](https://medium.com/@satishing/logging-vs-auditing-understanding-their-distinct-roles-in-software-systems-16a94922446e) - Granular vs summary logging

### Tertiary (LOW confidence)

None - all findings verified with official sources or codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All tools already in use (PostgreSQL CTEs, Prisma, LlamaLogger)
- Architecture: HIGH - Patterns verified in existing codebase, PostgreSQL docs, and BullMQ documentation
- Pitfalls: HIGH - Based on database migration best practices and hierarchical data anti-patterns
- Migration strategy: MEDIUM - Recursive CTE backfill pattern verified but not yet tested on this codebase

**Research date:** 2026-02-10
**Valid until:** 60 days (stable infrastructure, unlikely to change rapidly)
