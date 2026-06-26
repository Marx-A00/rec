# PRD: Comprehensive Structured Logging

## Problem

The app has a solid logging foundation (Pino + Axiom multistream, correlation context, module loggers) but it's barely used. Out of the entire codebase, **only the GraphQL route** uses structured logging. Everything else — auth, REST APIs, middleware, queue workers, external API calls, search, cache — uses raw `console.log/warn/error` with no structure, no correlation IDs, and no Axiom visibility.

This means:
- Production incidents are hard to debug (no request tracing across boundaries)
- External API failures are invisible until users report them
- Auth issues have no audit trail
- Queue job failures are only visible in Bull Board, not in Axiom
- Cache effectiveness is unmeasured
- User action patterns are opaque

## Current State

**What exists and works:**
- Pino logger with 3-stream output (console, local files, Axiom)
- Correlation context via AsyncLocalStorage (correlationId, requestPath, userId)
- 5 module loggers defined: `graphqlLogger`, `mbLogger`, `searchLogger`, `queueLogger`, `apiLogger`
- LlamaLog table for enrichment/correction audit trails
- Activity table for domain events (collection_add, recommendation, follow)

**What's broken:**
- Only `graphqlLogger` is actually used (in `/api/graphql/route.ts`)
- `mbLogger`, `searchLogger`, `queueLogger`, `apiLogger` — all defined, never imported anywhere
- Auth callbacks use `console.log()` — no structure, no correlation
- 43 REST API routes — all use `console.log/error` or nothing at all
- Middleware (rate limiting, CORS, mobile redirect) — `console.log/warn`
- Queue worker + all processors — `chalk`-colored `console.log`
- All 6 external API integrations — `console.log/error`
- Search orchestrator — `chalk`-decorated `console.log`
- Cache layer — `console.log` on errors only, no hit/miss tracking in logs
- All 4 schedulers — `console.log` with emoji prefixes

## Goals

1. **Replace all `console.log/warn/error` with structured Pino loggers** — every log line gets JSON structure, module context, and automatic correlation metadata
2. **Wire correlation context into middleware** — so every request gets a correlationId that flows through the entire call chain
3. **Add logging to blind spots** — auth events, external API calls, cache operations, queue lifecycle, user actions
4. **Ship to Axiom** — all structured logs automatically flow to Axiom via the existing multistream setup, enabling dashboards and alerts

## Non-Goals

- Changing the logging infrastructure itself (Pino + Axiom stream is solid)
- Adding application-level metrics/APM (separate initiative)
- Prisma query logging (too noisy, separate concern)
- Client-side logging/error tracking

---

## Implementation Plan

### Phase 1: Foundation — Middleware & Correlation Context

**Why first**: Everything downstream benefits from correlation IDs being set up at the request boundary.

#### 1.1 Create `middlewareLogger`

Add to `src/lib/logger.ts`:

```typescript
export const middlewareLogger = logger.child({ module: 'middleware' });
export const authLogger = logger.child({ module: 'auth' });
export const cacheLogger = logger.child({ module: 'cache' });
export const schedulerLogger = logger.child({ module: 'scheduler' });
export const enrichmentLogger = logger.child({ module: 'enrichment' });
```

#### 1.2 Wire correlation context into middleware

`src/middleware.ts` runs on every request but doesn't set up correlation context. The GraphQL route does this manually — we need it at the middleware level for REST routes too.

**Challenge**: Next.js Edge middleware can't use AsyncLocalStorage. Correlation context setup must happen in route handlers or a shared utility.

**Approach**: Create a `withCorrelation()` wrapper for REST API route handlers:

```typescript
// src/lib/api-utils.ts
export function withCorrelation(handler: NextRouteHandler): NextRouteHandler {
  return (req, ctx) => {
    return runWithCorrelationId(req, async () => {
      return handler(req, ctx);
    });
  };
}
```

REST routes wrap their handlers:
```typescript
export const GET = withCorrelation(async (req) => { ... });
```

#### 1.3 Replace middleware console logs

Replace all `console.log/warn/error` in `src/middleware.ts` with `middlewareLogger`:

**What to log:**
- Rate limit triggers: `middlewareLogger.warn({ key, bucket, usage }, 'Rate limit approaching')`
- Rate limit blocks: `middlewareLogger.warn({ key, ip }, 'Rate limited')`
- CORS rejections: `middlewareLogger.warn({ origin, path }, 'CORS rejected')`
- Mobile redirects: `middlewareLogger.debug({ path, device }, 'Mobile redirect')`

**Files**: `src/middleware.ts`

---

### Phase 2: Auth Events

