-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "lastfmConnectedAt" TIMESTAMP(3),
ADD COLUMN     "lastfmSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastfmUsername" TEXT,
ADD COLUMN     "showLastfmStats" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showTasteProfile" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "user_lastfm_data" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastfmUsername" TEXT NOT NULL,
    "topArtists" JSONB,
    "topAlbums" JSONB,
    "recentTracks" JSONB,
    "totalPlaycount" INTEGER,
    "totalArtists" INTEGER,
    "totalAlbums" INTEGER,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_lastfm_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_favorite_artists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "artistId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorite_artists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_lastfm_data_userId_key" ON "user_lastfm_data"("userId");

-- CreateIndex
CREATE INDEX "user_lastfm_data_userId_idx" ON "user_lastfm_data"("userId");

-- CreateIndex
CREATE INDEX "user_favorite_artists_userId_idx" ON "user_favorite_artists"("userId");

-- CreateIndex
CREATE INDEX "user_favorite_artists_artistId_idx" ON "user_favorite_artists"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorite_artists_userId_artistId_key" ON "user_favorite_artists"("userId", "artistId");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorite_artists_userId_position_key" ON "user_favorite_artists"("userId", "position");

-- AddForeignKey
ALTER TABLE "user_lastfm_data" ADD CONSTRAINT "user_lastfm_data_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorite_artists" ADD CONSTRAINT "user_favorite_artists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorite_artists" ADD CONSTRAINT "user_favorite_artists_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
