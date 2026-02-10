-- STEP 1: Add LINKED value to LlamaLogCategory enum
ALTER TYPE "LlamaLogCategory" ADD VALUE 'LINKED';

-- STEP 2: Add root_job_id column (nullable)
ALTER TABLE "llama_logs" ADD COLUMN "root_job_id" VARCHAR(100);

-- STEP 3: Create index for root job hierarchy queries
CREATE INDEX "llama_logs_rootJobId_idx" ON "llama_logs"("root_job_id");

-- STEP 4: Backfill root jobs - Set rootJobId = jobId where parentJobId IS NULL and jobId EXISTS
UPDATE "llama_logs"
SET "root_job_id" = "job_id"
WHERE "parent_job_id" IS NULL AND "job_id" IS NOT NULL;

-- STEP 5: Backfill child jobs - Walk parent chain to find root
-- Using recursive CTE with depth limit for safety
WITH RECURSIVE job_chain AS (
  -- Base case: Logs with parents
  SELECT 
    id,
    "job_id",
    "parent_job_id",
    "parent_job_id" as root_candidate,
    1 as depth
  FROM "llama_logs"
  WHERE "parent_job_id" IS NOT NULL
  
  UNION ALL
  
  -- Recursive case: Walk up to find root
  SELECT 
    jc.id,
    jc."job_id",
    parent."parent_job_id",
    COALESCE(parent."job_id", jc.root_candidate) as root_candidate,
    jc.depth + 1
  FROM job_chain jc
  JOIN "llama_logs" parent ON parent."job_id" = jc."parent_job_id"
  WHERE jc.depth < 10
),
root_jobs AS (
  SELECT DISTINCT ON (id)
    id,
    root_candidate as root_job_id
  FROM job_chain
  ORDER BY id, depth DESC
)
UPDATE "llama_logs" ll
SET "root_job_id" = rj.root_job_id
FROM root_jobs rj
WHERE ll.id = rj.id AND ll."root_job_id" IS NULL;

-- STEP 6: Add comment explaining NULL values
COMMENT ON COLUMN "llama_logs"."root_job_id" IS 'Root job ID for hierarchy queries. NULL indicates pre-Phase 29 orphan data without job tracking.';