**Why**: Auth is the highest-value blind spot. Failed logins, account linking issues, and session problems are currently invisible.

#### 2.1 Replace console logs in auth callbacks

`auth.ts` has ~15 `console.log/error` calls. Replace all with `authLogger`.

**What to log:**

Sign-in events:
- `authLogger.info({ provider, userId }, 'Sign-in successful')`
- `authLogger.warn({ provider, email }, 'Sign-in blocked: soft-deleted user')`
- `authLogger.info({ provider, userId }, 'OAuth account linked')`
- `authLogger.warn({ provider, error }, 'Sign-in failed')`

Session events:
- `authLogger.debug({ userId }, 'Session refreshed')`
- `authLogger.warn({ userId }, 'Session invalid: user not found')`

User creation:
- `authLogger.info({ userId, provider }, 'New user created via OAuth')`

#### 2.2 Auth API routes

Replace console logs in:
- `src/app/api/auth/register/route.ts` — registration attempts, validation failures, success
- `src/app/api/auth/forgot-password/route.ts` — reset requested (no PII), email send failures
- `src/app/api/auth/reset-password/route.ts` — reset completed, token invalid
- `src/app/api/auth/dev-login/route.ts` — dev login attempts

**Files**: `auth.ts`, `src/app/api/auth/**/*.ts`

---

### Phase 3: REST API Routes

**Why**: 43 routes with inconsistent or no logging. These are user-facing endpoints.

#### 3.1 Create a shared API logging pattern

Every REST route handler should log:
- Request received (debug level): method, path, userId if authed
- Response sent (info level): status, duration
- Errors (error level): error message, stack, context

The `withCorrelation()` wrapper from Phase 1 can be extended to handle request/response logging automatically:

```typescript
export function withApiLogging(handler: NextRouteHandler): NextRouteHandler {
  return withCorrelation(async (req, ctx) => {
    const start = performance.now();
    try {
      const res = await handler(req, ctx);
      apiLogger.info({
        method: req.method,
        path: new URL(req.url).pathname,
        status: res.status,
        duration: Math.round(performance.now() - start),
      }, 'API request completed');
      return res;
    } catch (err) {
      apiLogger.error({
        method: req.method,
        path: new URL(req.url).pathname,
        error: err instanceof Error ? err.message : String(err),
        duration: Math.round(performance.now() - start),
      }, 'API request failed');
      throw err;
    }
  });
}
```

#### 3.2 Adopt in all REST routes

Wrap all route handlers with `withApiLogging()`. Priority order:

**High priority** (user-facing, auth-required):
- `src/app/api/albums/[id]/add-to-collection/route.ts`
- `src/app/api/albums/[id]/cache-cover/route.ts`
- `src/app/api/users/[id]/route.ts` (PUT)
- `src/app/api/images/upload/route.ts`
- `src/app/api/collections/[collectionId]/reorder/route.ts`

**Medium priority** (public reads):
- `src/app/api/search/route.ts`
- `src/app/api/search/suggest/route.ts`
- `src/app/api/albums/[id]/route.ts`
- `src/app/api/artists/[id]/route.ts`

**Lower priority** (admin):
- `src/app/api/admin/**/*.ts` — all admin routes

#### 3.3 Remove emoji/chalk console logging

`src/app/api/albums/[id]/route.ts` has emoji-based logging. `src/app/api/search/route.ts` uses chalk. Replace with structured `apiLogger` calls.

**Files**: All files under `src/app/api/` (excluding `graphql/`)

---

### Phase 4: Queue & Worker System

**Why**: Background jobs are the hardest to debug. When enrichment fails silently at 3am, you need logs.

#### 4.1 Replace worker event logging

`src/workers/queue-worker.ts` uses chalk-colored console output for job lifecycle events. Replace with `queueLogger`:

- `queueLogger.info({ jobId, jobType, data }, 'Job started')`
- `queueLogger.info({ jobId, jobType, duration, result }, 'Job completed')`
- `queueLogger.error({ jobId, jobType, error, attempts }, 'Job failed')`
- `queueLogger.warn({ jobId }, 'Job stalled')`
- `queueLogger.info('Worker ready')`
- `queueLogger.info('Worker shutting down')`

#### 4.2 Replace processor logging

`src/lib/queue/processors/index.ts` has chalk-decorated success/failure logs. Replace with `queueLogger`:

- Job routing: `queueLogger.debug({ jobType }, 'Routing job to processor')`
- Success: `queueLogger.info({ jobType, duration }, 'Processor completed')`
- Failure: `queueLogger.error({ jobType, error, retryable }, 'Processor failed')`

