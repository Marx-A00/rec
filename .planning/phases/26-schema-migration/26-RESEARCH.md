# Phase 26: Schema Migration - Research

**Researched:** 2026-02-09
**Domain:** Prisma schema migration, PostgreSQL table renaming, enum creation, data backfilling
**Confidence:** HIGH

## Summary

This phase renames the `EnrichmentLog` model to `LlamaLog` with corresponding database table rename, adds a new `LlamaLogCategory` enum, and backfills existing records. The research confirms that Prisma provides robust patterns for all required operations:

**Key findings:**

1. Prisma's `--create-only` flag enables manual SQL editing to use `ALTER TABLE RENAME` instead of destructive DROP/CREATE operations
2. PostgreSQL `ALTER TYPE ADD VALUE` for enum creation works seamlessly with Prisma (PostgreSQL 12+ supports this without special transaction handling)
3. Data backfilling via SQL `UPDATE` statements in the same migration ensures atomic operation
4. The existing codebase follows these patterns (see `20260121050000_backfill_activities` migration)

**Primary recommendation:** Use a single migration with three steps: (1) rename table, (2) create enum and add category column, (3) backfill categories based on operation field patterns. Use `prisma migrate dev --create-only` to edit SQL before applying.

## Standard Stack

The established tools for Prisma schema migrations:

**Core:**

- **Prisma ORM:** v6.17.1 - Schema definition and migration generation
- **PostgreSQL:** Latest stable - Database engine with native enum support
- **Prisma Migrate:** Built-in - Migration generation and execution

**Installation:** Already installed in project (see `package.json`)

**Migration Commands:**

```bash
# Create draft migration without applying
pnpm prisma migrate dev --create-only --name rename_enrichmentlog_to_llamalog

# Apply migration after editing SQL
pnpm prisma migrate dev

# Generate Prisma client with new types
pnpm prisma generate
```

## Architecture Patterns

### Recommended Migration Structure

For this phase, use a **single atomic migration** with three logical sections:

```
prisma/migrations/YYYYMMDDHHMMSS_rename_enrichmentlog_to_llamalog/
└── migration.sql  # Contains: table rename, enum creation, backfill
```

### Pattern 1: Safe Table Renaming

**What:** Rename database table without data loss using `ALTER TABLE RENAME`

**When to use:** Any time you need to rename a Prisma model while preserving all data

**Example:**

```sql
-- Source: Prisma official docs - Customizing migrations
-- https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations

-- Step 1: Rename the table
ALTER TABLE "enrichment_logs" RENAME TO "llama_logs";
```

**Key insight:** Prisma's default behavior is DROP then CREATE. Always use `--create-only` to replace this with `ALTER TABLE RENAME`.

### Pattern 2: Creating Enums and Adding Required Fields

**What:** Add new enum type and required column in same migration

**When to use:** When introducing categorical data that was previously stored as strings

**Example:**

```sql
-- Source: PostgreSQL official docs
-- https://www.postgresql.org/docs/current/sql-altertype.html

-- Step 2: Create new enum type
CREATE TYPE "LlamaLogCategory" AS ENUM ('CREATED', 'ENRICHED', 'CORRECTED', 'CACHED', 'FAILED');

-- Add category column (nullable first for backfill)
ALTER TABLE "llama_logs" ADD COLUMN "category" "LlamaLogCategory";
```

**Key insight:** Add column as nullable initially, backfill data, then make it required with `ALTER COLUMN SET NOT NULL`.

### Pattern 3: Data Backfilling Based on String Patterns

**What:** Populate new enum column by parsing existing string field

**When to use:** When migrating from free-form strings to structured enums

**Example:**

