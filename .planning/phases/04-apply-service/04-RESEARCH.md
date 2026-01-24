# Phase 4: Apply Service - Research

**Researched:** 2026-01-24
**Domain:** Prisma interactive transactions, atomic database updates, audit logging
**Confidence:** HIGH

## Summary

This phase implements the Apply Correction Service that atomically updates Album, AlbumArtist, and Track tables based on admin-selected MusicBrainz corrections. The system uses Prisma's interactive transactions to ensure all-or-nothing updates with full audit trail logging.

**Key Technical Challenges:**
1. Atomic updates across multiple tables (Album, AlbumArtist, Track, Artist creation)
2. Selective field updates based on admin choices (partial apply)
3. Track matching strategy (position-first, title-fallback)
4. Optimistic locking to prevent concurrent modification conflicts
5. Audit logging with before/after deltas to enrichment_logs table
6. Data quality score recalculation after corrections

**Primary recommendation:** Use Prisma interactive transactions (`$transaction(async (tx) => {...})`) with optimistic locking via `updatedAt` timestamp validation. Keep transactions fast (<5s) by pre-fetching all data before transaction scope.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma Client | Current | Database ORM with transaction support | Industry standard for TypeScript + PostgreSQL, built-in transaction API |
| @prisma/client | Current | Generated Prisma types | Type-safe database operations with full IDE support |
| fastest-levenshtein | Latest | String similarity for track matching | Fastest JS/TS implementation of Levenshtein distance (O(mn) complexity) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jsdiff | Already in use | Character-level text diffs (from Phase 3) | Reuse for audit log change details |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Interactive transactions | Sequential operations (`$transaction([])`) | Arrays don't support conditional logic between operations |
| Interactive transactions | Nested writes | Can't handle complex track matching/deletion logic |
| fastest-levenshtein | js-levenshtein or custom | fastest-levenshtein is most performant, actively maintained |
| Optimistic locking | Database row locks | Row locks hurt concurrency, optimistic approach scales better |

**Installation:**
```bash
npm install fastest-levenshtein
# Prisma already installed, jsdiff already installed from Phase 3
```

## Architecture Patterns

### Recommended Project Structure

```
src/lib/correction/apply/
├── apply-service.ts           # Main ApplyCorrectionService class
├── field-selector.ts          # Selective field update logic
├── track-matcher.ts           # Track matching strategy (position + similarity)
├── data-quality-calculator.ts # Post-correction quality score calculation
├── types.ts                   # Apply-specific types
└── index.ts                   # Barrel export
```

### Pattern 1: Interactive Transaction with Pre-Fetched Data

**What:** Fetch all necessary data BEFORE opening transaction, then execute writes quickly
**When to use:** All complex database operations requiring atomicity
**Example:**
```typescript
// Source: Prisma docs + best practices
async applyCorrection(albumId: string, preview: CorrectionPreview, selections: FieldSelections) {
  // 1. PRE-FETCH: All reads happen OUTSIDE transaction
  const currentAlbum = await prisma.album.findUnique({
    where: { id: albumId },
    include: { tracks: true, artists: true }
  });
  
  // 2. PREPARE: Build update payloads outside transaction
  const updates = this.buildUpdatePayloads(currentAlbum, preview, selections);
  
  // 3. TRANSACTION: Only writes, no complex logic
  const result = await prisma.$transaction(async (tx) => {
    // Optimistic locking check
    const current = await tx.album.findUnique({ where: { id: albumId } });
    if (current.updatedAt > expectedUpdatedAt) {
      throw new StaleDataError('Album was modified by another user');
    }
    
    // Fast writes only
    await tx.album.update({ where: { id: albumId }, data: updates.album });
    await tx.albumArtist.deleteMany({ where: { albumId } });
    await tx.albumArtist.createMany({ data: updates.artists });
    await tx.track.deleteMany({ where: { albumId, id: { notIn: updates.tracksToKeep } } });
    // ... more writes
    
    return updatedAlbum;
  }, {
    timeout: 10000, // 10s for safety
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable
  });
  
  return result;
}
```

