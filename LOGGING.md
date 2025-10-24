# Logging System

This project uses [Pino](https://getpino.io/) for structured, production-ready logging with automatic correlation ID tracking.

## Features

- **Structured JSON Logging**: All logs are in JSON format for easy parsing and searching
- **Correlation IDs**: Every request gets a unique `x-correlation-id` that flows through all logs
- **Module-specific Loggers**: Separate loggers for GraphQL, MusicBrainz, Search, Queue, and API
- **Automatic Context**: Correlation IDs, request paths, and user IDs are automatically included in logs

## Quick Start

### Development (Default)

```bash
# Standard dev mode - JSON logs to console
pnpm dev
```

### Development (Pretty Logs)

```bash
# Human-readable colored logs
pnpm dev:pretty
```

Output:
```
14:23:45.123 INFO (graphql): Successfully matched artist with Spotify
  correlationId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  context: "spotify_enrich"
  artistName: "The Beatles"
```

### Development (File Logging)

```bash
# Write all logs to logs/app.log
pnpm dev:logs

# Then in another terminal, tail the logs
tail -f logs/app.log
```

### Production

```bash
# Start with logs to files
pnpm start:logs
```

This writes:
- All logs → `logs/app.log`
- Error logs → `logs/error.log`

## Using the Logger

### Import the Logger

```typescript
import { graphqlLogger } from '@/lib/logger';
// Or: mbLogger, searchLogger, queueLogger, apiLogger
```

### Log Messages

```typescript
// Info level
graphqlLogger.info('User logged in successfully');

// With structured data
graphqlLogger.info({
  userId: '123',
  email: 'user@example.com',
  duration: 250
}, 'User authentication completed');

// Warning
graphqlLogger.warn({
  artistName: 'Unknown Artist',
  reason: 'No Spotify match found'
}, 'Could not enrich artist data');

// Error
graphqlLogger.error({
  error: err.message,
  stack: err.stack,
  operation: 'fetchAlbums'
}, 'Failed to fetch albums');

// Debug (only in development by default)
graphqlLogger.debug({
  query: 'The Beatles',
  resultCount: 42
}, 'Search completed');
```

### Correlation IDs

Correlation IDs are **automatically** included in all logs within API routes:

```typescript
// In any GraphQL resolver or API route
graphqlLogger.info('Processing request');

// Output includes:
// {
//   "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
//   "requestPath": "/api/graphql",
//   "msg": "Processing request"
// }
```

## Searching Logs

### Search by Correlation ID

```bash
# Find all logs for a specific request
grep "a1b2c3d4-e5f6-7890-abcd-ef1234567890" logs/app.log

# Pretty print the results
grep "a1b2c3d4-e5f6-7890-abcd-ef1234567890" logs/app.log | pnpm exec pino-pretty
```

### Search by Module

```bash
# All GraphQL logs
grep '"module":"graphql"' logs/app.log

# All MusicBrainz logs
grep '"module":"musicbrainz"' logs/app.log
```

### Search by Error Level

```bash
# All errors
grep '"level":"ERROR"' logs/app.log

# All warnings
grep '"level":"WARN"' logs/app.log
```

### Search by Context

```bash
# All Spotify enrichment logs
grep '"context":"spotify_enrich"' logs/app.log

# All track search logs
grep '"context":"track_search"' logs/app.log
```

## Log Levels

Set via `LOG_LEVEL` environment variable:

```bash
# .env.local
LOG_LEVEL=debug  # Show everything (development default)
LOG_LEVEL=info   # Standard logs (production default)
LOG_LEVEL=warn   # Warnings and errors only
LOG_LEVEL=error  # Errors only
```

Or per-command:

```bash
LOG_LEVEL=debug pnpm dev
```

## Architecture

```
Request → GraphQL Route → runWithCorrelationId()
                              ↓
                         AsyncLocalStorage stores correlation context
                              ↓
                         All loggers access context via mixin
                              ↓
                         Logs include correlation ID automatically
```

### Files

- **`src/lib/logger.ts`** - Logger configuration and module loggers
- **`src/lib/correlation-context.ts`** - AsyncLocalStorage for correlation IDs
- **`src/app/api/graphql/route.ts`** - Sets up correlation context for GraphQL requests
- **`logs/`** - Log files (gitignored)

## Best Practices

### ✅ Do

- Use structured data objects for searchable information
- Include relevant context (IDs, names, counts)
- Use appropriate log levels (debug for verbose, info for normal, warn for issues, error for failures)
- Log important business events (user actions, external API calls, errors)

```typescript
graphqlLogger.info({
  userId: user.id,
  albumId: album.id,
  action: 'added_to_collection'
}, 'User added album to collection');
```

### ❌ Don't

- Log sensitive data (passwords, tokens, full credit cards)
- Log in tight loops without throttling
- Use console.log (use the logger instead)
- Include huge objects (just log IDs and relevant fields)

```typescript
// Bad
console.log('User:', user);

// Good
graphqlLogger.debug({
  userId: user.id,
  email: user.email
}, 'Processing user request');
```

## Correlation ID Flow Example

```
1. Client makes GraphQL request
   GET /api/graphql

2. GraphQL route handler generates correlation ID
   correlationId: "a1b2c3d4-..."

3. All logs during that request include it:
   → graphqlLogger.info('Fetching user data')
     {"correlationId":"a1b2c3d4-...","msg":"Fetching user data"}

   → mbLogger.info('Calling MusicBrainz API')
     {"correlationId":"a1b2c3d4-...","msg":"Calling MusicBrainz API"}

   → searchLogger.info('Search completed')
     {"correlationId":"a1b2c3d4-...","msg":"Search completed"}

4. Response includes correlation ID header
   x-correlation-id: a1b2c3d4-...

5. You can trace the entire request flow by searching for that ID
   grep "a1b2c3d4" logs/app.log
```

## Troubleshooting

### Logs not showing up?

- Check `LOG_LEVEL` - might be set too high (try `LOG_LEVEL=debug`)
- In production, make sure you're using `pnpm start:logs` or redirecting output

### No correlation IDs?

- Correlation IDs only work in API routes (not in client-side code)
- Make sure you're using the logger inside the `runWithCorrelationId` context

### Want to see pretty logs?

```bash
# Pipe through pino-pretty
pnpm dev:pretty

# Or manually
node server.js | pnpm exec pino-pretty
```

## Production Recommendations

1. **Use a log aggregation service** (Datadog, Logtail, Papertrail, etc.)
2. **Set up log rotation** to prevent disk space issues
3. **Monitor error logs** for alerts
4. **Keep logs for 30-90 days** for debugging and compliance
5. **Search by correlation ID** to trace user issues

Example with PM2 (production):
```bash
pm2 start npm --name "rec" -- start:logs
pm2 logs rec --lines 100
```