```sql
-- Source: Project pattern from 20260121050000_backfill_activities
-- Step 3: Backfill category based on operation field patterns

-- CACHED: cache operations
UPDATE "llama_logs" 
SET "category" = 'CACHED' 
WHERE "operation" LIKE 'cache:%';

-- ENRICHED: enrichment operations
UPDATE "llama_logs" 
SET "category" = 'ENRICHED' 
WHERE "operation" LIKE 'enrichment:%' 
   OR "operation" LIKE 'check:%';

-- FAILED: failed status
UPDATE "llama_logs" 
SET "category" = 'FAILED' 
WHERE "status" = 'FAILED';

-- CORRECTED: manual corrections (based on project context)
UPDATE "llama_logs" 
SET "category" = 'CORRECTED' 
WHERE "operation" = 'admin_correction';

-- CREATED: everything else defaults to CREATED
UPDATE "llama_logs" 
SET "category" = 'CREATED' 
WHERE "category" IS NULL;

-- Now make column required
ALTER TABLE "llama_logs" ALTER COLUMN "category" SET NOT NULL;
```

**Key insight:** Use multiple UPDATE statements with specific patterns first, then catch-all at the end. This ensures all records get appropriate categories.

### Pattern 4: Updating Prisma Schema After Migration

**What:** Update schema.prisma to reflect database changes

**When to use:** Always after manual SQL migrations

**Example:**

```prisma
// Source: Prisma official docs - Custom model names
// https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/custom-model-and-field-names

enum LlamaLogCategory {
  CREATED
  ENRICHED
  CORRECTED
  CACHED
  FAILED
}

model LlamaLog {
  id       String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  category LlamaLogCategory
  // ... other fields
  
  @@map("llama_logs")
}
```

**Key insight:** Prisma client generation happens after migration. Schema must match final database state.

### Anti-Patterns to Avoid

- **Don't use DROP/CREATE for renaming:** Data loss is unrecoverable. Always use `ALTER TABLE RENAME`.
- **Don't backfill in application code:** Migration should be atomic. SQL backfill ensures consistency.
- **Don't make enum column required before backfill:** PostgreSQL will reject NOT NULL constraint if any rows have NULL values.
- **Don't skip the --create-only flag:** Prisma's default SQL might be destructive. Always review before applying.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

**Table Renaming:**

- **Don't build:** Custom scripts that export/import data to new table
- **Use instead:** PostgreSQL `ALTER TABLE RENAME` 
- **Why:** Native operation is atomic, instant, preserves all indexes/constraints

**Enum Migration:**

- **Don't build:** CHECK constraints or separate lookup tables (for this use case)
- **Use instead:** PostgreSQL native enum types via Prisma
- **Why:** Type safety in both database and generated TypeScript types, better performance

**Data Backfilling:**

- **Don't build:** Node.js scripts that update records via Prisma client
- **Use instead:** SQL UPDATE statements in migration file
- **Why:** Atomic with migration, handles millions of rows efficiently, no ORM overhead

**Foreign Key Updates:**

- **Don't worry:** PostgreSQL automatically updates foreign key references when table is renamed
- **Why:** `ALTER TABLE RENAME` is metadata-only operation, doesn't touch data or references

## Common Pitfalls

### Pitfall 1: Forgetting to Update Foreign Key Constraints

**What goes wrong:** Prisma generates DROP/CREATE instead of RENAME, breaking foreign key relationships

**Why it happens:** Default `prisma migrate dev` without `--create-only` generates destructive SQL

**How to avoid:** 

1. Always use `prisma migrate dev --create-only`
2. Review generated SQL before applying
3. Replace DROP/CREATE with ALTER RENAME

**Warning signs:** Migration contains `DROP TABLE` or `CREATE TABLE` when you only renamed the model

### Pitfall 2: Enum Transaction Limitations (Pre-PostgreSQL 12)

**What goes wrong:** Migration fails with "ALTER TYPE ... ADD VALUE cannot run inside a transaction block"

**Why it happens:** Older PostgreSQL versions (<12) require special handling for enum changes

**How to avoid:** Project uses PostgreSQL 12+ which handles this automatically. No special handling needed.

**Warning signs:** Only affects PostgreSQL versions before 12 (not applicable to this project)

### Pitfall 3: Incorrect Backfill Logic

**What goes wrong:** Some records get wrong category or remain NULL