Individual processors to update:
- `musicbrainz-processor.ts` — MBID redirect warnings
- `enrichment-processor.ts` — enrichment decisions
- `cache-processor.ts` — cache operations
- `discogs-processor.ts` — Discogs fetch results
- `deezer-processor.ts` — playlist import progress
- `deezer-editorial-processor.ts` — editorial sync results
- `listenbrainz-processor.ts` — fresh releases sync
- `lastfm-cache-processor.ts` — Last.fm cache operations
- `lastfm-sync.ts` — user sync progress
- `similar-artists-processor.ts` — similar artist results
- `image-fetch-processor.ts` — image fetch results
- `uncover-processor.ts` — daily challenge creation

#### 4.3 Scheduler logging

Replace `console.log` in all 4 schedulers with `schedulerLogger`:

- `src/lib/musicbrainz/new-releases-scheduler.ts`
- `src/lib/spotify/scheduler.ts` (if exists)
- `src/lib/listenbrainz/scheduler.ts`
- `src/lib/deezer/editorial-sync/scheduler.ts`
- `src/lib/lastfm/sync-scheduler.ts`

Log: schedule created/removed, sync started/completed, config changes, errors.

**Files**: `src/workers/queue-worker.ts`, `src/lib/queue/processors/**/*.ts`, all scheduler files

---

### Phase 5: External API Integrations

**Why**: When MusicBrainz rate-limits you or Spotify tokens expire, you need to know immediately — not when a user reports "search is broken."

#### 5.1 MusicBrainz

`src/lib/musicbrainz/error-handler.ts` tracks metrics internally but logs to console with chalk. Replace with `mbLogger`:

- `mbLogger.info({ endpoint, duration, query }, 'MusicBrainz request completed')`
- `mbLogger.warn({ endpoint, status, retryAfter }, 'MusicBrainz rate limited')`
- `mbLogger.error({ endpoint, error, consecutiveFailures }, 'MusicBrainz request failed')`
- `mbLogger.warn({ consecutiveFailures }, 'MusicBrainz service degraded')`

**Files**: `src/lib/musicbrainz/error-handler.ts`, `src/lib/musicbrainz/musicbrainz-service.ts`, `src/lib/musicbrainz/basic-service.ts`

#### 5.2 Spotify

Replace `console.error/warn` in error handling and mappers:

- `apiLogger.info({ endpoint, duration }, 'Spotify request completed')` (or create `spotifyLogger`)
- `apiLogger.warn({ status, retryAttempt }, 'Spotify request retrying')`
- `apiLogger.error({ endpoint, error }, 'Spotify request failed')`
- `apiLogger.warn('Spotify token refresh failed')`

**Files**: `src/lib/spotify/client.ts`, `src/lib/spotify/error-handling.ts`, `src/lib/spotify/mappers.ts`

#### 5.3 ListenBrainz

Replace `console.log/error/warn` with `mbLogger` (or new `listenbrainzLogger`):

- API call results, similar artist counts, error responses

**Files**: `src/lib/listenbrainz/api.ts`

#### 5.4 Deezer

Replace console calls in editorial sync and playlist import:

**Files**: `src/lib/deezer/editorial-sync/api.ts`, `src/lib/deezer/playlist-import.ts`

#### 5.5 Discogs

Replace chalk console output:

**Files**: `src/lib/discogs/queued-service.ts`

#### 5.6 Last.fm

Replace console calls in client and sync:

**Files**: `src/lib/lastfm/lastfm-client.ts`, `src/lib/lastfm/lastfm-base.ts`

---

### Phase 6: Search & Cache

#### 6.1 Search Orchestrator

`src/lib/search/SearchOrchestrator.ts` has elaborate chalk-decorated box logs. Replace with `searchLogger`:

- `searchLogger.info({ query, types, sources, limit }, 'Search started')`
- `searchLogger.info({ query, resultCount, duration, sources }, 'Search completed')`
- `searchLogger.debug({ source, resultCount }, 'Source results received')`
- `searchLogger.warn({ query }, 'Zero results')`

#### 6.2 Cache Operations

`src/lib/cache/redis-cache.ts` has console error logs. Replace with `cacheLogger`:

- `cacheLogger.debug({ key, hit: true }, 'Cache hit')`
- `cacheLogger.debug({ key, hit: false }, 'Cache miss')`
- `cacheLogger.debug({ key, ttl }, 'Cache set')`
- `cacheLogger.debug({ pattern, count }, 'Cache invalidated')`
- `cacheLogger.error({ key, error }, 'Cache error')`

**Note**: Cache hit/miss logs should be `debug` level — only visible in dev or when `LOG_LEVEL=debug`. In prod these would be too noisy at `info`.

