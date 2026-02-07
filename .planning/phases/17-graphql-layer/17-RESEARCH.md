# Phase 17: GraphQL Layer - Research

**Researched:** 2026-02-06
**Domain:** GraphQL schema design, resolver implementation, tree structure fetching
**Confidence:** HIGH

## Summary

Phase 17 involves exposing `jobId` and `parentJobId` fields in the GraphQL schema and implementing tree fetching logic for enrichment logs. The research reveals that:

1. The schema already has `jobId` exposed but needs `parentJobId` added
2. GraphQL doesn't support recursive queries natively - tree assembly happens in resolvers
3. The codebase uses @graphql-codegen with typescript-resolvers plugin for type safety
4. Prisma doesn't support recursive queries - tree assembly requires custom resolver logic
5. Parent-child tree fetching is best done via single query + in-memory assembly (not recursive DB calls)

**Primary recommendation:** Add `parentJobId` field to schema, implement resolver that fetches parent logs with their children in a single Prisma query using `include`, then assemble tree structure in resolver logic.

## Standard Stack

### Core

| Library                               | Version | Purpose                               | Why Standard                                          |
| ------------------------------------- | ------- | ------------------------------------- | ----------------------------------------------------- |
| @graphql-codegen/cli                  | 5.0.3   | GraphQL code generator                | Industry standard for type-safe GraphQL in TypeScript |
| @graphql-codegen/typescript           | 4.1.1   | Generate TypeScript types from schema | Core plugin for TypeScript type generation            |
| @graphql-codegen/typescript-resolvers | 4.3.1   | Generate resolver signatures          | Type-safe resolver implementation                     |
| graphql                               | 16.x    | GraphQL implementation                | Reference JavaScript implementation                   |
| @apollo/server                        | 4.x     | GraphQL server                        | Most popular GraphQL server for Node.js               |
| DataLoader                            | 2.x     | Batching and caching                  | Solves N+1 query problem in GraphQL                   |

### Supporting

| Library                                 | Version | Purpose                 | When to Use                                |
| --------------------------------------- | ------- | ----------------------- | ------------------------------------------ |
| @graphql-codegen/typescript-react-query | 6.1.1   | React hooks for queries | Client-side data fetching (already in use) |

### Alternatives Considered

| Instead of               | Could Use                   | Tradeoff                                                                            |
| ------------------------ | --------------------------- | ----------------------------------------------------------------------------------- |
| Custom resolver assembly | Prisma recursive extensions | Prisma doesn't support recursive queries natively; must use raw SQL or custom logic |
| Flat array return        | GraphQL @defer directive    | Not widely supported; client complexity increases                                   |

**Installation:**
Already installed - no new dependencies required.

## Architecture Patterns

### Recommended Schema Structure

For tree structures in GraphQL, the standard pattern is to add an optional `children` field that returns the same type:

```graphql
type EnrichmentLog {
  id: UUID!
  jobId: String
  parentJobId: String # NEW FIELD
  # ... other fields ...
  children: [EnrichmentLog!] # NEW FIELD - populated conditionally
}
```

Query accepts parameter to control tree fetching:

```graphql
type Query {
  enrichmentLogs(
    entityType: EnrichmentEntityType
    entityId: UUID
    status: EnrichmentLogStatus
    skip: Int
    limit: Int
    includeChildren: Boolean # NEW PARAMETER
  ): [EnrichmentLog!]!
}
```

### Pattern 1: Tree Assembly in Resolver

**What:** Fetch flat list from database, assemble tree structure in resolver using parent-child relationships

**When to use:** When tree depth is bounded and dataset isn't massive (< 10k records)

**Example:**