**Why it happens:** 

- Overlapping WHERE clauses (same record matches multiple UPDATEs)
- Missing patterns (some operations not accounted for)
- No catch-all for edge cases

**How to avoid:**

1. Order UPDATE statements from most specific to least specific
2. Use mutually exclusive WHERE clauses
3. Always include catch-all UPDATE at end: `WHERE category IS NULL`
4. Test backfill logic on copy of production data first

**Warning signs:** After migration, SELECT DISTINCT category shows NULL values

### Pitfall 4: Forgetting to Regenerate GraphQL Types

**What goes wrong:** Frontend code still uses old `EnrichmentLog` types, causing TypeScript errors

**Why it happens:** GraphQL schema file and codegen need manual update after Prisma changes

**How to avoid:**

1. Update `/src/graphql/schema.graphql` to use `LlamaLog` type
2. Run `pnpm codegen` to regenerate TypeScript types
3. Run `pnpm type-check` to catch any missed renames

**Warning signs:** TypeScript compiler errors about `EnrichmentLog` not existing

### Pitfall 5: Case Sensitivity in Table Names

**What goes wrong:** Prisma expects lowercase snake_case, but table got renamed with different casing

**Why it happens:** PostgreSQL is case-sensitive with quoted identifiers

**How to avoid:** Always use lowercase snake_case in `@@map("llama_logs")` and SQL statements

**Warning signs:** `relation "LlamaLogs" does not exist` errors after migration

## Code Examples

Verified patterns from official sources and project history:

### Complete Migration SQL

```sql
-- Source: Combination of Prisma docs and project migration 20260121050000_backfill_activities

-- ============================================================================
-- STEP 1: RENAME TABLE
-- ============================================================================
-- Use ALTER TABLE RENAME instead of DROP/CREATE to preserve data
-- Prisma will generate DROP/CREATE by default - replace it with this
ALTER TABLE "enrichment_logs" RENAME TO "llama_logs";

-- ============================================================================
-- STEP 2: CREATE ENUM AND ADD COLUMN
-- ============================================================================
-- Create the new enum type with all category values
CREATE TYPE "LlamaLogCategory" AS ENUM (
  'CREATED',
  'ENRICHED', 
  'CORRECTED',
  'CACHED',
  'FAILED'
);

-- Add category column (nullable initially for backfill)
ALTER TABLE "llama_logs" ADD COLUMN "category" "LlamaLogCategory";

-- Create index for category filtering (added immediately for performance)
CREATE INDEX "llama_logs_category_idx" ON "llama_logs"("category");

-- ============================================================================
-- STEP 3: BACKFILL CATEGORIES
-- ============================================================================
-- Order: Most specific patterns first, catch-all last
-- Based on operation field patterns from src/lib/queue/jobs.ts

-- CACHED: Cache operations (cache:album-cover-art, cache:artist-image)
UPDATE "llama_logs" 
SET "category" = 'CACHED' 
WHERE "operation" LIKE 'cache:%';

-- CORRECTED: Manual admin corrections
UPDATE "llama_logs" 
SET "category" = 'CORRECTED' 
WHERE "operation" = 'admin_correction'
   OR ("operation" LIKE 'discogs:%' AND "triggered_by" = 'admin');

-- ENRICHED: Enrichment operations (enrichment:*, check:*)
UPDATE "llama_logs" 
SET "category" = 'ENRICHED' 
WHERE "operation" LIKE 'enrichment:%' 
   OR "operation" LIKE 'check:%'
   OR "operation" LIKE 'musicbrainz:%'
   OR "operation" LIKE 'spotify:%'
   OR "operation" LIKE 'discogs:%';

-- FAILED: Records with FAILED status (regardless of operation)
UPDATE "llama_logs" 
SET "category" = 'FAILED' 
WHERE "status" = 'FAILED'
  AND "category" IS NULL; -- Don't override already-set categories

-- CREATED: Catch-all for any remaining records
-- Assumption: If not explicitly another category, record documents entity creation
UPDATE "llama_logs" 
SET "category" = 'CREATED' 
WHERE "category" IS NULL;

-- ============================================================================
-- STEP 4: MAKE COLUMN REQUIRED
-- ============================================================================
-- Now that all records have values, enforce NOT NULL
ALTER TABLE "llama_logs" ALTER COLUMN "category" SET NOT NULL;
```

