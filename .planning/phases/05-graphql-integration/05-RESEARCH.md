# Phase 5: GraphQL Integration - Research

**Researched:** 2026-01-24
**Domain:** GraphQL API layer for correction services
**Confidence:** HIGH

## Summary

This phase exposes the three correction services (SearchCorrectionService, CorrectionPreviewService, ApplyCorrectionService) via GraphQL API using the established patterns in this codebase. The codebase has a mature GraphQL setup with Apollo Server, automatic type generation via GraphQL Code Generator, and React Query hook generation for client-side consumption.

The existing architecture follows a "thin resolver" pattern where resolvers handle authentication/authorization and delegate to service layer functions. All resolvers use inline admin checks with `isAdmin(user.role)` and throw `GraphQLError` with standardized error codes. The codegen system automatically generates TypeScript types and React Query hooks from schema definitions and `.graphql` query files.

Key findings:

- Schema location: `src/graphql/schema.graphql` (1482 lines, well-organized by domain)
- Resolvers split into: `queries.ts` (2285 lines), `mutations.ts` (2700 lines), `index.ts` (orchestrator)
- Codegen config: `codegen.yml` generates both resolver types and client-side React Query hooks
- Auth pattern: Inline `isAdmin()` check in each resolver, no middleware
- Error handling: `GraphQLError` with extension codes (UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, INTERNAL_ERROR)

**Primary recommendation:** Follow existing thin resolver pattern - add schema types first, implement resolvers with inline admin checks, create `.graphql` query files for client hooks, run `pnpm codegen` to generate TypeScript types and React Query hooks.

## Standard Stack

The GraphQL layer uses established libraries with zero additional dependencies needed for this phase.

### Core

| Library               | Version     | Purpose                      | Why Standard                                                       |
| --------------------- | ----------- | ---------------------------- | ------------------------------------------------------------------ |
| graphql               | (installed) | GraphQL schema and execution | Core GraphQL implementation for Apollo Server                      |
| @apollo/server        | (installed) | GraphQL server               | Industry-standard GraphQL server with excellent TypeScript support |
| @graphql-codegen/cli  | (installed) | Code generation orchestrator | Automates TypeScript type generation from schema                   |
| @tanstack/react-query | v5          | Client-side data fetching    | Modern replacement for Apollo Client, used throughout codebase     |

### Supporting

| Library                                 | Version     | Purpose                               | When to Use                             |
| --------------------------------------- | ----------- | ------------------------------------- | --------------------------------------- |
| @graphql-codegen/typescript             | (installed) | Generate TypeScript types from schema | Automatic - part of codegen pipeline    |
| @graphql-codegen/typescript-operations  | (installed) | Generate operation types              | Automatic - for query/mutation types    |
| @graphql-codegen/typescript-react-query | (installed) | Generate React Query hooks            | Automatic - creates `useXQuery` hooks   |
| @graphql-codegen/typescript-resolvers   | (installed) | Generate resolver types               | Automatic - for server-side type safety |

### Alternatives Considered

No alternatives needed - this phase integrates into existing GraphQL infrastructure with zero new dependencies.

**Installation:**

No new packages needed. Existing setup already has all required dependencies.

## Architecture Patterns

### Schema Organization

Schema file structure (src/graphql/schema.graphql):

```graphql
# Scalar types first
scalar DateTime
scalar UUID
scalar JSON

# Enums (alphabetically by domain)
enum ChangeType { ADDED, MODIFIED, REMOVED, CONFLICT, UNCHANGED }
enum CoverArtChoice { USE_SOURCE, KEEP_CURRENT, CLEAR }
enum DataQuality { LOW, MEDIUM, HIGH }

# Input types (for mutations/complex queries)
input CorrectionSearchInput { ... }
input CorrectionApplyInput { ... }

# Output types (domain-specific, alphabetically)
type CorrectionSearchResult { ... }
type CorrectionPreview { ... }

# Query and Mutation roots (at end of file)
type Query {
  # Existing queries...
  correctionSearch(input: CorrectionSearchInput!): CorrectionSearchResponse!
  correctionPreview(input: CorrectionPreviewInput!): CorrectionPreview!
}

type Mutation {
  # Existing mutations...
  correctionApply(input: CorrectionApplyInput!): CorrectionApplyResult!
}
```

**Pattern observed in codebase:**

- Scalars at top
- Enums before types
- Input types use `Input` suffix
- Queries with complex args use input objects (e.g., `search(input: SearchInput!)`)
- Mutations always use input objects
- Naming: domain-prefixed (e.g., `correctionSearch`, `correctionPreview`, `correctionApply`)

### Resolver Organization

