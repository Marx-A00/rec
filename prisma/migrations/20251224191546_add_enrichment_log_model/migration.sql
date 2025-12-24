-- CreateEnum
CREATE TYPE "EnrichmentEntityType" AS ENUM ('ARTIST', 'ALBUM', 'TRACK');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EnrichmentStatus" ADD VALUE 'SUCCESS';
ALTER TYPE "EnrichmentStatus" ADD VALUE 'PARTIAL_SUCCESS';
ALTER TYPE "EnrichmentStatus" ADD VALUE 'NO_DATA_AVAILABLE';
ALTER TYPE "EnrichmentStatus" ADD VALUE 'SKIPPED';

-- CreateTable
CREATE TABLE "enrichment_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_type" "EnrichmentEntityType",
    "entity_id" UUID,
    "artist_id" UUID,
    "album_id" UUID,
    "track_id" UUID,
    "operation" VARCHAR(100) NOT NULL,
    "sources" TEXT[],
    "status" "EnrichmentStatus" NOT NULL,
    "fields_enriched" TEXT[],
    "data_quality_before" "DataQuality",
    "data_quality_after" "DataQuality",
    "error_message" TEXT,
    "error_code" VARCHAR(50),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "duration_ms" INTEGER,
    "api_call_count" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "job_id" VARCHAR(100),
    "triggered_by" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrichment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "enrichment_logs_entity_type_entity_id_idx" ON "enrichment_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "enrichment_logs_artist_id_created_at_idx" ON "enrichment_logs"("artist_id", "created_at");

-- CreateIndex
CREATE INDEX "enrichment_logs_album_id_created_at_idx" ON "enrichment_logs"("album_id", "created_at");

-- CreateIndex
CREATE INDEX "enrichment_logs_track_id_created_at_idx" ON "enrichment_logs"("track_id", "created_at");

-- CreateIndex
CREATE INDEX "enrichment_logs_status_created_at_idx" ON "enrichment_logs"("status", "created_at");

-- CreateIndex
CREATE INDEX "enrichment_logs_operation_idx" ON "enrichment_logs"("operation");

-- CreateIndex
CREATE INDEX "enrichment_logs_sources_idx" ON "enrichment_logs"("sources");

-- AddForeignKey
ALTER TABLE "enrichment_logs" ADD CONSTRAINT "enrichment_logs_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrichment_logs" ADD CONSTRAINT "enrichment_logs_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrichment_logs" ADD CONSTRAINT "enrichment_logs_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
