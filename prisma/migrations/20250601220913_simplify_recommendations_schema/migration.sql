/*
  Warnings:

  - You are about to drop the column `albumId` on the `CollectionAlbum` table. All the data in the column will be lost.
  - You are about to drop the column `basisAlbumId` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `recommendedAlbumId` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the `Album` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Track` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[collectionId,albumDiscogsId]` on the table `CollectionAlbum` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `albumArtist` to the `CollectionAlbum` table without a default value. This is not possible if the table is not empty.
  - Added the required column `albumDiscogsId` to the `CollectionAlbum` table without a default value. This is not possible if the table is not empty.
  - Added the required column `albumTitle` to the `CollectionAlbum` table without a default value. This is not possible if the table is not empty.
  - Added the required column `basisAlbumArtist` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `basisAlbumDiscogsId` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `basisAlbumTitle` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recommendedAlbumArtist` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recommendedAlbumDiscogsId` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recommendedAlbumTitle` to the `Recommendation` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Add new columns with default values temporarily
ALTER TABLE "CollectionAlbum" 
ADD COLUMN "albumArtist" TEXT DEFAULT '',
ADD COLUMN "albumDiscogsId" TEXT DEFAULT '',
ADD COLUMN "albumImageUrl" TEXT,
ADD COLUMN "albumTitle" TEXT DEFAULT '',
ADD COLUMN "albumYear" TEXT;

ALTER TABLE "Recommendation" 
ADD COLUMN "basisAlbumArtist" TEXT DEFAULT '',
ADD COLUMN "basisAlbumDiscogsId" TEXT DEFAULT '',
ADD COLUMN "basisAlbumImageUrl" TEXT,
ADD COLUMN "basisAlbumTitle" TEXT DEFAULT '',
ADD COLUMN "basisAlbumYear" TEXT,
ADD COLUMN "recommendedAlbumArtist" TEXT DEFAULT '',
ADD COLUMN "recommendedAlbumDiscogsId" TEXT DEFAULT '',
ADD COLUMN "recommendedAlbumImageUrl" TEXT,
ADD COLUMN "recommendedAlbumTitle" TEXT DEFAULT '',
ADD COLUMN "recommendedAlbumYear" TEXT;

-- Step 2: Migrate existing data for CollectionAlbum
UPDATE "CollectionAlbum" 
SET 
  "albumDiscogsId" = "Album"."discogsId",
  "albumTitle" = "Album"."title",
  "albumArtist" = "Album"."artist",
  "albumImageUrl" = "Album"."imageUrl",
  "albumYear" = "Album"."releaseDate"
FROM "Album" 
WHERE "CollectionAlbum"."albumId" = "Album"."id";

-- Step 3: Migrate existing data for Recommendation
UPDATE "Recommendation" 
SET 
  "basisAlbumDiscogsId" = basis_album."discogsId",
  "basisAlbumTitle" = basis_album."title",
  "basisAlbumArtist" = basis_album."artist",
  "basisAlbumImageUrl" = basis_album."imageUrl",
  "basisAlbumYear" = basis_album."releaseDate",
  "recommendedAlbumDiscogsId" = rec_album."discogsId",
  "recommendedAlbumTitle" = rec_album."title",
  "recommendedAlbumArtist" = rec_album."artist",
  "recommendedAlbumImageUrl" = rec_album."imageUrl",
  "recommendedAlbumYear" = rec_album."releaseDate"
FROM "Album" basis_album, "Album" rec_album
WHERE "Recommendation"."basisAlbumId" = basis_album."id" 
  AND "Recommendation"."recommendedAlbumId" = rec_album."id";

-- Step 4: Remove default values and make columns NOT NULL
ALTER TABLE "CollectionAlbum" ALTER COLUMN "albumArtist" DROP DEFAULT;
ALTER TABLE "CollectionAlbum" ALTER COLUMN "albumDiscogsId" DROP DEFAULT;
ALTER TABLE "CollectionAlbum" ALTER COLUMN "albumTitle" DROP DEFAULT;

ALTER TABLE "Recommendation" ALTER COLUMN "basisAlbumArtist" DROP DEFAULT;
ALTER TABLE "Recommendation" ALTER COLUMN "basisAlbumDiscogsId" DROP DEFAULT;
ALTER TABLE "Recommendation" ALTER COLUMN "basisAlbumTitle" DROP DEFAULT;
ALTER TABLE "Recommendation" ALTER COLUMN "recommendedAlbumArtist" DROP DEFAULT;
ALTER TABLE "Recommendation" ALTER COLUMN "recommendedAlbumDiscogsId" DROP DEFAULT;
ALTER TABLE "Recommendation" ALTER COLUMN "recommendedAlbumTitle" DROP DEFAULT;

-- Step 5: Drop foreign key constraints
ALTER TABLE "CollectionAlbum" DROP CONSTRAINT "CollectionAlbum_albumId_fkey";
ALTER TABLE "Recommendation" DROP CONSTRAINT "Recommendation_basisAlbumId_fkey";
ALTER TABLE "Recommendation" DROP CONSTRAINT "Recommendation_recommendedAlbumId_fkey";
ALTER TABLE "Track" DROP CONSTRAINT "Track_albumId_fkey";

-- Step 6: Drop indexes
DROP INDEX "CollectionAlbum_albumId_idx";
DROP INDEX "CollectionAlbum_collectionId_albumId_key";
DROP INDEX "Recommendation_basisAlbumId_idx";
DROP INDEX "Recommendation_recommendedAlbumId_idx";

-- Step 7: Drop old columns
ALTER TABLE "CollectionAlbum" DROP COLUMN "albumId";
ALTER TABLE "Recommendation" DROP COLUMN "basisAlbumId", DROP COLUMN "recommendedAlbumId";

-- Step 8: Drop old tables
DROP TABLE "Track";
DROP TABLE "Album";

-- Step 9: Create new indexes
CREATE INDEX "CollectionAlbum_albumDiscogsId_idx" ON "CollectionAlbum"("albumDiscogsId");
CREATE UNIQUE INDEX "CollectionAlbum_collectionId_albumDiscogsId_key" ON "CollectionAlbum"("collectionId", "albumDiscogsId");
CREATE INDEX "Recommendation_basisAlbumDiscogsId_idx" ON "Recommendation"("basisAlbumDiscogsId");
CREATE INDEX "Recommendation_recommendedAlbumDiscogsId_idx" ON "Recommendation"("recommendedAlbumDiscogsId");
