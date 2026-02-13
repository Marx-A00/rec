# Phase 1: Foundation & Infrastructure - Research

**Researched:** 2026-01-23
**Domain:** BullMQ job priority, MusicBrainz API stability, queue infrastructure
**Confidence:** HIGH

## Summary

This research investigates how to implement admin API request prioritization and MBID redirect verification for the existing BullMQ-based MusicBrainz integration. The codebase already has a solid foundation with `queue-service.ts`, `musicbrainz-queue.ts`, and job processing infrastructure. The primary modifications needed are: (1) introducing priority levels to distinguish admin/interactive jobs from background jobs, and (2) adding MBID verification to detect when MusicBrainz returns a different (redirected) MBID than requested.

The existing implementation uses BullMQ's `limiter` configuration with `max: 1, duration: 1000` for 1 request/second rate limiting. Priority support is already partially implemented (jobs use `priority: 1` for user requests), but there's no differentiation between admin-initiated and background operations. MBID verification is completely absent from the current lookup handlers.

**Primary recommendation:** Add explicit priority tiers (ADMIN=1, USER=5, BACKGROUND=10) and wrap all MBID lookup handlers with a verification function that compares requested MBID to returned MBID.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)

**BullMQ**

- Version: Already in project (check package.json for exact version)
- Purpose: Job queue with rate limiting and priority support
- Why Standard: Built-in priority queuing, rate limiter, Redis-backed persistence

**musicbrainz-api**

- Version: ^0.25.1 (currently installed)
- Purpose: MusicBrainz API client with TypeScript support
- Why Standard: Official community library, built-in rate limiting, type definitions

### Supporting (Already Available)

**ioredis**

- Version: ^5.3.0 (currently installed)
- Purpose: Redis client for BullMQ
- Why Standard: Required by BullMQ, already configured in project

### No New Dependencies Required

The existing stack fully supports the required features. No new packages needed.

## Architecture Patterns

### Recommended Changes to Existing Structure

```
src/lib/queue/
├── jobs.ts              # ADD: Priority tier constants
├── musicbrainz-queue.ts # MODIFY: Use priority tiers in addJob
└── processors/
    └── musicbrainz-processor.ts  # MODIFY: Add MBID verification wrapper

src/lib/musicbrainz/
├── queue-service.ts     # MODIFY: Accept priority parameter in public methods
├── mbid-verifier.ts     # NEW: MBID verification utility
└── types.ts             # NEW (optional): Verification result types
```

### Pattern 1: Priority Tier Constants

**What:** Define explicit priority tiers as constants instead of magic numbers
**When to use:** All job additions to the queue
**Example:**

```typescript
// Source: BullMQ official docs - https://docs.bullmq.io/guide/jobs/prioritized
// In jobs.ts

export const PRIORITY_TIERS = {
  ADMIN: 1, // Admin UI searches - highest priority
  USER: 5, // User-initiated requests (search, recommendations)
  ENRICHMENT: 8, // Enrichment triggered by user actions
  BACKGROUND: 10, // Scheduled syncs, background enrichment
} as const;

export type PriorityTier = (typeof PRIORITY_TIERS)[keyof typeof PRIORITY_TIERS];
```

### Pattern 2: MBID Verification Wrapper

**What:** Wrap lookup results to detect when returned MBID differs from requested
**When to use:** All MBID lookup operations (artist, release, release-group, recording)
**Example:**

```typescript
// Source: MusicBrainz behavior - https://eve.gd/2025/10/09/using-a-public-api-or-the-instability-of-musicbrainz-ids/

interface MbidVerificationResult<T> {
  data: T;
  requestedMbid: string;
  returnedMbid: string;
  wasRedirected: boolean;
}

function verifyMbid<T extends { id: string }>(
  requestedMbid: string,
  result: T
): MbidVerificationResult<T> {
  return {
    data: result,
    requestedMbid,
    returnedMbid: result.id,
    wasRedirected: requestedMbid !== result.id,
  };
}
```

### Pattern 3: Priority-Aware Job Addition

**What:** Modify addJob calls to accept semantic priority tiers
**When to use:** Queue service public methods
**Example:**