File structure:

```
src/lib/graphql/resolvers/
├── index.ts           # Exports combined resolver map
├── queries.ts         # Query resolvers (read operations)
├── mutations.ts       # Mutation resolvers (write operations)
├── scalars.ts         # Custom scalar resolvers
└── subscriptions.ts   # Subscription resolvers
```

**Pattern 1: Thin Resolver with Admin Check**

```typescript
// In mutations.ts or queries.ts
import { GraphQLError } from 'graphql';
import { isAdmin } from '@/lib/permissions';
import { MutationResolvers } from '@/generated/resolvers-types';

export const mutationResolvers: MutationResolvers = {
  correctionApply: async (_, { input }, { user, prisma }) => {
    // 1. Check authentication
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // 2. Check authorization (inline admin check)
    if (!isAdmin(user.role)) {
      throw new GraphQLError('Unauthorized: Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    try {
      // 3. Delegate to service layer
      const { applyCorrectionService } = await import('@/lib/correction');
      const result = await applyCorrectionService.applyCorrection({
        albumId: input.albumId,
        preview: input.preview,
        selections: input.selections,
        expectedUpdatedAt: new Date(input.expectedUpdatedAt),
        adminUserId: user.id,
      });

      // 4. Return result directly
      return result;
    } catch (error) {
      // 5. Handle service layer errors
      if (error instanceof GraphQLError) {
        throw error;
      }
      console.error('Error applying correction:', error);
      throw new GraphQLError(`Failed to apply correction: ${error}`, {
        extensions: { code: 'INTERNAL_ERROR' },
      });
    }
  },
};
```

**Source:** Pattern extracted from `deleteArtist` resolver in mutations.ts (lines 982-1050)

**Pattern 2: Query Resolver with Service Integration**

```typescript
// In queries.ts
export const queryResolvers: QueryResolvers = {
  correctionSearch: async (_, { input }, { user, prisma }) => {
    // Auth checks (same pattern)
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    if (!isAdmin(user.role)) {
      throw new GraphQLError('Unauthorized: Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    try {
      // Import and use search service
      const { getSearchScoringService } = await import('@/lib/correction');
      const searchService = getSearchScoringService();

      const results = await searchService.searchWithScoring({
        albumTitle: input.albumTitle,
        artistName: input.artistName,
        yearFilter: input.yearFilter,
        limit: input.limit || 10,
        offset: input.offset || 0,
      });

      return results;
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      console.error('Correction search error:', error);
      throw new GraphQLError(`Search failed: ${error}`, {
        extensions: { code: 'INTERNAL_ERROR' },
      });
    }
  },
};
```

**Source:** Pattern adapted from `search` resolver in queries.ts (lines 458-540)

### Anti-Patterns to Avoid

- **Using middleware for auth**: Codebase uses inline checks, not wrapper functions
- **Custom error types**: Use standard `GraphQLError` with extension codes, not custom error classes
- **Union types for errors**: Apollo Server's error handling is sufficient - don't create `Result | Error` union types
- **Direct Prisma in resolvers**: Always delegate complex logic to service layer
- **Fat resolvers**: Resolvers should only handle auth, validation, service calls - no business logic

## Don't Hand-Roll

Problems that existing infrastructure already solves:

| Problem            | Don't Build                  | Use Instead                  | Why                                                                                  |
| ------------------ | ---------------------------- | ---------------------------- | ------------------------------------------------------------------------------------ |
| Type generation    | Manual TypeScript interfaces | GraphQL Codegen              | Generates types from schema automatically, keeps client/server types in sync         |
| Client hooks       | Custom fetch functions       | Generated React Query hooks  | `pnpm codegen` creates typed `useXQuery` hooks with caching, refetch, error handling |
| Error handling     | Custom error classes         | GraphQLError with extensions | Apollo Server standard, client libraries understand error structure                  |
| Auth middleware    | Wrapper functions            | Inline `isAdmin()` checks    | Existing pattern across 50+ resolvers, explicit is better than magic                 |
| Input validation   | Zod/Yup schemas              | GraphQL schema types         | Schema enforces structure, codegen provides TypeScript types                         |
| Service singletons | Re-instantiation             | Existing `getX()` factories  | `getSearchScoringService()`, `getCorrectionPreviewService()` already exist           |

**Key insight:** The correction services were designed with GraphQL integration in mind. They return structured data that maps cleanly to GraphQL types, handle their own validation, and use error codes that align with GraphQL error extensions.

## Common Pitfalls

### Pitfall 1: Forgetting to Run Codegen

**What goes wrong:** Schema changes don't generate types, client hooks are missing/outdated, TypeScript errors appear

