-- CreateEnum
CREATE TYPE "UncoverSelectionMode" AS ENUM ('RANDOM', 'FIFO');

-- CreateEnum
CREATE TYPE "UncoverPoolExhaustedMode" AS ENUM ('AUTO_RESET', 'STOP');

-- AlterTable
ALTER TABLE "app_config" ADD COLUMN "uncover_selection_mode" "UncoverSelectionMode" NOT NULL DEFAULT 'RANDOM';
ALTER TABLE "app_config" ADD COLUMN "uncover_pool_exhausted_mode" "UncoverPoolExhaustedMode" NOT NULL DEFAULT 'AUTO_RESET';

-- DropIndex
DROP INDEX "curated_challenges_sequence_key";

-- DropIndex
DROP INDEX "curated_challenges_sequence_idx";

-- AlterTable
ALTER TABLE "curated_challenges" DROP COLUMN "sequence";

-- CreateIndex
ALTER TABLE "curated_challenges" ADD CONSTRAINT "curated_challenges_album_id_key" UNIQUE ("album_id");
