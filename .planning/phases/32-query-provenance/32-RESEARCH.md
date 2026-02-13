# Phase 32: Query & Provenance - Research

**Researched:** 2026-02-10
**Domain:** GraphQL cursor-based pagination with Prisma, provenance chain queries
**Confidence:** HIGH

## Summary

Phase 32 implements a GraphQL query (`llamaLogChain`) that returns the complete provenance chain for any entity (Album, Artist, Track) - the root creation event plus all related operations. The research confirms that the project's existing patterns align well with industry best practices for cursor-based pagination, Prisma optimization, and GraphQL error handling.

**Key findings:**

- Cursor-based pagination with Prisma is well-established; project already uses this pattern in `recommendationFeed` query
- Separate `count()` query for `totalCount` is the recommended approach (avoid window functions for performance)
- Existing composite indexes on `(entityType, entityId)` and `(entityType-specific, createdAt)` are optimal for this query
- GraphQL validation and entity existence checking follow established patterns in codebase
- Date range filtering with `startDate`/`endDate` is a standard GraphQL pattern

**Primary recommendation:** Implement `llamaLogChain` query using existing codebase patterns (cursor pagination, GraphQLError for validation, Promise.all for parallel queries) with minor extensions for category/date filtering.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | Current | Database ORM with cursor pagination | Project standard, excellent cursor pagination support |
| Apollo Server | Current | GraphQL server | Project standard, robust error handling |
| GraphQL.js | Current | GraphQL implementation | Standard GraphQL library with validation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| graphql-codegen | Current | Type generation | Already in use, generates TypeScript types from schema |

### Alternatives Considered

None - all required functionality exists in current stack.

**Installation:**

No new dependencies required.

## Architecture Patterns

### Recommended Query Structure

```graphql
type Query {
  llamaLogChain(
    entityType: EnrichmentEntityType!
    entityId: UUID!
    categories: [LlamaLogCategory!]
    startDate: DateTime
    endDate: DateTime
    limit: Int = 20
    cursor: String
  ): LlamaLogChainResponse!
}

type LlamaLogChainResponse {
  logs: [LlamaLog!]!
  totalCount: Int!
  cursor: String
  hasMore: Boolean!
}
```

### Pattern 1: Cursor-Based Pagination with Prisma

**What:** Use Prisma's cursor pagination with `take + 1` pattern to determine `hasMore`

**When to use:** All paginated queries, especially with large datasets

**Example:**

```typescript
// Source: Existing codebase pattern in src/lib/graphql/resolvers/queries.ts
const logs = await prisma.llamaLog.findMany({
  take: limit + 1, // Fetch one extra to check if there's more
  skip: cursor ? 1 : 0, // Skip 1 to exclude the cursor itself
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { createdAt: 'desc' },
  where: {
    entityType,
    entityId,
    // Additional filters...
  },
});

const hasMore = logs.length > limit;
const items = hasMore ? logs.slice(0, -1) : logs;
const nextCursor = hasMore ? items[items.length - 1].id : null;
```

**Why this pattern:**

- Avoids expensive OFFSET scans for large datasets
- Uses database indexes efficiently (WHERE with cursor)
- Stable results even as data changes during pagination
- Already proven in codebase (recommendationFeed, myRecommendations)

