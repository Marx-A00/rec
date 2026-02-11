---
phase: 32-query-provenance
plan: 01
subsystem: graphql-api
tags: [graphql, pagination, provenance]

dependency-graph:
  requires:
    - phase-29 (rootJobId column and provenance tracking)
  provides:
    - llamaLogChain query for entity provenance
    - LlamaLogChainResponse type with pagination
    - useGetLlamaLogChainQuery hook
  affects:
    - phase-32-02 (UI will consume this query)

tech-stack:
  added: []
  patterns:
    - cursor-based pagination with take+1
    - entity validation with GraphQL error
    - typed ID field queries for index usage

key-files:
  created:
    - src/graphql/queries/llamaLogChain.graphql
  modified:
    - src/graphql/schema.graphql
    - src/lib/graphql/resolvers/queries.ts
    - src/generated/graphql.ts
    - src/generated/resolvers-types.ts

decisions: []

metrics:
  duration: 3m 51s
  completed: 2026-02-10
---

# Phase 32 Plan 01: llamaLogChain Query Summary

**One-liner:** GraphQL query for entity provenance chain with cursor pagination, category filtering, and date range filtering.

## What Was Built

Implemented `llamaLogChain` GraphQL query that returns the complete lifecycle history for any entity (Album, Artist, Track) - answering "How did this entity get into the database, and what happened to it afterward?"

**Query capabilities:**
- Entity lookup by type (ALBUM, ARTIST, TRACK) and ID
- Optional category filtering (CREATED, ENRICHED, CORRECTED, CACHED, FAILED)
- Optional date range filtering (startDate, endDate)
- Cursor-based pagination with configurable limit (default: 20)
- Reverse chronological order (newest first)
- Entity validation with NOT_FOUND error for invalid IDs

**Schema additions:**
- `rootJobId` field on LlamaLog type (exposes existing DB column)
- `LlamaLogChainResponse` type with logs, totalCount, cursor, hasMore
- `llamaLogChain` query with all filter parameters

**Resolver patterns:**
- Validates entity exists before querying logs
- Uses typed ID fields (albumId/artistId/trackId) for better index usage
- Falls back to generic entityId for pre-Phase 29 historical data
- Parallel count query with Promise.all for totalCount
- Stable sort with createdAt + id to prevent pagination issues

## Key Implementation Details

**Why OR clause for entity matching:**
```typescript
// Use OR to match both typed ID field and generic entityId (for historical data)
const baseWhere = {
  OR: [
    { [typedIdField]: entityId },  // New: uses albumId/artistId/trackId
    { entityId: entityId, entityType },  // Legacy: pre-Phase 29 data
  ],
};
```

**Why take+1 pattern:**
```typescript
take: limit + 1,  // Fetch one extra to determine hasMore
// ...
const hasMore = logs.length > limit;
const items = hasMore ? logs.slice(0, -1) : logs;
```

**Why children: null mapping:**
LlamaLog type has optional `children` field for tree display. Chain query returns flat list, so we explicitly set `children: null` to satisfy type requirements.

## Commit Log

- `4e9743b`: feat(32-01): add llamaLogChain query schema
- `a98a6fd`: feat(32-01): implement llamaLogChain resolver
- `0639f52`: feat(32-01): add client query and regenerate types

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- Type check: PASS
- Prisma validate: PASS
- Schema grep (llamaLogChain): FOUND
- Resolver grep (llamaLogChain:): FOUND
- Generated types grep (LlamaLogChainResponse): FOUND
- Generated hook grep (useGetLlamaLogChainQuery): FOUND

## Next Phase Readiness

**For Phase 32-02 (if applicable):**
- Query is ready to be consumed by UI components
- Hook `useGetLlamaLogChainQuery` available for React components
- Pagination cursor returned for infinite scroll implementation
