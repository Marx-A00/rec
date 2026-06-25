# Logging System

This project uses [Pino](https://getpino.io/) for structured, production-ready logging with automatic correlation ID tracking, rotating log files, and optional [Axiom](https://axiom.co) integration for cloud log aggregation.

## How It Works

Logs flow through three channels simultaneously:

1. **Console** — Pretty-printed in dev (via `pino-pretty`), JSON to stdout in prod (for Railway / log drains)
2. **Rotating files** — Always written to `logs/` directory. Daily rotation, 10 MB max, keeps 7 files.
3. **Axiom** (optional) — When `AXIOM_DATASET` + `AXIOM_TOKEN` are set, logs stream to Axiom for structured search.

```
Request → GraphQL Route → runWithCorrelationId()
                              ↓
                         AsyncLocalStorage stores correlation context
                              ↓
                         Pino transport targets (parallel):
                           → Console (pretty / JSON)
                           → pino-roll → logs/app.2026-06-25
                           → @axiomhq/pino → Axiom cloud
```

## Quick Start

```bash
# Standard dev — pretty console output + log files written automatically
pnpm dev

# Raw JSON output (for piping to jq, gonzo, etc.)
pnpm dev:json
```

Log files are always written to `logs/` regardless of which dev script you use.

## Viewing Logs

### In the terminal (live)

Logs are pretty-printed by default in dev. Formatting is configured in `.pino-prettyrc`.

### From log files

```bash
# Tail the latest log file with pretty formatting
tail -f logs/app.* | pnpm exec pino-pretty

# Interactive TUI viewer (install: brew install gonzo)
cat logs/app.* | gonzo

# Interactive JSON navigator (install: brew install jnv)
cat logs/app.* | jnv
```

### Filtering with jq

```bash
# Errors only
cat logs/app.* | jq 'select(.level == "ERROR")'

# GraphQL module only
cat logs/app.* | jq 'select(.module == "graphql")'

# Specific correlation ID
cat logs/app.* | jq 'select(.correlationId == "abc-123")'

# Compact summary view
cat logs/app.* | jq -r '[.time, .level, .module, .msg] | @tsv'
```

### In Axiom (production)

Once configured, use Axiom's query UI:

- `correlationId == "abc-123"` — trace a full request
- `module == "graphql" AND level == "ERROR"` — find GraphQL errors
- `userId == "user_xyz"` — all activity for a user
- Time-range scoping is built into the UI

## Using the Logger

### Import

```typescript
import { graphqlLogger } from '@/lib/logger';
// Also: mbLogger, searchLogger, queueLogger, apiLogger
```

### Log Messages

```typescript
// Info with structured data
graphqlLogger.info(
  { userId: '123', duration: 250 },
  'User authentication completed'
);

// Warning
graphqlLogger.warn(
  { artistName: 'Unknown', reason: 'No Spotify match' },
  'Could not enrich artist data'
);

// Error
graphqlLogger.error(
  { error: err.message, stack: err.stack, operation: 'fetchAlbums' },
  'Failed to fetch albums'
);

// Debug (dev only by default)
graphqlLogger.debug(
  { query: 'The Beatles', resultCount: 42 },
  'Search completed'
);
```

### Correlation IDs

Automatically included in all logs within API routes — no manual setup needed:

```json
{
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "requestPath": "/api/graphql",
  "userId": "user_123",
  "module": "graphql",
  "msg": "Processing request"
}
```

## Configuration

### Environment Variables

```bash
# .env.local
LOG_LEVEL=debug      # debug | info | warn | error (dev default: debug, prod default: info)

# Axiom (optional — enables cloud log aggregation)
AXIOM_DATASET=rec-logs
AXIOM_TOKEN=xaat-your-api-token
```

### Log Files

Files are written to `logs/` with daily rotation:

- `logs/app.2026-06-25` — today's logs
- `logs/app.2026-06-24` — yesterday's logs
- Up to 7 files kept, rotates at 10 MB within a day

### Pretty Print Config

Customize dev console output in `.pino-prettyrc`:

```json
{
  "translateTime": "SYS:HH:MM:ss",
  "ignore": "pid,hostname",
  "colorize": true,
  "messageFormat": "{module} » {msg}"
}
```

## Architecture

### Files

- **`src/lib/logger.ts`** — Logger config, multi-target transport, module loggers
- **`src/lib/correlation-context.ts`** — AsyncLocalStorage for correlation IDs
- **`src/app/api/graphql/route.ts`** — Sets up correlation context for GraphQL requests
- **`.pino-prettyrc`** — Pretty-print formatting config
- **`logs/`** — Rotating log files (gitignored)

### Next.js Bundler Compatibility

Pino transports use worker threads, which Next.js bundler can't trace. This is solved via `serverExternalPackages` in `next.config.ts`:

```ts
serverExternalPackages: ['pino', 'pino-pretty', 'pino-roll', 'thread-stream']
```

### Setting Up Axiom

1. Sign up at [axiom.co](https://axiom.co) (free: 500 GB/month, 30-day retention)
2. Create a dataset (e.g., `rec-logs`)
3. Create an API token with ingest permissions
4. Add to `.env.local`:
   ```
   AXIOM_DATASET=rec-logs
   AXIOM_TOKEN=xaat-your-token
   ```
5. Restart the dev server — logs will start flowing to Axiom immediately
