/*
  Warnings:

  - You are about to drop the column `migrated_from_discogs_id` on the `CollectionAlbum` table. All the data in the column will be lost.
  - You are about to drop the column `migrated_from_basis_discogs_id` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `migrated_from_recommended_discogs_id` on the `Recommendation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CollectionAlbum" DROP COLUMN "migrated_from_discogs_id",
ADD COLUMN     "discogs_id" TEXT;

-- AlterTable
ALTER TABLE "Recommendation" DROP COLUMN "migrated_from_basis_discogs_id",
DROP COLUMN "migrated_from_recommended_discogs_id",
ADD COLUMN     "basis_discogs_id" TEXT,
ADD COLUMN     "recommended_discogs_id" TEXT;

-- AlterTable
ALTER TABLE "albums" ADD COLUMN     "discogs_id" VARCHAR(20);

-- AlterTable
ALTER TABLE "artists" ADD COLUMN     "discogs_id" VARCHAR(20);