**Files**: `src/lib/search/SearchOrchestrator.ts`, `src/lib/cache/redis-cache.ts`

---

### Phase 7: User Action Gaps

These are gaps in the existing LlamaLog/Activity tracking:

#### 7.1 Missing operation logs

Add structured logging for operations that currently have no trail:

- **Recommendation deleted**: `graphqlLogger.info({ recommendationId, userId }, 'Recommendation deleted')`
- **Recommendation updated**: `graphqlLogger.info({ recommendationId, score, userId }, 'Recommendation score updated')`
- **User unfollowed**: `graphqlLogger.info({ userId, targetUserId }, 'User unfollowed')`
- **Collection removed**: `graphqlLogger.info({ collectionId, albumId, userId }, 'Album removed from collection')`
- **Profile updated**: `graphqlLogger.info({ userId, fields }, 'Profile updated')`

#### 7.2 Enrichment decisions

`src/lib/musicbrainz/enrichment-logic.ts` makes decisions about whether to enrich. Log the "why not":

- `enrichmentLogger.debug({ albumId, reason: 'cooldown' }, 'Enrichment skipped')`
- `enrichmentLogger.debug({ albumId, reason: 'already_high_quality' }, 'Enrichment skipped')`
- `enrichmentLogger.info({ albumId, source }, 'Enrichment triggered')`

**Files**: `src/lib/graphql/resolvers/mutations.ts`, `src/lib/musicbrainz/enrichment-logic.ts`

---

## Rollout Strategy

**Phase 1-2** (Foundation + Auth): Do first — highest value, lowest risk. Auth logging is critical for security. Correlation context enables everything else.

**Phase 3** (REST APIs): Mechanical but important. The `withApiLogging` wrapper makes this mostly a find-and-replace exercise.

**Phase 4** (Queue/Worker): High value for production debugging. The worker runs as a separate process so this can be done independently.

**Phase 5** (External APIs): Medium effort, high value. When an external service goes down, you'll know immediately from Axiom instead of guessing.

**Phase 6** (Search + Cache): Lower priority but useful for performance optimization.

**Phase 7** (User action gaps): Smallest changes, fills in the remaining blind spots.

---

## Testing Strategy

