/*
  Warnings:

  - Made the column `albumArtist` on table `CollectionAlbum` required. This step will fail if there are existing NULL values in that column.
  - Made the column `albumDiscogsId` on table `CollectionAlbum` required. This step will fail if there are existing NULL values in that column.
  - Made the column `albumTitle` on table `CollectionAlbum` required. This step will fail if there are existing NULL values in that column.
  - Made the column `basisAlbumArtist` on table `Recommendation` required. This step will fail if there are existing NULL values in that column.
  - Made the column `basisAlbumDiscogsId` on table `Recommendation` required. This step will fail if there are existing NULL values in that column.
  - Made the column `basisAlbumTitle` on table `Recommendation` required. This step will fail if there are existing NULL values in that column.
  - Made the column `recommendedAlbumArtist` on table `Recommendation` required. This step will fail if there are existing NULL values in that column.
  - Made the column `recommendedAlbumDiscogsId` on table `Recommendation` required. This step will fail if there are existing NULL values in that column.
  - Made the column `recommendedAlbumTitle` on table `Recommendation` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "CollectionAlbum" ALTER COLUMN "albumArtist" SET NOT NULL,
ALTER COLUMN "albumDiscogsId" SET NOT NULL,
ALTER COLUMN "albumTitle" SET NOT NULL;

-- AlterTable
ALTER TABLE "Recommendation" ALTER COLUMN "basisAlbumArtist" SET NOT NULL,
ALTER COLUMN "basisAlbumDiscogsId" SET NOT NULL,
ALTER COLUMN "basisAlbumTitle" SET NOT NULL,
ALTER COLUMN "recommendedAlbumArtist" SET NOT NULL,
ALTER COLUMN "recommendedAlbumDiscogsId" SET NOT NULL,
ALTER COLUMN "recommendedAlbumTitle" SET NOT NULL;