**Why it happens:** Codegen is a manual step (`pnpm codegen`), not automatic on save

**How to avoid:**

1. After modifying `schema.graphql`, immediately run `pnpm codegen`
2. After creating `.graphql` query files, immediately run `pnpm codegen`
3. Check `src/generated/graphql.ts` modification timestamp to verify generation

**Warning signs:**

- Import errors for `useXQuery` hooks
- Type mismatches between schema and TypeScript
- `src/generated/graphql.ts` modified date is older than schema changes

### Pitfall 2: Mismatched Service Layer Types vs GraphQL Types

**What goes wrong:** Service returns `ScoredSearchResponse` but GraphQL schema defines different field structure, runtime errors occur

**Why it happens:** Service layer types evolve separately from schema types

**How to avoid:**

1. When defining GraphQL types, reference service layer types (`src/lib/correction/types.ts`)
2. Map service types 1:1 to GraphQL types when possible
3. Add transformation layer in resolver only when necessary (e.g., Date → DateTime scalar)

**Example mapping:**

```typescript
// Service type (src/lib/correction/types.ts)
interface ScoredSearchResult {
  releaseGroupMbid: string;
  title: string;
  primaryArtistName: string;
  score: number;           // 0-1 float
  confidenceTier: string; // "HIGH", "MEDIUM", "LOW"
}

// GraphQL type (should match structure)
type CorrectionSearchResult {
  releaseGroupMbid: UUID!
  title: String!
  primaryArtistName: String!
  score: Float!           # 0-1 float (same representation)
  confidenceTier: String! # "HIGH", "MEDIUM", "LOW" (same values)
}
```

**Warning signs:**

- Resolver has complex transformation logic
- Field names differ between service and GraphQL (e.g., `mbid` vs `releaseGroupMbid`)
- Need to destructure/reshape objects before returning

### Pitfall 3: Not Handling Service Layer Errors

**What goes wrong:** Service throws `StaleDataError` (custom error class), resolver crashes instead of returning proper GraphQL error

**Why it happens:** Service layer uses domain-specific errors, GraphQL expects `GraphQLError`

**How to avoid:**

```typescript
try {
  const result = await applyCorrectionService.applyCorrection(input);
  return result;
} catch (error) {
  // Check for known service errors
  if (error instanceof StaleDataError) {
    throw new GraphQLError('Album was modified since preview was generated', {
      extensions: {
        code: 'STALE_DATA',
        albumId: error.albumId,
        expectedVersion: error.expectedUpdatedAt,
        currentVersion: error.currentUpdatedAt,
      },
    });
  }

  // Re-throw GraphQLErrors as-is
  if (error instanceof GraphQLError) {
    throw error;
  }

  // Catch-all for unexpected errors
  console.error('Unexpected correction error:', error);
  throw new GraphQLError('Internal server error', {
    extensions: { code: 'INTERNAL_ERROR' },
  });
}
```

**Warning signs:**

- Service layer has custom error classes (e.g., `StaleDataError`)
- Resolver doesn't have try/catch around service calls
- Errors in logs show stack traces instead of structured GraphQL errors

### Pitfall 4: Query vs Mutation Misclassification

**What goes wrong:** `correctionPreview` defined as Mutation but it doesn't modify data, clients can't cache results

**Why it happens:** Confusion between "fetches external data" and "modifies database"

**How to avoid:** Follow GraphQL semantics:

- **Query:** Reads data (database or external API), safe to cache/retry
- **Mutation:** Writes to database, side effects, not idempotent

**Correct classification for this phase:**

- `correctionSearch` → **Query** (reads from MusicBrainz, no DB writes)
- `correctionPreview` → **Query** (fetches MB release data, generates diff, no DB writes)
- `correctionApply` → **Mutation** (writes to database, modifies album/tracks)

**Warning signs:**

- Query results aren't cached by React Query
- Read operations trigger "refetch on mutation" behavior
- Operations can't be run in parallel

### Pitfall 5: Not Creating Client Query Files

**What goes wrong:** Schema types exist but no React Query hooks are generated for client use

**Why it happens:** Codegen requires `.graphql` files in `src/graphql/queries/` or `src/graphql/mutations/`

**How to avoid:**

1. After adding to schema, create corresponding `.graphql` file:
   - Queries → `src/graphql/queries/correctionSearch.graphql`
   - Mutations → `src/graphql/mutations/correctionApply.graphql`
2. Define the operation with exact field selection
3. Run `pnpm codegen` to generate hooks

**Example:**

