/*
  Warnings:

  - You are about to drop the column `albumArtist` on the `CollectionAlbum` table. All the data in the column will be lost.
  - You are about to drop the column `albumDiscogsId` on the `CollectionAlbum` table. All the data in the column will be lost.
  - You are about to drop the column `albumImageUrl` on the `CollectionAlbum` table. All the data in the column will be lost.
  - You are about to drop the column `albumTitle` on the `CollectionAlbum` table. All the data in the column will be lost.
  - You are about to drop the column `albumYear` on the `CollectionAlbum` table. All the data in the column will be lost.
  - You are about to drop the column `basisAlbumArtist` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `basisAlbumDiscogsId` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `basisAlbumImageUrl` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `basisAlbumTitle` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `basisAlbumYear` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `recommendedAlbumArtist` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `recommendedAlbumDiscogsId` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `recommendedAlbumImageUrl` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `recommendedAlbumTitle` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `recommendedAlbumYear` on the `Recommendation` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[collectionId,album_id]` on the table `CollectionAlbum` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `album_id` to the `CollectionAlbum` table without a default value. This is not possible if the table is not empty.
  - Added the required column `basis_album_id` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recommended_album_id` to the `Recommendation` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "CollectionAlbum_albumDiscogsId_idx";

-- DropIndex
DROP INDEX "CollectionAlbum_collectionId_albumDiscogsId_key";

-- DropIndex
DROP INDEX "Recommendation_basisAlbumDiscogsId_idx";

-- DropIndex
DROP INDEX "Recommendation_recommendedAlbumDiscogsId_idx";

-- AlterTable
ALTER TABLE "CollectionAlbum" DROP COLUMN "albumArtist",
DROP COLUMN "albumDiscogsId",
DROP COLUMN "albumImageUrl",
DROP COLUMN "albumTitle",
DROP COLUMN "albumYear",
ADD COLUMN     "album_id" UUID NOT NULL,
ADD COLUMN     "migrated_from_discogs_id" TEXT;

-- AlterTable
ALTER TABLE "Recommendation" DROP COLUMN "basisAlbumArtist",
DROP COLUMN "basisAlbumDiscogsId",
DROP COLUMN "basisAlbumImageUrl",
DROP COLUMN "basisAlbumTitle",
DROP COLUMN "basisAlbumYear",
DROP COLUMN "recommendedAlbumArtist",
DROP COLUMN "recommendedAlbumDiscogsId",
DROP COLUMN "recommendedAlbumImageUrl",
DROP COLUMN "recommendedAlbumTitle",
DROP COLUMN "recommendedAlbumYear",
ADD COLUMN     "basis_album_id" UUID NOT NULL,
ADD COLUMN     "migrated_from_basis_discogs_id" TEXT,
ADD COLUMN     "migrated_from_recommended_discogs_id" TEXT,
ADD COLUMN     "recommended_album_id" UUID NOT NULL;

-- CreateTable
CREATE TABLE "artists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "musicbrainz_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "biography" TEXT,
    "formed_year" INTEGER,
    "country_code" VARCHAR(2),
    "image_url" TEXT,
    "search_vector" tsvector,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "albums" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "musicbrainz_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "release_date" DATE,
    "release_type" VARCHAR(50),
    "track_count" INTEGER,
    "duration_ms" INTEGER,
    "cover_art_url" TEXT,
    "barcode" VARCHAR(50),
    "label" VARCHAR(255),
    "catalog_number" VARCHAR(100),
    "search_vector" tsvector,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "album_id" UUID NOT NULL,
    "musicbrainz_id" UUID,
    "isrc" VARCHAR(12),
    "title" VARCHAR(255) NOT NULL,
    "track_number" INTEGER NOT NULL,
    "disc_number" INTEGER NOT NULL DEFAULT 1,
    "duration_ms" INTEGER,
    "explicit" BOOLEAN NOT NULL DEFAULT false,
    "preview_url" TEXT,
    "energy" DOUBLE PRECISION,
    "valence" DOUBLE PRECISION,
    "danceability" DOUBLE PRECISION,
    "tempo" DOUBLE PRECISION,
    "acousticness" DOUBLE PRECISION,
    "instrumentalness" DOUBLE PRECISION,
    "liveness" DOUBLE PRECISION,
    "loudness" DOUBLE PRECISION,
    "speechiness" DOUBLE PRECISION,
    "key_signature" INTEGER,
    "mode" INTEGER,
    "time_signature" INTEGER,
    "search_vector" tsvector,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "album_artists" (
    "album_id" UUID NOT NULL,
    "artist_id" UUID NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'primary',
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "album_artists_pkey" PRIMARY KEY ("album_id","artist_id","role")
);

-- CreateTable
CREATE TABLE "track_artists" (
    "track_id" UUID NOT NULL,
    "artist_id" UUID NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'primary',
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "track_artists_pkey" PRIMARY KEY ("track_id","artist_id","role")
);

-- CreateIndex
CREATE UNIQUE INDEX "artists_musicbrainz_id_key" ON "artists"("musicbrainz_id");

-- CreateIndex
CREATE INDEX "artists_name_idx" ON "artists"("name");

-- CreateIndex
CREATE INDEX "artists_musicbrainz_id_idx" ON "artists"("musicbrainz_id");

-- CreateIndex
CREATE INDEX "artists_search_vector_idx" ON "artists" USING GIN ("search_vector");

-- CreateIndex
CREATE UNIQUE INDEX "albums_musicbrainz_id_key" ON "albums"("musicbrainz_id");

-- CreateIndex
CREATE INDEX "albums_title_idx" ON "albums"("title");

-- CreateIndex
CREATE INDEX "albums_release_date_idx" ON "albums"("release_date");

-- CreateIndex
CREATE INDEX "albums_musicbrainz_id_idx" ON "albums"("musicbrainz_id");

-- CreateIndex
CREATE INDEX "albums_search_vector_idx" ON "albums" USING GIN ("search_vector");

-- CreateIndex
CREATE UNIQUE INDEX "tracks_musicbrainz_id_key" ON "tracks"("musicbrainz_id");

-- CreateIndex
CREATE INDEX "tracks_album_id_disc_number_track_number_idx" ON "tracks"("album_id", "disc_number", "track_number");

-- CreateIndex
CREATE INDEX "tracks_title_idx" ON "tracks"("title");

-- CreateIndex
CREATE INDEX "tracks_isrc_idx" ON "tracks"("isrc");

-- CreateIndex
CREATE INDEX "tracks_search_vector_idx" ON "tracks" USING GIN ("search_vector");

-- CreateIndex
CREATE INDEX "album_artists_album_id_idx" ON "album_artists"("album_id");

-- CreateIndex
CREATE INDEX "album_artists_artist_id_idx" ON "album_artists"("artist_id");

-- CreateIndex
CREATE INDEX "track_artists_track_id_idx" ON "track_artists"("track_id");

-- CreateIndex
CREATE INDEX "track_artists_artist_id_idx" ON "track_artists"("artist_id");

-- CreateIndex
CREATE INDEX "Collection_userId_updatedAt_idx" ON "Collection"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "CollectionAlbum_album_id_idx" ON "CollectionAlbum"("album_id");

-- CreateIndex
CREATE INDEX "CollectionAlbum_collectionId_position_idx" ON "CollectionAlbum"("collectionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionAlbum_collectionId_album_id_key" ON "CollectionAlbum"("collectionId", "album_id");

-- CreateIndex
CREATE INDEX "Recommendation_basis_album_id_idx" ON "Recommendation"("basis_album_id");

-- CreateIndex
CREATE INDEX "Recommendation_recommended_album_id_idx" ON "Recommendation"("recommended_album_id");

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_basis_album_id_fkey" FOREIGN KEY ("basis_album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_recommended_album_id_fkey" FOREIGN KEY ("recommended_album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionAlbum" ADD CONSTRAINT "CollectionAlbum_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_artists" ADD CONSTRAINT "album_artists_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_artists" ADD CONSTRAINT "album_artists_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_artists" ADD CONSTRAINT "track_artists_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_artists" ADD CONSTRAINT "track_artists_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