```typescript
// Source: Apollo GraphQL best practices
enrichmentLogs: async (_, args, { prisma }) => {
  const { includeChildren, ...filters } = args;

  if (!includeChildren) {
    // Simple case - return flat list
    return prisma.enrichmentLog.findMany({
      where: buildWhereClause(filters),
      orderBy: { createdAt: 'desc' },
    });
  }

  // Tree case - fetch parents and all their children
  const parentLogs = await prisma.enrichmentLog.findMany({
    where: {
      ...buildWhereClause(filters),
      parentJobId: null, // Root logs only
    },
    include: {
      // Prisma doesn't support recursive include
      // Must fetch children separately
    },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch all children for these parents in single query
  const parentJobIds = parentLogs.map(log => log.jobId).filter(Boolean);
  const childLogs = await prisma.enrichmentLog.findMany({
    where: {
      parentJobId: { in: parentJobIds },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Assemble tree structure
  const childrenMap = new Map<string, typeof childLogs>();
  for (const child of childLogs) {
    if (!child.parentJobId) continue;
    const siblings = childrenMap.get(child.parentJobId) || [];
    siblings.push(child);
    childrenMap.set(child.parentJobId, siblings);
  }

  // Attach children to parents
  return parentLogs.map(parent => ({
    ...parent,
    children: parent.jobId ? childrenMap.get(parent.jobId) || [] : [],
  }));
};
```

### Pattern 2: DataLoader for Child Fetching

**What:** Use DataLoader to batch child fetching across multiple parent logs

**When to use:** When tree structure is accessed via field resolvers (not query resolver)

**Example:**

```typescript
// Source: Apollo DataLoader patterns
const childrenByParentJobIdLoader = new DataLoader(
  async (parentJobIds: string[]) => {
    const allChildren = await prisma.enrichmentLog.findMany({
      where: { parentJobId: { in: parentJobIds } },
    });

    // Group by parentJobId
    const grouped = new Map<string, typeof allChildren>();
    for (const child of allChildren) {
      const siblings = grouped.get(child.parentJobId!) || [];
      siblings.push(child);
      grouped.set(child.parentJobId!, siblings);
    }

    // Return in same order as input keys
    return parentJobIds.map(id => grouped.get(id) || []);
  }
);

// Field resolver
EnrichmentLog: {
  children: async (parent, _, { dataloaders }) => {
    if (!parent.jobId) return [];
    return dataloaders.childrenByParentJobIdLoader.load(parent.jobId);
  },
}
```

### Anti-Patterns to Avoid

- **Recursive database calls**: Fetching children one parent at a time causes N+1 queries
- **Unbounded recursion**: Without depth limits, malicious queries can DoS the server
- **Client-side assembly**: Returning flat arrays and expecting client to build tree is bad DX
- **GraphQL fragments for recursion**: While technically possible, fragments add complexity without server-side support

## Don't Hand-Roll

| Problem                     | Don't Build             | Use Instead                                | Why                                                 |
| --------------------------- | ----------------------- | ------------------------------------------ | --------------------------------------------------- |
| Type generation from schema | Custom TypeScript types | @graphql-codegen/typescript-resolvers      | Keeps types in sync with schema, prevents drift     |
| N+1 query prevention        | Manual batching logic   | DataLoader                                 | Battle-tested, handles edge cases, caching built-in |
| Tree depth limiting         | Custom recursion guards | Schema-level parameter with resolver logic | Explicit contract in schema, easier to test         |
| Resolver type safety        | `any` types             | Generated resolver types                   | TypeScript catches resolver signature mismatches    |

**Key insight:** GraphQL codegen eliminates an entire class of bugs by generating types that must match the schema. The resolver signatures are type-checked against the schema at compile time.

## Common Pitfalls

### Pitfall 1: Exposing Unbounded Recursion

**What goes wrong:** Adding `children: [EnrichmentLog!]!` as a field resolver without depth limits allows infinite recursion

**Why it happens:** GraphQL spec allows querying `log { children { children { children { ... } } } }` infinitely

**How to avoid:**

- Use query parameter approach (`includeChildren: Boolean`) for one-level trees
- If multi-level needed, add `maxDepth` parameter and enforce in resolver
- Consider Apollo Server's `validationRules` for query depth limiting

**Warning signs:** Server memory spikes, slow response times, DoS-like symptoms

### Pitfall 2: N+1 Queries in Tree Fetching

**What goes wrong:** Fetching children inside a field resolver causes one query per parent log

**Why it happens:** Field resolvers run for each item in parent array without batching

**How to avoid:**

- Fetch all children in single query in root resolver, attach as property
- Or use DataLoader in field resolver to batch child fetching
- Monitor query counts with Prisma query events

**Warning signs:**

```
Query count scales linearly with result count
Database connection pool exhaustion
```

### Pitfall 3: Schema-Generated Type Mismatch

**What goes wrong:** Adding `children` field to schema without regenerating types causes TypeScript errors

