-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "arcadeButtonColor" TEXT NOT NULL DEFAULT '#CC4B24',
ADD COLUMN     "arcadeButtonSound" TEXT NOT NULL DEFAULT 'pluh',
ADD COLUMN     "showArcadeButton" BOOLEAN NOT NULL DEFAULT true;
