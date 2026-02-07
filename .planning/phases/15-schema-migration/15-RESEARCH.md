# Phase 15: Schema & Migration - Research

**Researched:** 2026-02-06
**Domain:** Prisma ORM schema migrations
**Confidence:** HIGH

## Summary

This phase adds a `parentJobId` field to the EnrichmentLog model to enable parent-child job linking for timeline UI. The research confirms this is a straightforward Prisma migration with a nullable VARCHAR field and an index.

The EnrichmentLog model already has a `jobId` field (`VARCHAR(100)`) that serves as the template for `parentJobId`. The migration pattern is well-established in this codebase (38 prior migrations), and adding a nullable field with an index requires no data backfill.

**Primary recommendation:** Add `parentJobId` field following the exact pattern of the existing `jobId` field, then add a dedicated index for efficient child lookups.

## Standard Stack

### Core

- **Prisma ORM** | 6.17.1 | Schema management and migrations | Industry standard for Next.js apps
- **PostgreSQL** | 15+ | Database backend | Already in use, supports all required features

### Commands

```bash
# Add field to schema, then run:
pnpm prisma migrate dev --name add_parent_job_id

# Verify client regeneration:
pnpm prisma generate  # (auto-runs with migrate dev)
```

## Architecture Patterns

### Field Definition Pattern

Follow the existing `jobId` field exactly:

```prisma
// Current jobId field in EnrichmentLog:
jobId              String?                @map("job_id") @db.VarChar(100)

// New parentJobId field (same pattern):
parentJobId        String?                @map("parent_job_id") @db.VarChar(100)
```

Key attributes:

- **Optional (`String?`)**: Existing logs will have `null`, which is correct (standalone jobs)
- **Column mapping (`@map("parent_job_id")`)**: Snake_case for PostgreSQL convention
- **Type annotation (`@db.VarChar(100)`)**: Matches `jobId` type exactly

### Index Pattern

Follow existing EnrichmentLog index conventions:

```prisma
// Existing indexes in EnrichmentLog:
@@index([entityType, entityId])
@@index([artistId, createdAt])
@@index([albumId, createdAt])
@@index([trackId, createdAt])
@@index([status, createdAt])
@@index([operation])
@@index([sources])
@@index([userId])

// New index for parentJobId:
@@index([parentJobId])
```

Single-column index is sufficient because:

- Primary use case: `WHERE parentJobId = ?` to fetch children
- No common compound query patterns expected
- Index on `createdAt` already exists separately

### Migration SQL Pattern

The generated migration will look like:

```sql
-- AlterTable
ALTER TABLE "enrichment_logs" ADD COLUMN "parent_job_id" VARCHAR(100);

-- CreateIndex
CREATE INDEX "enrichment_logs_parent_job_id_idx" ON "enrichment_logs"("parent_job_id");
```

## Don't Hand-Roll

| Problem       | Don't Build         | Use Instead          | Why                                  |
| ------------- | ------------------- | -------------------- | ------------------------------------ |
| Migration SQL | Raw SQL files       | `prisma migrate dev` | Type-safe, versioned, rollback-ready |
| Index syntax  | Custom CREATE INDEX | Prisma `@@index()`   | Automatic naming, schema sync        |
| Null handling | Manual COALESCE     | Optional field (`?`) | Prisma handles NULL safely           |

**Key insight:** Prisma generates correct PostgreSQL DDL for nullable fields. Adding a nullable column requires no data migration since existing rows get `NULL` automatically.

## Common Pitfalls

### Pitfall 1: Using `db push` instead of `migrate dev`

**What goes wrong:** No migration file created, changes not version-controlled
**Why it happens:** `db push` is faster for prototyping
**How to avoid:** Always use `prisma migrate dev --name descriptive_name` in this codebase
**Warning signs:** Missing migration folder in `prisma/migrations/`

### Pitfall 2: Inconsistent Field Naming

**What goes wrong:** Column name doesn't match convention (snake_case in DB)
**Why it happens:** Forgetting `@map()` attribute
**How to avoid:** Copy exact pattern from `jobId` field
**Warning signs:** Column named `parentJobId` instead of `parent_job_id` in PostgreSQL

### Pitfall 3: Missing Index

**What goes wrong:** Slow child lookups when table grows
**Why it happens:** Index added in separate migration or forgotten
**How to avoid:** Add `@@index([parentJobId])` in same schema change
**Warning signs:** Query plans showing sequential scans on `parentJobId` filter

### Pitfall 4: Breaking Existing Data

**What goes wrong:** Migration fails or corrupts data
**Why it happens:** Field defined as required (`String` instead of `String?`)
**How to avoid:** Field MUST be nullable (`String?`) since existing logs have no parent
**Warning signs:** Migration error about NOT NULL constraint violation

## Code Examples

### Schema Change