### Pattern 2: Optimistic Locking via Timestamp Validation

**What:** Use `updatedAt` timestamp to detect concurrent modifications
**When to use:** Prevent lost updates in multi-admin scenarios
**Example:**
```typescript
// Source: Concurrency Control in Node.js and Prisma article
interface ApplyInput {
  albumId: string;
  expectedUpdatedAt: Date; // From preview
  changes: Changes;
}

async applyWithOptimisticLock(input: ApplyInput) {
  return await prisma.$transaction(async (tx) => {
    // Check if record was modified since preview was generated
    const current = await tx.album.findUnique({ 
      where: { id: input.albumId },
      select: { updatedAt: true }
    });
    
    if (current.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
      throw new Error('STALE_DATA: Album was modified. Refresh and retry.');
    }
    
    // Proceed with update (updatedAt auto-updates via Prisma)
    return await tx.album.update({
      where: { id: input.albumId },
      data: input.changes
    });
  });
}
```

### Pattern 3: Selective Field Updates with Dynamic Data Object

**What:** Build Prisma update data object conditionally based on field selection
**When to use:** Admin chooses which fields to update (partial apply)
**Example:**
```typescript
// Source: Prisma type safety docs + community patterns
function buildAlbumUpdateData(
  preview: CorrectionPreview, 
  selections: FieldSelections
): Prisma.AlbumUpdateInput {
  const data: Prisma.AlbumUpdateInput = {};
  
  // Only include selected fields (undefined = not updated)
  if (selections.metadata.title) {
    data.title = preview.sourceResult.title;
  }
  if (selections.metadata.releaseDate) {
    data.releaseDate = parseDate(preview.sourceResult.firstReleaseDate);
  }
  if (selections.externalIds.musicbrainzId) {
    data.musicbrainzId = preview.sourceResult.releaseGroupMbid;
  }
  // ... more fields
  
  // Always update timestamps and data quality
  data.dataQuality = calculateDataQuality(data);
  data.lastEnriched = new Date();
  
  return data;
}
```

### Pattern 4: Track Matching Strategy

**What:** Match tracks by position first, fall back to title similarity for reordered tracklists
**When to use:** Merging MusicBrainz tracks with existing database tracks
**Example:**
```typescript
// Source: Music track matching research + fastest-levenshtein
import { distance } from 'fastest-levenshtein';

interface TrackMatch {
  dbTrack: Track | null;
  mbTrack: MBRecording;
  matchType: 'POSITION' | 'TITLE_SIMILARITY' | 'NEW';
  confidence: number; // 0-1
}

function matchTracks(
  dbTracks: Track[], 
  mbTracks: MBRecording[]
): TrackMatch[] {
  const matches: TrackMatch[] = [];
  const usedDbTracks = new Set<string>();
  
  for (const mbTrack of mbTracks) {
    // 1. Try position match first (disc + track number)
    const positionMatch = dbTracks.find(
      t => t.discNumber === mbTrack.discNumber && 
           t.trackNumber === mbTrack.position &&
           !usedDbTracks.has(t.id)
    );
    
    if (positionMatch) {
      usedDbTracks.add(positionMatch.id);
      matches.push({
        dbTrack: positionMatch,
        mbTrack,
        matchType: 'POSITION',
        confidence: 1.0
      });
      continue;
    }
    
    // 2. Fall back to title similarity (Levenshtein distance)
    const similarityMatches = dbTracks
      .filter(t => !usedDbTracks.has(t.id))
      .map(t => ({
        track: t,
        similarity: 1 - (distance(t.title.toLowerCase(), mbTrack.title.toLowerCase()) / 
                    Math.max(t.title.length, mbTrack.title.length))
      }))
      .filter(m => m.similarity > 0.8); // 80% similarity threshold
    
    if (similarityMatches.length > 0) {
      const best = similarityMatches.sort((a, b) => b.similarity - a.similarity)[0];
      usedDbTracks.add(best.track.id);
      matches.push({
        dbTrack: best.track,
        mbTrack,
        matchType: 'TITLE_SIMILARITY',
        confidence: best.similarity
      });
      continue;
    }
    
    // 3. No match - this is a new track
    matches.push({
      dbTrack: null,
      mbTrack,
      matchType: 'NEW',
      confidence: 1.0
    });
  }
  
  return matches;
}
```

