-- CreateEnum
CREATE TYPE "AlbumGameStatus" AS ENUM ('ELIGIBLE', 'EXCLUDED', 'NONE');

-- AlterTable
ALTER TABLE "albums" ADD COLUMN     "game_status" "AlbumGameStatus" NOT NULL DEFAULT 'NONE';
