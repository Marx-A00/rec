-- AlterEnum
ALTER TYPE "SyncJobType" ADD VALUE 'DEEZER_EDITORIAL_RELEASES';

-- AlterTable
ALTER TABLE "app_config" ADD COLUMN     "deezer_editorial_filter_deluxe" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "deezer_editorial_genres" TEXT[] DEFAULT ARRAY['0']::TEXT[],
ADD COLUMN     "deezer_editorial_interval_minutes" INTEGER NOT NULL DEFAULT 10080,
ADD COLUMN     "deezer_editorial_max_releases" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "deezer_editorial_scheduler_enabled" BOOLEAN NOT NULL DEFAULT false;