### Pattern 5: Audit Logging with Delta Capture

**What:** Log only changed fields with before/after values to enrichment_logs
**When to use:** Admin corrections requiring full audit trail
**Example:**
```typescript
// Source: @sourceloop/audit-log pattern + existing enrichment_logs schema
interface FieldDelta {
  field: string;
  before: unknown;
  after: unknown;
}

interface AuditLogPayload {
  metadata: FieldDelta[];
  tracks: Array<{ action: 'added' | 'modified' | 'removed'; delta: FieldDelta[] }>;
  artists: Array<{ action: 'added' | 'removed'; artistName: string }>;
  externalIds: FieldDelta[];
  coverArt: FieldDelta[];
}

async function logCorrection(
  albumId: string,
  userId: string,
  before: Album,
  after: Album,
  trackChanges: TrackMatch[]
) {
  const deltas: AuditLogPayload = {
    metadata: [],
    tracks: [],
    artists: [],
    externalIds: [],
    coverArt: []
  };
  
  // Capture only changed fields
  if (before.title !== after.title) {
    deltas.metadata.push({ field: 'title', before: before.title, after: after.title });
  }
  if (before.releaseDate?.getTime() !== after.releaseDate?.getTime()) {
    deltas.metadata.push({ 
      field: 'releaseDate', 
      before: before.releaseDate, 
      after: after.releaseDate 
    });
  }
  // ... more fields
  
  // Track changes (detailed)
  for (const match of trackChanges) {
    if (match.matchType === 'NEW') {
      deltas.tracks.push({
        action: 'added',
        delta: [{ field: 'title', before: null, after: match.mbTrack.title }]
      });
    }
    // ... handle modified/removed
  }
  
  // Write to enrichment_logs table
  await prisma.enrichmentLog.create({
    data: {
      entityType: 'ALBUM',
      albumId,
      userId,
      operation: 'admin_correction',
      status: 'SUCCESS',
      sources: ['musicbrainz'],
      fieldsEnriched: Object.keys(deltas).filter(k => deltas[k].length > 0),
      metadata: deltas, // JSON structure
      triggeredBy: 'admin_ui'
    }
  });
}
```

### Anti-Patterns to Avoid

- **Opening transaction before data fetch:** Transactions should contain only writes, not reads or API calls
- **Using `undefined` for required fields:** Selective updates need explicit field checks, not ternaries with undefined
- **Ignoring optimistic locking:** Concurrent admins can create lost updates without timestamp validation
- **Logging full snapshots:** Audit logs should contain deltas (changed fields only), not entire objects
- **Manual transaction control:** Prisma doesn't support `$begin/$commit/$rollback`, use callback pattern
- **Long-running transactions:** Keep under 5s (default timeout), configure up to 10s max for safety

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| String similarity | Custom edit distance | `fastest-levenshtein` | Optimized C-level implementation, handles Unicode correctly |
| Transaction rollback | Manual try/catch rollback | Prisma auto-rollback on error | Automatic, reliable, handles nested failures |
| Track matching | Exact title match only | Position-first + similarity fallback | Handles reordered tracks, typos, remasters |
| Data quality scoring | Binary (has data / no data) | Weighted field completeness + source confidence | Nuanced scores enable better enrichment decisions |
| Concurrent updates | No locking strategy | Optimistic locking with `updatedAt` | Prevents lost updates, better than pessimistic locks for read-heavy workloads |

