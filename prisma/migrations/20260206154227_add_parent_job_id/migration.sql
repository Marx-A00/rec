-- AlterTable
ALTER TABLE "enrichment_logs" ADD COLUMN     "parent_job_id" VARCHAR(100);

-- CreateIndex
CREATE INDEX "enrichment_logs_parent_job_id_idx" ON "enrichment_logs"("parent_job_id");
