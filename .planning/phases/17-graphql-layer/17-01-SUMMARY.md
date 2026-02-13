---
phase: 17
plan: 01
subsystem: graphql
tags: [graphql, schema, enrichment, job-linking]

dependency_graph:
  requires:
    - phase-15 (parentJobId field in Prisma schema)
  provides:
    - EnrichmentLog type with parentJobId and children fields
    - enrichmentLogs query with includeChildren parameter
    - GetEnrichmentLogsWithChildren client query
  affects:
    - phase-17-02 (codegen will generate hooks)
    - phase-18 (resolver implementation)
    - phase-19 (UI timeline component)

tech_stack:
  added: []
  patterns:
    - nullable children array (conditionally populated)
    - includeChildren parameter for tree vs flat mode

file_tracking:
  created: []
  modified:
    - src/graphql/schema.graphql
    - src/graphql/queries/enrichment.graphql

decisions:
  - children field nullable to allow conditional population
  - separate GetEnrichmentLogsWithChildren query for explicit tree fetch

metrics:
  duration: ~3 minutes
  completed: 2026-02-06
---

# Phase 17 Plan 01: GraphQL Schema Extensions Summary

**One-liner:** Added parentJobId, children fields and includeChildren param to EnrichmentLog GraphQL type for job hierarchy display.

## What Was Built

**Schema additions to EnrichmentLog type:**

- `parentJobId: String` - Links child job to parent for tree display
- `children: [EnrichmentLog!]` - Nested logs (populated when includeChildren=true)

**Query parameter addition:**

- `includeChildren: Boolean` on `enrichmentLogs` query

**Client query updates:**

- GetEnrichmentLogs now includes `jobId`, `parentJobId`, and accepts `includeChildren`
- New `GetEnrichmentLogsWithChildren` query with nested children selection

## Commits

| Commit  | Description                                        | Files                                  |
| ------- | -------------------------------------------------- | -------------------------------------- |
| b9ea58f | Add parentJobId and children to EnrichmentLog type | src/graphql/schema.graphql             |
| 37c094f | Update client enrichment queries with hierarchy    | src/graphql/queries/enrichment.graphql |

## Key Decisions

**1. Nullable children field**

- Children array is nullable (not `[EnrichmentLog!]!`)
- Only populated when `includeChildren=true`
- Keeps flat query behavior unchanged

**2. Separate query variant**

- Added `GetEnrichmentLogsWithChildren` for explicit tree fetch
- Keeps `GetEnrichmentLogs` lightweight for existing usages

## Deviations from Plan

None - plan executed exactly as written.

## Requirements Met

- GQL-01: EnrichmentLog type has jobId field (already existed, verified)
- GQL-02: EnrichmentLog type has parentJobId field (newly added)
- GQL-03: enrichmentLogs query has includeChildren parameter

## Next Phase Readiness

**Ready for Plan 02:** Schema changes ready for `pnpm codegen`

**Blockers:** None

**Dependencies resolved:**

- Phase 15 database migration (parentJobId column) is complete
- GraphQL types now match Prisma schema
