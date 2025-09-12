-- AlterTable
ALTER TABLE "albums" ADD COLUMN     "genres" TEXT[],
ADD COLUMN     "secondary_types" TEXT[];

-- AlterTable
ALTER TABLE "artists" ADD COLUMN     "artist_type" VARCHAR(20),
ADD COLUMN     "genres" TEXT[];