```typescript
// In queue-service.ts

async searchArtists(
  query: string,
  limit = 25,
  offset = 0,
  priorityTier: PriorityTier = PRIORITY_TIERS.USER
): Promise<ArtistSearchResult[]> {
  // ...existing code...
  const job = await this.queue.addJob(
    JOB_TYPES.MUSICBRAINZ_SEARCH_ARTISTS,
    { query, limit, offset },
    {
      priority: priorityTier,  // Use tier instead of hardcoded 1
      requestId: `search-artists-${Date.now()}`,
    }
  );
  // ...
}
```

### Anti-Patterns to Avoid

- **Magic priority numbers scattered throughout code:** Always use PRIORITY_TIERS constants
- **Ignoring MBID mismatches:** Never silently accept a different MBID than requested without logging/flagging
- **Blocking on verification:** Verification should be synchronous comparison, not additional API calls
- **Priority 0 for admin jobs:** BullMQ treats jobs without priority as highest priority; use explicit tier instead

## Don't Hand-Roll

Problems that look simple but have existing solutions:

**Priority Queuing**

- Don't Build: Custom priority queue logic
- Use Instead: BullMQ's built-in `priority` option
- Why: BullMQ uses optimized O(log n) insertion, handles race conditions, persists to Redis

**Rate Limiting**

- Don't Build: setInterval-based throttling
- Use Instead: BullMQ's `limiter: { max: 1, duration: 1000 }`
- Why: Handles concurrent workers, persists state, respects limits across restarts

**Job Result Waiting**

- Don't Build: Polling with job.getState()
- Use Instead: QueueEvents listener pattern (already implemented in queue-service.ts)
- Why: Event-driven, no polling overhead, proper cleanup

**Key insight:** The existing infrastructure already handles rate limiting and job completion waiting correctly. The phase work is about adding semantic priority tiers and MBID verification, not reimplementing queue mechanics.

## Common Pitfalls

### Pitfall 1: Priority Inversion with Background Jobs

**What goes wrong:** Background sync jobs (priority 10) get starved when admin queues many searches
**Why it happens:** Admin sessions can queue 50+ jobs quickly; at 1 req/sec, background jobs wait 50+ seconds
**How to avoid:** Implement a maximum admin queue depth or interleave priorities
**Warning signs:** Background enrichment jobs showing >60 second wait times in Bull Board

### Pitfall 2: Silent MBID Changes Breaking Local Data

**What goes wrong:** Stored MBID no longer matches MusicBrainz canonical MBID after merge
**Why it happens:** MusicBrainz merges entities; API returns new canonical MBID transparently
**How to avoid:** Always verify returned MBID matches requested; log/flag discrepancies
**Warning signs:** Album/artist pages showing wrong data; enrichment fetching wrong entity

### Pitfall 3: Not Handling 503 Rate Limit Errors

**What goes wrong:** Bursts exceed rate limit; 503 errors cascade
**Why it happens:** BullMQ rate limiter doesn't account for external rate limit violations
**How to avoid:** Existing retry with exponential backoff (already configured) handles this
**Warning signs:** Consecutive 503 errors in logs; jobs failing after 3 retries

### Pitfall 4: QueueEvents Memory Leak

**What goes wrong:** Pending job promises accumulate if events aren't properly cleaned up
**Why it happens:** Jobs complete but promise map not cleared on shutdown
**How to avoid:** Already handled in queue-service.ts shutdown() - verify cleanup on restart
**Warning signs:** Growing pendingJobs Map size; memory growth in long-running workers

## Code Examples

Verified patterns from official sources:

### BullMQ Priority Configuration

```typescript
// Source: https://docs.bullmq.io/guide/jobs/prioritized

// Priority range: 1 to 2,097,152 (lower = higher priority)
// Jobs WITHOUT priority get processed BEFORE jobs with priority

await myQueue.add('job', data, { priority: 1 }); // Highest assignable
await myQueue.add('job', data, { priority: 5 }); // Medium
await myQueue.add('job', data, { priority: 10 }); // Lower

// Jobs with same priority: FIFO order
// Complexity: O(log n) for insertion
```