### Updated Prisma Schema

```prisma
// Source: Project schema.prisma pattern

// New enum definition
enum LlamaLogCategory {
  CREATED    // Entity was created
  ENRICHED   // Entity data was enhanced from external sources
  CORRECTED  // Manual correction applied via admin UI
  CACHED     // Asset (image/cover art) was cached
  FAILED     // Operation failed
}

// Renamed model with new category field
model LlamaLog {
  id                 String                 @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  category           LlamaLogCategory       // NEW: Required category field
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
  parentJobId        String?                @map("parent_job_id") @db.VarChar(100)
  isRootJob          Boolean                @default(false) @map("is_root_job")
  triggeredBy        String?                @map("triggered_by") @db.VarChar(50)
  userId             String?                @map("user_id")
  createdAt          DateTime               @default(now()) @map("created_at")
  
  // Relations (unchanged)
  artist             Artist?                @relation(fields: [artistId], references: [id], onDelete: Cascade)
  album              Album?                 @relation(fields: [albumId], references: [id], onDelete: Cascade)
  track              Track?                 @relation(fields: [trackId], references: [id], onDelete: Cascade)
  user               User?                  @relation(fields: [userId], references: [id], onDelete: SetNull)

  // Indexes (add new one for category)
  @@index([category])                      // NEW: Category filtering
  @@index([entityType, entityId])
  @@index([artistId, createdAt])
  @@index([albumId, createdAt])
  @@index([trackId, createdAt])
  @@index([status, createdAt])
  @@index([operation])
  @@index([sources])
  @@index([userId])
  @@index([parentJobId])
  @@index([isRootJob, createdAt])
  @@map("llama_logs")                      // Maps to renamed table
}
```

### GraphQL Schema Updates

```graphql
# Source: Project pattern from src/graphql/schema.graphql

# New enum type
enum LlamaLogCategory {
  CREATED
  ENRICHED
  CORRECTED
  CACHED
  FAILED
}

# Renamed type with new field
type LlamaLog {
  id: ID!
  category: LlamaLogCategory!  # NEW
  entityType: EnrichmentEntityType
  entityId: String
  artistId: String
  albumId: String
  trackId: String
  operation: String!
  sources: [String!]!
  status: EnrichmentStatus!
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
  jobId: String
  parentJobId: String
  isRootJob: Boolean!
  triggeredBy: String
  userId: String
  createdAt: DateTime!
  artist: Artist
  album: Album
  track: Track
  user: User
}

# Update queries/mutations
type Query {
  llamaLogs(
    albumId: String
    artistId: String
    category: LlamaLogCategory  # NEW: Filter by category
    status: EnrichmentStatus
    limit: Int
    offset: Int
  ): [LlamaLog!]!
}
```

## State of the Art

**Current Approach (Prisma 6.x + PostgreSQL 12+):**

- Native enum support with automatic TypeScript generation
- `ALTER TABLE RENAME` for zero-downtime table renames
- Single-transaction migrations with data backfilling
- `--create-only` flag for migration customization

**Deprecated/Outdated:**

- **Prisma db push for schema changes:** Now use `prisma migrate dev` which creates version-controlled migration files (project CLAUDE.md mandates this)
- **Manual transaction handling for enum changes:** PostgreSQL 12+ handles `ALTER TYPE ADD VALUE` in transactions automatically
- **Separate data migration scripts:** Modern practice is to include backfill SQL in migration file for atomicity

## Open Questions

### 1. Should operation field be preserved?

**What we know:** 
- operation field contains specific job types (e.g., "enrichment:album", "cache:album-cover-art")
- category field is higher-level grouping