```graphql
# src/graphql/queries/correctionSearch.graphql
query CorrectionSearch($input: CorrectionSearchInput!) {
  correctionSearch(input: $input) {
    results {
      releaseGroupMbid
      title
      primaryArtistName
      score
      confidenceTier
    }
    totalGroups
    hasMore
  }
}
```

After codegen, this generates: `useCorrectionSearchQuery()` hook

**Warning signs:**

- `useXQuery` hook doesn't exist in `src/generated/graphql.ts`
- Only resolver types exist, no operation types
- Import errors when trying to use hook in components

## Code Examples

Verified patterns from codebase with sources:

### Admin-Only Mutation Pattern

```typescript
// Source: src/lib/graphql/resolvers/mutations.ts (deleteArtist, lines 982-1050)
import { GraphQLError } from 'graphql';
import { isAdmin } from '@/lib/permissions';
import { MutationResolvers } from '@/generated/resolvers-types';

export const mutationResolvers: MutationResolvers = {
  correctionApply: async (_, { input }, { user, prisma }) => {
    // Step 1: Authentication check
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Step 2: Authorization check (inline, explicit)
    if (!isAdmin(user.role)) {
      throw new GraphQLError('Unauthorized: Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    try {
      // Step 3: Delegate to service layer
      const { applyCorrectionService } = await import('@/lib/correction');

      const result = await applyCorrectionService.applyCorrection({
        albumId: input.albumId,
        preview: input.preview,
        selections: input.selections,
        expectedUpdatedAt: new Date(input.expectedUpdatedAt),
        adminUserId: user.id,
      });

      // Step 4: Return service result directly
      // (Service returns success/failure structured type)
      return result;
    } catch (error) {
      // Step 5: Error handling
      if (error instanceof GraphQLError) {
        throw error; // Re-throw GraphQL errors as-is
      }

      console.error('Error applying correction:', error);
      throw new GraphQLError(`Failed to apply correction: ${error}`, {
        extensions: { code: 'INTERNAL_ERROR' },
      });
    }
  },
};
```

### Admin-Only Query Pattern

```typescript
// Source: Adapted from search resolver in src/lib/graphql/resolvers/queries.ts (lines 458-540)
import { GraphQLError } from 'graphql';
import { isAdmin } from '@/lib/permissions';
import { QueryResolvers } from '@/generated/resolvers-types';

export const queryResolvers: QueryResolvers = {
  correctionSearch: async (_, { input }, { user, prisma }) => {
    // Authentication
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Authorization
    if (!isAdmin(user.role)) {
      throw new GraphQLError('Unauthorized: Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    try {
      // Import service (dynamic import for code splitting)
      const { getSearchScoringService } = await import('@/lib/correction');
      const searchService = getSearchScoringService();

      // Call service with mapped inputs
      const results = await searchService.searchWithScoring({
        albumTitle: input.albumTitle,
        artistName: input.artistName,
        yearFilter: input.yearFilter,
        limit: input.limit || 10,
        offset: input.offset || 0,
      });

      // Return service result (types should align with GraphQL schema)
      return results;
    } catch (error) {
      if (error instanceof GraphQLError) throw error;

      console.error('Correction search error:', error);
      throw new GraphQLError(`Search failed: ${error}`, {
        extensions: { code: 'INTERNAL_ERROR' },
      });
    }
  },
};
```

### GraphQL Context Access

```typescript
// Source: src/lib/graphql/context.ts
// Context provides: { user, prisma, dataloaders, activityTracker, ... }

export interface GraphQLContext {
  prisma: PrismaClient; // Database access
  user?: {
    // Authenticated user (if logged in)
    id: string;
    email?: string;
    role?: string; // UserRole enum: USER, MODERATOR, ADMIN, OWNER
  } | null;
  dataloaders: DataLoaders; // N+1 query prevention
  activityTracker: ActivityTracker; // Activity logging
  requestId: string; // Request tracing
  // ... other metadata
}

// Usage in resolver signature:
async (parent, args, context) => {
  const { user, prisma } = context;
  // ...
};
```

### Client Query File Example

```graphql
# Source: src/graphql/queries/search.graphql (simplified)
# This generates: useCorrectionSearchQuery() hook

query CorrectionSearch($input: CorrectionSearchInput!) {
  correctionSearch(input: $input) {
    results {
      releaseGroupMbid
      title
      disambiguation
      primaryArtistName
      firstReleaseDate
      primaryType
      secondaryTypes
      score
      confidenceTier
      coverArtUrl
      artistCredits {
        mbid
        name
      }
    }
    totalGroups
    hasMore
    query {
      albumTitle
      artistName
      yearFilter
    }
    scoring {
      strategy
      threshold
      lowConfidenceCount
    }
  }
}
```

