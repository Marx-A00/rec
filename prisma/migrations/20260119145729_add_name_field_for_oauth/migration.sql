-- AlterTable
ALTER TABLE "User" ADD COLUMN     "name" TEXT;

-- RenameIndex
ALTER INDEX "User_name_key" RENAME TO "User_username_key";
