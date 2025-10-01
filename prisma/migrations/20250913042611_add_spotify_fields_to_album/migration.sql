/*
  Warnings:

  - A unique constraint covering the columns `[spotify_id]` on the table `albums` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "albums" ADD COLUMN     "spotify_id" VARCHAR(50),
ADD COLUMN     "spotify_url" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "albums_spotify_id_key" ON "albums"("spotify_id");