Source: Existing EnrichmentLog model in `prisma/schema.prisma`

```prisma
model EnrichmentLog {
  id                 String                 @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  entityType         EnrichmentEntityType?  @map("entity_type")
  entityId           String?                @map("entity_id") @db.Uuid
  artistId           String?                @map("artist_id") @db.Uuid
  albumId            String?                @map("album_id") @db.Uuid
  trackId            String?                @map("track_id") @db.Uuid
  operation          String                 @db.VarChar(100)
  sources            String[]
  status             EnrichmentStatus
  reason             String?
  fieldsEnriched     String[]               @map("fields_enriched")
  dataQualityBefore  DataQuality?           @map("data_quality_before")
  dataQualityAfter   DataQuality?           @map("data_quality_after")
  errorMessage       String?                @map("error_message")
  errorCode          String?                @map("error_code") @db.VarChar(50)
  retryCount         Int                    @default(0) @map("retry_count")
  durationMs         Int?                   @map("duration_ms")
  apiCallCount       Int                    @default(0) @map("api_call_count")
  metadata           Json?
  previewData        Json?                  @map("preview_data")
  jobId              String?                @map("job_id") @db.VarChar(100)
  parentJobId        String?                @map("parent_job_id") @db.VarChar(100)  // NEW
  triggeredBy        String?                @map("triggered_by") @db.VarChar(50)
  userId             String?                @map("user_id")
  createdAt          DateTime               @default(now()) @map("created_at")
  artist             Artist?                @relation(fields: [artistId], references: [id], onDelete: Cascade)
  album              Album?                 @relation(fields: [albumId], references: [id], onDelete: Cascade)
  track              Track?                 @relation(fields: [trackId], references: [id], onDelete: Cascade)
  user               User?                  @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([entityType, entityId])
  @@index([artistId, createdAt])
  @@index([albumId, createdAt])
  @@index([trackId, createdAt])
  @@index([status, createdAt])
  @@index([operation])
  @@index([sources])
  @@index([userId])
  @@index([parentJobId])  // NEW
  @@map("enrichment_logs")
}
```

### Migration Commands

```bash
# Step 1: Add field and index to schema.prisma (as shown above)

# Step 2: Generate and apply migration
pnpm prisma migrate dev --name add_parent_job_id

# Step 3: Verify (auto-runs with migrate dev, but can run explicitly)
pnpm prisma generate
```

### Verification Query

```sql
-- Verify field exists
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'enrichment_logs' AND column_name = 'parent_job_id';
-- Expected: parent_job_id | character varying | 100 | YES

-- Verify index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'enrichment_logs' AND indexname LIKE '%parent_job_id%';
-- Expected: enrichment_logs_parent_job_id_idx | CREATE INDEX...
```

## State of the Art

| Old Approach          | Current Approach                    | When Changed         | Impact                        |
| --------------------- | ----------------------------------- | -------------------- | ----------------------------- |
| `db push` for changes | `migrate dev` with named migrations | Project standard     | Version-controlled migrations |
| Raw SQL migrations    | Prisma schema-first                 | Prisma 1 → 2+ (2020) | Type-safe schema management   |

**No deprecated patterns in this domain.** Prisma 6.x migration workflow is stable and matches project conventions.

## Open Questions

None. This phase is straightforward:

1. Add nullable `parentJobId` field (VARCHAR 100) - following `jobId` pattern
2. Add `@@index([parentJobId])` - following existing index patterns
3. Run `prisma migrate dev` - following project convention
4. Verify client regeneration - automatic with migrate dev

All requirements (DATA-01, DATA-02, DATA-03) are covered by this approach.

## Sources

### Primary (HIGH confidence)

- **Prisma Schema Reference** - [https://www.prisma.io/docs/orm/reference/prisma-schema-reference](https://www.prisma.io/docs/orm/reference/prisma-schema-reference) - Field types, @map, @db.VarChar, @@index
- **Prisma Migrate Getting Started** - [https://www.prisma.io/docs/orm/prisma-migrate/getting-started](https://www.prisma.io/docs/orm/prisma-migrate/getting-started) - migrate dev workflow
- **Existing codebase** - `prisma/schema.prisma` (EnrichmentLog model, lines 398-437)
- **Existing migrations** - 38 migration files in `prisma/migrations/` showing established patterns

### Secondary (MEDIUM confidence)

- **v1.2-RESEARCH.md** - `.planning/research/v1.2-RESEARCH.md` - Pre-researched `parentJobId` approach and schema design

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Prisma 6.17.1 verified, project patterns well-established
- Architecture: HIGH - Exact pattern exists (jobId field), 38 prior migrations as reference
- Pitfalls: HIGH - Common issues documented from codebase conventions (CLAUDE.md)

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days - stable domain, Prisma version unlikely to change)
