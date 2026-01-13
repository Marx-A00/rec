/*
  Warnings:

  - A unique constraint covering the columns `[album_id,musicbrainz_id]` on the table `tracks` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."tracks_musicbrainz_id_key";

-- AlterTable
ALTER TABLE "enrichment_logs" ADD COLUMN     "reason" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tracks_album_id_musicbrainz_id_key" ON "tracks"("album_id", "musicbrainz_id");