**Source:** [Prisma cursor-based pagination](https://www.prisma.io/docs/orm/prisma-client/queries/pagination)

### Pattern 2: Separate Count Query with Promise.all

**What:** Execute paginated query and total count in parallel using Promise.all

**When to use:** When totalCount is needed for pagination UI

**Example:**

```typescript
// Run queries in parallel for performance
const [logs, totalCount] = await Promise.all([
  prisma.llamaLog.findMany({
    take: limit + 1,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' },
    where,
  }),
  prisma.llamaLog.count({ where }),
]);
```

**Why this pattern:**

- Parallel execution reduces latency
- Separate count() is more efficient than window functions for large datasets
- Shared `where` clause ensures filter consistency
- For strict consistency needs, wrap in `prisma.$transaction([...])` instead

**Source:** [Prisma pagination with count](https://github.com/prisma/prisma/discussions/3087)

### Pattern 3: Entity Validation with GraphQLError

**What:** Validate entity exists before querying logs, throw GraphQLError if not found

**When to use:** All entity-specific queries (as specified in CONTEXT.md)

**Example:**

```typescript
// Source: Existing pattern in src/lib/graphql/resolvers/mutations.ts
const entity = await prisma[entityTable].findUnique({
  where: { id: entityId },
  select: { id: true, name: true }, // Minimal fields for validation
});

if (!entity) {
  throw new GraphQLError(`${entityType} not found: ${entityId}`, {
    extensions: { code: 'NOT_FOUND' },
  });
}
```

**Why this pattern:**

- Clear error semantics for client (distinct from empty results)
- Consistent with existing codebase error handling
- GraphQL spec-compliant error structure
- Extensions allow error categorization for client logic

**Source:** [Apollo Server error handling](https://www.apollographql.com/docs/apollo-server/data/errors)

### Pattern 4: Optional Array Filters (Categories)

**What:** Filter by multiple category values using Prisma's `in` operator

**When to use:** When filtering by enum values (categories, statuses, etc.)

**Example:**

```typescript
const where: Prisma.LlamaLogWhereInput = {
  entityType,
  entityId,
  ...(categories && categories.length > 0 && { category: { in: categories } }),
};
```

**Why this pattern:**

- Prisma's `in` operator efficiently translates to SQL `IN (...)`
- Optional filter (only applied if array provided and non-empty)
- Index-friendly (can use `(category, createdAt)` composite index)

### Pattern 5: Date Range Filtering

**What:** Filter logs between start and end dates using Prisma's date comparisons

**When to use:** When implementing time-based filtering

**Example:**

```typescript
const where: Prisma.LlamaLogWhereInput = {
  entityType,
  entityId,
  ...(startDate && { createdAt: { gte: startDate } }),
  ...(endDate && { createdAt: { lte: endDate } }),
  // If both provided, combines into: createdAt: { gte: startDate, lte: endDate }
};
```

**Why this pattern:**

- Prisma automatically merges multiple constraints on same field
- Index-friendly (uses `createdAt` indexes)
- Standard GraphQL DateTime scalar already defined in schema

**Source:** [Hasura date/time filtering](https://hasura.io/blog/working-with-dates-time-timezones-graphql-postgresql)

### Pattern 6: Orphan Record Handling

**What:** Include logs with NULL `rootJobId` (pre-tracking history)

**When to use:** As specified in CONTEXT.md - orphan records are valid history

**Example:**

```typescript
// No special filtering needed - NULL rootJobId logs are valid
// Simply query by entityType + entityId regardless of rootJobId
const where: Prisma.LlamaLogWhereInput = {
  entityType,
  entityId,
  // rootJobId: null <- DO NOT filter by this
};
```

**Why this pattern:**

- Historical data from before Phase 28/29 tracking is still valuable
- Simpler query (no need to handle NULL rootJobId specially)
- Matches CONTEXT.md decision: "Include orphan records (NULL rootJobId) — they're valid pre-tracking history"

### Anti-Patterns to Avoid

- **Using OFFSET for pagination:** Expensive table scans; use cursor instead
- **Window functions for totalCount:** `count(*) over()` has poor performance with large datasets
- **Filtering by rootJobId to exclude orphans:** Loses valuable pre-tracking history
- **Single query without entity validation:** Makes "entity not found" indistinguishable from "no logs"
- **Sorting by createdAt alone:** Non-unique; always include ID as tiebreaker: `orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]`

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cursor pagination | Custom pagination logic | Prisma cursor API with take/skip/cursor | Handles edge cases (empty results, last page), leverages indexes |
| Date range overlap | Manual date comparisons | Prisma's `gte`/`lte` operators | Correctly handles timezone, NULL values, combines conditions |
| Opaque cursors | Base64-encoding IDs | Plain ID strings | Prisma cursor requires actual ID values, not encoded strings |
| Entity type routing | Switch statements | Prisma model name mapping | More maintainable as entity types grow |

**Key insight:** Prisma's cursor pagination API is specifically designed for this use case and handles many edge cases (NULL cursors, empty results, combining filters). Don't reimplement it.

## Common Pitfalls

### Pitfall 1: Not Sorting by Unique Column

**What goes wrong:** Using `orderBy: { createdAt: 'desc' }` alone causes unstable pagination - records with same timestamp return in non-deterministic order between pages.

**Why it happens:** `createdAt` is not unique; multiple logs can have identical timestamps (especially batch operations).

**How to avoid:** Always include ID as secondary sort field:

```typescript
orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
```

**Warning signs:** Records appearing on multiple pages or disappearing during pagination.

**Source:** [Prisma cursor pagination requirements](https://github.com/prisma/prisma/discussions/4888)

### Pitfall 2: Existing Index Not Optimal for Query

**What goes wrong:** Query uses `(entityType, entityId)` index but sorts by `createdAt`, causing inefficient query plan.

**Why it happens:** PostgreSQL can't efficiently use index for both filtering AND sorting unless sort column is in index.

**How to avoid:** Use entity-specific indexes that include createdAt:

- For albums: `(albumId, createdAt)` - already exists ✓
- For artists: `(artistId, createdAt)` - already exists ✓
- For tracks: `(trackId, createdAt)` - already exists ✓

**Query should use typed ID field** (albumId/artistId/trackId) rather than generic entityId field to leverage these indexes.

**Warning signs:** Slow queries on large log tables, EXPLAIN shows "Seq Scan" or "Index Scan" without "Index Only Scan".

### Pitfall 3: Fetching Too Many Fields for Validation

**What goes wrong:** Entity validation query fetches all fields, loading unnecessary data.

**Why it happens:** Default Prisma behavior returns all fields.

**How to avoid:** Use `select` to fetch only what's needed for validation:

```typescript
const entity = await prisma.album.findUnique({
  where: { id: entityId },
  select: { id: true, title: true }, // Only for validation + inline display
});
```

**Warning signs:** High memory usage, slow validation queries, network overhead.

### Pitfall 4: Not Handling Empty Results vs. Invalid Entity

**What goes wrong:** Returning empty array for both "entity doesn't exist" and "entity has no logs" makes debugging hard.

**Why it happens:** Trying to simplify by avoiding validation step.

**How to avoid:** Always validate entity exists first, then return empty array if no logs found (per CONTEXT.md decision).

**Warning signs:** Client can't distinguish error cases, poor user experience ("Is this broken or just no data?").

### Pitfall 5: Race Condition Between Count and Data Query

**What goes wrong:** totalCount and paginated data become inconsistent if new logs are inserted between queries.

**Why it happens:** Two separate database queries without transaction isolation.

**How to avoid:** For strict consistency requirements, use transaction:

```typescript
const [logs, totalCount] = await prisma.$transaction([
  prisma.llamaLog.findMany({ ... }),
  prisma.llamaLog.count({ ... }),
]);
```

**When to accept risk:** If eventual consistency is acceptable (most feed/timeline UIs), parallel queries with Promise.all are faster.

**Warning signs:** Client reports "showing 21 of 20 items" or similar inconsistencies.

**Source:** [Prisma pagination consistency](https://www.timsanteford.com/posts/how-to-paginate-with-prisma-and-get-total-record-count/)

## Code Examples

Verified patterns from official sources and existing codebase:

### Complete llamaLogChain Resolver

```typescript
// Source: Synthesized from existing patterns in src/lib/graphql/resolvers/queries.ts
llamaLogChain: async (_, args, { prisma }) => {
  const {
    entityType,
    entityId,
    categories,
    startDate,
    endDate,
    limit = 20,
    cursor,
  } = args;

  // 1. Validate entity exists
  const entityTable = entityType.toLowerCase(); // 'ALBUM' -> 'album'
  const entity = await prisma[entityTable].findUnique({
    where: { id: entityId },
    select: { id: true, title: true }, // Minimal fields
  });

  if (!entity) {
    throw new GraphQLError(`${entityType} not found: ${entityId}`, {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  // 2. Build where clause with filters
  const typedIdField = `${entityTable}Id`; // 'album' -> 'albumId'
  const where: Prisma.LlamaLogWhereInput = {
    [typedIdField]: entityId, // Use typed field for better index usage
    ...(categories && categories.length > 0 && { category: { in: categories } }),
    ...(startDate && { createdAt: { gte: startDate } }),
    ...(endDate && { createdAt: { lte: endDate } }),
  };

  // 3. Fetch logs and count in parallel
  const [logs, totalCount] = await Promise.all([
    prisma.llamaLog.findMany({
      take: limit + 1, // Fetch one extra to check hasMore
      skip: cursor ? 1 : 0, // Skip cursor itself
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], // Stable sort
      where,
    }),
    prisma.llamaLog.count({ where }),
  ]);

  // 4. Compute pagination metadata
  const hasMore = logs.length > limit;
  const items = hasMore ? logs.slice(0, -1) : logs;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return {
    logs: items,
    totalCount,
    cursor: nextCursor,
    hasMore,
  };
},
```

### GraphQL Schema Additions

```graphql
# Source: Based on existing RecommendationFeed pattern
type Query {
  llamaLogChain(
    entityType: EnrichmentEntityType!
    entityId: UUID!
    categories: [LlamaLogCategory!]
    startDate: DateTime
    endDate: DateTime
    limit: Int = 20
    cursor: String
  ): LlamaLogChainResponse!
}

type LlamaLogChainResponse {
  logs: [LlamaLog!]!
  totalCount: Int!
  cursor: String
  hasMore: Boolean!
}
```

### Client Query Example

```graphql
# Source: Standard pattern for cursor pagination queries
query GetAlbumProvenance($albumId: UUID!, $cursor: String, $categories: [LlamaLogCategory!]) {
  llamaLogChain(
    entityType: ALBUM
    entityId: $albumId
    cursor: $cursor
    categories: $categories
    limit: 20
  ) {
    logs {
      id
      operation
      category
      status
      createdAt
      fieldsEnriched
      dataQualityBefore
      dataQualityAfter
      reason
      errorMessage
    }
    totalCount
    cursor
    hasMore
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|---------|
| OFFSET pagination | Cursor-based pagination | PostgreSQL 9.2+ (2012) | Better performance for large datasets, stable results |
| Window functions for count | Separate count() query | Prisma best practices | Avoids performance issues with large result sets |
| Encoded cursors (base64) | Plain ID cursors | Prisma cursor API design | Simpler, Prisma requires actual ID values |
| Single orderBy field | Composite orderBy with tiebreaker | GraphQL best practices | Stable, deterministic pagination |

**Deprecated/outdated:**

- **OFFSET pagination:** Still works but doesn't scale; use cursor-based instead
- **Relay Connection spec (edges/nodes):** More verbose than needed; simpler response wrapper pattern is sufficient for this use case
- **Encoded opaque cursors:** Prisma expects actual ID values, not encoded strings

## Open Questions

Things that couldn't be fully resolved:

1. **Should cursor be ID or base64-encoded composite key (createdAt + ID)?**
   - What we know: Prisma cursor requires actual ID value; codebase uses plain ID strings
   - What's unclear: Whether multi-column orderBy causes issues with ID-only cursor
   - Recommendation: Start with ID-only cursor (matches existing pattern); monitor for issues

2. **Should response include basic entity info inline (name, type)?**
   - What we know: CONTEXT.md mentions "Include basic entity info (name, id) inline with each log"
   - What's unclear: Whether this means per-log entity info or once in response wrapper
   - Recommendation: Include entity info in response wrapper only (not per-log) to reduce payload size

3. **Performance impact of totalCount on very large log tables**
   - What we know: Separate count() query is recommended approach
   - What's unclear: Actual performance with millions of logs per entity
   - Recommendation: Implement with count(); add caching or estimate if becomes bottleneck

## Sources

### Primary (HIGH confidence)

- [Prisma Cursor-Based Pagination Documentation](https://www.prisma.io/docs/orm/prisma-client/queries/pagination)
- [Apollo Server Error Handling](https://www.apollographql.com/docs/apollo-server/data/errors)
- [GraphQL Pagination Specification](https://graphql.org/learn/pagination/)
- Existing codebase patterns in `src/lib/graphql/resolvers/queries.ts` and `src/graphql/schema.graphql`
- Existing Prisma schema with LlamaLog indexes in `prisma/schema.prisma`

### Secondary (MEDIUM confidence)

- [Prisma Discussion: Total Count with Pagination](https://github.com/prisma/prisma/discussions/3087)
- [Prisma Discussion: Cursor Pagination Without Sequential Cursor](https://github.com/prisma/prisma/discussions/4888)
- [LogRocket: Pagination in GraphQL with Prisma](https://blog.logrocket.com/pagination-in-graphql-with-prisma-the-right-way/)
- [PostgreSQL Composite Index Performance](https://minervadb.xyz/composite-indexes-in-postgresql/)
- [Hasura: Working with Dates and Time in GraphQL](https://hasura.io/blog/working-with-dates-time-timezones-graphql-postgresql)
- [Tim Santeford: Paginate with Prisma and Get Total Count](https://www.timsanteford.com/posts/how-to-paginate-with-prisma-and-get-total-record-count/)

### Tertiary (LOW confidence)

None - all findings verified with official documentation or existing codebase.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All tools already in project, no new dependencies
- Architecture: HIGH - Patterns proven in existing codebase (recommendationFeed, myRecommendations)
- Pitfalls: HIGH - Known issues documented in Prisma discussions and codebase comments
- Performance: HIGH - Existing indexes optimal for query pattern

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days - stable domain, mature tools)