**Key insight:** Interactive transactions are deceptively complex. Naïve implementations (reads inside transaction, no timeout config, missing error handling) lead to deadlocks and performance issues. Prisma's automatic rollback is safer than manual control.

## Common Pitfalls

### Pitfall 1: Transaction Timeout Exceeded

**What goes wrong:** `Transaction timeout exceeded` error after 5 seconds
**Why it happens:** Default timeout is 5s, fetching related data or complex logic inside transaction exceeds limit
**How to avoid:** 
- Fetch ALL data BEFORE opening transaction
- Configure timeout: `$transaction(async (tx) => {...}, { timeout: 10000 })`
- Keep transaction code to writes only, no business logic
**Warning signs:** Logs show `PrismaClientKnownRequestError: Transaction already closed`

### Pitfall 2: Stale Transaction Client Reference

**What goes wrong:** Using global `prisma` client inside transaction instead of `tx` parameter
**Why it happens:** Developers forget to use transaction-scoped client, leading to queries outside transaction
**How to avoid:** 
- Always use `tx` parameter passed to transaction callback
- Lint rule: Disallow `prisma` usage inside `$transaction` callback
- Pass `tx` to helper functions instead of global `prisma`
**Warning signs:** Updates not atomic, partial changes visible before commit

### Pitfall 3: Lost Updates from Concurrent Modifications

**What goes wrong:** Two admins apply corrections simultaneously, second overwrites first's changes
**Why it happens:** No optimistic locking, album.updatedAt not validated
**How to avoid:**
- Capture `album.updatedAt` in preview generation
- Validate `updatedAt` matches at start of transaction
- Return error `STALE_DATA` if mismatch, force admin to refresh
**Warning signs:** Admins report changes disappearing, enrichment_logs show conflicting corrections

### Pitfall 4: Orphaned Artist Records

**What goes wrong:** Artist records created but not linked to album when transaction rolls back
**Why it happens:** Artist creation happens outside transaction scope
**How to avoid:**
- Create new artists INSIDE transaction using `tx.artist.create()`
- Use `connectOrCreate` for existing artists
- Delete orphaned artists in cleanup job (separate concern)
**Warning signs:** Artists table grows with unlinked records

### Pitfall 5: Incomplete Audit Logs

**What goes wrong:** Audit log missing track changes or only logs "corrected album"
**Why it happens:** Logging called before transaction commit, or logs only top-level fields
**How to avoid:**
- Log AFTER transaction succeeds (in finally block or separate call)
- Capture detailed deltas: metadata, tracks, artists, external IDs, cover art
- Test audit log completeness in integration tests
**Warning signs:** enrichment_logs.metadata contains `{}` or missing fieldsEnriched

### Pitfall 6: Data Quality Not Recalculated

**What goes wrong:** Album data quality remains LOW after correction
**Why it happens:** Forgot to update `dataQuality` field in transaction
**How to avoid:**
- Always call `calculateDataQuality()` on updated data
- Include `dataQuality` in album update payload
- Log before/after quality in enrichment_logs
**Warning signs:** Corrected albums still flagged for enrichment

## Code Examples

Verified patterns from official sources:

### Transaction Configuration (High Timeout for Admin Operations)

```typescript
// Source: Prisma transaction docs
await prisma.$transaction(async (tx) => {
  // Admin correction operations
}, {
  maxWait: 5000,      // Wait up to 5s to acquire connection
  timeout: 10000,     // Transaction can run up to 10s (admin UI workflow)
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable // Strictest isolation
});
```

### Error Handling with Rollback

```typescript
// Source: Prisma error handling docs
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

try {
  await prisma.$transaction(async (tx) => {
    // Operations that might fail
  });
} catch (error) {
  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2034') {
      throw new Error('TRANSACTION_CONFLICT: Write conflict detected, retry');
    }
    if (error.code === 'P2025') {
      throw new Error('RECORD_NOT_FOUND: Album may have been deleted');
    }
  }
  // All changes automatically rolled back
  throw error;
}
```