Each phase has a two-step verification: **local dev check** (immediate feedback) and **Axiom query** (prove it's flowing end-to-end). We have Axiom MCP access, so verification queries can be run directly during development.

### General Approach

Two roles in the testing loop — Claude handles automated verification, the developer handles visual/interactive checks.

**Claude (automated):**
1. Run `pnpm type-check` after changes to catch import/type errors
2. Grep local log files (`logs/app.YYYY-MM-DD.log`) to verify JSON structure after the dev server has been triggered
3. Query Axiom MCP against `rec-logs-dev` to confirm logs landed with the expected fields

**Developer (manual):**
1. Keep `pnpm dev` running with `AXIOM_DATASET=rec-logs-dev` and `AXIOM_TOKEN` set
2. Trigger the action — hit the endpoint, run the flow, cause the error
3. Eyeball the pino-pretty console output to confirm structured logs show module, level, and message formatting
4. Tell Claude to run the Axiom verification query for that phase

### Axiom Verification Queries Per Phase

**Phase 1 — Middleware & Correlation Context:**
```apl
['rec-logs-dev']
| where module == "middleware"
| where _time > ago(15m)
| project _time, level, msg, correlationId
| take 20
```
- Trigger: Hit any page or API route
- Pass criteria: Logs appear with `module: "middleware"` and a `correlationId`
- Bonus: Trigger a rate limit (hit `/api/search` 31 times in a minute) and confirm a WARN-level log appears

**Phase 2 — Auth Events:**
```apl
['rec-logs-dev']
| where module == "auth"
| where _time > ago(15m)
| project _time, level, msg, userId
| take 20
```
- Trigger: Sign in with Google/Spotify/credentials, sign out, attempt a bad password, request a password reset
- Pass criteria: Each auth action produces a log line. Failed attempts show WARN level. Successful logins show INFO.
- Negative test: Confirm no PII (email, password) appears in any log field:
```apl
['rec-logs-dev']
| where module == "auth"
| where msg has "@" or msg has "password"
| where _time > ago(1h)
| take 5
```
Should return zero results.

**Phase 3 — REST API Routes:**
```apl
['rec-logs-dev']
| where module == "api"
| where _time > ago(15m)
| summarize count() by msg, status
```
- Trigger: Hit several REST endpoints (search, album detail, user profile, image upload)
- Pass criteria: Every request shows "API request completed" with status and duration
- Error test: Hit a nonexistent album ID, confirm an error-level log with the error message
- Duration test: Confirm `duration` field is a reasonable number (not null, not negative)

**Phase 4 — Queue & Worker:**
```apl
['rec-logs-dev']
| where module == "queue" or module == "scheduler"
| where _time > ago(30m)
| project _time, level, msg, jobId, jobType, duration
| take 30
```
- Trigger: Add an album to a collection (triggers enrichment jobs), or manually add a test job via `pnpm queue:add`
- Pass criteria: Job started, job completed, and job failed (if applicable) all appear with jobId and jobType
- Scheduler test: Start/stop a scheduler from the worker dashboard, confirm logs appear

**Phase 5 — External APIs:**
```apl
['rec-logs-dev']
| where module in ("musicbrainz", "api")
| where msg has "request"
| where _time > ago(15m)
| project _time, level, msg, endpoint, duration, status
| take 20
```
- Trigger: Search for an artist (fires MusicBrainz + Spotify calls), view an album detail page (may trigger enrichment)
- Pass criteria: Each external API call produces a log with endpoint, duration, and status
- Error test: Temporarily set an invalid Spotify token or MusicBrainz URL, confirm ERROR logs appear with the error details
- Rate limit test: If MusicBrainz returns 503, confirm WARN log with `retryAfter` field

**Phase 6 — Search & Cache:**
```apl
['rec-logs-dev']
| where module == "search"
| where _time > ago(15m)
| project _time, msg, query, resultCount, duration
| take 10
```
- Trigger: Run a few searches from the UI
- Pass criteria: "Search started" and "Search completed" logs with query, result count, duration
- Zero results test: Search for gibberish, confirm a WARN log for zero results
- Cache verification (dev only — debug level):
```apl
['rec-logs-dev']
| where module == "cache"
| where _time > ago(15m)
| summarize hits=countif(msg == "Cache hit"), misses=countif(msg == "Cache miss")
```
Search the same thing twice — first should be a miss, second a hit.

**Phase 7 — User Action Gaps:**
```apl
['rec-logs-dev']
| where module == "graphql"
| where msg has_cs "deleted" or msg has_cs "updated" or msg has_cs "unfollowed" or msg has_cs "removed"
| where _time > ago(30m)
| project _time, level, msg, userId
| take 20
```
- Trigger: Delete a recommendation, update a score, unfollow a user, remove an album from a collection
- Pass criteria: Each destructive/update action produces a log line with the relevant IDs

### Regression Check — Console.log Sweep

After all phases, run a final grep to confirm no `console.log/warn/error` remain in source:

```bash
rg "console\.(log|warn|error)" src/lib/ src/app/api/ --type ts \
  --glob '!**/axiom-stream.ts' \
  --glob '!**/node_modules/**' \
  -c
```

Target: **zero matches** (excluding `axiom-stream.ts` stderr fallback).

### Axiom Dashboard Smoke Test

After full rollout, verify Axiom can answer these questions with simple queries:

- "What errors happened in the last hour?"
  ```apl
  ['rec-logs-dev'] | where level == "ERROR" | where _time > ago(1h) | summarize count() by module, msg
  ```

- "How many requests per module in the last 24h?"
  ```apl
  ['rec-logs-dev'] | where _time > ago(24h) | summarize count() by module | sort by count_ desc
  ```

- "What's the p95 duration for GraphQL requests?"
  ```apl
  ['rec-logs-dev'] | where module == "graphql" | where _time > ago(24h) | summarize p95=percentile(duration, 95)
  ```

- "Show me a single request's full journey (correlation trace):"
  ```apl
  ['rec-logs-dev'] | where correlationId == "<paste-id-here>" | sort by _time asc
  ```

---

## What NOT to Log

- **PII**: Never log email addresses, passwords, tokens, or session data. Log user IDs only.
- **Request/response bodies**: Too large, potential PII. Log summary metadata only.
- **Health check hits**: `/api/health/*` at debug level only, or skip entirely.
- **Every cache get/set in prod**: Use debug level so these only appear when investigating.
- **Prisma SQL queries**: Too noisy, use Prisma's own tooling for query debugging.

## Success Criteria

- Zero `console.log/warn/error` calls remain in `src/lib/` and `src/app/api/` (outside of the Axiom stream's stderr fallback)
- Every request to the app generates at least one structured log line with a correlationId
- Auth events (login, registration, password reset) visible in Axiom
- External API failures trigger warn/error level logs visible in Axiom
- Queue job lifecycle (start, complete, fail) visible in Axiom
- Axiom dashboards can answer: "What failed in the last hour and why?"