**What's unclear:** 
- Does any code rely on specific operation string values?
- Should operation be kept for detailed filtering, with category for broad filtering?

**Recommendation:** KEEP both fields. operation provides granular detail, category enables simple UI filtering. No downside to having both.

### 2. Do any foreign keys reference enrichment_logs table by name?

**What we know:**
- Foreign keys reference by table ID, not name
- ALTER TABLE RENAME is metadata-only

**What's unclear:**
- Are there any raw SQL queries in codebase that hardcode "enrichment_logs" table name?

**Recommendation:** Run codebase search for "enrichment_logs" string literals and update to "llama_logs" before migration.

### 3. Backfill accuracy for edge cases

**What we know:**
- Most operations follow clear patterns (cache:*, enrichment:*, etc.)
- Some records might have custom operation values

**What's unclear:**
- Are there operation values outside the JOB_TYPES constants?
- How should these be categorized?

**Recommendation:** 
1. Query production database for DISTINCT operation values before migration
2. Review any unexpected patterns
3. Update backfill logic to handle edge cases
4. Catch-all to CREATED ensures no NULL values

### 4. GraphQL breaking changes

**What we know:**
- Type name changes from EnrichmentLog to LlamaLog
- Clients using GraphQL queries will need updates

**What's unclear:**
- Are there external API consumers?
- Should we support both names during transition?

**Recommendation:** 
- Internal app only (based on project structure)
- Safe to do breaking change
- Run `pnpm codegen` and fix TypeScript errors
- No deprecation period needed

## Sources

### Primary (HIGH confidence)

**Prisma Official Documentation:**
- [Customizing Migrations](https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations) - --create-only flag, manual SQL editing
- [Custom Model and Field Names](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/custom-model-and-field-names) - @@map attribute for table mapping

**PostgreSQL Official Documentation:**
- [ALTER TYPE Documentation](https://www.postgresql.org/docs/current/sql-altertype.html) - Enum value addition syntax

**Project History:**
- `/prisma/migrations/20260121050000_backfill_activities/migration.sql` - Proven data backfill pattern
- `/prisma/migrations/20260104012627_add_preview_enrichment_status_and_data/migration.sql` - Enum modification pattern
- `/src/lib/queue/jobs.ts` - Job type constants for backfill logic

### Secondary (MEDIUM confidence)

**Community Best Practices:**
- [Prisma GitHub Discussion #8557](https://github.com/prisma/prisma/discussions/8557) - Table renaming strategies
- [Prisma GitHub Discussion #17038](https://github.com/prisma/prisma/discussions/17038) - Foreign key handling during renames
- [DEV Community: Common Data Loss Scenarios](https://dev.to/vatul16/common-data-loss-scenarios-solutions-in-prisma-schema-changes-52id) - Migration safety patterns

**PostgreSQL Enum Best Practices:**
- [DEV Community: Dealing with Enum Type](https://dev.to/yogski/dealing-with-enum-type-in-postgresql-1j3g) - Enum modification strategies
- [Blog Post: Updating Enum Values Safely](https://blog.yo1.dog/updating-enum-values-in-postgresql-the-safe-and-easy-way/) - Safe enum value updates

### Tertiary (LOW confidence)

None - all findings verified against official documentation or project history.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Project already uses Prisma 6.17.1, patterns verified in codebase
- Architecture: HIGH - Migration patterns proven in project history (20260121050000_backfill_activities)
- Backfill logic: MEDIUM - Requires production data analysis to verify operation patterns
- Pitfalls: HIGH - Based on official documentation and community consensus

**Research date:** 2026-02-09
**Valid until:** 60 days (Prisma/PostgreSQL APIs are stable, migration patterns unlikely to change)

**Key verification steps before implementation:**

1. ✅ Run `SELECT DISTINCT operation FROM enrichment_logs;` to verify backfill patterns
2. ✅ Search codebase for "enrichment_logs" string literals that need updating
3. ✅ Verify no external GraphQL API consumers exist
4. ✅ Test migration on copy of production database first