### Conditional Field Updates (Partial Apply)

```typescript
// Source: Prisma CRUD docs + type utilities
function buildUpdateData(
  preview: CorrectionPreview,
  selections: FieldSelections
): Prisma.AlbumUpdateInput {
  const data: Prisma.AlbumUpdateInput = {};
  
  // Metadata group
  if (selections.metadata.title) data.title = preview.sourceResult.title;
  if (selections.metadata.releaseType) data.releaseType = preview.sourceResult.primaryType;
  if (selections.metadata.releaseDate) {
    data.releaseDate = preview.sourceResult.firstReleaseDate 
      ? new Date(preview.sourceResult.firstReleaseDate) 
      : null;
  }
  
  // External IDs group
  if (selections.externalIds.musicbrainzId) {
    data.musicbrainzId = preview.sourceResult.releaseGroupMbid;
  }
  if (selections.externalIds.spotifyId && preview.mbReleaseData?.spotifyId) {
    data.spotifyId = preview.mbReleaseData.spotifyId;
  }
  
  // Cover art (three-way choice: use MB, keep current, clear)
  if (selections.coverArt === 'use_source') {
    data.coverArtUrl = preview.sourceResult.coverArtUrl;
  } else if (selections.coverArt === 'clear') {
    data.coverArtUrl = null;
    data.cloudflareImageId = null;
  }
  // 'keep_current' = don't include in data object
  
  return data;
}
```

### Track Deletion (Delete Orphans)

```typescript
// Source: Prisma relation queries docs
async function deleteOrphanedTracks(
  tx: Prisma.TransactionClient,
  albumId: string,
  tracksToKeep: string[] // Track IDs to preserve
) {
  // Delete tracks that exist in DB but not in MB result
  await tx.track.deleteMany({
    where: {
      albumId,
      id: { notIn: tracksToKeep } // Prisma filter: not in array
    }
  });
}
```

### Artist Association (Link/Unlink Only, Don't Update Artist Records)

