/*
  Warnings:

  - A unique constraint covering the columns `[spotify_id]` on the table `tracks` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "data_quality" VARCHAR(10) NOT NULL DEFAULT 'LOW',
ADD COLUMN     "enrichment_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "last_enriched" TIMESTAMP(3),
ADD COLUMN     "spotify_id" VARCHAR(50),
ADD COLUMN     "spotify_url" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tracks_spotify_id_key" ON "tracks"("spotify_id");