**Why it happens:** Generated types in `src/generated/resolvers-types.ts` don't include new field

**How to avoid:**

1. Modify `src/graphql/schema.graphql`
2. Run `pnpm codegen` immediately
3. Fix TypeScript errors in resolvers
4. Never commit schema changes without running codegen

**Warning signs:**

```
Type 'EnrichmentLog' is not assignable to type 'ResolversTypes["EnrichmentLog"]'
Property 'children' does not exist on type...
```

### Pitfall 4: Prisma Self-Referencing Limitations

**What goes wrong:** Trying to use `include: { children: true }` fails because Prisma doesn't have `children` relation

**Why it happens:** Prisma self-relations require explicit relation fields in schema - can't infer from `parentJobId`

**How to avoid:**

- Don't add Prisma relation - it's unnecessary complexity for this use case
- Fetch via `where: { parentJobId: { in: [...] } }` instead
- Assemble tree structure in application code

**Warning signs:**

```
Error: Unknown relation 'children' on model 'EnrichmentLog'
```

## Code Examples

### Example 1: Adding Fields to Schema

```graphql
# Source: Project's src/graphql/schema.graphql pattern
type EnrichmentLog {
  id: UUID!
  entityType: EnrichmentEntityType
  entityId: UUID
  operation: String!
  sources: [String!]!
  status: EnrichmentLogStatus!
  reason: String
  fieldsEnriched: [String!]!
  dataQualityBefore: DataQuality
  dataQualityAfter: DataQuality
  errorMessage: String
  errorCode: String
  retryCount: Int!
  durationMs: Int
  apiCallCount: Int!
  metadata: JSON
  previewData: JSON
  jobId: String # EXISTING
  parentJobId: String # NEW - from Phase 15 DB migration
  triggeredBy: String
  userId: String
  createdAt: DateTime!
}
```

### Example 2: Query with includeChildren Parameter

```graphql
# Source: Project's src/graphql/schema.graphql Query type pattern
type Query {
  # ... other queries ...

  enrichmentLogs(
    entityType: EnrichmentEntityType
    entityId: UUID
    status: EnrichmentLogStatus
    sources: [String!]
    skip: Int
    limit: Int
    includeChildren: Boolean # NEW - default false for backward compatibility
  ): [EnrichmentLog!]!
}
```

### Example 3: Client Query Usage

```graphql
# Source: Project's src/graphql/queries/enrichment.graphql pattern
query GetEnrichmentLogs(
  $entityType: EnrichmentEntityType
  $entityId: UUID
  $status: EnrichmentLogStatus
  $skip: Int
  $limit: Int
  $includeChildren: Boolean # NEW
) {
  enrichmentLogs(
    entityType: $entityType
    entityId: $entityId
    status: $status
    skip: $skip
    limit: $limit
    includeChildren: $includeChildren # NEW
  ) {
    id
    entityType
    entityId
    operation
    sources
    status
    reason
    fieldsEnriched
    dataQualityBefore
    dataQualityAfter
    errorMessage
    errorCode
    durationMs
    apiCallCount
    metadata
    createdAt
    jobId # EXISTING
    parentJobId # NEW
  }
}
```

### Example 4: Resolver Implementation

```typescript
// Source: Adapted from project's src/lib/graphql/resolvers/queries.ts pattern
enrichmentLogs: async (_, args, { prisma }) => {
  const {
    entityType,
    entityId,
    status,
    sources,
    skip,
    limit,
    includeChildren = false, // NEW - default false
  } = args;

  // Build where clause (existing pattern)
  const where: Record<string, unknown> = {};
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (status) where.status = status;
  if (sources && sources.length > 0) {
    where.sources = { hasSome: sources };
  }

  // EXISTING: Simple flat fetch
  if (!includeChildren) {
    return prisma.enrichmentLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: skip || 0,
      take: limit || 50,
    });
  }

  // NEW: Tree fetch - parents with children
  // Only return root logs (parentJobId is null) when includeChildren=true
  const parentLogs = await prisma.enrichmentLog.findMany({
    where: {
      ...where,
      parentJobId: null, // Root logs only
    },
    orderBy: { createdAt: 'desc' },
    skip: skip || 0,
    take: limit || 50,
  });

  // Fetch all children for these parents in single query
  const parentJobIds = parentLogs
    .map(log => log.jobId)
    .filter((id): id is string => Boolean(id));

  if (parentJobIds.length === 0) {
    // No parents with jobIds, return as-is
    return parentLogs.map(log => ({ ...log, children: [] }));
  }

  const childLogs = await prisma.enrichmentLog.findMany({
    where: {
      parentJobId: { in: parentJobIds },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Build children map for O(n) lookup
  const childrenMap = new Map<string, typeof childLogs>();
  for (const child of childLogs) {
    if (!child.parentJobId) continue;
    const siblings = childrenMap.get(child.parentJobId) || [];
    siblings.push(child);
    childrenMap.set(child.parentJobId, siblings);
  }

  // Attach children to parents - add empty children arrays to leaf nodes
  return parentLogs.map(parent => ({
    ...parent,
    children: parent.jobId
      ? (childrenMap.get(parent.jobId) || []).map(child => ({
          ...child,
          children: [], // Children are leaf nodes (no grandchildren)
        }))
      : [],
  }));
};
```

