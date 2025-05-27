-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionAlbum" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "personalRating" INTEGER,
    "personalNotes" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionAlbum_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Collection_userId_idx" ON "Collection"("userId");

-- CreateIndex
CREATE INDEX "Collection_isPublic_idx" ON "Collection"("isPublic");

-- CreateIndex
CREATE INDEX "CollectionAlbum_collectionId_idx" ON "CollectionAlbum"("collectionId");

-- CreateIndex
CREATE INDEX "CollectionAlbum_albumId_idx" ON "CollectionAlbum"("albumId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionAlbum_collectionId_albumId_key" ON "CollectionAlbum"("collectionId", "albumId");

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionAlbum" ADD CONSTRAINT "CollectionAlbum_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionAlbum" ADD CONSTRAINT "CollectionAlbum_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;
