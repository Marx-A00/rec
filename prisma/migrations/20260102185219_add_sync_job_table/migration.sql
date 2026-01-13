-- CreateEnum
CREATE TYPE "SyncJobType" AS ENUM ('SPOTIFY_NEW_RELEASES', 'SPOTIFY_FEATURED_PLAYLISTS', 'MUSICBRAINZ_NEW_RELEASES', 'MUSICBRAINZ_SYNC', 'DISCOGS_SYNC', 'ENRICHMENT_BATCH');

-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "sync_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" VARCHAR(100) NOT NULL,
    "job_type" "SyncJobType" NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "albums_created" INTEGER NOT NULL DEFAULT 0,
    "albums_updated" INTEGER NOT NULL DEFAULT 0,
    "albums_skipped" INTEGER NOT NULL DEFAULT 0,
    "artists_created" INTEGER NOT NULL DEFAULT 0,
    "artists_updated" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "error_code" VARCHAR(50),
    "metadata" JSONB,
    "triggered_by" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sync_jobs_job_id_key" ON "sync_jobs"("job_id");

-- CreateIndex
CREATE INDEX "sync_jobs_job_type_status_idx" ON "sync_jobs"("job_type", "status");

-- CreateIndex
CREATE INDEX "sync_jobs_status_started_at_idx" ON "sync_jobs"("status", "started_at");

-- CreateIndex
CREATE INDEX "sync_jobs_started_at_idx" ON "sync_jobs"("started_at");

-- CreateIndex
CREATE INDEX "sync_jobs_job_id_idx" ON "sync_jobs"("job_id");