## State of the Art

| Old Approach                           | Current Approach                  | When Changed | Impact                                     |
| -------------------------------------- | --------------------------------- | ------------ | ------------------------------------------ |
| Manual schema-to-type mapping          | @graphql-codegen auto-generation  | ~2020        | Type safety, reduced bugs                  |
| Separate DataLoader imports            | Context-scoped DataLoader factory | ~2021        | Request-scoped caching, memory efficiency  |
| Field-by-field resolvers for relations | DataLoader batching               | ~2019        | N+1 query elimination                      |
| GraphQL v15                            | GraphQL v16                       | 2021         | Better TypeScript support, async iterators |

**Deprecated/outdated:**

- **graphql-tools v4**: Replaced by v10+ with better schema stitching
- **apollo-server v2/v3**: Now using apollo-server v4 with async context
- **Implicit resolver returns**: Now using explicit ResolversTypes for type safety

## Open Questions

1. **Maximum tree depth**
   - What we know: Schema currently allows one level (parent → children)
   - What's unclear: Should we support grandchildren (parent → child → grandchild)?
   - Recommendation: Start with one level, add depth parameter if needed later

2. **Performance threshold**
   - What we know: In-memory assembly works well for < 10k records
   - What's unclear: What's the realistic dataset size? Current log retention policy?
   - Recommendation: Monitor query performance, add pagination if logs exceed 1000 parents

3. **Child ordering**
   - What we know: Children ordered by `createdAt ASC` (chronological)
   - What's unclear: Should children preserve jobId chain order for multi-step enrichments?
   - Recommendation: Chronological order is correct - earlier children may have triggered later ones

## Sources

### Primary (HIGH confidence)

- [Apollo GraphQL Resolvers Documentation](https://www.apollographql.com/docs/apollo-server/data/resolvers)
- [GraphQL Codegen TypeScript Resolvers](https://the-guild.dev/graphql/codegen/plugins/typescript/typescript-resolvers)
- [Prisma Self-Relations Documentation](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/self-relations)
- Project codebase analysis:
  - `src/graphql/schema.graphql` - existing EnrichmentLog type
  - `src/lib/graphql/resolvers/queries.ts` - enrichmentLogs resolver pattern
  - `codegen.yml` - TypeScript resolver generation config
  - `prisma/schema.prisma` - EnrichmentLog model with parentJobId field

### Secondary (MEDIUM confidence)

- [GraphQL Recursive Query with Fragments](https://hashinteractive.com/blog/graphql-recursive-query-with-fragments/)
- [Prisma Tree Structures Discussion](https://github.com/prisma/prisma/discussions/16061)
- [Apollo Server Nested Resolvers](https://codesignal.com/learn/courses/advanced-graphql-data-patterns-and-fetching-1/lessons/using-apollo-server-4-for-graphql-nested-resolvers-and-data-relationships)

### Tertiary (LOW confidence)

- Web search results on GraphQL tree structures (various blog posts)

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - all libraries in active use, versions confirmed in package.json
- Architecture: HIGH - patterns verified in codebase, resolver implementation seen in queries.ts
- Pitfalls: HIGH - common GraphQL + Prisma issues well-documented, DataLoader N+1 prevention standard

**Research date:** 2026-02-06
**Valid until:** ~30 days (stable domain, unlikely to change)