```typescript
// Source: Prisma many-to-many relations pattern
async function updateAlbumArtists(
  tx: Prisma.TransactionClient,
  albumId: string,
  artistCredits: CorrectionArtistCredit[]
) {
  // 1. Clear existing associations
  await tx.albumArtist.deleteMany({ where: { albumId } });
  
  // 2. Create or link artists, then associate
  for (let i = 0; i < artistCredits.length; i++) {
    const credit = artistCredits[i];
    
    // Find or create artist (by MBID)
    const artist = await tx.artist.upsert({
      where: { musicbrainzId: credit.mbid },
      update: {}, // Don't update artist fields (Phase 11 concern)
      create: {
        musicbrainzId: credit.mbid,
        name: credit.name,
        dataQuality: 'LOW' // Will be enriched separately
      }
    });
    
    // 3. Create association
    await tx.albumArtist.create({
      data: {
        albumId,
        artistId: artist.id,
        role: 'primary',
        position: i
      }
    });
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|---------|
| Sequential array transactions | Interactive transactions | Prisma 4.7.0+ (2022) | Enables conditional logic, complex workflows |
| Manual rollback with try/catch | Automatic rollback on exception | Prisma core feature | Safer, less error-prone |
| Global prisma client | Transaction-scoped `tx` client | Prisma 2.0+ | Ensures operations are truly atomic |
| Pessimistic row locks | Optimistic locking (timestamp) | Community best practice (2023+) | Better scalability for read-heavy workloads |
| fastest-levenshtein | Superseded js-levenshtein | 2020+ | 1.5-2x faster, better TypeScript support |

**Deprecated/outdated:**
- Manual `BEGIN/COMMIT/ROLLBACK` via raw SQL: Prisma doesn't support this, use interactive transactions instead
- `Prisma.validator()` for type inference: Superseded by generated types from Prisma 4.0+
- `extendedWhereUnique` preview flag: Graduated to stable in Prisma 5.0.0, no longer needs flag

## Open Questions

Things that couldn't be fully resolved:

1. **Data Quality Score Calculation Algorithm**
   - What we know: Current system uses simple match score > 0.9 = HIGH, else MEDIUM
   - What's unclear: Should admin corrections always result in HIGH quality? Or weighted by fields corrected?
   - Recommendation: Start with HIGH for admin corrections (admin-verified = highest confidence), add weighted calculation in Phase 10 if needed

2. **Artist Record Updates vs Associations**
   - What we know: Context decisions say "link/unlink only, don't update artist records"
   - What's unclear: What if artist name in MB differs from DB (e.g., typo fix)?
   - Recommendation: Phase 4 only manages associations, Phase 11 handles artist corrections. Log mismatch as enrichment_logs metadata for future cleanup.

3. **Track Matching Similarity Threshold**
   - What we know: 80% similarity is common in string matching
   - What's unclear: Is 80% right for music tracks? "Intro" vs "Intro (Live)" = 70% similarity
   - Recommendation: Start with 0.8, expose as config constant, monitor false positives/negatives in testing

4. **Concurrent Correction Conflict Resolution**
   - What we know: First admin wins, second gets STALE_DATA error
   - What's unclear: Should we merge changes or force full refresh?
   - Recommendation: Force refresh (fail second correction), merging is complex and error-prone. Admin can review and reapply.

## Sources

### Primary (HIGH confidence)

- [Prisma Transactions and Batch Queries Documentation](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) - Interactive transactions, timeout configuration, error handling
- [Prisma Blog: How Prisma Supports Transactions](https://www.prisma.io/blog/how-prisma-supports-transactions-x45s1d5l0ww1) - Best practices, ACID guarantees
- [Concurrency Control in Node.js and Prisma](https://gokulmahe.medium.com/concurrency-control-in-node-js-and-prisma-managing-simultaneous-updates-56b9f17859e5) - Optimistic locking patterns with updatedAt
- [fastest-levenshtein GitHub](https://github.com/ka-weihe/fastest-levenshtein) - String similarity implementation
- [Levenshtein Distance - Wikipedia](https://en.wikipedia.org/wiki/Levenshtein_distance) - Algorithm fundamentals

### Secondary (MEDIUM confidence)

- [Interactive Transactions in Prisma: A Developer's Guide](https://dev.to/ashukr22/interactive-transactions-in-prisma-a-developers-guide-4mg6) - Community patterns
- [Mastering Database Rollbacks with Prisma](https://medium.com/@moiserushanika2006/mastering-database-rollbacks-with-prismas-transactional-finesse-9156b8319bb1) - Error handling patterns
- [Data Quality Score Calculation - Microsoft Purview](https://learn.microsoft.com/en-us/purview/how-to-view-data-quality-scan-results) - Industry approaches to quality scoring
- [@sourceloop/audit-log npm package](https://www.npmjs.com/package/@sourceloop/audit-log) - Before/after state tracking pattern

### Tertiary (LOW confidence)

- Community discussions on Prisma transaction timeout issues (GitHub issues #22309, #15376)
- Music similarity research papers (referenced for track matching theory, not implementation)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Prisma is the established choice, fastest-levenshtein is proven
- Architecture: HIGH - Patterns verified against Prisma official docs and production codebases
- Pitfalls: HIGH - Documented in Prisma issues and community articles
- Track matching: MEDIUM - Algorithm is sound, but threshold (0.8) needs empirical validation
- Data quality calculation: MEDIUM - Simple approach verified, weighted calculation deferred

**Research date:** 2026-01-24
**Valid until:** 2026-02-28 (30 days - Prisma is stable, patterns unlikely to change)
