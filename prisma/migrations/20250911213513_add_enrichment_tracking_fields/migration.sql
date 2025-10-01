/*
  Warnings:

  - A unique constraint covering the columns `[spotify_id]` on the table `artists` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "DataQuality" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "EnrichmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "albums" ADD COLUMN     "data_quality" "DataQuality" DEFAULT 'LOW',
ADD COLUMN     "enrichment_status" "EnrichmentStatus" DEFAULT 'PENDING',
ADD COLUMN     "last_enriched" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "artists" ADD COLUMN     "data_quality" "DataQuality" DEFAULT 'LOW',
ADD COLUMN     "enrichment_status" "EnrichmentStatus" DEFAULT 'PENDING',
ADD COLUMN     "last_enriched" TIMESTAMP(3),
ADD COLUMN     "spotify_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "artists_spotify_id_key" ON "artists"("spotify_id");