### Changing Job Priority After Creation

```typescript
// Source: https://docs.bullmq.io/guide/jobs/prioritized

const job = await Job.create(queue, 'test', { foo: 'bar' }, { priority: 16 });
await job.changePriority({ priority: 1 }); // Upgrade priority

// Also supports LIFO within same priority:
await job.changePriority({ lifo: true });
```

### MBID Verification Pattern

```typescript
// Source: Derived from MusicBrainz API behavior
// https://eve.gd/2025/10/09/using-a-public-api-or-the-instability-of-musicbrainz-ids/

async function lookupWithVerification(
  mbid: string,
  lookupFn: (id: string) => Promise<{ id: string; [key: string]: unknown }>
) {
  const result = await lookupFn(mbid);

  if (result.id !== mbid) {
    console.warn(`MBID redirect detected: ${mbid} -> ${result.id}`);
    // Optionally: queue database update job
    // Optionally: add to redirect tracking table
  }

  return {
    ...result,
    _mbidRedirect: result.id !== mbid ? { from: mbid, to: result.id } : null,
  };
}
```

### Rate Limiter Configuration (Already Implemented)

```typescript
// Source: Existing musicbrainz-queue.ts - verified correct
// Matches MusicBrainz requirement: https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting

this.worker = new Worker(this.queueName, processor, {
  connection: redisConnection,
  limiter: {
    max: 1, // 1 request
    duration: 1000, // per 1000ms
  },
  concurrency: 1, // Single job at a time
});
```

## State of the Art

**Current Approach (Already Correct)**

- BullMQ rate limiter: 1 req/sec enforced at worker level
- Priority support: Available but using magic number `1` everywhere
- Job retry: Exponential backoff with 3 attempts
- QueueEvents: Proper async job result waiting

**New Approach (This Phase)**

- Priority tiers: Semantic constants (ADMIN, USER, ENRICHMENT, BACKGROUND)
- MBID verification: Compare requested vs returned, flag redirects
- Admin prioritization: Admin jobs get priority 1, background gets 10

**Deprecated/Outdated**

- `job.finished()` polling: Use QueueEvents instead (already done)
- Manual rate limiting with delays: Use BullMQ limiter (already done)

## Open Questions

1. **Database MBID Update Strategy**
   - What we know: API returns canonical MBID when redirect occurs
   - What's unclear: Should we auto-update database MBIDs or just flag for review?
   - Recommendation: Log warnings initially; defer auto-update to Phase 2

2. **Admin Queue Depth Limits**
   - What we know: Admin can queue many jobs quickly, starving background
   - What's unclear: Acceptable max queue depth before warning user?
   - Recommendation: Start with 50 job limit; add UI warning at 30

3. **Priority for Enrichment Jobs**
   - What we know: Current enrichment uses priority 5 (same as user)
   - What's unclear: Should admin-triggered enrichment be priority 1 or 5?
   - Recommendation: Use ENRICHMENT tier (8) for all enrichment, regardless of source

## Sources

### Primary (HIGH confidence)

- BullMQ Priority Documentation: https://docs.bullmq.io/guide/jobs/prioritized
  - Priority range, FIFO behavior, changePriority API
- MusicBrainz Rate Limiting: https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting
  - 1 request/second requirement, 503 error handling
- Existing Codebase: `/src/lib/queue/musicbrainz-queue.ts`, `/src/lib/musicbrainz/queue-service.ts`
  - Current implementation patterns, already working rate limiting

### Secondary (MEDIUM confidence)

- MusicBrainz MBID Instability: https://eve.gd/2025/10/09/using-a-public-api-or-the-instability-of-musicbrainz-ids/
  - Real-world experience with MBID redirects, verification pattern
- MusicBrainz Identifier Docs: https://musicbrainz.org/doc/MusicBrainz_Identifier
  - Official statement on MBID merges and redirects

### Tertiary (LOW confidence)

- None - all findings verified with primary sources

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Using existing libraries, no changes needed
- Architecture: HIGH - Simple additions to existing patterns
- Pitfalls: HIGH - Well-documented in MusicBrainz community and BullMQ docs

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - stable domain, no major version changes expected)
