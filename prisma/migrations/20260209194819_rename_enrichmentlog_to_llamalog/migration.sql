-- STEP 1: RENAME TABLE (preserves all data)
ALTER TABLE "enrichment_logs" RENAME TO "llama_logs";

-- STEP 2: CREATE ENUM
CREATE TYPE "LlamaLogCategory" AS ENUM ('CREATED', 'ENRICHED', 'CORRECTED', 'CACHED', 'FAILED');

-- STEP 3: ADD CATEGORY COLUMN (nullable initially for backfill)
ALTER TABLE "llama_logs" ADD COLUMN "category" "LlamaLogCategory";

-- STEP 4: CREATE INDEX FOR CATEGORY FILTERING
CREATE INDEX "llama_logs_category_createdAt_idx" ON "llama_logs"("category", "created_at");

-- STEP 5: BACKFILL CATEGORIES based on operation patterns
-- CACHED: cache operations
UPDATE "llama_logs" SET "category" = 'CACHED' 
WHERE "operation" LIKE 'cache:%';

-- CORRECTED: admin corrections
UPDATE "llama_logs" SET "category" = 'CORRECTED' 
WHERE "operation" = 'admin_correction';

-- ENRICHED: enrichment, check, and API operations  
UPDATE "llama_logs" SET "category" = 'ENRICHED' 
WHERE "operation" LIKE 'enrichment:%' 
   OR "operation" LIKE 'check:%'
   OR "operation" LIKE 'musicbrainz:%'
   OR "operation" LIKE 'spotify:%'
   OR "operation" LIKE 'discogs:%'
   OR "operation" = 'PREVIEW_ENRICHMENT';

-- FAILED: records with FAILED status (overrides previous)
UPDATE "llama_logs" SET "category" = 'FAILED' 
WHERE "status" = 'FAILED' AND "category" IS NULL;

-- CREATED: catch-all for remaining (future creation events)
UPDATE "llama_logs" SET "category" = 'CREATED' 
WHERE "category" IS NULL;

-- STEP 6: MAKE COLUMN REQUIRED (now safe after backfill)
ALTER TABLE "llama_logs" ALTER COLUMN "category" SET NOT NULL;
