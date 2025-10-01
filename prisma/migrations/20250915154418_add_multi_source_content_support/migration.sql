/*
  Warnings:

  - The `data_quality` column on the `tracks` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `enrichment_status` column on the `tracks` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ContentSource" AS ENUM ('DISCOGS', 'MUSICBRAINZ', 'SPOTIFY', 'YOUTUBE', 'BANDCAMP', 'SOUNDCLOUD', 'USER_SUBMITTED');

-- AlterTable
ALTER TABLE "albums" ADD COLUMN     "source" "ContentSource" NOT NULL DEFAULT 'MUSICBRAINZ',
ADD COLUMN     "source_url" TEXT,
ADD COLUMN     "submitted_by" UUID;

-- AlterTable
ALTER TABLE "artists" ADD COLUMN     "source" "ContentSource" NOT NULL DEFAULT 'MUSICBRAINZ',
ADD COLUMN     "source_url" TEXT,
ADD COLUMN     "submitted_by" UUID;

-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "discogs_position" VARCHAR(10),
ADD COLUMN     "discogs_release_id" VARCHAR(20),
ADD COLUMN     "source" "ContentSource" NOT NULL DEFAULT 'USER_SUBMITTED',
ADD COLUMN     "source_url" TEXT,
ADD COLUMN     "submitted_by" UUID,
DROP COLUMN "data_quality",
ADD COLUMN     "data_quality" "DataQuality" NOT NULL DEFAULT 'LOW',
DROP COLUMN "enrichment_status",
ADD COLUMN     "enrichment_status" "EnrichmentStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "albums_source_idx" ON "albums"("source");

-- CreateIndex
CREATE INDEX "artists_source_idx" ON "artists"("source");

-- CreateIndex
CREATE INDEX "tracks_source_idx" ON "tracks"("source");

-- CreateIndex
CREATE INDEX "tracks_discogs_release_id_discogs_position_idx" ON "tracks"("discogs_release_id", "discogs_position");
