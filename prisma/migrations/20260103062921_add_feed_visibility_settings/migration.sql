-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "showCollectionAddsInFeed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showListenLaterInFeed" BOOLEAN NOT NULL DEFAULT true;
