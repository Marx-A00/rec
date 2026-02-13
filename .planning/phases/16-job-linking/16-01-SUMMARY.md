---
phase: 16-job-linking
plan: 01
completed: 2026-02-07
duration: ~2 minutes

provides:
  - isRootJob Boolean field on EnrichmentLog for root job identification
  - parentJobId field on 10 job data interfaces for chain tracking
  - Index on (isRootJob, createdAt) for efficient root queries

requires:
  - Phase 15 (parentJobId field on EnrichmentLog)

affects:
  - Phase 16-02: Enrichment processor parent propagation
  - Phase 16-03: Cache processor logging
  - Phase 16-04: Discogs processor logging

tech-stack:
  added: []
  patterns:
    - Flat job chain structure (all children point to root)

key-files:
  created:
    - prisma/migrations/20260206182344_add_is_root_job/migration.sql
  modified:
    - prisma/schema.prisma
    - src/lib/queue/jobs.ts

decisions:
  - isRootJob with default false for new logs
  - Composite index for efficient table queries

metrics:
  tasks: 3
  commits: 3
  lines_added: ~28
---

# Phase 16 Plan 01: Schema Foundation for Job Linking

**One-liner:** Added isRootJob field to EnrichmentLog and parentJobId to all job data interfaces for job chain tracking.

## What Was Built

This plan establishes the schema foundation for job chain linking:

**EnrichmentLog Schema:**

- Added `isRootJob` Boolean field with default `false`
- Added composite index `@@index([isRootJob, createdAt])` for efficient root queries
- Enables table query: `WHERE isRootJob = true` to show only top-level entries

**Job Data Interfaces:**
Added `parentJobId?: string` field to 10 job data interfaces that participate in job chains:

- CheckAlbumEnrichmentJobData
- CheckArtistEnrichmentJobData
- CheckTrackEnrichmentJobData
- EnrichAlbumJobData
- EnrichArtistJobData
- EnrichTrackJobData
- CacheAlbumCoverArtJobData
- CacheArtistImageJobData
- DiscogsSearchArtistJobData
- DiscogsGetArtistJobData

## Key Implementation Details

**Flat Job Chain Structure:**
Every child job points to the root job regardless of chain depth. For example:

- ENRICH_ALBUM (root) → ENRICH_ARTIST → CACHE_IMAGE
- All three have the same parentJobId (the ENRICH_ALBUM job ID)

This enables single `WHERE parentJobId = rootJobId` queries to get all children without recursive traversal.

**Root Job Identification:**

- Jobs without a parent set `isRootJob: true`
- Legacy logs (null parentJobId) can be distinguished from orphaned child logs
- Table displays only `isRootJob = true` entries at top level

## Commits

- d85d1fe: feat(16-01): add isRootJob field to EnrichmentLog schema
- 2639822: feat(16-01): create migration for isRootJob field
- 0983999: feat(16-01): add parentJobId to all job data interfaces

## Verification Results

- Prisma validate: passed
- TypeScript type-check: passed
- Migration exists with correct schema
- All 10 job data interfaces have parentJobId field

## Deviations from Plan

**1. [Rule 1 - Bug] Fixed any type in DiscogsSearchArtistJobData**

- Found during: Task 3
- Issue: musicbrainzData field used `any` type
- Fix: Changed to `unknown` per TypeScript standards
- Files modified: src/lib/queue/jobs.ts
- Commit: 0983999

## Next Steps

Processors can now be updated to:

1. Set `isRootJob: true` when creating root job logs
2. Propagate `parentJobId` through job chains
3. Pass `parentJobId` when spawning child jobs

---

_Phase: 16-job-linking | Plan: 01 | Completed: 2026-02-07_
