-- AlterTable
ALTER TABLE "albums" ADD COLUMN     "release_country" VARCHAR(2),
ADD COLUMN     "release_status" VARCHAR(20);

-- AlterTable
ALTER TABLE "artists" ADD COLUMN     "area" VARCHAR(100);