After running `pnpm codegen`, this generates:

```typescript
// Auto-generated in src/generated/graphql.ts
export const useCorrectionSearchQuery = <
  TData = CorrectionSearchQuery,
  TError = unknown,
>(
  variables: CorrectionSearchQueryVariables,
  options?: UseQueryOptions<CorrectionSearchQuery, TError, TData>
) =>
  useQuery<CorrectionSearchQuery, TError, TData>(
    ['CorrectionSearch', variables],
    fetcher<CorrectionSearchQuery, CorrectionSearchQueryVariables>(
      CorrectionSearchDocument,
      variables
    ),
    options
  );
```

Usage in component:

```typescript
import { useCorrectionSearchQuery } from '@/generated/graphql';

function SearchResults({ albumId, albumTitle, artistName }) {
  const { data, isLoading, error } = useCorrectionSearchQuery({
    input: { albumTitle, artistName, limit: 10 }
  });

  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;

  return <ResultsList results={data.correctionSearch.results} />;
}
```

## State of the Art

| Old Approach           | Current Approach                | When Changed     | Impact                                                 |
| ---------------------- | ------------------------------- | ---------------- | ------------------------------------------------------ |
| Apollo Client          | TanStack Query (React Query v5) | 2024             | Simpler API, better TypeScript support, lighter bundle |
| Manual fetch functions | Generated hooks via codegen     | Existing pattern | Type safety, less boilerplate, automatic caching       |
| Apollo error policies  | Standard GraphQLError           | Existing pattern | Consistent error handling, works with any client       |
| Middleware auth        | Inline `isAdmin()` checks       | Existing pattern | Explicit authorization, easier to audit                |

**Deprecated/outdated:**

- **Apollo Client**: Codebase uses TanStack Query with GraphQL Codegen for hook generation
- **REST endpoints for data fetching**: All new operations should use GraphQL API
- **Custom error classes in resolvers**: Use `GraphQLError` with `extensions.code`

## Open Questions

Things that couldn't be fully resolved:

1. **Complex nested input types (Map<string, boolean>)**
   - What we know: Service uses `Map<string, boolean>` for track/artist selections
   - What's unclear: GraphQL doesn't have Map type - needs alternative representation
   - Recommendation: Use `JSON` scalar or array of `{ key: String!, selected: Boolean! }` objects

2. **Preview data size**
   - What we know: `CorrectionPreview` can be large (100+ tracks, multiple diffs)
   - What's unclear: Whether to send full preview in apply mutation or reference by ID
   - Recommendation: Start with full preview in input (simpler), optimize if performance issues arise

3. **Error code exhaustiveness**
   - What we know: Service layer uses `ApplyErrorCode` enum with 5 codes
   - What's unclear: Whether to expose these as GraphQL enum or use extension codes
   - Recommendation: Use extension codes (existing pattern), document in schema comments

## Sources

### Primary (HIGH confidence)

- Codebase inspection: `src/graphql/schema.graphql` (1482 lines, comprehensive schema)
- Codebase inspection: `src/lib/graphql/resolvers/queries.ts` (2285 lines, query patterns)
- Codebase inspection: `src/lib/graphql/resolvers/mutations.ts` (2700 lines, mutation patterns)
- Codebase inspection: `src/lib/graphql/context.ts` (GraphQL context structure)
- Codebase inspection: `src/lib/permissions.ts` (isAdmin implementation)
- Codebase inspection: `src/lib/correction/types.ts` (service layer types to map)
- Codebase inspection: `codegen.yml` (codegen configuration)
- Codebase inspection: `src/generated/graphql.ts` (generated hooks examples)
- Codebase inspection: `src/graphql/queries/*.graphql` (client query patterns)

### Secondary (MEDIUM confidence)

- [Apollo Server Error Handling](https://www.apollographql.com/docs/apollo-server/data/errors) - Error handling best practices
- [GraphQL Codegen React Query Guide](https://the-guild.dev/graphql/codegen/docs/guides/react-query) - Hook generation setup
- [TypeScript React-Query Plugin](https://the-guild.dev/graphql/codegen/plugins/typescript/typescript-react-query) - Plugin configuration

### Tertiary (LOW confidence)

None - all findings verified against codebase implementation

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All dependencies already installed and configured
- Architecture: HIGH - Extensive examples in codebase, clear patterns established
- Pitfalls: HIGH - Identified from real resolver implementations and common mistakes
- Service integration: HIGH - Service layer types and interfaces already defined

**Research date:** 2026-01-24
**Valid until:** 2026-02-24 (30 days - GraphQL ecosystem is stable, patterns won't change)
