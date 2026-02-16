-- Rename constraints and indexes from enrichment_logs to llama_logs
-- (ALTER TABLE RENAME doesn't rename these automatically in PostgreSQL)

-- Primary key
ALTER INDEX "enrichment_logs_pkey" RENAME TO "llama_logs_pkey";

-- Foreign keys
ALTER TABLE "llama_logs" RENAME CONSTRAINT "enrichment_logs_album_id_fkey" TO "llama_logs_album_id_fkey";
ALTER TABLE "llama_logs" RENAME CONSTRAINT "enrichment_logs_artist_id_fkey" TO "llama_logs_artist_id_fkey";
ALTER TABLE "llama_logs" RENAME CONSTRAINT "enrichment_logs_track_id_fkey" TO "llama_logs_track_id_fkey";
ALTER TABLE "llama_logs" RENAME CONSTRAINT "enrichment_logs_user_id_fkey" TO "llama_logs_user_id_fkey";

-- Indexes
ALTER INDEX "enrichment_logs_album_id_created_at_idx" RENAME TO "llama_logs_album_id_created_at_idx";
ALTER INDEX "enrichment_logs_artist_id_created_at_idx" RENAME TO "llama_logs_artist_id_created_at_idx";
ALTER INDEX "enrichment_logs_entity_type_entity_id_idx" RENAME TO "llama_logs_entity_type_entity_id_idx";
ALTER INDEX "enrichment_logs_is_root_job_created_at_idx" RENAME TO "llama_logs_is_root_job_created_at_idx";
ALTER INDEX "enrichment_logs_operation_idx" RENAME TO "llama_logs_operation_idx";
ALTER INDEX "enrichment_logs_parent_job_id_idx" RENAME TO "llama_logs_parent_job_id_idx";
ALTER INDEX "enrichment_logs_sources_idx" RENAME TO "llama_logs_sources_idx";
ALTER INDEX "enrichment_logs_status_created_at_idx" RENAME TO "llama_logs_status_created_at_idx";
ALTER INDEX "enrichment_logs_track_id_created_at_idx" RENAME TO "llama_logs_track_id_created_at_idx";
ALTER INDEX "enrichment_logs_user_id_idx" RENAME TO "llama_logs_user_id_idx";

-- Fix camelCase index names to snake_case
ALTER INDEX "llama_logs_category_createdAt_idx" RENAME TO "llama_logs_category_created_at_idx";
ALTER INDEX "llama_logs_rootJobId_idx" RENAME TO "llama_logs_root_job_id_idx";

-- Add USER_ACTION to LlamaLogCategory enum
ALTER TYPE "LlamaLogCategory" ADD VALUE 'USER_ACTION';
