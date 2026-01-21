-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "targetUserId" TEXT,
    "recommendationId" TEXT,
    "collectionAlbumId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activities_userId_createdAt_idx" ON "activities"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "activities_userId_deletedAt_createdAt_idx" ON "activities"("userId", "deletedAt", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "activities_type_createdAt_idx" ON "activities"("type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "activities_targetUserId_idx" ON "activities"("targetUserId");

-- CreateIndex
CREATE INDEX "activities_recommendationId_idx" ON "activities"("recommendationId");

-- CreateIndex
CREATE INDEX "activities_collectionAlbumId_idx" ON "activities"("collectionAlbumId");

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_collectionAlbumId_fkey" FOREIGN KEY ("collectionAlbumId") REFERENCES "CollectionAlbum"("id") ON DELETE SET NULL ON UPDATE CASCADE;
