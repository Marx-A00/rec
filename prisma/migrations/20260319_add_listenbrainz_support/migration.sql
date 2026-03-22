-- AlterEnum: Add LISTENBRAINZ to ContentSource
ALTER TYPE "ContentSource" ADD VALUE 'LISTENBRAINZ';

-- AlterEnum: Add LISTENBRAINZ_FRESH_RELEASES to SyncJobType
ALTER TYPE "SyncJobType" ADD VALUE 'LISTENBRAINZ_FRESH_RELEASES';

-- AlterTable: Add listenbrainz_scheduler_enabled to app_config
ALTER TABLE "app_config" ADD COLUMN "listenbrainz_scheduler_enabled" BOOLEAN NOT NULL DEFAULT false;
