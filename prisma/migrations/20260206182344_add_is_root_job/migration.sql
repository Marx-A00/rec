-- AlterTable
ALTER TABLE "enrichment_logs" ADD COLUMN     "is_root_job" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "enrichment_logs_is_root_job_created_at_idx" ON "enrichment_logs"("is_root_job", "created_at");
